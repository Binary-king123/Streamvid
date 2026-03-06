import path from 'path'
import fs from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import { pipeline } from 'stream/promises'
import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { invalidate } from '../lib/redis.js'
import { enqueueVideoJob } from '../worker/queue.js'

const UPLOADS_PATH = process.env.UPLOADS_PATH || '/tmp/streamvid-uploads'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function slugify(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80)
}

// Download a remote video URL using yt-dlp (handles most sites) or curl fallback
function downloadUrl(url, outputPath) {
    return new Promise((resolve, reject) => {
        // Try yt-dlp first (best for most video platforms)
        const proc = spawn('yt-dlp', [
            '--no-playlist', '--format', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            url
        ], { stdio: ['ignore', 'pipe', 'pipe'] })

        let stderr = ''
        proc.stderr.on('data', d => { stderr += d })
        proc.on('close', code => {
            if (code === 0) return resolve()
            // Fallback: direct curl download (for direct mp4 links)
            const curl = spawn('curl', ['-L', '-o', outputPath, url], { stdio: 'ignore' })
            curl.on('close', code2 => {
                if (code2 === 0) resolve()
                else reject(new Error(`Download failed: ${stderr.slice(-300)}`))
            })
        })
    })
}

async function findOrCreateGenre(name) {
    const slug = slugify(name)
    return prisma.genre.upsert({
        where: { slug },
        update: {},
        create: { name, slug }
    })
}

async function findOrCreateTags(tagNames) {
    if (!tagNames?.length) return []
    return Promise.all(tagNames.map(name =>
        prisma.tag.upsert({
            where: { name: name.trim() },
            update: {},
            create: { name: name.trim(), slug: slugify(name.trim()) }
        })
    ))
}

async function findOrCreateActors(actorNames) {
    if (!actorNames?.length) return []
    return Promise.all(actorNames.map(name =>
        prisma.actor.upsert({
            where: { name: name.trim() },
            update: {},
            create: { name: name.trim(), slug: slugify(name.trim()) }
        })
    ))
}

