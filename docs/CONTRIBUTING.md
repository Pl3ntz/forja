# Contributing to Forja

Thank you for your interest in contributing to Forja! This document provides guidelines for contributing to the project.

---

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/forja.git
   cd forja
   ```
3. Set up your development environment — see [DEVELOPMENT.md](./DEVELOPMENT.md)
4. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

---

## Development Workflow

1. **Pick an issue** or create one describing what you want to work on
2. **Set up locally** — follow [DEVELOPMENT.md](./DEVELOPMENT.md)
3. **Write code** — follow the code style guidelines below
4. **Test** — run `bun run test` to ensure nothing is broken
5. **Build** — run `docker compose build` to verify the Docker build passes
6. **Commit** — write clear commit messages
7. **Push** — push to your fork
8. **Open a PR** — describe your changes and link the issue

---

## Code Style

### General

- TypeScript strict mode throughout
- Functional components with hooks (no class components)
- ESM modules with `.js` extensions in imports (TypeScript compiles to ESM)
- No explicit semicolons

### Frontend

- React 19 with functional components
- Tailwind CSS for styling (no inline styles or CSS modules except for templates)
- Framer Motion for animations
- Form state managed with `useState` hooks

### Backend

- Hono for HTTP routing
- Drizzle ORM for all database access — never write raw SQL
- Zod for input validation on all endpoints
- Better Auth for authentication

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files (components) | PascalCase | `CvEditorForm.tsx` |
| Files (lib/utils) | kebab-case | `latex-escape.ts` |
| Files (DB schema) | kebab-case | `cv-education-items.ts` |
| React components | PascalCase | `function HeaderForm()` |
| Functions | camelCase | `function buildAtsPrompt()` |
| Variables | camelCase | `const cvInput` |
| Constants | SCREAMING_SNAKE | `const TIMEOUT_MS` |
| Types/Interfaces | PascalCase | `type CvInput` |
| DB tables | snake_case | `cv_education_items` |
| API routes | kebab-case | `/api/cv/:cvId/ats-score` |

---

## Validation Rules

- **All user input** must be validated with Zod schemas before processing
- **CV data** has strict limits — check `src/lib/zod-schemas/cv.ts`
- **File uploads** must verify MIME type and magic bytes
- **LaTeX content** must be escaped to prevent injection

---

## Security Guidelines

- Never log sensitive data (passwords, tokens, API keys)
- Always use parameterized queries (Drizzle handles this)
- Escape user content before inserting into LaTeX templates
- Rate limit expensive operations
- Validate file uploads (type, size, magic bytes)

---

## Testing

Run existing tests before submitting:

```bash
bun run test
```

### When to Write Tests

- New utility functions in `src/lib/`
- Bug fixes (write a test that reproduces the bug first)
- Complex logic that could regress

### Test Location

Tests go in the `tests/` directory, named `<module>.test.ts`.

---

## Commit Messages

Write clear, descriptive commit messages:

```
feat: add dark mode support to editor

fix: prevent LaTeX injection in custom sections

docs: update API reference with new endpoints

refactor: extract PDF queue into separate module
```

Prefixes:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code restructuring (no behavior change)
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks (deps, config, etc.)

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Link the related issue if one exists
- Ensure `bun run test` passes
- Ensure `docker compose build` succeeds
- Update documentation if you changed behavior or added features

### PR Description Template

```markdown
## What

Brief description of the change.

## Why

Why this change is needed.

## How

Technical approach taken.

## Testing

How you verified the change works.
```

---

## Areas for Contribution

Here are some areas where contributions are welcome:

### New Templates
- Create new LaTeX templates in `latex/<template-id>/`
- Add corresponding CSS in `src/styles/templates/<template-id>/`
- See [DEVELOPMENT.md](./DEVELOPMENT.md#adding-a-new-template) for details

### Internationalization
- Add new locales beyond `pt` and `en`
- Improve existing translations in `src/lib/i18n/`

### UI/UX Improvements
- Mobile responsiveness
- Accessibility improvements
- New editor features

### Testing
- Increase test coverage (currently unit tests only)
- Add integration tests for API endpoints
- Add E2E tests

### Documentation
- Improve existing docs
- Add tutorials or guides
- Translate documentation

---

## Questions?

If you have questions about contributing, open an issue on GitHub and tag it with the `question` label.

---

Thank you for helping make Forja better!
