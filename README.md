# Forja

A modern open-source platform for building, managing, and generating professional CVs/resumes with a real-time split-pane editor, LaTeX-powered PDF generation, AI-powered ATS scoring, and multi-language support.

[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![Hono](https://img.shields.io/badge/Hono-4.7-orange)](https://hono.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-lightblue)](https://www.docker.com)
[![Bun](https://img.shields.io/badge/Bun-1.x-black)](https://bun.sh)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.4-green)](https://betterauth.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/Pl3ntz/forja/actions/workflows/ci.yml/badge.svg)](https://github.com/Pl3ntz/forja/actions/workflows/ci.yml)

> **Complete documentation:** [Architecture](./docs/ARCHITECTURE.md) | [API Reference](./docs/API.md) | [AI Features](./docs/AI.md) | [Database](./docs/DATABASE.md) | [Deployment](./docs/DEPLOYMENT.md) | [Development](./docs/DEVELOPMENT.md) | [Contributing](./docs/CONTRIBUTING.md)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [AI Features (Groq)](#ai-features-groq)
- [PDF Generation Pipeline](#pdf-generation-pipeline)
- [Templates](#templates)
- [Internationalization (i18n)](#internationalization-i18n)
- [Testing](#testing)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Split-Pane CV Editor
- Real-time HTML preview on the right, form editor on the left
- Tabbed sections: Header, Summary, Education, Experience, Projects, Skills, Languages
- Custom sections support with drag-and-drop reordering
- Auto-save with 1.5s debounce and save status indicator
- Multiple CVs per user with locale selection

### LaTeX PDF Generation
- Professional PDFs compiled with [Tectonic](https://tectonic-typesetting.github.io/) (XeTeX-compatible)
- Based on the popular Jake Gutierrez Resume template
- Concurrency-controlled queue (p-queue) to prevent server overload
- Automatic LaTeX injection protection with character escaping
- Custom LaTeX source editing for advanced users

### AI-Powered Features (Groq)
- **ATS Score Analysis** — Scores your CV 0-100 for ATS compatibility (Workday, Greenhouse, Lever, iCIMS) with per-section feedback and actionable suggestions
- **PDF Import** — Upload an existing PDF resume and let AI extract all structured data into editable form fields
- **Clone & Translate** — Clone a CV and translate it to another language with one click
- In-memory cache (5min TTL) for ATS scores to avoid redundant API calls

### Authentication & Authorization
- Email/password authentication via Better Auth
- Database-backed sessions with IP and User-Agent tracking
- Role system (`user` / `admin`) with auto-promotion via `ADMIN_EMAIL`
- Per-route rate limiting (in-memory, sliding window)

### Admin Dashboard
- User statistics (total users, CVs, active sessions)
- Paginated user list with management capabilities
- Promote/demote admin roles, view user CVs and sessions
- Delete users with cascade

### Multi-Language Support
- Portuguese (PT-BR) and English (EN)
- Per-CV locale selection with translated section titles
- i18n system for UI labels and form placeholders

### Security
- Input validation with Zod schemas on all endpoints
- Parameterized SQL queries (Drizzle ORM) against injection
- LaTeX character escaping against template injection
- Rate limiting on auth and API routes
- httpOnly session cookies

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19 | UI components |
| | React Router | 7.2 | Client-side routing |
| | Tailwind CSS | 4.1 | Styling |
| | Framer Motion | 12 | Animations |
| | Lucide React | 0.475 | Icons |
| | Vite | 6.2 | Build tool / dev server |
| **Backend** | Hono | 4.7 | HTTP framework |
| | Bun | 1.x | JavaScript runtime |
| | Better Auth | 1.4 | Authentication |
| | Drizzle ORM | 0.45 | Type-safe database ORM |
| **Database** | PostgreSQL | 16 | Relational database |
| **PDF** | Tectonic | 0.15 | XeTeX LaTeX compiler |
| | EJS | 3.1 | LaTeX template engine |
| | p-queue | 9.1 | Concurrency queue |
| **AI** | Groq (Llama 3.3) | 70b-versatile | CV parsing, ATS scoring, translation |
| **Validation** | Zod | 4.3 | Schema validation |
| **Infra** | Docker | Latest | Containerization |
| | Traefik | Latest | Reverse proxy (production) |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose (recommended)
- Or for local development: [Bun](https://bun.sh) 1.x, PostgreSQL 16, [Tectonic](https://tectonic-typesetting.github.io/) 0.15

### With Docker Compose (recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Pl3ntz/forja.git
cd forja

# 2. Configure environment variables
cp .env.example .env
# Edit .env — at minimum set BETTER_AUTH_SECRET and POSTGRES_PASSWORD

# 3. Generate a secure auth secret
openssl rand -hex 32
# Paste the output as BETTER_AUTH_SECRET in .env

# 4. Start the application
docker compose up -d

# 5. Access at http://localhost:4321
```

The Docker entrypoint automatically:
1. Waits for PostgreSQL to be ready (up to 10 retries)
2. Runs database migrations
3. Seeds the admin user (if `ADMIN_EMAIL` is set)
4. Starts the application

### Local Development (without Docker)

```bash
# 1. Clone and install
git clone https://github.com/Pl3ntz/forja.git
cd forja
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env with your local PostgreSQL connection string

# 3. Set up the database
bun run db:push          # Push schema directly (dev mode)
bun run db:seed          # Optional: create admin + demo user

# 4. Start dev servers (run in separate terminals)
bun run dev:client       # Vite dev server on port 5173
bun run dev:server       # Hono server on port 4321
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `POSTGRES_USER` | Docker | `cvbuilder` | PostgreSQL user (Docker Compose) |
| `POSTGRES_PASSWORD` | Docker | — | PostgreSQL password (Docker Compose) |
| `POSTGRES_DB` | Docker | `cvbuilder` | PostgreSQL database name (Docker Compose) |
| `BETTER_AUTH_SECRET` | Yes | — | Auth secret key (min 32 random chars). Generate with `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Yes | — | Base URL of the app (`http://localhost:4321` for dev) |
| `PDF_CONCURRENCY` | No | `2` | Max simultaneous LaTeX compilations |
| `ADMIN_EMAIL` | No | — | Email that auto-receives admin role on registration |
| `ADMIN_SEED_PASSWORD` | No | — | Password for the seeded admin user |
| `SEED_DEMO` | No | `false` | Set to `true` to create a demo user with sample CVs |
| `DEMO_EMAIL` | No | `demo@cvbuilder.local` | Demo user email |
| `DEMO_PASSWORD` | No | `demo12341234` | Demo user password |
| `GROQ_API_KEY` | No | — | Groq API key for AI features. Get one free at [Groq Console](https://console.groq.com) |
| `HOST` | No | `0.0.0.0` | Server bind address |
| `PORT` | No | `4321` | Server port |

### Example `.env`

```env
DATABASE_URL=postgres://cvbuilder:changeme@localhost:5432/cvbuilder
BETTER_AUTH_SECRET=your-secret-key-at-least-32-chars-long
BETTER_AUTH_URL=http://localhost:4321
PDF_CONCURRENCY=2
ADMIN_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=change-me-on-first-deploy
GROQ_API_KEY=your-groq-api-key
```

---

## Project Structure

```
forja/
├── src/
│   ├── client/                    # React frontend (SPA)
│   │   ├── pages/                 # Page components
│   │   │   ├── HomePage.tsx       # Landing page
│   │   │   ├── LoginPage.tsx      # Login
│   │   │   ├── RegisterPage.tsx   # Registration
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── DashboardPage.tsx  # CV management dashboard
│   │   │   ├── EditorPage.tsx     # Split-pane CV editor
│   │   │   ├── SettingsPage.tsx   # User settings
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── AdminUsersPage.tsx
│   │   │   ├── AdminUserDetailPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── components/            # Reusable UI components
│   │   │   ├── CvEditorForm.tsx   # Main editor orchestrator
│   │   │   ├── HeaderForm.tsx     # Contact info form
│   │   │   ├── SummaryForm.tsx    # Professional summary
│   │   │   ├── EducationForm.tsx  # Education section
│   │   │   ├── ExperienceForm.tsx # Work experience
│   │   │   ├── ProjectsForm.tsx   # Projects portfolio
│   │   │   ├── SkillsForm.tsx     # Skills by category
│   │   │   ├── LanguagesForm.tsx  # Languages spoken
│   │   │   ├── CustomSectionForm.tsx # Custom user sections
│   │   │   ├── AtsScoreGauge.tsx  # Circular ATS score visualization
│   │   │   ├── LoginForm.tsx      # Login form
│   │   │   ├── RegisterForm.tsx   # Registration form
│   │   │   ├── SettingsForm.tsx   # Profile/password management
│   │   │   ├── UserMenu.tsx       # User dropdown menu
│   │   │   ├── Brand.tsx          # Logo and branding
│   │   │   └── Logo.tsx           # Logo SVG
│   │   ├── layouts/               # Layout wrappers
│   │   │   ├── AppLayout.tsx      # Authenticated pages (navbar)
│   │   │   ├── AuthLayout.tsx     # Auth pages (centered form)
│   │   │   └── EditorLayout.tsx   # Full-screen editor
│   │   ├── hooks/
│   │   │   └── useAuth.ts         # Auth context and hooks
│   │   ├── App.tsx                # Router configuration
│   │   └── main.tsx               # Entry point
│   ├── server/                    # Hono backend
│   │   ├── index.ts               # App setup, middleware, route mounting
│   │   ├── middleware.ts          # Rate limiting, auth, admin guards
│   │   └── api/
│   │       ├── auth.ts            # Better Auth route handler
│   │       ├── cv.ts              # CV CRUD, PDF, preview, AI features
│   │       ├── admin.ts           # Admin dashboard and user management
│   │       ├── health.ts          # Database health check
│   │       └── public-cv.ts       # Public CV viewing (SSR)
│   ├── db/
│   │   ├── schema/
│   │   │   ├── users.ts           # users, sessions, accounts, verifications
│   │   │   ├── cvs.ts             # cvs table
│   │   │   ├── cv-education-items.ts
│   │   │   ├── cv-experience-items.ts
│   │   │   ├── cv-project-items.ts
│   │   │   ├── cv-skill-categories.ts
│   │   │   ├── cv-language-items.ts
│   │   │   └── index.ts           # Schema exports and DB client
│   │   └── migrations/            # Drizzle auto-generated SQL migrations
│   ├── lib/
│   │   ├── auth.ts                # Better Auth server config
│   │   ├── auth-client.ts         # Client-side auth helpers
│   │   ├── ai-client.ts           # Groq AI: parse PDF, ATS score, translate
│   │   ├── pdf-generator.ts       # PDF generation orchestrator
│   │   ├── pdf-queue.ts           # p-queue concurrency instance
│   │   ├── preview-renderer.ts    # HTML preview generation
│   │   ├── latex-escape.ts        # LaTeX special character escaping
│   │   ├── cv-to-data.ts          # DB rows → CvData type conversion
│   │   ├── load-cv.ts             # Load CV + items from database
│   │   ├── form-defaults.ts       # Default form values per locale
│   │   ├── templates.ts           # Template registry (jake)
│   │   ├── locales.ts             # Supported locales config
│   │   ├── rate-limit.ts          # In-memory rate limiter
│   │   ├── validation.ts          # Shared validation helpers
│   │   ├── i18n/
│   │   │   ├── pt.ts              # Portuguese translations
│   │   │   ├── en.ts              # English translations
│   │   │   └── index.ts           # getTranslations() helper
│   │   └── zod-schemas/
│   │       ├── cv.ts              # CV input validation schema
│   │       └── ats-score.ts       # ATS response validation schema
│   ├── types/
│   │   └── cv.ts                  # CvData TypeScript interfaces
│   └── styles/
│       ├── global.css             # Tailwind config, custom colors, fonts
│       └── templates/
│           └── jake/              # Jake template CSS for HTML preview
├── scripts/
│   ├── generate-tex.ts            # CvData → LaTeX source via EJS
│   ├── compile-pdf.ts             # LaTeX → PDF via Tectonic
│   ├── build-all.ts               # Build all example PDFs
│   ├── seed.ts                    # Database seeding (admin + demo)
│   └── validate.ts                # YAML data validation
├── latex/
│   └── jake/                      # Jake template LaTeX files
│       ├── preamble.tex           # LaTeX packages and formatting
│       └── template.tex.ejs       # EJS template for CV rendering
├── data/
│   ├── cv.pt.yaml                 # Sample CV in Portuguese
│   ├── cv.en.yaml                 # Sample CV in English
│   └── ui.yaml                    # UI configuration
├── tests/
│   ├── latex-escape.test.ts       # LaTeX escaping tests
│   ├── generate-tex.test.ts       # LaTeX generation tests
│   └── validate.test.ts           # YAML validation tests
├── public/                        # Static assets
├── Dockerfile                     # Multi-stage build (Bun + Tectonic)
├── docker-compose.yml             # PostgreSQL + App orchestration
├── docker-entrypoint.sh           # Container startup (migrate + seed + start)
├── drizzle.config.ts              # Drizzle ORM configuration
├── vite.config.ts                 # Vite build configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies and scripts
```

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React SPA)                       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Pages   │  │  Forms   │  │ Layouts  │  │  Auth Context  │  │
│  │ (Router) │  │(Editor)  │  │          │  │   (useAuth)    │  │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └───────────────┘  │
│       │              │                                          │
│       └──────┬───────┘                                          │
│              │ fetch()                                          │
└──────────────┼──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Server (Hono on Bun)                         │
│                                                                  │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  Middleware  │  │   API Routes   │  │    Static Serving    │  │
│  │ Rate Limit  │  │ /api/auth      │  │ dist/client/*        │  │
│  │ Auth Guard  │  │ /api/cv        │  │ SPA fallback         │  │
│  │ Admin Guard │  │ /api/admin     │  └──────────────────────┘  │
│  └─────────────┘  │ /api/health    │                            │
│                    │ /cv (public)   │                            │
│                    └───────┬────────┘                            │
│                            │                                     │
│  ┌─────────────────────────┼──────────────────────────────────┐  │
│  │                    Libraries                                │  │
│  │  ┌────────────┐  ┌─────┴──────┐  ┌─────────────────────┐  │  │
│  │  │  Groq AI   │  │  Drizzle   │  │   PDF Generator     │  │  │
│  │  │ Parse PDF  │  │    ORM     │  │ EJS → LaTeX → PDF   │  │  │
│  │  │ ATS Score  │  │            │  │ (Tectonic + Queue)  │  │  │
│  │  │ Translate  │  │            │  │                     │  │  │
│  │  └────────────┘  └─────┬──────┘  └─────────────────────┘  │  │
│  └─────────────────────────┼──────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  PostgreSQL 16   │
                    │                  │
                    │  users, sessions │
                    │  cvs, cv_items   │
                    └──────────────────┘
```

### Request Flow

1. **Client** makes `fetch()` requests to `/api/*` endpoints
2. **Rate Limiting** middleware checks request count per IP
3. **Auth Middleware** validates session cookie via Better Auth
4. **Route Handler** processes request (CRUD, PDF generation, AI analysis)
5. **Drizzle ORM** executes parameterized queries against PostgreSQL
6. **Response** returned as JSON (API) or binary (PDF)

### Authentication Flow

```
Register/Login → Better Auth validates → Session created in DB
                                        → httpOnly cookie set
                                        → 5-min cookie cache

Each request → Cookie sent → Middleware checks session
             → If ADMIN_EMAIL matches → role = 'admin'
             → Attach user to request context
```

### Auto-Save + Preview Flow

```
User types in form
  ↓
React state update
  ↓ (300ms debounce)
POST /api/cv/:cvId/preview → HTML rendered → Preview iframe updated
  ↓ (1.5s debounce)
PUT /api/cv/:cvId → Zod validation → DB transaction
  ↓                                   (update header + delete/insert items)
Save status: idle → saving → saved
```

---

## API Reference

### Authentication

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/auth/sign-up` | Register new user | No |
| `POST` | `/api/auth/sign-in` | Login | No |
| `POST` | `/api/auth/sign-out` | Logout | Yes |
| `GET` | `/api/auth/session` | Get current session | Yes |

### CV Management

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/cv/` | List all user CVs | Yes |
| `POST` | `/api/cv/` | Create new CV | Yes |
| `GET` | `/api/cv/:cvId` | Get CV with all data | Yes |
| `PUT` | `/api/cv/:cvId` | Update entire CV (atomic) | Yes |
| `DELETE` | `/api/cv/:cvId` | Delete CV | Yes |

### CV Processing

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/api/cv/:cvId/preview` | Generate HTML preview | Yes |
| `POST` | `/api/cv/:cvId/pdf` | Generate and download PDF | Yes |
| `POST` | `/api/cv/:cvId/latex` | Get LaTeX source code | Yes |
| `GET` | `/api/cv/sample-preview` | Preview sample CV | Yes |

### AI Features

| Method | Route | Description | Auth | Rate Limit |
|--------|-------|-------------|------|------------|
| `POST` | `/api/cv/:cvId/ats-score` | ATS compatibility analysis | Yes | 10/hour |
| `POST` | `/api/cv/:cvId/import` | Import data from existing PDF | Yes | 5/hour |
| `POST` | `/api/cv/import-pdf` | Upload PDF → create CV | Yes | 5/hour |
| `POST` | `/api/cv/:cvId/clone-translate` | Clone CV to another language | Yes | 5/hour |

### Admin

| Method | Route | Description | Auth | Role |
|--------|-------|-------------|------|------|
| `GET` | `/api/admin/stats` | Dashboard statistics | Yes | Admin |
| `GET` | `/api/admin/users` | Paginated user list | Yes | Admin |
| `GET` | `/api/admin/users/:userId` | User details + CVs + sessions | Yes | Admin |
| `PATCH` | `/api/admin/users/:userId` | Update user role/name | Yes | Admin |
| `DELETE` | `/api/admin/users/:userId` | Delete user (cascade) | Yes | Admin |

### Utility

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/health` | Database connectivity check | No |
| `GET` | `/cv/:userId/:cvId` | Public CV view (SSR HTML) | No |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/sign-up` | 5 requests / minute / IP |
| `POST /api/auth/sign-in` | 10 requests / minute / IP |
| `POST /api/cv/*` | 20 requests / minute / IP |
| ATS score | 10 requests / hour / user |
| PDF import | 5 requests / hour / user |
| Clone/translate | 5 requests / hour / user |

---

## Database Schema

### Entity Relationship

```
users 1──N sessions
users 1──N accounts
users 1──N cvs

cvs 1──N cv_education_items
cvs 1──N cv_experience_items
cvs 1──N cv_project_items
cvs 1──N cv_skill_categories
cvs 1──N cv_language_items
```

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | text | PK |
| name | text | |
| email | text | UNIQUE |
| emailVerified | boolean | default: false |
| image | text | nullable |
| role | text | `'user'` or `'admin'`, default: `'user'` |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | text | PK |
| userId | text | FK → users (CASCADE) |
| token | text | UNIQUE |
| expiresAt | timestamp | |
| ipAddress | text | nullable |
| userAgent | text | nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

#### `cvs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, random |
| userId | text | FK → users (CASCADE) |
| locale | text | `'pt'` or `'en'` |
| templateId | text | default: `'jake'` |
| name, location, phone, email, linkedin, github | text | Header fields |
| summaryTitle, summaryText | text | Summary section |
| educationTitle, experienceTitle, projectsTitle, skillsTitle, languagesTitle | text | Section titles |
| customLatex | text | nullable, max 100KB |
| customSections | jsonb | nullable, custom user sections |
| sectionOrder | jsonb | nullable, ordered section keys |
| pdfFilename | text | nullable |
| createdAt, updatedAt | timestamp | |

**Indexes:** `UNIQUE(userId, locale)`, `INDEX(userId)`

#### CV Item Tables

All item tables share: `id (uuid PK)`, `cvId (uuid FK → cvs CASCADE)`, `orderIndex (int)`, `createdAt`, `updatedAt`

| Table | Extra Columns |
|-------|--------------|
| `cv_education_items` | institution, degree, date, location, highlights[] |
| `cv_experience_items` | company, role, date, location, highlights[] |
| `cv_project_items` | name, tech, date, highlights[] |
| `cv_skill_categories` | name, values (comma-separated) |
| `cv_language_items` | name, level |

---

## AI Features (Groq)

All AI features use **Llama 3.3 70B** via Groq with `json_object` response format and Zod schema validation.

### ATS Score Analysis

Evaluates your CV for compatibility with major Applicant Tracking Systems (Workday, Greenhouse, Lever, iCIMS).

**Returns:**
- Overall score (0-100)
- Per-section scores: header, summary, experience, education, skills, projects, languages, general
- 3-7 actionable suggestions with priority levels (`critical` / `recommended` / `optional`)

**Optimizations:**
- `temperature: 0` for deterministic results
- In-memory cache with SHA-256 key and 5-minute TTL
- Strips `customLatex` and `templateId` from input (saves tokens)
- Compact JSON serialization (no pretty-print)
- 30-second timeout

### PDF Import

Upload an existing PDF resume. Text is extracted locally via `pdf-parse`, then the AI structures all data into the CV format:
- Auto-detects language (Portuguese or English)
- Extracts: contact info, summary, education, experience, projects, skills, languages
- Populates all form fields automatically

**Limits:** 5MB max file size, PDF magic bytes validation

### Clone & Translate

Clones an existing CV and translates it to the target language:
- Translates: section titles, summary, highlights, job titles, degrees, skill names, language levels
- Preserves: proper names, companies, URLs, emails, phones, tech names (React, Python, etc.)

---

## PDF Generation Pipeline

```
CV Data (from DB or form)
  ↓
generate-tex.ts — Renders LaTeX using EJS template
  ↓
latex-escape.ts — Escapes special chars: \ $ & % # _ { } ~ ^
  ↓
pdf-queue.ts — Enqueues in p-queue (max concurrency from PDF_CONCURRENCY)
  ↓
compile-pdf.ts — Creates temp dir, writes .tex files, runs Tectonic
  ↓
tectonic cv.tex — XeTeX compilation (60s timeout)
  ↓
PDF Buffer returned → sent as download response
  ↓
Temp directory cleaned up
```

**Custom LaTeX:** Users can edit LaTeX source directly. A safety check blocks dangerous commands (`\write18`, `\openin`, `\openout`, etc.) before compilation.

---

## Templates

Currently one template is available:

| ID | Name | Description |
|----|------|-------------|
| `jake` | Jake's Resume | Clean single-column resume. Popular on Overleaf. |

Templates are defined in `src/lib/templates.ts` and consist of:
- **LaTeX files** in `latex/<template-id>/` — `preamble.tex` + `template.tex.ejs`
- **CSS files** in `src/styles/templates/<template-id>/` — for HTML preview styling

### Adding a New Template

1. Create `latex/<new-id>/preamble.tex` and `template.tex.ejs`
2. Create `src/styles/templates/<new-id>/` with preview CSS
3. Add the template ID to `TEMPLATE_IDS` in `src/lib/templates.ts`
4. Add the template config to the `TEMPLATES` object

---

## Internationalization (i18n)

### Supported Locales

| Code | Label | Default |
|------|-------|---------|
| `pt` | Portugues | Yes |
| `en` | English | |

### How it Works

- Translation dictionaries live in `src/lib/i18n/pt.ts` and `src/lib/i18n/en.ts`
- Each dictionary maps section names to field labels (e.g., `header.name`, `education.sectionTitle`)
- `getTranslations(locale)` returns the appropriate dictionary
- `getFormDefaults(locale)` provides locale-appropriate default section titles
- Each CV stores its own `locale` field — users can have multiple CVs in different languages

### What Gets Translated

- **UI elements:** Form labels, button text, placeholders, hints
- **Section titles:** Default titles per locale (e.g., "Experiencia Profissional" vs "Experience")
- **AI translation:** Full content translation via Groq when cloning CVs

---

## Testing

Framework: [Vitest](https://vitest.dev)

```bash
bun run test           # Run tests once
bun run test:watch     # Watch mode
```

### Test Files

| File | Tests |
|------|-------|
| `tests/latex-escape.test.ts` | LaTeX special character escaping |
| `tests/generate-tex.test.ts` | LaTeX generation from CV data |
| `tests/validate.test.ts` | YAML data validation against schemas |

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev:client` | Start Vite dev server (port 5173) |
| `bun run dev:server` | Start Hono server with watch mode (port 4321) |
| `bun run build` | Production build (Vite) |
| `bun run build:pdf` | Generate example PDFs from sample data |
| `bun run start` | Start production server |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |
| `bun run spell` | Spell-check YAML data files |
| `bun run validate` | Validate CV YAML data against schemas |
| `bun run db:generate` | Generate Drizzle migrations from schema changes |
| `bun run db:migrate` | Apply pending database migrations |
| `bun run db:push` | Push schema directly to DB (dev only, no migration files) |
| `bun run db:seed` | Seed database with admin and optional demo user |

---

## Deployment

### Docker Production Build

The `Dockerfile` uses a multi-stage build:

1. **Build stage** (`oven/bun:1`):
   - Installs Tectonic binary (architecture-aware: ARM64 / x86_64)
   - Installs system dependencies (fontconfig, harfbuzz, ICU)
   - Runs `bun install` and `bunx vite build`

2. **Production stage** (`oven/bun:1-slim`):
   - Minimal image with only runtime dependencies
   - Copies compiled assets, Tectonic binary, source code
   - Exposes port 4321

### Docker Compose Services

| Service | Image | Resources | Purpose |
|---------|-------|-----------|---------|
| `db` | `postgres:16-alpine` | 0.25 CPU, 256MB | Database |
| `app` | Built from Dockerfile | 0.50 CPU, 1GB | Application |

### Production with Traefik

The `docker-compose.yml` includes Traefik labels for automatic HTTPS:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.forja.rule=Host(`your-domain.com`)"
  - "traefik.http.routers.forja.entrypoints=https"
  - "traefik.http.routers.forja.tls.certresolver=letsencrypt"
```

### Health Checks

- **Database:** `pg_isready` every 10s
- **Application:** `curl /api/health` every 30s
- Auto-restart on failure (`restart: unless-stopped`)

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `bun run test`
5. Ensure Docker build passes: `docker compose build`
6. Commit your changes: `git commit -m 'Add my feature'`
7. Push to the branch: `git push origin feature/my-feature`
8. Open a Pull Request

### Development Guidelines

- Validate all input with Zod schemas
- Use Drizzle ORM for all database queries (never raw SQL)
- Escape user content before inserting into LaTeX templates
- Add tests for new utilities in `tests/`
- Follow the existing code style (TypeScript strict, no semicolons implied by Prettier)

---

## License

MIT

---

Made with care by [@Pl3ntz](https://github.com/Pl3ntz)
