import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import dotenv from 'dotenv'

import { authRoutes } from './routes/auth.js'
import { videoRoutes } from './routes/videos.js'
import { analyticsRoutes } from './routes/analytics.js'
import { adminRoutes } from './routes/admin.js'
import { adRoutes } from './routes/ads.js'

dotenv.config()

// Globally polyfill BigInt serialization for Fastify's JSON stringifier
BigInt.prototype.toJSON = function () { return this.toString() }

const isProd = process.env.NODE_ENV === 'production'

const server = Fastify({
  logger: {
    transport: !isProd
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
  },
  trustProxy: true,
  // Disable built-in 404 error detail — don't leak route info
  return503OnClosing: true
})

// ─── Remove all server fingerprinting headers ─────────────────────────────
server.addHook('onSend', async (request, reply) => {
  reply.removeHeader('x-powered-by')
  reply.removeHeader('server')
  // Don't reveal framework/runtime
  reply.header('server', 'web')
})

// ─── Plugins ─────────────────────────────────────────────────────────────────
await server.register(cors, {
  origin: isProd ? (process.env.ALLOWED_ORIGIN || false) : true,
  credentials: true
})
await server.register(cookie)
await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'fallback-dev-secret',
  cookie: {
    cookieName: 'token',
    signed: false
  }
})
await server.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 } })
await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({ statusCode: 429, error: 'Too Many Requests', message: 'Slow down.' })
})

// ─── Auth Decorator ──────────────────────────────────────────────────────────
server.decorate('authenticate', async function (request, reply) {
  try { await request.jwtVerify() }
  catch { reply.code(401).send({ error: 'Unauthorized' }) }
})

// ─── Routes ──────────────────────────────────────────────────────────────────
await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(videoRoutes, { prefix: '/api/videos' })
await server.register(analyticsRoutes, { prefix: '/api/analytics' })
await server.register(adminRoutes, { prefix: '/api/admin' })
await server.register(adRoutes, { prefix: '/api/ads' })

server.get('/health', async () => ({ status: 'ok' }))

// ─── 404 — Don't expose route tree ───────────────────────────────────────────
server.setNotFoundHandler(async (request, reply) => {
  reply.code(404).send({ error: 'Not found' })
})

// ─── Error handler — no stack traces in production ───────────────────────────
server.setErrorHandler(async (err, request, reply) => {
  if (isProd) {
    reply.code(err.statusCode || 500).send({ error: 'Server error' })
  } else {
    reply.code(err.statusCode || 500).send({ error: err.message })
  }
})

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const signals = ['SIGINT', 'SIGTERM']
signals.forEach(sig => {
  process.once(sig, async () => {
    await server.close()
    process.exit(0)
  })
})

const port = parseInt(process.env.PORT || '4000')
try {
  await server.listen({ port, host: '0.0.0.0' })
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
