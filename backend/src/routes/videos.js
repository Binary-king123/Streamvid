import prisma from '../lib/prisma.js'
import { cached, invalidate } from '../lib/redis.js'

const PAGE_SIZE = 24  // MissAV style — more per page
const SIDEBAR_SIZE = 12

function getSiteMode() {
    return process.env.SITE_MODE || 'mainstream'
}

function adultFilter() {
    return process.env.SITE_MODE === 'adult' ? { isAdult: true } : { isAdult: false }
}

// Slim video object for lists — includes tags and actors for MissAV-style display
function slimVideo(v) {
    return {
        id: v.id,
        code: v.code,
        title: v.title,
        thumbnailPath: v.thumbnailPath,
        previewPath: v.previewPath,
        durationSeconds: v.durationSeconds,
        viewsCount: v.viewsCount,
        createdAt: v.createdAt,
        isAdult: v.isAdult,
        genre: v.genre ? { name: v.genre.name, slug: v.genre.slug } : null,
        tags: v.tags?.map(vt => ({ id: vt.tag.id, name: vt.tag.name, slug: vt.tag.slug })) || [],
        actors: v.actors?.map(va => ({ id: va.actor.id, name: va.actor.name, slug: va.actor.slug })) || []
    }
}

const videoInclude = {
    genre: true,
    tags: { include: { tag: true } },
    actors: { include: { actor: true } }
}

