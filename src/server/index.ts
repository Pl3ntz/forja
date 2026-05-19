import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { rateLimitMiddleware, authMiddleware, adminMiddleware } from './middleware.js'
import authRoutes from './api/auth.js'
import healthRoutes from './api/health.js'
import cvRoutes from './api/cv.js'
import { coverLetterApi } from './api/cover-letter.js'
import adminRoutes from './api/admin.js'
import publicCvRoute from './api/public-cv.js'
import feedbackRoutes from './api/feedback.js'

const app = new Hono()

// Debug request logger (temporary, remove after diagnosis)
app.use('/api/cover-letter/*', async (c, next) => {
  const start = Date.now()
  console.log(`[req] ${c.req.method} ${c.req.url}`)
  await next()
  console.log(`[res] ${c.req.method} ${c.req.url} → ${c.res.status} (${Date.now() - start}ms)`)
})

// Security headers
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

// Rate limiting on all API routes
app.use('/api/*', rateLimitMiddleware)

// Auth middleware for protected routes
app.use('/api/cv/*', authMiddleware)
app.use('/api/cover-letter/*', authMiddleware)
app.use('/api/admin/*', adminMiddleware)

// Public API routes (no auth required)
app.route('/api/feedback', feedbackRoutes)

// API routes
app.route('/api/auth', authRoutes)
app.route('/api', healthRoutes)
app.route('/api/cv', cvRoutes)
app.route('/api/cover-letter', coverLetterApi)
app.route('/api/admin', adminRoutes)

// Public CV SSR route (no auth required)
app.route('/cv', publicCvRoute)

// Serve static assets from Vite build output
app.use('/*', serveStatic({ root: './dist/client' }))

// SPA fallback — serve index.html for all non-API, non-static routes
app.get('*', serveStatic({ path: './dist/client/index.html' }))

export default {
  port: parseInt(process.env.PORT ?? '4321', 10),
  hostname: process.env.HOST ?? '0.0.0.0',
  fetch: app.fetch,
}
