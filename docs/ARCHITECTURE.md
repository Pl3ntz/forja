# Architecture

This document describes the system architecture of Forja in detail.

---

## Overview

Forja is a full-stack web application built as a single deployable Docker container (plus PostgreSQL). The frontend is a React SPA served as static files, and the backend is a Hono HTTP server running on the Bun runtime.

```
Browser (React SPA)
    ↕ HTTP (JSON / Binary)
Hono Server (Bun runtime, port 4321)
    ↕ SQL (Drizzle ORM)
PostgreSQL 16
```

---

## Frontend Architecture

### Technology

- **React 19** with functional components and hooks
- **React Router 7.2** for client-side routing
- **Tailwind CSS 4** for styling (custom design tokens, no component library)
- **Framer Motion 12** for animations and transitions
- **Vite 6.2** for development server and production builds

### Routing

Routes are defined in `src/client/App.tsx` using React Router:

```
/                          → HomePage (public landing)
/auth/login               → LoginPage (redirect if authed)
/auth/register            → RegisterPage (redirect if authed)
/auth/forgot-password     → ForgotPasswordPage (redirect if authed)
/dashboard                → DashboardPage (requires auth)
/editor/:cvId             → EditorPage (requires auth)
/settings                 → SettingsPage (requires auth)
/admin                    → AdminDashboardPage (requires admin)
/admin/users              → AdminUsersPage (requires admin)
/admin/users/:userId      → AdminUserDetailPage (requires admin)
*                         → NotFoundPage
```

### Route Guards

- `RequireAuth` — redirects unauthenticated users to `/auth/login`
- `RequireAdmin` — redirects non-admin users to `/dashboard`
- `RedirectIfAuth` — redirects authenticated users to `/dashboard`

### Layouts

| Layout | Used By | Features |
|--------|---------|----------|
| `AuthLayout` | Login, Register, Forgot Password | Centered card, minimal nav |
| `AppLayout` | Dashboard, Settings, Admin | Persistent navbar with UserMenu |
| `EditorLayout` | CV Editor | Full-screen, no navbar chrome |

### State Management

No external state library. The app uses:

- **React Context** (`useAuth`) for authentication state and methods
- **Component state** (`useState`) for form data within the editor
- **Fetch-on-mount** pattern for loading data from API

### CV Editor Data Flow

```
User types in form field
  ↓
onChange → setState (immediate)
  ↓
Debounced preview (300ms) → POST /api/cv/:cvId/preview → iframe updated
  ↓
Debounced save (1.5s) → PUT /api/cv/:cvId → DB transaction
  ↓
Save indicator: idle → saving → saved (or error)
```

### Design System

Custom Tailwind theme defined in `src/styles/global.css`:

- **Forge** palette (dark navy) — backgrounds
- **Ember** palette (orange-red) — primary accent / CTAs
- **Molten** palette (warm gold) — secondary accent
- **Fonts:** Inter (sans), Cinzel (brand/serif)
- **Status colors:** success (green), warning (yellow), error (red)

---

## Backend Architecture

### Technology

- **Hono 4.7** — Lightweight web framework
- **Bun 1.x** — JavaScript/TypeScript runtime
- **Better Auth 1.4** — Authentication library
- **Drizzle ORM 0.45** — Type-safe SQL query builder

### Server Setup

Entry point: `src/server/index.ts`

```
Hono App
├── Middleware
│   ├── rateLimitMiddleware → all /api/* routes
│   ├── authMiddleware → /api/cv/* routes
│   └── adminMiddleware → /api/admin/* routes
├── API Routes
│   ├── /api/auth → Better Auth handler
│   ├── /api/health → DB connectivity check
│   ├── /api/cv → CV CRUD + processing + AI
│   └── /api/admin → User management + stats
├── Public Route
│   └── /cv/:userId/:cvId → SSR public CV view
└── Static
    ├── /* → serve dist/client/ assets
    └── * → SPA fallback (index.html)
```

### Middleware Stack

1. **Rate Limiting** (`src/lib/rate-limit.ts`)
   - In-memory `Map` with sliding window
   - Auto-cleanup of expired entries every 60 seconds
   - Returns 429 with `Retry-After` header when exceeded

