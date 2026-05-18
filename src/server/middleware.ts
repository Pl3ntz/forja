import type { Context, Next } from 'hono'
import { auth } from '../lib/auth.js'
import { checkRateLimit, rateLimitResponse } from '../lib/rate-limit.js'
import { getClientIp } from '../lib/request-utils.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

const RATE_LIMITS: ReadonlyArray<{
  prefix: string
  methods: ReadonlyArray<string>
  windowMs: number
  maxRequests: number
}> = [
  { prefix: '/api/auth/sign-in', methods: ['POST'], windowMs: 60_000, maxRequests: 10 },
  { prefix: '/api/auth/sign-up', methods: ['POST'], windowMs: 60_000, maxRequests: 5 },
  { prefix: '/api/cv/', methods: ['POST'], windowMs: 60_000, maxRequests: 20 },
  { prefix: '/api/cover-letter/', methods: ['POST'], windowMs: 60_000, maxRequests: 20 },
]

export async function rateLimitMiddleware(c: Context, next: Next) {
  const pathname = new URL(c.req.url).pathname
  const method = c.req.method

  for (const rule of RATE_LIMITS) {
    if (pathname.startsWith(rule.prefix) && rule.methods.includes(method)) {
      const ip = getClientIp(c.req.raw)
      const key = `${ip}:${rule.prefix}`
      const result = checkRateLimit(key, {
        windowMs: rule.windowMs,
        maxRequests: rule.maxRequests,
      })
      if (!result.allowed) {
        return rateLimitResponse(result.retryAfterMs)
      }
      break
    }
  }

  await next()
}

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const userRole =
    ADMIN_EMAIL && session.user.email === ADMIN_EMAIL
      ? 'admin'
      : (session.user.role ?? 'user')

  c.set('user', { ...session.user, role: userRole })
  c.set('session', session.session)

  await next()
}

export async function adminMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ error: 'Não autorizado' }, 401)
  }

  const userRole =
    ADMIN_EMAIL && session.user.email === ADMIN_EMAIL
      ? 'admin'
      : (session.user.role ?? 'user')

  if (userRole !== 'admin') {
    return c.json({ error: 'Acesso negado' }, 403)
  }

  c.set('user', { ...session.user, role: userRole })
  c.set('session', session.session)

  await next()
}
