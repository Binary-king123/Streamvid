import crypto from 'crypto'
import prisma from '../lib/prisma.js'
import redis from '../lib/redis.js'

// ─── Bot Detection ────────────────────────────────────────────────────────────
// List of known bot UA signatures (crawlers, scrapers, headless browsers)
const BOT_PATTERNS = /bot|crawler|spider|scraper|headless|phantom|selenium|puppeteer|playwright|wget|curl|python|java|go-http|axios|okhttp|apache-httpclient|libwww|nutch|feedburner|slurp|bingbot|googlebot|baiduspider|yandexbot|duckduckbot|facebot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|linkdexbot|exabot/i

// Minimum client-side signals required (must come from WatchPageClient JS)
const REQUIRED_WATCH_SECONDS = 5

function isBot(userAgent) {
    if (!userAgent) return true
    if (BOT_PATTERNS.test(userAgent)) return true
    // Headless browser UA is very short or missing common strings
    if (userAgent.length < 40) return true
    return false
}

function getRealIP(request) {
    // Respect Cloudflare's real IP header first, then X-Forwarded-For
    return request.headers['cf-connecting-ip']
        || request.headers['x-real-ip']
        || (request.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || request.ip
}

export async function analyticsRoutes(fastify) {

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/analytics/view
    // Called by frontend ONLY after real user watches 5+ seconds
    // Requires a valid human_token from the client tracker
    // ─────────────────────────────────────────────────────────────────────────
    fastify.post('/view', async (request, reply) => {
        const { videoId, watchSeconds, humanToken } = request.body
        if (!videoId) return reply.code(400).send({ error: 'videoId required' })

        const ua = request.headers['user-agent'] || ''
        const ip = getRealIP(request)

        // 1. Bot check — UA signature
        if (isBot(ua)) {
            return reply.send({ ok: true, counted: false, reason: 'bot' })
        }

        // 2. Watch time check — must have watched at least 5 seconds
        if (!watchSeconds || watchSeconds < REQUIRED_WATCH_SECONDS) {
            return reply.send({ ok: true, counted: false, reason: 'insufficient_watch_time' })
        }

        // 3. Human token check — must be issued by our /analytics/token endpoint
        if (humanToken) {
            const tokenKey = `human_token:${humanToken}`
            const valid = await redis.get(tokenKey)
            if (!valid) return reply.send({ ok: true, counted: false, reason: 'invalid_token' })
            // Consume the token (one-time use per session per video)
            await redis.del(tokenKey)
        }

        // 4. Session dedup — cookie-based (survives VPN IP changes)
        let sessionId = request.cookies.sid
        if (!sessionId) {
            sessionId = crypto.randomUUID()
            reply.setCookie('sid', sessionId, {
                httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30,
                sameSite: 'lax', secure: process.env.NODE_ENV === 'production'
            })
        }

        // 5. Per-session per-video dedup (24h window)
        const viewKey = `viewed:${sessionId}:${videoId}`
        const alreadyViewed = await redis.get(viewKey)
        if (alreadyViewed) return reply.send({ ok: true, counted: false, reason: 'already_counted' })

        // 6. IP-based rate limiting — max 50 unique videos per IP per hour
        const ipKey = `ip_views:${ip}`
        const ipViews = await redis.incr(ipKey)
        if (ipViews === 1) await redis.expire(ipKey, 3600)
        if (ipViews > 50) return reply.send({ ok: true, counted: false, reason: 'ip_limit' })

        // ✅ All checks passed — count this view
        await redis.set(viewKey, '1', 'EX', 60 * 60 * 24)

        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        await prisma.analyticsDaily.upsert({
            where: { videoId_date: { videoId, date: today } },
            create: { videoId, date: today, views: 1 },
            update: { views: { increment: 1 } }
        })

        await prisma.video.update({
            where: { id: videoId },
            data: { viewsCount: { increment: 1 } }
        })

        reply.send({ ok: true, counted: true })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/token
    // Issues a one-time human token when client proves it's a real user
    // (called after mouse movement + scroll events detected in JS)
    // ─────────────────────────────────────────────────────────────────────────
    fastify.post('/token', async (request, reply) => {
        const { signals } = request.body
        // signals = { hasMouse: true, hasScroll: true, screenW: 1920, screenH: 1080 }
        // Bots running headless typically have no mouse, no scroll, 0x0 screen
        const isLikelyHuman = signals?.hasMouse || signals?.hasScroll || (signals?.screenW > 100)
        if (!isLikelyHuman) return reply.code(403).send({ error: 'Forbidden' })

        const token = crypto.randomUUID()
        // Token valid for 30 minutes — enough to watch a short video
        await redis.set(`human_token:${token}`, '1', 'EX', 1800)
        reply.send({ token })
    })

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/analytics/stats — public stats (for display on homepage)
    // ─────────────────────────────────────────────────────────────────────────
    fastify.get('/stats', async (request, reply) => {
        const cached = await redis.get('stats:public')
        if (cached) return reply.send(JSON.parse(cached))

        const [totalVideos, totalViews] = await Promise.all([
            prisma.video.count({ where: { status: 'ready' } }),
            prisma.video.aggregate({ _sum: { viewsCount: true } })
        ])
        const stats = {
            totalVideos,
            totalViews: Number(totalViews._sum.viewsCount || 0)
        }
        // Cache for 5 minutes
        await redis.set('stats:public', JSON.stringify(stats), 'EX', 300)
        reply.send(stats)
    })
}
