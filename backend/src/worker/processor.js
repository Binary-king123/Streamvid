import { Worker } from 'bullmq'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import dotenv from 'dotenv'
import { connection } from './queue.js'
import prisma from '../lib/prisma.js'

dotenv.config()

const STORAGE_PATH = process.env.VIDEO_STORAGE_PATH || '/var/www/videos'
const MAX_JOBS = parseInt(process.env.MAX_ENCODING_JOBS || '2')
const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000 // 10 minute max per job

// ─── FFMPEG HELPER ──────────────────────────────────────────────────────────
// Uses spawn instead of exec to avoid 1MB stdout buffer crash on large files

function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
        let stderr = ''
        proc.stderr.on('data', chunk => { stderr += chunk.toString() })

        const timeout = setTimeout(() => {
            proc.kill('SIGKILL')
            reject(new Error(`FFmpeg timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`))
        }, FFMPEG_TIMEOUT_MS)

        proc.on('close', code => {
            clearTimeout(timeout)
            if (code === 0) resolve()
            else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`))
        })
    })
}

function runFFprobe(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] })
        let stdout = ''
        proc.stdout.on('data', chunk => { stdout += chunk })
        proc.on('close', code => {
            if (code === 0) resolve(stdout.trim())
            else resolve('0')
        })
    })
}

async function generateThumbnail(input, outputDir) {
    const out = path.join(outputDir, 'thumbnail.jpg')
    await runFFmpeg(['-v', 'quiet', '-i', input, '-ss', '00:00:03', '-vframes', '1', '-q:v', '2', out])
}

async function generatePreview(input, outputDir) {
    const out = path.join(outputDir, 'preview.mp4')
    await runFFmpeg(['-i', input, '-ss', '00:00:02', '-t', '00:00:05', '-vf', 'scale=-2:360',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-an', out])
}

async function generateHLS(input, outputDir) {
    const segmentPattern = path.join(outputDir, 'segment_%03d.ts')
    const playlist = path.join(outputDir, 'index.m3u8')
    await runFFmpeg([
        '-i', input,
        '-vf', 'scale=-2:360',
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '500k', '-maxrate', '600k', '-bufsize', '1000k',
        '-c:a', 'aac', '-b:a', '64k',
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segmentPattern,
        playlist
    ])
}

async function getVideoDuration(inputPath) {
    try {
        const out = await runFFprobe(['-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', inputPath])
        return Math.round(parseFloat(out)) || 0
    } catch { return 0 }
}

// ─── WORKER ─────────────────────────────────────────────────────────────────

const worker = new Worker('video-processing', async (job) => {
    const { videoId, inputPath } = job.data
    job.log(`Starting encoding for video: ${videoId}`)

    const outputDir = path.join(STORAGE_PATH, videoId)
    await fs.mkdir(outputDir, { recursive: true })

    try {
        await job.updateProgress(5)

        const durationSeconds = await getVideoDuration(inputPath)
        await job.updateProgress(10)

        await generateThumbnail(inputPath, outputDir)
        await job.updateProgress(30)

        await generatePreview(inputPath, outputDir)
        await job.updateProgress(55)

        await generateHLS(inputPath, outputDir)
        await job.updateProgress(90)

        await prisma.video.update({
            where: { id: videoId },
            data: {
                status: 'ready',
                hlsPath: `/videos/${videoId}/index.m3u8`,
                thumbnailPath: `/videos/${videoId}/thumbnail.jpg`,
                previewPath: `/videos/${videoId}/preview.mp4`,
                durationSeconds
            }
        })

        if (existsSync(inputPath)) await fs.unlink(inputPath)

        await job.updateProgress(100)
        job.log(`Encoding complete for video: ${videoId}`)
    } catch (err) {
        await prisma.video.update({ where: { id: videoId }, data: { status: 'failed' } })
        throw err
    }
}, {
    connection,
    concurrency: MAX_JOBS
})

worker.on('completed', (job) => console.log(`[Worker] ✅ ${job.id} done: ${job.data.videoId}`))
worker.on('failed', (job, err) => console.error(`[Worker] ❌ ${job?.id} failed: ${err.message}`))
worker.on('error', err => console.error('[Worker] Error:', err))

console.log(`[Worker] Started — concurrency: ${MAX_JOBS}, timeout: ${FFMPEG_TIMEOUT_MS / 1000}s`)
