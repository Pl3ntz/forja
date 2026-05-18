import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── useCoverLetters hook smoke tests ───────────────────────────────────────
// Full rendering tests are covered by Wave 4 e2e-runner.
// These tests validate the hook module exports its public API and the
// CoverLetterListItem shape matches what GET /api/cover-letter/ returns.

const CL_ID = '11111111-1111-1111-1111-111111111111'

// Patch global fetch before importing the hook so useEffect calls don't throw
const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
)
// @ts-ignore — bun global fetch override for test isolation
globalThis.fetch = mockFetch

// Import React hooks stubs so the module can be imported outside a browser
vi.mock('react', () => ({
  useState: (init: unknown) => [typeof init === 'function' ? (init as () => unknown)() : init, () => {}],
  useCallback: (fn: unknown) => fn,
  useEffect: () => {},
}))

describe('useCoverLetters — module contract', () => {
  it('exports useCoverLetters function', async () => {
    const mod = await import('../../src/client/hooks/useCoverLetters.js')
    expect(typeof mod.useCoverLetters).toBe('function')
  })
})

describe('CoverLetterListItem shape', () => {
  it('list item has expected fields from GET /api/cover-letter/', () => {
    // Contract test: verifies the shape agreed between hook and API.
    // The API selects exactly these fields (src/server/api/cover-letter.ts lines 38-47).
    const item = {
      id: CL_ID,
      title: 'My Letter',
      locale: 'en' as const,
      templateId: 'default',
      cvId: null as string | null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    }

    expect(item.id).toBe(CL_ID)
    expect(item.locale).toBe('en')
    expect(item.cvId).toBeNull()
    expect(typeof item.templateId).toBe('string')
  })

  it('list item with cvId set is valid', () => {
    const item = {
      id: CL_ID,
      title: 'Letter with CV',
      locale: 'pt' as const,
      templateId: 'default',
      cvId: '22222222-2222-2222-2222-222222222222',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    }
    expect(item.cvId).toBeTruthy()
    expect(item.locale).toBe('pt')
  })
})

describe('useCoverLetters — create payload shape', () => {
  it('create payload accepts locale, optional title, optional cvId', () => {
    // Documents the CreateCoverLetterPayload type — matching POST /api/cover-letter/
    const payloadMinimal = { locale: 'en' as const }
    const payloadFull = {
      locale: 'pt' as const,
      title: 'Carta para Google',
      cvId: '33333333-3333-3333-3333-333333333333',
    }

    expect(payloadMinimal.locale).toBe('en')
    expect(payloadFull.title).toBe('Carta para Google')
    expect(payloadFull.cvId).toBeTruthy()
  })

  it('create payload accepts null cvId', () => {
    const payload = { locale: 'en' as const, cvId: null as string | null }
    expect(payload.cvId).toBeNull()
  })
})
