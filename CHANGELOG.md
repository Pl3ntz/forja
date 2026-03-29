# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2025-02-24

### Added
- Full migration from Astro/Preact to React 19 + React Router 7
- Hono backend replacing Astro API routes
- Custom CV sections with drag-and-drop reordering
- Clone and translate CV to another language via Groq AI
- ATS score analysis with per-section feedback and suggestions
- PDF import — upload existing resume and auto-fill all fields
- In-memory ATS score cache (5min TTL) for faster repeated analysis
- Admin dashboard with user management, stats, and session viewing
- Rate limiting on auth and API endpoints
- Public CV sharing via SSR route
- Comprehensive documentation (Architecture, API, AI, Database, Deployment, Development, Contributing)

### Changed
- Frontend: React 19 SPA with Tailwind CSS 4, Framer Motion 12
- Backend: Hono 4.7 on Bun runtime
- Groq client optimized: compact JSON, stripped unused fields, 30s timeout, concise prompts
- Editor auto-save debounce increased to 1.5s
- Preview debounce at 300ms

### Removed
- Astro framework and all `.astro` files
- Preact and Preact Signals dependencies
- Legacy Astro middleware and API route structure

## [0.1.0] - 2025-01-15

### Added
- Initial Forja MVP
- Split-pane editor with real-time HTML preview
- LaTeX PDF generation via Tectonic (XeTeX)
- Jake Gutierrez resume template
- Email/password authentication with Better Auth
- PostgreSQL database with Drizzle ORM
- Multi-language support (Portuguese, English)
- Docker Compose deployment with health checks
- Zod validation on all inputs
- LaTeX injection protection
