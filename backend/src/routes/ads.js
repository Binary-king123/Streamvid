import prisma from '../lib/prisma.js'
import { cached } from '../lib/redis.js'

export async function adRoutes(fastify) {
    // GET /api/ads/config — fetches the current ad configuration
    // Frontend loads this once on mount, after page load, asynchronously
    fastify.get('/config', async (request, reply) => {
        const config = await cached('ads:config', 300, async () => {
            return prisma.platformAd.findFirst()
        })
        reply.send(config || {})
    })
}
