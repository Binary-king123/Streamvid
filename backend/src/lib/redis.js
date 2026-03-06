import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: false
})

redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err)
})

// --- Helpers ---

/**
 * Get a cached JSON value or compute and store it.
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {Function} fetchFn - async function that returns the value
 */
export async function cached(key, ttlSeconds, fetchFn) {
    const hit = await redis.get(key)
    if (hit) return JSON.parse(hit)

    const value = await fetchFn()
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return value
}

/**
 * Invalidate a single key or a pattern.
 * @param {string} pattern - prefix pattern e.g. 'videos:*'
 */
export async function invalidate(pattern) {
    if (pattern.includes('*')) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) await redis.del(...keys)
    } else {
        await redis.del(pattern)
    }
}

export default redis
