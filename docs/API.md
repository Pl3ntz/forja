# API Reference

Complete API documentation for Forja. All endpoints return JSON unless otherwise noted.

---

## Base URL

- **Development:** `http://localhost:4321`
- **Production:** `https://your-domain.com`

## Authentication

Most endpoints require authentication via session cookie. The cookie is set automatically by Better Auth on login.

**Unauthenticated requests** to protected endpoints receive:
```json
{ "error": "Unauthorized" }
```
**Status:** `401`

**Non-admin requests** to admin endpoints receive:
```json
{ "error": "Forbidden" }
```
**Status:** `403`

---

## Auth Endpoints

### `POST /api/auth/sign-up`

Register a new user account.

**Rate limit:** 5 requests / minute / IP

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:** `200 OK` — Session created, cookie set.

---

### `POST /api/auth/sign-in`

Log in with email and password.

**Rate limit:** 10 requests / minute / IP

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK` — Session cookie set.

---

### `POST /api/auth/sign-out`

Log out and invalidate session.

**Auth:** Required

**Response:** `200 OK` — Cookie cleared.

---

### `GET /api/auth/session`

Get current session and user info.

**Auth:** Required

**Response:**
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "emailVerified": false
  },
  "session": {
    "id": "sess_123",
    "expiresAt": "2025-04-01T00:00:00Z"
  }
}
```

---

## CV Endpoints

All CV endpoints require authentication.

**Rate limit:** 20 requests / minute / IP for POST operations.

### `GET /api/cv/`

List all CVs belonging to the authenticated user.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-here",
    "locale": "pt",
    "templateId": "jake",
    "name": "John Doe",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-02T00:00:00Z"
  }
]
```

---

### `POST /api/cv/`

Create a new CV.

**Request body:**
```json
{
  "locale": "pt",
  "templateId": "jake"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-of-new-cv"
}
```

---

### `GET /api/cv/:cvId`

Get full CV data including all items (education, experience, projects, skills, languages).

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "locale": "pt",
  "templateId": "jake",
  "header": {
    "name": "John Doe",
    "location": "Sao Paulo, Brazil",
    "phone": "+55 11 99999-9999",
    "email": "john@example.com",
    "linkedin": "linkedin.com/in/john",
    "github": "github.com/john"
  },
  "summary": {
    "title": "Resumo Profissional",
    "text": "..."
  },
  "education": {
    "title": "Formacao Academica",
    "items": [
      {
        "institution": "USP",
        "degree": "Computer Science",
        "date": "2020 - 2024",
        "location": "Sao Paulo",
        "highlights": ["Dean's list"]
      }
    ]
  },
  "experience": { "title": "...", "items": [...] },
  "projects": { "title": "...", "items": [...] },
  "skills": { "title": "...", "categories": [...] },
  "languages": { "title": "...", "items": [...] }
}
```

---

### `PUT /api/cv/:cvId`

Update an entire CV. This is an atomic operation — all items are replaced within a database transaction.

**Request body:** Full CV data (same structure as GET response). Validated with Zod schema.

**Response:** `200 OK`
```json
{ "success": true }
```

**Validation errors:** `400 Bad Request` with Zod error details.

---

### `DELETE /api/cv/:cvId`

Delete a CV and all its associated items (cascade).

**Response:** `200 OK`
```json
{ "success": true }
```

---

### `POST /api/cv/:cvId/preview`

Generate an HTML preview of the CV.

**Request body:** Full CV data.

**Response:** `200 OK` — HTML string in response body.

---

### `POST /api/cv/:cvId/pdf`

Generate a PDF from the CV data.

**Request body (optional):**
```json
{
  "customLatex": "\\documentclass{article}..."
}
```

**Response:** `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="cv.pdf"`
- Body: PDF binary data

**Errors:**
- `400` — Dangerous LaTeX commands detected
- `500` — LaTeX compilation failure

---

### `POST /api/cv/:cvId/latex`

Get the generated LaTeX source code (without compiling to PDF).

**Request body:** Full CV data.

**Response:** `200 OK`
- Content-Type: `text/plain`
- Body: LaTeX source code

---

### `GET /api/cv/sample-preview`

