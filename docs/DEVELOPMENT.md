# Development Guide

This guide covers everything you need to set up a local development environment and contribute to Forja.

---

## Prerequisites

- [Bun](https://bun.sh) 1.x (JavaScript runtime and package manager)
- [PostgreSQL](https://www.postgresql.org/) 16 (database)
- [Tectonic](https://tectonic-typesetting.github.io/) 0.15 (LaTeX compiler — needed for PDF generation)
- Git

### Installing Prerequisites

```bash
# Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# PostgreSQL (macOS via Homebrew)
brew install postgresql@16

# PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql-16

# Tectonic (macOS)
brew install tectonic

# Tectonic (Linux — download binary)
curl -fsSL https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-gnu.tar.gz | tar xz -C /usr/local/bin
```

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Pl3ntz/forja.git
cd forja

# Install dependencies
bun install

# Create environment file
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
DATABASE_URL=postgres://cvbuilder:changeme@localhost:5432/cvbuilder
BETTER_AUTH_SECRET=dev-secret-at-least-32-characters-long-here
BETTER_AUTH_URL=http://localhost:4321
PDF_CONCURRENCY=2
ADMIN_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=localdevpassword
GROQ_API_KEY=            # Optional: get from https://console.groq.com
GOOGLE_CLIENT_ID=        # Optional: Google OAuth
GOOGLE_CLIENT_SECRET=    # Optional: Google OAuth
```

### Database Setup

```bash
# Create the database (if it doesn't exist)
createdb cvbuilder

# Push schema directly (fastest for development)
bun run db:push

# Or use migrations (closer to production)
bun run db:migrate

# Seed with admin and optional demo data
bun run db:seed
```

### Starting Development Servers

You need two terminals:

```bash
# Terminal 1: Vite dev server (frontend with HMR)
bun run dev:client
# → http://localhost:5173

# Terminal 2: Hono server (backend API)
bun run dev:server
# → http://localhost:4321
```

The Vite dev server proxies API requests to the Hono server automatically.

---

## Project Organization

### Frontend (`src/client/`)

The frontend is a standard React SPA:

- **Pages** in `src/client/pages/` — one file per route
- **Components** in `src/client/components/` — reusable UI elements
- **Layouts** in `src/client/layouts/` — page wrappers
- **Hooks** in `src/client/hooks/` — custom React hooks
- **Router** in `src/client/App.tsx` — all route definitions

### Backend (`src/server/`)

The backend is a Hono app:

- **Entry** in `src/server/index.ts` — middleware and route registration
- **Middleware** in `src/server/middleware.ts` — auth, rate limiting
- **API routes** in `src/server/api/` — one file per resource

### Shared (`src/lib/`)

Libraries used by both frontend and backend:

- **Zod schemas** — validation shared between client and server
- **i18n** — translation dictionaries
- **Types** — TypeScript interfaces

### Database (`src/db/`)

- **Schema** in `src/db/schema/` — Drizzle table definitions
- **Migrations** in `src/db/migrations/` — auto-generated SQL
- **Client** in `src/db/schema/index.ts` — DB connection and exports

---

## Common Development Tasks

### Adding a New Page

1. Create `src/client/pages/MyNewPage.tsx`:
   ```tsx
   export default function MyNewPage() {
     return <div>My new page</div>
   }
   ```

2. Add the route in `src/client/App.tsx`:
   ```tsx
   <Route path="/my-page" element={<MyNewPage />} />
   ```

3. Wrap with a layout and/or guard as needed:
   ```tsx
   <Route element={<RequireAuth />}>
     <Route element={<AppLayout />}>
       <Route path="/my-page" element={<MyNewPage />} />
     </Route>
   </Route>
   ```

### Adding a New API Endpoint

1. Create or edit a file in `src/server/api/`:
   ```typescript
   import { Hono } from 'hono'

   const app = new Hono()

   app.get('/my-endpoint', async (c) => {
     const user = c.get('user') // from auth middleware
     return c.json({ data: 'hello' })
   })

   export default app
   ```

2. Mount it in `src/server/index.ts`:
   ```typescript
   import myRoutes from './api/my-routes.js'
   app.route('/api/my', myRoutes)
   ```

3. Add authentication/admin middleware if needed.

### Adding a New CV Section

1. Create a new Drizzle schema in `src/db/schema/`:
   ```typescript
   import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
   import { cvs } from './cvs.js'

   export const cvNewItems = pgTable('cv_new_items', {
     id: uuid('id').defaultRandom().primaryKey(),
     cvId: uuid('cv_id').notNull().references(() => cvs.id, { onDelete: 'cascade' }),
     orderIndex: integer('order_index').notNull().default(0),
     // ... your fields
     createdAt: timestamp('created_at').defaultNow().notNull(),
     updatedAt: timestamp('updated_at').defaultNow().notNull(),
   })
   ```

2. Export from `src/db/schema/index.ts`

3. Update the Zod schema in `src/lib/zod-schemas/cv.ts`

4. Update the TypeScript types in `src/types/cv.ts`

5. Generate and apply migration:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

6. Update the CV CRUD logic in `src/server/api/cv.ts`

7. Create a form component in `src/client/components/`

8. Add the tab to `CvEditorForm.tsx`

### Modifying the Database Schema

```bash
# 1. Edit schema files in src/db/schema/

# 2. Generate migration
bun run db:generate

# 3. Apply migration (production-safe)
bun run db:migrate

# Or push directly in development
bun run db:push
```

### Adding a New Template

1. Create LaTeX files:
   ```
   latex/my-template/
   ├── preamble.tex
   └── template.tex.ejs
   ```

2. Create CSS for preview:
   ```
   src/styles/templates/my-template/
   └── cv-preview.css
   ```

3. Register in `src/lib/templates.ts`:
   ```typescript
   export const TEMPLATE_IDS = ['jake', 'my-template'] as const

   export const TEMPLATES = {
     jake: { ... },
     'my-template': {
       id: 'my-template',
       name: 'My Template',
       description: 'Description here',
       latexDir: 'latex/my-template',
       cssDir: 'src/styles/templates/my-template',
     },
   }
   ```

---

## Testing

```bash
# Run tests once
bun run test

# Watch mode (re-runs on file changes)
bun run test:watch
```

Tests are in the `tests/` directory using [Vitest](https://vitest.dev).

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../src/lib/my-module.js'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

---

## Docker Development

You can also develop with Docker if you prefer:

```bash
# Build and start
docker compose up --build

# Rebuild after code changes
docker compose build && docker compose up -d

# View logs
docker compose logs -f app

# Access database shell
docker compose exec db psql -U cvbuilder -d cvbuilder

# Stop everything
docker compose down
```

---

## Debugging

### Backend

The Hono server runs with `bun --watch` in development, which auto-restarts on file changes.

To add debug logging:
```typescript
console.log('[DEBUG]', someVariable)
```

### Frontend

React DevTools and browser DevTools work normally. The Vite dev server provides fast HMR.

### Database

```bash
# Connect to database
psql $DATABASE_URL

# View tables
\dt

# Check CV data
SELECT id, locale, name FROM cvs WHERE user_id = 'xxx';

# Check migrations status
SELECT * FROM drizzle.__drizzle_migrations;
```

### PDF Generation

```bash
# Generate a test PDF from sample data
bun run build:pdf

# Check if Tectonic is installed
tectonic --version
```

---

## Code Style

- TypeScript strict mode
- No explicit semicolons (handled by formatter)
- Functional components with hooks (no class components)
- Zod for all input validation
- Drizzle ORM for all database access (no raw SQL)
- ESM modules (`.js` extensions in imports)

---

## Environment Variables Reference

See the main [README](../README.md#environment-variables) for the full list.

Quick reference for development:

```env
DATABASE_URL=postgres://cvbuilder:changeme@localhost:5432/cvbuilder
BETTER_AUTH_SECRET=dev-secret-32-chars-minimum-here-please
BETTER_AUTH_URL=http://localhost:4321
PDF_CONCURRENCY=2
ADMIN_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=localdevpassword
SEED_DEMO=true
DEMO_EMAIL=demo@cvbuilder.local
DEMO_PASSWORD=demo12341234
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```