export async function videoRoutes(fastify) {

    // GET /api/videos/home?page=1&sort=latest|popular
    fastify.get('/home', async (request, reply) => {
        const page = Math.max(1, parseInt(request.query.page || '1'))
        const sort = request.query.sort === 'popular' ? { viewsCount: 'desc' } : { createdAt: 'desc' }
        const skip = (page - 1) * PAGE_SIZE
        const mode = getSiteMode()
        const key = `videos:home:${mode}:${request.query.sort || 'latest'}:${page}`

        const data = await cached(key, 60, async () => {
            const [videos, total] = await Promise.all([
                prisma.video.findMany({
                    where: { status: 'ready', ...adultFilter() },
                    orderBy: sort,
                    skip,
                    take: PAGE_SIZE,
                    include: videoInclude
                }),
                prisma.video.count({ where: { status: 'ready', ...adultFilter() } })
            ])
            return { videos: videos.map(slimVideo), total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) }
        })
        reply.send(data)
    })

    // GET /api/videos/search?q=...&page=1
    fastify.get('/search', async (request, reply) => {
        const q = (request.query.q || '').trim()
        if (!q) return reply.send({ videos: [], total: 0 })
        const page = Math.max(1, parseInt(request.query.page || '1'))
        const skip = (page - 1) * PAGE_SIZE

        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where: {
                    status: 'ready',
                    ...adultFilter(),
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { code: { contains: q, mode: 'insensitive' } },
                        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
                        { actors: { some: { actor: { name: { contains: q, mode: 'insensitive' } } } } }
                    ]
                },
                orderBy: { viewsCount: 'desc' },
                skip,
                take: PAGE_SIZE,
                include: videoInclude
            }),
            prisma.video.count({
                where: {
                    status: 'ready',
                    ...adultFilter(),
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { code: { contains: q, mode: 'insensitive' } }
                    ]
                }
            })
        ])
        reply.send({ videos: videos.map(slimVideo), total, page, totalPages: Math.ceil(total / PAGE_SIZE), query: q })
    })

    // GET /api/videos/genres/list
    fastify.get('/genres/list', async (request, reply) => {
        const mode = getSiteMode()
        const data = await cached(`genres:list:${mode}`, 300, () =>
            prisma.genre.findMany({
                where: mode === 'adult' ? { isAdult: true } : {},
                orderBy: { name: 'asc' }
            })
        )
        reply.send(data)
    })

    // GET /api/videos/genre/:slug?page=1
    fastify.get('/genre/:slug', async (request, reply) => {
        const { slug } = request.params
        const page = Math.max(1, parseInt(request.query.page || '1'))
        const skip = (page - 1) * PAGE_SIZE
        const mode = getSiteMode()

        const genre = await prisma.genre.findUnique({ where: { slug } })
        if (!genre) return reply.code(404).send({ error: 'Genre not found' })

        const key = `videos:genre:${slug}:${mode}:${page}`
        const data = await cached(key, 60, async () => {
            const [videos, total] = await Promise.all([
                prisma.video.findMany({
                    where: { status: 'ready', genreId: genre.id, ...adultFilter() },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: PAGE_SIZE,
                    include: videoInclude
                }),
                prisma.video.count({ where: { status: 'ready', genreId: genre.id, ...adultFilter() } })
            ])
            return { genre, videos: videos.map(slimVideo), total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) }
        })
        reply.send(data)
    })

    // GET /api/videos/tag/:slug?page=1  — NEW for MissAV-style tag pages
    fastify.get('/tag/:slug', async (request, reply) => {
        const { slug } = request.params
        const page = Math.max(1, parseInt(request.query.page || '1'))
        const skip = (page - 1) * PAGE_SIZE

        const tag = await prisma.tag.findUnique({ where: { slug } })
        if (!tag) return reply.code(404).send({ error: 'Tag not found' })

        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where: { status: 'ready', ...adultFilter(), tags: { some: { tagId: tag.id } } },
                orderBy: { viewsCount: 'desc' },
                skip, take: PAGE_SIZE,
                include: videoInclude
            }),
            prisma.video.count({ where: { status: 'ready', ...adultFilter(), tags: { some: { tagId: tag.id } } } })
        ])
        reply.send({ tag, videos: videos.map(slimVideo), total, page, totalPages: Math.ceil(total / PAGE_SIZE) })
    })

    // GET /api/videos/actor/:slug?page=1 — NEW for actor pages
    fastify.get('/actor/:slug', async (request, reply) => {
        const { slug } = request.params
        const page = Math.max(1, parseInt(request.query.page || '1'))
        const skip = (page - 1) * PAGE_SIZE

        const actor = await prisma.actor.findUnique({ where: { slug } })
        if (!actor) return reply.code(404).send({ error: 'Actor not found' })

        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where: { status: 'ready', ...adultFilter(), actors: { some: { actorId: actor.id } } },
                orderBy: { viewsCount: 'desc' },
                skip, take: PAGE_SIZE,
                include: videoInclude
            }),
            prisma.video.count({ where: { status: 'ready', ...adultFilter(), actors: { some: { actorId: actor.id } } } })
        ])
        reply.send({ actor, videos: videos.map(slimVideo), total, page, totalPages: Math.ceil(total / PAGE_SIZE) })
    })

    // GET /api/videos/:id — full detail
    fastify.get('/:id', async (request, reply) => {
        const { id } = request.params
        if (['genres', 'search', 'tag', 'actor'].includes(id)) return reply.code(404).send({ error: 'Not found' })

        const mode = getSiteMode()
        const key = `videos:single:${id}:${mode}`
        const data = await cached(key, 120, async () => {
            const video = await prisma.video.findFirst({
                where: { id, status: 'ready', ...adultFilter() },
                include: videoInclude
            })
            if (!video) return null

            const [recommended, related] = await Promise.all([
                prisma.video.findMany({
                    where: { status: 'ready', genreId: video.genreId, id: { not: id }, ...adultFilter() },
                    orderBy: { viewsCount: 'desc' },
                    take: SIDEBAR_SIZE,
                    include: videoInclude
                }),
                prisma.video.findMany({
                    where: { status: 'ready', id: { not: id }, ...adultFilter() },
                    orderBy: { createdAt: 'desc' },
                    take: 12,
                    include: videoInclude
                })
            ])
            return { video: slimVideo(video), recommended: recommended.map(slimVideo), related: related.map(slimVideo) }
        })

        if (!data) return reply.code(404).send({ error: 'Video not found' })
        reply.send(data)
    })

    // POST /api/videos/:id/view — increment view count (session deduped in analytics route)
    fastify.post('/:id/view', async (request, reply) => {
        const { id } = request.params
        await prisma.video.update({ where: { id }, data: { viewsCount: { increment: 1 } } })
        reply.send({ ok: true })
    })
}