Get an HTML preview of the sample CV.

**Query params:**
- `locale` — `pt` or `en` (optional, defaults to `pt`)

**Response:** `200 OK` — HTML string.

---

## AI Endpoints

All AI endpoints require authentication and a valid `GROQ_API_KEY`.

### `POST /api/cv/:cvId/ats-score`

Analyze CV for ATS (Applicant Tracking System) compatibility.

**Rate limit:** 10 requests / hour / user

**Request body:** Full CV data + locale.

**Response:** `200 OK`
```json
{
  "overallScore": 75,
  "categories": [
    {
      "name": "Contact Info",
      "score": 90,
      "feedback": "Complete contact information with LinkedIn",
      "section": "header"
    },
    {
      "name": "Experience",
      "score": 65,
      "feedback": "Add more quantified achievements",
      "section": "experience"
    }
  ],
  "suggestions": [
    {
      "text": "Add measurable metrics to experience highlights",
      "priority": "critical",
      "section": "experience"
    },
    {
      "text": "Include a professional summary with target keywords",
      "priority": "recommended",
      "section": "summary"
    }
  ]
}
```

---

### `POST /api/cv/:cvId/import`

Import structured data from an uploaded PDF into an existing CV.

**Rate limit:** 5 requests / hour / user

**Request:** `multipart/form-data`
- `file` — PDF file (max 5MB, must have PDF magic bytes)

**Response:** `200 OK` — Parsed CV data (same structure as GET /api/cv/:cvId).

---

### `POST /api/cv/import-pdf`

One-click workflow: upload PDF, parse it, create a new CV, and return the CV ID.

**Rate limit:** 5 requests / hour / user

**Request:** `multipart/form-data`
- `file` — PDF file (max 5MB)

**Response:** `201 Created`
```json
{
  "cvId": "uuid-of-created-cv"
}
```

---

### `POST /api/cv/:cvId/clone-translate`

Clone an existing CV and translate it to a different language.

**Rate limit:** 5 requests / hour / user

**Request body:**
```json
{
  "targetLocale": "en"
}
```

**Response:** `201 Created`
```json
{
  "cvId": "uuid-of-cloned-cv"
}
```

---

## Admin Endpoints

All admin endpoints require authentication with `role: 'admin'`.

### `GET /api/admin/stats`

Get dashboard statistics.

**Response:** `200 OK`
```json
{
  "totalUsers": 42,
  "totalCvs": 87,
  "activeSessions": 15,
  "recentUsers": [
    {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### `GET /api/admin/users`

Get paginated user list.

**Query params:**
- `page` — Page number (default: 1)
- `limit` — Users per page (default: 20)

**Response:** `200 OK`
```json
{
  "users": [...],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

---

### `GET /api/admin/users/:userId`

Get user details including their CVs and active sessions.

**Response:** `200 OK`
```json
{
  "user": { "id": "...", "name": "...", "email": "...", "role": "..." },
  "cvs": [...],
  "sessions": [...]
}
```

---

### `PATCH /api/admin/users/:userId`

Update a user's role or name.

**Request body:**
```json
{
  "role": "admin",
  "name": "New Name"
}
```

**Response:** `200 OK`

---

### `DELETE /api/admin/users/:userId`

Delete a user and all their data (cascade).

**Response:** `200 OK`
```json
{ "success": true }
```

---

## Health Check

### `GET /api/health`

Check database connectivity.

**Response (healthy):** `200 OK`
```json
{ "status": "ok" }
```

**Response (unhealthy):** `503 Service Unavailable`
```json
{ "status": "error", "message": "Database connection failed" }
```

---

## Public Routes

### `GET /cv/:userId/:cvId`

Server-side rendered public CV page. Returns full HTML with meta tags for SEO and social sharing.

**Auth:** None required

**Response:** `200 OK` — Full HTML page with embedded CV styling.

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (no valid session) |
| `403` | Forbidden (insufficient role) |
| `404` | Not found |
| `429` | Too many requests (rate limited) |
| `500` | Internal server error |

### Rate Limit Headers

When rate limited, the response includes:
```
Retry-After: <seconds until reset>
```
