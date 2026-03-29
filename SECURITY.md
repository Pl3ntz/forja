# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in Forja, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@vitorplentz.com.br**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 48 hours acknowledging receipt. We will work with you to understand and address the issue before any public disclosure.

## Security Measures

This project implements the following security practices:

- **Input validation** — All user input validated with Zod schemas
- **SQL injection prevention** — Parameterized queries via Drizzle ORM
- **LaTeX injection prevention** — Automatic escaping of special characters
- **Authentication** — Better Auth with bcrypt password hashing and httpOnly session cookies
- **Rate limiting** — Per-IP sliding window on all API endpoints
- **File upload validation** — MIME type and magic bytes verification
- **Custom LaTeX safety** — Dangerous commands blocked before compilation

## Responsible Disclosure

We appreciate the security research community and will credit reporters (with permission) once a fix is released.
