import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import * as schema from '../db/schema/index.js'

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? ''
const PLACEHOLDER_SECRET = 'change-this-to-a-random-secret-at-least-32-chars'

if (!BETTER_AUTH_SECRET || BETTER_AUTH_SECRET === PLACEHOLDER_SECRET) {
  throw new Error(
    'BETTER_AUTH_SECRET is not set or still has the placeholder value. '
    + 'Generate a random secret: openssl rand -base64 32',
  )
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:4321',
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:8080', 'http://127.0.0.1:8080'] : []),
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) {
            await db
              .update(schema.users)
              .set({ role: 'admin' })
              .where(eq(schema.users.id, user.id))
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          if (!ADMIN_EMAIL) return
          const [user] = await db
            .select({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
            .from(schema.users)
            .where(eq(schema.users.id, session.userId))
            .limit(1)
          if (user && user.email === ADMIN_EMAIL && user.role !== 'admin') {
            await db
              .update(schema.users)
              .set({ role: 'admin' })
              .where(eq(schema.users.id, user.id))
          }
        },
      },
    },
  },
})
