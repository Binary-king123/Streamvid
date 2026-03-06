import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'

export async function authRoutes(fastify) {
    // POST /api/auth/login
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 }
                }
            }
        }
    }, async (request, reply) => {
        const { email, password } = request.body

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

        const token = fastify.jwt.sign(
            { id: user.id, email: user.email },
            { expiresIn: '7d' }
        )

        reply
            .setCookie('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' })
            .send({ token, user: { id: user.id, email: user.email } })
    })

    // POST /api/auth/logout
    fastify.post('/logout', async (request, reply) => {
        reply.clearCookie('token', { path: '/' }).send({ ok: true })
    })

    // GET /api/auth/me
    fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        reply.send({ user: request.user })
    })

    // POST /api/auth/seed — Creates first admin (disable after setup!)
    fastify.post('/seed', async (request, reply) => {
        const { email, password } = request.body
        const count = await prisma.user.count()
        if (count > 0) return reply.code(403).send({ error: 'Admin already exists' })

        const passwordHash = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({ data: { email, passwordHash } })
        reply.code(201).send({ id: user.id, email: user.email })
    })
}
