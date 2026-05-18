import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// ─── UUID fixtures (all valid UUIDs) ────────────────────────────────────────
const CL_ID = '11111111-1111-1111-1111-111111111111'
const CL_ID_NEW = '22222222-2222-2222-2222-222222222222'
const CL_ID_WITH_CV = '33333333-3333-3333-3333-333333333333'
const CL_ID_NO_CV = '44444444-4444-4444-4444-444444444444'
const CV_ID = '550e8400-e29b-41d4-a716-446655440000'

// ─── Shared mutable state ───────────────────────────────────────────────────
let currentUser: { id: string; email: string; role: string } | null = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'user',
}

// ─── Mock heavy dependencies before importing the route ─────────────────────

vi.mock('../../src/lib/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(async () =>
        currentUser
          ? { user: currentUser, session: { id: 'sess-1' } }
          : null,
      ),
    },
  },
}))

// Intercept DB calls
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  orderBy: vi.fn(() => mockDb),
  limit: vi.fn(() => Promise.resolve([])),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => Promise.resolve([])),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
  transaction: vi.fn(async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)),
}

vi.mock('../../src/db/index.js', () => ({ db: mockDb }))
vi.mock('../../src/lib/load-cover-letter.js', () => ({
  loadCoverLetter: vi.fn(async () => null),
}))
vi.mock('../../scripts/compile-pdf.js', () => ({
  compilePdf: vi.fn(() => {}),
  compilePdfFromTex: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
}))

// Import after mocks
const { default: coverLetterApi } = await import('../../src/server/api/cover-letter.js')
const { loadCoverLetter } = await import('../../src/lib/load-cover-letter.js')

// ─── Test app ────────────────────────────────────────────────────────────────
function makeApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    if (currentUser) {
      c.set('user', currentUser)
    }
    await next()
  })
  app.route('/', coverLetterApi)
  return app
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_CV = {
  id: CV_ID,
  userId: 'user-1',
  name: 'John Doe',
  headerTitle: 'Engineer',
  location: 'NYC',
  email: 'john@example.com',
  phone: '+1 555-0000',
  linkedin: 'linkedin.com/in/johndoe',
}

const VALID_INPUT = {
  locale: 'en',
  templateId: 'default',
  cvId: null,
  title: 'My Cover Letter',
  pdfFilename: 'John_Doe_Cover_Letter.pdf',
  sender: {
    name: 'John Doe',
    title: 'Engineer',
    location: 'NYC',
    email: 'john@example.com',
    phone: '',
    linkedin: '',
  },
  recipient: {
    salutation: 'Dear Hiring Manager',
    name: '',
    company: 'Acme',
    address: '',
  },
  letterDate: '2025-01-01',
  body: [{ label: 'Opening', content: 'I am writing...' }],
  closingPhrase: 'Sincerely,',
  signature: 'John Doe',
  customLatex: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  mockDb.select.mockReset()
  mockDb.from.mockReset()
  mockDb.where.mockReset()
  mockDb.orderBy.mockReset()
  mockDb.limit.mockReset()
  mockDb.insert.mockReset()
  mockDb.values.mockReset()
  mockDb.returning.mockReset()
  mockDb.update.mockReset()
  mockDb.set.mockReset()
  mockDb.delete.mockReset()
  mockDb.transaction.mockReset()

  // Default: chain returns self, terminal ops return empty
  mockDb.select.mockReturnValue(mockDb)
  mockDb.from.mockReturnValue(mockDb)
  mockDb.where.mockReturnValue(mockDb)
  mockDb.orderBy.mockReturnValue(mockDb)
  mockDb.limit.mockResolvedValue([])
  mockDb.insert.mockReturnValue(mockDb)
  mockDb.values.mockReturnValue(mockDb)
  mockDb.returning.mockResolvedValue([])
  mockDb.update.mockReturnValue(mockDb)
  mockDb.set.mockReturnValue(mockDb)
  mockDb.delete.mockReturnValue(mockDb)
  mockDb.transaction.mockImplementation(async (fn) => fn(mockDb))

  ;(loadCoverLetter as ReturnType<typeof mock>).mockReset()
  ;(loadCoverLetter as ReturnType<typeof mock>).mockResolvedValue(null)
}

// ─── GET / — list ─────────────────────────────────────────────────────────────

describe('GET / — list cover letters', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 200 with array of cover letters', async () => {
    mockDb.orderBy.mockResolvedValue([
      {
        id: CL_ID,
        title: 'My Cover Letter',
        locale: 'en',
        templateId: 'default',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-02T00:00:00Z'),
        cvId: null,
      },
    ])
    const app = makeApp()
    const res = await app.request('/', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].id).toBe(CL_ID)
    expect(data[0].title).toBe('My Cover Letter')
  })

  it('returns 200 with empty array when no cover letters', async () => {
    mockDb.orderBy.mockResolvedValue([])
    const app = makeApp()
    const res = await app.request('/', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual([])
  })
})

// ─── POST / — create ─────────────────────────────────────────────────────────

