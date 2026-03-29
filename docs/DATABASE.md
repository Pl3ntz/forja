# Database Documentation

Forja uses PostgreSQL 16 as its primary database, accessed through Drizzle ORM for type-safe queries.

---

## Overview

| Aspect | Details |
|--------|---------|
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM 0.45 |
| Driver | `postgres` (node-postgres) |
| Migrations | Drizzle Kit auto-generated SQL |
| Config | `drizzle.config.ts` |

---

## Connection

The database connection is configured via the `DATABASE_URL` environment variable:

```
postgres://user:password@host:port/database
```

**Docker Compose:** The app connects to `db:5432` on the internal network.

**Local development:** Connect to `localhost:5432` (or your local PostgreSQL instance).

---

## Schema Overview

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
│    users     │     │     sessions     │     │    accounts       │
│              │────→│                  │     │                   │
│ id (PK)      │     │ userId (FK)      │     │ userId (FK)       │
│ name         │     │ token            │     │ providerId        │
│ email (UQ)   │     │ expiresAt        │     │ accessToken       │
│ role         │     │ ipAddress        │     │ password (hashed) │
│ emailVerified│     │ userAgent        │     └───────────────────┘
└──────┬───────┘     └──────────────────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│     cvs      │
│              │
│ id (PK, uuid)│
│ userId (FK)  │
│ locale       │
│ templateId   │
│ header fields│
│ section titles│
│ customLatex  │
│ customSections│
│ sectionOrder │
└──────┬───────┘
       │
       │ 1:N (each)
       ▼
┌──────────────────────────────────────────────────────┐
│  cv_education_items  │  cv_experience_items          │
│  cv_project_items    │  cv_skill_categories          │
│  cv_language_items   │                               │
│                      │                               │
│  All share:          │                               │
│  - id (uuid PK)     │                               │
│  - cvId (FK, CASCADE)│                               │
│  - orderIndex        │                               │
│  - timestamps        │                               │
└──────────────────────────────────────────────────────┘
```

---

## Table Definitions

### `users`

Better Auth managed table for user accounts.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image         TEXT,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Roles:**
- `user` — Default role, can manage own CVs
- `admin` — Can access admin dashboard and manage all users

**Auto-promotion:** When `ADMIN_EMAIL` env var is set, users with that email are automatically promoted to admin on registration or session creation.

---

### `sessions`

Better Auth managed table for active sessions.

```sql
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMP NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### `accounts`

Better Auth managed table for auth providers.

```sql
CREATE TABLE accounts (
  id                        TEXT PRIMARY KEY,
  user_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id                TEXT NOT NULL,
  provider_id               TEXT NOT NULL,
  access_token              TEXT,
  refresh_token             TEXT,
  access_token_expires_at   TIMESTAMP,
  refresh_token_expires_at  TIMESTAMP,
  scope                     TEXT,
  password                  TEXT,      -- bcrypt hashed
  created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### `verifications`

Better Auth managed table for email verification tokens.

```sql
CREATE TABLE verifications (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### `cvs`

Main CV record containing header info and section titles.

```sql
CREATE TABLE cvs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale            TEXT NOT NULL DEFAULT 'pt',
  template_id       TEXT NOT NULL DEFAULT 'jake',
  pdf_filename      TEXT,
  name              TEXT NOT NULL DEFAULT '',
  location          TEXT NOT NULL DEFAULT '',
  phone             TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL DEFAULT '',
  linkedin          TEXT NOT NULL DEFAULT '',
  github            TEXT NOT NULL DEFAULT '',
  summary_title     TEXT NOT NULL DEFAULT '',
  summary_text      TEXT NOT NULL DEFAULT '',
  education_title   TEXT NOT NULL DEFAULT '',
  experience_title  TEXT NOT NULL DEFAULT '',
  projects_title    TEXT NOT NULL DEFAULT '',
  skills_title      TEXT NOT NULL DEFAULT '',
  languages_title   TEXT NOT NULL DEFAULT '',
  custom_latex      TEXT,
  custom_sections   JSONB,
  section_order     JSONB,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON cvs (user_id, locale);
CREATE INDEX ON cvs (user_id);
```

---

### `cv_education_items`

```sql
CREATE TABLE cv_education_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id        UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  institution  TEXT NOT NULL DEFAULT '',
  degree       TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',
  highlights   TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON cv_education_items (cv_id);
```

---

### `cv_experience_items`

```sql
CREATE TABLE cv_experience_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id        UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  company      TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',
  highlights   TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON cv_experience_items (cv_id);
```

---

### `cv_project_items`

```sql
CREATE TABLE cv_project_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id        UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  name         TEXT NOT NULL DEFAULT '',
  tech         TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL DEFAULT '',
  highlights   TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON cv_project_items (cv_id);
```

---

### `cv_skill_categories`

```sql
CREATE TABLE cv_skill_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id        UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  name         TEXT NOT NULL DEFAULT '',
  values       TEXT NOT NULL DEFAULT '',   -- comma-separated skill names
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON cv_skill_categories (cv_id);
```

---

### `cv_language_items`

```sql
CREATE TABLE cv_language_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id        UUID NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  name         TEXT NOT NULL DEFAULT '',
  level        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ON cv_language_items (cv_id);
```

---

## Cascade Behavior

```
DELETE user → CASCADE to:
  ├── sessions (deleted)
  ├── accounts (deleted)
  └── cvs (deleted) → CASCADE to:
       ├── cv_education_items (deleted)
       ├── cv_experience_items (deleted)
       ├── cv_project_items (deleted)
       ├── cv_skill_categories (deleted)
       └── cv_language_items (deleted)
```

Deleting a user removes all their data automatically.

---

## Transaction Pattern

CV updates use database transactions to ensure atomicity:

```typescript
await db.transaction(async (tx) => {
  // 1. Update CV header fields
  await tx.update(cvs).set({ ...headerData }).where(eq(cvs.id, cvId))

  // 2. Delete all existing items
  await tx.delete(cvEducationItems).where(eq(cvEducationItems.cvId, cvId))
  await tx.delete(cvExperienceItems).where(eq(cvExperienceItems.cvId, cvId))
  // ... same for projects, skills, languages

  // 3. Insert new items with orderIndex
  if (educationItems.length > 0) {
    await tx.insert(cvEducationItems).values(educationItems)
  }
  // ... same for other item types
})
```

This ensures either all changes apply or none do — no partial updates.

---

## Migration Management

Migrations are managed by Drizzle Kit:

```bash
# After modifying schema files, generate a migration
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Push schema directly (development only — no migration file)
bun run db:push
```

Migration files are stored in `src/db/migrations/` and committed to git.

---

## Seeding

The seed script (`scripts/seed.ts`) is idempotent — safe to run multiple times.

It creates:
1. **Admin user** — using `ADMIN_EMAIL` and `ADMIN_SEED_PASSWORD` env vars
2. **Demo user** (optional) — using `DEMO_EMAIL` and `DEMO_PASSWORD` when `SEED_DEMO=true`
3. **Sample CVs** — from `data/cv.pt.yaml` and `data/cv.en.yaml` for the demo user

The seed runs automatically on container startup via `docker-entrypoint.sh`.

---

## Performance Notes

- **Indexes** on all foreign keys for fast joins
- **UUID v4** primary keys (random) — no sequential ID exposure
- **Unique constraint** on `(userId, locale)` prevents duplicate CVs per language
- **Connection pooling** handled by the `postgres` driver
- **Parameterized queries** via Drizzle ORM — no SQL injection risk