2. **Auth Middleware** (`src/server/middleware.ts`)
   - Validates session cookie via Better Auth
   - Attaches `user` object to request context
   - Returns 401 if no valid session

3. **Admin Middleware**
   - Extends auth middleware
   - Checks `user.role === 'admin'`
   - Returns 403 if not admin

### Database Layer

PostgreSQL accessed via Drizzle ORM with the `postgres` driver.

**Connection:** Single connection via `DATABASE_URL` environment variable.

**Transaction pattern** (CV updates):
```typescript
await db.transaction(async (tx) => {
  // 1. Update CV header fields
  // 2. Delete all existing items
  // 3. Insert new items with orderIndex
})
```

This ensures atomicity — partial updates never occur.

### PDF Generation

See [PDF Generation Pipeline](#pdf-generation-pipeline) in the README for the full flow.

Key components:
- `src/lib/pdf-generator.ts` — Orchestrator
- `src/lib/pdf-queue.ts` — p-queue with `PDF_CONCURRENCY` limit
- `scripts/generate-tex.ts` — EJS template rendering
- `scripts/compile-pdf.ts` — Tectonic execution
- `src/lib/latex-escape.ts` — Security escaping

### AI Integration

See [AI Features](./AI.md) for detailed documentation.

Key design decisions:
- All AI calls go through `src/lib/ai-client.ts`
- JSON output via Groq `json_object` mode with schema in prompt
- Zod validation on all AI responses
- Input stripping (removes `customLatex`, `templateId`) to reduce token count
- Compact JSON serialization (no pretty-print)
- In-memory caching for ATS scores (5-min TTL)
- 30-second timeout on all AI requests

---

## Security Model

### Input Validation
- All API inputs validated with Zod schemas before processing
- CV data has strict length limits (500 chars for text, 5000 for long text, 100KB for custom LaTeX)
- Max item counts enforced (20 items per section, 10 custom sections)

### SQL Injection Prevention
- Drizzle ORM generates parameterized queries exclusively
- No raw SQL anywhere in the codebase

### LaTeX Injection Prevention
- All user text is escaped before insertion into LaTeX templates
- Special characters: `\`, `$`, `&`, `%`, `#`, `_`, `{`, `}`, `~`, `^`
- Custom LaTeX is checked for dangerous commands before compilation

### Authentication
- Passwords hashed by Better Auth (bcrypt)
- Sessions stored in database with expiry
- httpOnly cookies prevent XSS token theft
- 5-minute cookie cache reduces DB lookups

### Rate Limiting
- Per-IP sliding window for all endpoints
- Stricter limits on auth endpoints (5 sign-ups/min, 10 sign-ins/min)
- Per-user limits on expensive AI operations

---

## Deployment Architecture

### Docker

```
┌─────────────────────────────────────┐
│        Docker Compose               │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │    app       │  │     db      │  │
│  │  Bun + Hono  │  │ PostgreSQL  │  │
│  │  + Tectonic  │  │  16-Alpine  │  │
│  │  Port 4321   │  │  Port 5432  │  │
│  └──────┬───────┘  └──────┬──────┘  │
│         │    internal net  │         │
│         └──────────────────┘         │
└─────────────────┬────────────────────┘
                  │ easypanel network
                  ▼
           ┌─────────────┐
           │   Traefik    │
           │ HTTPS + TLS  │
           └─────────────┘
```

### Startup Sequence

```
docker-entrypoint.sh:
1. Wait for PostgreSQL (max 10 retries, 2s intervals)
2. drizzle-kit migrate (apply pending migrations)
3. bun scripts/seed.ts (idempotent admin + demo seeding)
4. exec bun src/server/index.ts (start app, replace shell)
```

### Resource Limits

| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|-------------|-------------|-----------------|
| app | 0.50 | 1GB | 0.25 | 256MB |
| db | 0.25 | 256MB | 0.10 | 128MB |

### Health Checks

| Service | Command | Interval | Timeout | Retries |
|---------|---------|----------|---------|---------|
| db | `pg_isready` | 10s | 5s | 5 |
| app | `curl /api/health` | 30s | 10s | 3 |