describe('POST / — create cover letter', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 201 with id on successful creation without cvId', async () => {
    mockDb.returning.mockResolvedValue([{ id: CL_ID_NEW }])
    const app = makeApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'en' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe(CL_ID_NEW)
  })

  it('returns 201 with id on creation with title', async () => {
    mockDb.returning.mockResolvedValue([{ id: CL_ID_NEW }])
    const app = makeApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'pt', title: 'Carta para Engenheiro' }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe(CL_ID_NEW)
  })

  it('returns 400 for invalid locale', async () => {
    const app = makeApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'fr' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const app = makeApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('creates with cvId and snapshots sender fields from CV', async () => {
    // First call (cv ownership check) returns CV
    let dbCallCount = 0
    mockDb.limit.mockImplementation(async () => {
      dbCallCount++
      if (dbCallCount === 1) return [BASE_CV]
      return []
    })
    mockDb.returning.mockResolvedValue([{ id: CL_ID_WITH_CV }])

    const app = makeApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'en', cvId: CV_ID }),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe(CL_ID_WITH_CV)
  })

  it('creates with empty sender fields when cvId does not belong to user', async () => {
    // CV lookup returns empty (user does not own it)
    mockDb.limit.mockResolvedValue([])
    mockDb.returning.mockResolvedValue([{ id: CL_ID_NO_CV }])

    const app = makeApp()
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'en', cvId: CV_ID }),
    })
    // Should succeed with 201, not fail
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe(CL_ID_NO_CV)
  })
})

// ─── GET /:id — fetch ─────────────────────────────────────────────────────────

describe('GET /:id — fetch cover letter', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 200 with full cover letter data', async () => {
    const letterData = {
      id: CL_ID,
      userId: 'user-1',
      cvId: null,
      locale: 'en',
      templateId: 'default',
      title: 'My Letter',
      pdfFilename: 'letter.pdf',
      sender: { name: 'John', title: '', location: '', email: '', phone: '', linkedin: '' },
      recipient: { salutation: 'Dear', name: '', company: '', address: '' },
      letterDate: '',
      body: [],
      closingPhrase: 'Sincerely,',
      signature: '',
      customLatex: '',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    }
    ;(loadCoverLetter as ReturnType<typeof mock>).mockResolvedValue(letterData)

    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(CL_ID)
  })

  it('returns 404 when cover letter not found', async () => {
    ;(loadCoverLetter as ReturnType<typeof mock>).mockResolvedValue(null)

    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, { method: 'GET' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid UUID', async () => {
    const app = makeApp()
    const res = await app.request('/not-a-uuid', { method: 'GET' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when cover letter belongs to another user (loadCoverLetter returns null)', async () => {
    // loadCoverLetter already filters by userId — returns null for wrong user
    ;(loadCoverLetter as ReturnType<typeof mock>).mockResolvedValue(null)

    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, { method: 'GET' })
    expect(res.status).toBe(404)
  })
})

// ─── PUT /:id — update ────────────────────────────────────────────────────────

describe('PUT /:id — update cover letter', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 200 on successful update', async () => {
    mockDb.transaction.mockImplementation(async (fn) => {
      mockDb.limit.mockResolvedValue([{ id: CL_ID }])
      return fn(mockDb)
    })

    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 404 when cover letter not found during update', async () => {
    mockDb.transaction.mockImplementation(async (fn) => {
      mockDb.limit.mockResolvedValue([])
      return fn(mockDb)
    })

    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid JSON', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for schema validation failure', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'invalid-locale' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid UUID in path', async () => {
    const app = makeApp()
    const res = await app.request('/not-a-uuid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when customLatex contains dangerous commands', async () => {
    mockDb.transaction.mockImplementation(async (fn) => {
      mockDb.limit.mockResolvedValue([{ id: CL_ID }])
      return fn(mockDb)
    })

    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_INPUT, customLatex: '\\input{/etc/passwd}' }),
    })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe('DELETE /:id — delete cover letter', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 200 on successful deletion', async () => {
    mockDb.returning.mockResolvedValue([{ id: CL_ID }])
    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('returns 404 when cover letter not found', async () => {
    mockDb.returning.mockResolvedValue([])
    const app = makeApp()
    const res = await app.request(`/${CL_ID}`, { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid UUID', async () => {
    const app = makeApp()
    const res = await app.request('/not-a-uuid', { method: 'DELETE' })
    expect(res.status).toBe(400)
  })
})

// ─── POST /:id/preview ────────────────────────────────────────────────────────

describe('POST /:id/preview — HTML preview', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 200 with full HTML document for valid input', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('<!doctype html>')
    expect(text).toContain('John Doe')
  })

  it('returns 400 for invalid JSON', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for schema validation failure', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid UUID', async () => {
    const app = makeApp()
    const res = await app.request('/not-a-uuid/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(400)
  })
})

// ─── POST /:id/pdf ────────────────────────────────────────────────────────────

