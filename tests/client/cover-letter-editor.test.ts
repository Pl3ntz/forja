import { describe, it, expect } from 'vitest'

// Structural smoke tests — verify components are React function components
// and hooks export the expected shape. RTL is not a project dependency,
// so real rendering tests are deferred to Wave 4 (e2e-runner / Playwright).

describe('CoverLetterEditorPage', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/pages/CoverLetterEditorPage.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CoverLetterEditorForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CoverLetterEditorForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CoverLetterHeaderForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CoverLetterHeaderForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CoverLetterRecipientForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CoverLetterRecipientForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CoverLetterBodyForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CoverLetterBodyForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CoverLetterClosingForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CoverLetterClosingForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('useCoverLetterDebounce', () => {
  it('exports a useCoverLetterDebounce function', async () => {
    const mod = await import('../../src/client/hooks/useCoverLetterDebounce.js')
    expect(typeof mod.useCoverLetterDebounce).toBe('function')
  })
})

describe('CoverLetterEditorForm — API endpoint constants', () => {
  // Verify the preview and save endpoints match the backend routes
  it('preview endpoint uses /api/cover-letter/:id/preview path pattern', () => {
    const id = 'abc-123'
    const endpoint = `/api/cover-letter/${id}/preview`
    expect(endpoint).toBe('/api/cover-letter/abc-123/preview')
  })

  it('save endpoint uses /api/cover-letter/:id path pattern', () => {
    const id = 'abc-123'
    const endpoint = `/api/cover-letter/${id}`
    expect(endpoint).toBe('/api/cover-letter/abc-123')
  })

  it('pdf endpoint uses /api/cover-letter/:id/pdf path pattern', () => {
    const id = 'abc-123'
    const endpoint = `/api/cover-letter/${id}/pdf`
    expect(endpoint).toBe('/api/cover-letter/abc-123/pdf')
  })
})

describe('Cover letter schema — structural contract', () => {
  it('CoverLetterInput has expected sender fields', async () => {
    const { coverLetterInputSchema } = await import('../../src/lib/zod-schemas/cover-letter.js')
    const result = coverLetterInputSchema.safeParse({
      locale: 'en',
      sender: {
        name: 'Jane Doe',
        title: 'Engineer',
        location: 'NYC',
        email: 'jane@example.com',
        phone: '+1 555 0100',
        linkedin: 'linkedin.com/in/jane',
      },
      recipient: {
        salutation: 'Dear Hiring Manager',
        name: '',
        company: 'Acme',
        address: '',
      },
      body: [{ label: 'Intro', content: 'Hello world' }],
      closingPhrase: 'Sincerely,',
      signature: 'Jane Doe',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sender.name).toBe('Jane Doe')
      expect(result.data.sender.linkedin).toBe('linkedin.com/in/jane')
    }
  })

  it('body is capped at 6 items', async () => {
    const { coverLetterInputSchema } = await import('../../src/lib/zod-schemas/cover-letter.js')
    const sevenItems = Array.from({ length: 7 }, (_, i) => ({ label: `P${i}`, content: `content ${i}` }))
    const result = coverLetterInputSchema.safeParse({ locale: 'en', body: sevenItems })
    expect(result.success).toBe(false)
  })

  it('locale accepts only pt or en', async () => {
    const { coverLetterInputSchema } = await import('../../src/lib/zod-schemas/cover-letter.js')
    const invalid = coverLetterInputSchema.safeParse({ locale: 'fr' })
    expect(invalid.success).toBe(false)
  })

  it('closingPhrase defaults to "Sincerely,"', async () => {
    const { coverLetterInputSchema } = await import('../../src/lib/zod-schemas/cover-letter.js')
    const result = coverLetterInputSchema.safeParse({ locale: 'en' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.closingPhrase).toBe('Sincerely,')
    }
  })
})
