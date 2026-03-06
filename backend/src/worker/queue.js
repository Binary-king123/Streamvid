import { Queue } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
})

export const videoQueue = new Queue('video-processing', { connection })

/**
 * Add a video encoding job to the queue.
 * @param {{ videoId: string, inputPath: string }} payload
 */
export async function enqueueVideoJob(payload) {
    await videoQueue.add('encode', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false
    })
}

export { connection }