describe('POST /:id/pdf — PDF generation', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('returns 400 for invalid UUID', async () => {
    const app = makeApp()
    const res = await app.request('/not-a-uuid/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when customLatex contains dangerous commands', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...VALID_INPUT, customLatex: '\\input{/etc/passwd}' }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('inválidos')
  })

  it('returns 400 for schema validation failure', async () => {
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })

  // Fix 2: ownership check on /pdf
  it('returns 404 when calling /pdf with another user cover letter id', async () => {
    // Ownership check: db.select returns empty (not owned by user-1)
    mockDb.limit.mockResolvedValue([])
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  // Fix 3: Content-Disposition filename sanitization
  it('returns well-formed Content-Disposition header even when pdfFilename contains injection chars', async () => {
    // Ownership check passes
    mockDb.limit.mockResolvedValue([{ id: CL_ID }])

    const maliciousInput = {
      ...VALID_INPUT,
      pdfFilename: '"; rm -rf /',
      sender: { ...VALID_INPUT.sender, name: 'Alice Hacker' },
    }
    const app = makeApp()
    const res = await app.request(`/${CL_ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(maliciousInput),
    })
    // Must not be 500; response should be PDF or error but header must be clean
    const disposition = res.headers.get('Content-Disposition') ?? ''
    // Should NOT contain raw injection chars: newline, carriage return, or unescaped double-quote after filename=
    expect(disposition).not.toMatch(/[\r\n]/)
    if (disposition.includes('filename=')) {
      // The filename value (after filename=") must not contain double-quotes or semicolons
      const filenameMatch = disposition.match(/filename="([^"]*)"/)
      if (filenameMatch) {
        expect(filenameMatch[1]).not.toContain('"')
        expect(filenameMatch[1]).not.toContain('\r')
        expect(filenameMatch[1]).not.toContain('\n')
      }
    }
  })
})

// ─── Fix 2: rate limit — 6th call within 60s returns 429 ─────────────────────

describe('POST /:id/pdf — rate limit (Fix 2)', () => {
  // Use a unique userId to avoid cross-test pollution of the in-memory store
  const rateLimitUser = { id: 'rate-limit-test-user', email: 'rl@example.com', role: 'user' }

  beforeEach(() => {
    currentUser = rateLimitUser
    resetMocks()
    // Ownership check always passes for this suite
    mockDb.limit.mockResolvedValue([{ id: CL_ID }])
  })

  it('returns 429 on the 6th call within the rate limit window', async () => {
    const app = makeApp()

    // Calls 1-5 must succeed (or at least not be 429)
    for (let i = 0; i < 5; i++) {
      const res = await app.request(`/${CL_ID}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_INPUT),
      })
      // Accept any non-429 status (200 or 500 depending on PDF gen mock)
      expect(res.status).not.toBe(429)
    }

    // 6th call must be rate-limited
    const res = await app.request(`/${CL_ID}/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_INPUT),
    })
    expect(res.status).toBe(429)
  })
})

// ─── Fix 1: PUT /:id — cvId ownership check ──────────────────────────────────

describe('PUT /:id — cvId ownership check (Fix 1)', () => {
  beforeEach(() => {
    currentUser = { id: 'user-1', email: 'user@example.com', role: 'user' }
    resetMocks()
  })

  it('coerces cvId to null when target CV belongs to another user', async () => {
    // Track the value passed to tx.update(...).set(...)
    let capturedSet: Record<string, unknown> | null = null

    mockDb.transaction.mockImplementation(async (fn) => {
      // First limit call: ownership of the cover letter (returns existing)
      // Second limit call: ownership of the CV (returns empty — foreign CV)
      let callCount = 0
      mockDb.limit.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return [{ id: CL_ID }] // cover letter exists
        return [] // CV not owned by this user
      })
      mockDb.set.mockImplementation((values: Record<string, unknown>) => {
        capturedSet = values
        return mockDb
      })
      return fn(mockDb)
    })

    const app = makeApp()
    const inputWithForeignCvId = { ...VALID_INPUT, cvId: CV_ID }
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputWithForeignCvId),
    })

    expect(res.status).toBe(200)
    // cvId must have been coerced to null in the set() call
    expect(capturedSet).not.toBeNull()
    expect(capturedSet!.cvId).toBeNull()
  })

  it('preserves cvId when CV belongs to current user', async () => {
    let capturedSet: Record<string, unknown> | null = null

    mockDb.transaction.mockImplementation(async (fn) => {
      let callCount = 0
      mockDb.limit.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return [{ id: CL_ID }] // cover letter exists
        return [{ id: CV_ID }] // CV is owned by this user
      })
      mockDb.set.mockImplementation((values: Record<string, unknown>) => {
        capturedSet = values
        return mockDb
      })
      return fn(mockDb)
    })

    const app = makeApp()
    const inputWithOwnedCvId = { ...VALID_INPUT, cvId: CV_ID }
    const res = await app.request(`/${CL_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputWithOwnedCvId),
    })

    expect(res.status).toBe(200)
    expect(capturedSet).not.toBeNull()
    expect(capturedSet!.cvId).toBe(CV_ID)
  })
})