async function createVideoRecord({ title, description, genreId, isAdult, code, tagIds, actorIds }) {
    const video = await prisma.video.create({
        data: {
            title,
            description,
            genreId,
            isAdult: Boolean(isAdult),
            code: code || null,
            status: 'processing',
            tags: tagIds?.length ? { create: tagIds.map(tagId => ({ tagId })) } : undefined,
            actors: actorIds?.length ? { create: actorIds.map(actorId => ({ actorId })) } : undefined
        }
    })
    return video
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

export async function adminRoutes(fastify) {
    const opts = { onRequest: [fastify.authenticate] }

    // ============================================================
    // VIDEO UPLOAD — File Upload
    // ============================================================
    fastify.post('/videos/upload', opts, async (request, reply) => {
        const data = await request.file()
        if (!data) return reply.code(400).send({ error: 'No file uploaded' })

        const fields = Object.fromEntries(
            Object.entries(data.fields).map(([k, v]) => [k, v.value])
        )
        const { title, genreId, description, isAdult, code } = fields
        if (!title || !genreId) return reply.code(400).send({ error: 'title and genreId required' })

        const tags = fields.tags ? fields.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        const actors = fields.actors ? fields.actors.split(',').map(a => a.trim()).filter(Boolean) : []

        const [tagRecords, actorRecords] = await Promise.all([
            findOrCreateTags(tags),
            findOrCreateActors(actors)
        ])

        const video = await createVideoRecord({
            title, description, genreId, isAdult, code,
            tagIds: tagRecords.map(t => t.id),
            actorIds: actorRecords.map(a => a.id)
        })

        await fs.mkdir(UPLOADS_PATH, { recursive: true })
        const uploadedPath = path.join(UPLOADS_PATH, `${video.id}${path.extname(data.filename || '.mp4')}`)
        await pipeline(data.file, createWriteStream(uploadedPath))

        await enqueueVideoJob({ videoId: video.id, inputPath: uploadedPath })
        reply.code(202).send({ id: video.id, status: 'processing' })
    })

    // ============================================================
    // URL IMPORT — Download from URL + process
    // ============================================================
    fastify.post('/videos/import-url', opts, async (request, reply) => {
        const { url, title, genreId, description, isAdult, code, tags, actors } = request.body
        if (!url || !title || !genreId) {
            return reply.code(400).send({ error: 'url, title, and genreId are required' })
        }

        const [tagRecords, actorRecords] = await Promise.all([
            findOrCreateTags(tags || []),
            findOrCreateActors(actors || [])
        ])

        const video = await createVideoRecord({
            title, description, genreId, isAdult, code,
            tagIds: tagRecords.map(t => t.id),
            actorIds: actorRecords.map(a => a.id)
        })

        await fs.mkdir(UPLOADS_PATH, { recursive: true })
        const downloadPath = path.join(UPLOADS_PATH, `${video.id}.mp4`)

        // Respond immediately — download happens in background
        reply.code(202).send({ id: video.id, status: 'downloading', message: 'Video download queued' })

        // Background: download then enqueue
        setImmediate(async () => {
            try {
                await downloadUrl(url, downloadPath)
                await enqueueVideoJob({ videoId: video.id, inputPath: downloadPath })
            } catch (err) {
                await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } })
                console.error(`[Import] Download failed for ${video.id}: ${err.message}`)
            }
        })
    })

    // ============================================================
    // BATCH CSV IMPORT — Multiple videos at once (DOWNLOAD based)
    // Format: URL,title,genre_name,code,tags(;sep),actors(;sep),isAdult(true/false)
    // ============================================================
    fastify.post('/videos/batch-import', opts, async (request, reply) => {
        const { rows } = request.body // Array of { url, title, genreName, code, tags, actors, isAdult }
        if (!Array.isArray(rows) || rows.length === 0) {
            return reply.code(400).send({ error: 'rows array required' })
        }
        if (rows.length > 500) {
            return reply.code(400).send({ error: 'Max 500 rows per batch' })
        }

        const results = []
        const errors = []

        for (const row of rows) {
            try {
                const { url, title, genreName, code, tags, actors, isAdult } = row
                if (!url || !title || !genreName) {
                    errors.push({ row, error: 'Missing url, title, or genreName' })
                    continue
                }

                const genre = await findOrCreateGenre(genreName)
                const [tagRecords, actorRecords] = await Promise.all([
                    findOrCreateTags(Array.isArray(tags) ? tags : (tags || '').split(';').filter(Boolean)),
                    findOrCreateActors(Array.isArray(actors) ? actors : (actors || '').split(';').filter(Boolean))
                ])

                const video = await createVideoRecord({
                    title, description: null, genreId: genre.id,
                    isAdult: isAdult === true || isAdult === 'true', code,
                    tagIds: tagRecords.map(t => t.id),
                    actorIds: actorRecords.map(a => a.id)
                })

                // Queue download in background
                const downloadPath = path.join(UPLOADS_PATH, `${video.id}.mp4`)
                setImmediate(async () => {
                    try {
                        await fs.mkdir(UPLOADS_PATH, { recursive: true })
                        await downloadUrl(url, downloadPath)
                        await enqueueVideoJob({ videoId: video.id, inputPath: downloadPath })
                    } catch (err) {
                        await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } })
                    }
                })

                results.push({ id: video.id, title, status: 'queued' })
            } catch (err) {
                errors.push({ row, error: err.message })
            }
        }

        await invalidate('videos:home:*')
        reply.send({ queued: results.length, errors: errors.length, results, errors })
    })

    // ============================================================
    // SINGLE EMBED — Zero Encoding Publish
    // ============================================================
    fastify.post('/videos/embed', opts, async (request, reply) => {
        const { title, embedUrl, thumbnailUrl, genreName, duration, tags, actors, isAdult, description, code } = request.body

        if (!title || !embedUrl || !genreName) {
            return reply.code(400).send({ error: 'title, embedUrl, and genreName required' })
        }

        const genre = await findOrCreateGenre(genreName)
        const [tagRecords, actorRecords] = await Promise.all([
            findOrCreateTags(tags || []),
            findOrCreateActors(actors || [])
        ])

        const video = await prisma.video.create({
            data: {
                title,
                description,
                embedUrl,
                thumbnailPath: thumbnailUrl || null,
                genreId: genre.id,
                durationSeconds: parseInt(duration) || 0,
                isAdult: Boolean(isAdult),
                code: code || null,
                status: 'ready', // INSTANT PUBLISH
                tags: tagRecords.length ? { create: tagRecords.map(t => ({ tagId: t.id })) } : undefined,
                actors: actorRecords.length ? { create: actorRecords.map(a => ({ actorId: a.id })) } : undefined
            }
        })

        await invalidate('videos:home:*')
        reply.send({ id: video.id, status: 'ready' })
    })

    // ============================================================
    // BULK EMBED — Batch Zero Encoding Publish (Max 100)
    // ============================================================
    fastify.post('/videos/bulk-embed', opts, async (request, reply) => {
        const rows = request.body
        if (!Array.isArray(rows) || rows.length === 0) {
            return reply.code(400).send({ error: 'Array of embed videos required' })
        }
        if (rows.length > 100) {
            return reply.code(400).send({ error: 'Max 100 per request for bulk embed' })
        }

        let imported = 0
        let skipped = 0
        let errors = 0
        const errorList = []

        for (const row of rows) {
            try {
                // Support both direct tags array or semicolon/comma separated string
                const rowTags = Array.isArray(row.tags) ? row.tags : (row.tags || '').split(/[;,]/).filter(Boolean)
                const rowActors = Array.isArray(row.actors) ? row.actors : (row.actors || '').split(/[;,]/).filter(Boolean)

                const { title, embedUrl, thumbnailUrl, genreName, duration, isAdult, description, code } = row

                if (!title || !embedUrl || !genreName) {
                    throw new Error('Missing title, embedUrl, or genreName')
                }

                // ── Dedup check: skip if embedUrl already exists ──────────────
                const existing = await prisma.video.findFirst({ where: { embedUrl }, select: { id: true } })
                if (existing) { skipped++; continue }

                const genre = await findOrCreateGenre(genreName)
                const [tagRecords, actorRecords] = await Promise.all([
                    findOrCreateTags(rowTags),
                    findOrCreateActors(rowActors)
                ])

                await prisma.video.create({
                    data: {
                        title,
                        description: description || null,
                        embedUrl,
                        thumbnailPath: thumbnailUrl || null,
                        genreId: genre.id,
                        durationSeconds: parseInt(duration) || 0,
                        isAdult: Boolean(isAdult),
                        code: code || null,
                        status: 'ready',
                        tags: tagRecords.length ? { create: tagRecords.map(t => ({ tagId: t.id })) } : undefined,
                        actors: actorRecords.length ? { create: actorRecords.map(a => ({ actorId: a.id })) } : undefined
                    }
                })
                imported++
            } catch (err) {
                errors++
                errorList.push({ title: row.title, error: err.message })
            }
        }

        await invalidate('videos:home:*')
        reply.send({ imported, skipped, errors, errorList })
    })

    // ============================================================
    // VIDEO MANAGEMENT
    // ============================================================
    fastify.get('/videos', opts, async (request, reply) => {
        const page = Math.max(1, parseInt(request.query.page || '1'))
        const status = request.query.status || undefined
        const search = request.query.search || ''

        const where = {
            ...(status ? { status } : {}),
            ...(search ? { title: { contains: search, mode: 'insensitive' } } : {})
        }
        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * 20,
                take: 20,
                include: { genre: true, tags: { include: { tag: true } }, actors: { include: { actor: true } } }
            }),
            prisma.video.count({ where })
        ])
        reply.send({ videos, total, page, totalPages: Math.ceil(total / 20) })
    })

    fastify.put('/videos/:id', opts, async (request, reply) => {
        const { id } = request.params
        const { title, description, genreId, isAdult, code } = request.body
        const video = await prisma.video.update({
            where: { id },
            data: { title, description, genreId, isAdult, code }
        })
        await invalidate(`videos:single:${id}`)
        await invalidate('videos:home:*')
        reply.send(video)
    })

    fastify.delete('/videos/:id', opts, async (request, reply) => {
        const { id } = request.params
        const video = await prisma.video.findUnique({ where: { id } })
        if (!video) return reply.code(404).send({ error: 'Not found' })

        const storageBase = process.env.VIDEO_STORAGE_PATH || '/var/www/videos'
        const videoDir = path.join(storageBase, id)
        if (existsSync(videoDir)) await fs.rm(videoDir, { recursive: true, force: true })

        await prisma.video.delete({ where: { id } })
        await invalidate(`videos:single:${id}`)
        await invalidate('videos:home:*')
        reply.send({ ok: true })
    })

    // ============================================================
    // GENRE / TAG / ACTOR MANAGEMENT
    // ============================================================
    fastify.get('/genres', opts, async (_, reply) => {
        reply.send(await prisma.genre.findMany({ orderBy: { name: 'asc' } }))
    })
    fastify.post('/genres', opts, async (request, reply) => {
        const { name, isAdult } = request.body
        const slug = slugify(name)
        const genre = await prisma.genre.create({ data: { name, slug, isAdult: Boolean(isAdult) } })
        await invalidate('genres:list:*')
        reply.code(201).send(genre)
    })
    fastify.delete('/genres/:id', opts, async (request, reply) => {
        await prisma.genre.delete({ where: { id: request.params.id } })
        await invalidate('genres:list:*')
        reply.send({ ok: true })
    })

    fastify.get('/tags', opts, async (_, reply) => {
        reply.send(await prisma.tag.findMany({ orderBy: { name: 'asc' } }))
    })
    fastify.get('/actors', opts, async (_, reply) => {
        reply.send(await prisma.actor.findMany({ orderBy: { name: 'asc' } }))
    })

    // ============================================================
    // ANALYTICS
    // ============================================================
    fastify.get('/analytics', opts, async (request, reply) => {
        const days = parseInt(request.query.days || '30')
        const since = new Date()
        since.setDate(since.getDate() - days)

        const [totalViews, topVideos, dailyTraffic] = await Promise.all([
            prisma.video.aggregate({ _sum: { viewsCount: true } }),
            prisma.video.findMany({
                where: { status: 'ready' },
                orderBy: { viewsCount: 'desc' },
                take: 10,
                select: { id: true, title: true, viewsCount: true, thumbnailPath: true, genre: { select: { name: true } } }
            }),
            prisma.analyticsDaily.groupBy({
                by: ['date'],
                where: { date: { gte: since } },
                _sum: { views: true },
                orderBy: { date: 'asc' }
            })
        ])
        reply.send({ totalViews: totalViews._sum.viewsCount || 0, topVideos, dailyTraffic })
    })

    // ============================================================
    // ADS CONFIG
    // ============================================================
    fastify.get('/ads', opts, async (_, reply) => {
        let config = await prisma.platformAd.findFirst()
        if (!config) config = await prisma.platformAd.create({ data: {} })
        reply.send(config)
    })
    fastify.put('/ads', opts, async (request, reply) => {
        const existing = await prisma.platformAd.findFirst()
        const config = existing
            ? await prisma.platformAd.update({ where: { id: existing.id }, data: request.body })
            : await prisma.platformAd.create({ data: request.body })
        await invalidate('ads:config')
        reply.send(config)
    })
}
