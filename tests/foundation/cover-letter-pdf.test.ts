import { describe, it, expect, vi } from 'vitest'
import type { CoverLetterData } from '../../src/types/cover-letter.js'

const SAMPLE_DATA: CoverLetterData = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userId: 'user-1',
  cvId: null,
  locale: 'en',
  templateId: 'default',
  title: 'Cover Letter',
  pdfFilename: 'John_Doe_Cover_Letter.pdf',
  sender: {
    name: 'John Doe',
    title: 'Engineer',
    location: 'NYC',
    email: 'john@example.com',
    phone: '+1 555-0100',
    linkedin: 'linkedin.com/in/johndoe',
  },
  recipient: {
    salutation: 'Dear Hiring Manager',
    name: '',
    company: 'Acme Corp',
    address: '',
  },
  letterDate: '2025-01-15',
  body: [
    { label: 'Opening', content: 'I am writing to express my interest.' },
  ],
  closingPhrase: 'Sincerely,',
  signature: 'John Doe',
  customLatex: '',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

// ─── Mock only compile-pdf (tectonic invocation) ──────────────────────────────
// We do NOT mock generate-tex to avoid polluting other test files

const mockCompilePdfFromTex = vi.fn(async (_tex: string, _preamblePath?: string): Promise<Buffer> => {
  return Buffer.from('%PDF-1.4 mock cover letter pdf')
})

vi.mock('../../scripts/compile-pdf.js', () => ({
  compilePdf: vi.fn(() => {}),
  compilePdfFromTex: mockCompilePdfFromTex,
}))

// Import AFTER mock is registered
const { generateCoverLetterPdf } = await import('../../src/lib/pdf-generator.js')
const { compilePdfFromTex } = await import('../../scripts/compile-pdf.js')

describe('generateCoverLetterPdf — wiring', () => {
  it('returns a Buffer', async () => {
    mockCompilePdfFromTex.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'))
    const result = await generateCoverLetterPdf(SAMPLE_DATA)
    expect(result).toBeInstanceOf(Buffer)
  })

  it('passes preamble path from cover-letter-default template to compilePdfFromTex', async () => {
    mockCompilePdfFromTex.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'))

    await generateCoverLetterPdf(SAMPLE_DATA)

    const calls = (compilePdfFromTex as ReturnType<typeof mock>).mock.calls
    const lastCall = calls[calls.length - 1]
    // Second arg is preamblePath — should contain 'cover-letter-default'
    expect(lastCall[1]).toContain('cover-letter-default')
    expect(lastCall[1]).toContain('preamble.tex')
  })

  it('passes TeX content as first arg to compilePdfFromTex', async () => {
    mockCompilePdfFromTex.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'))

    await generateCoverLetterPdf(SAMPLE_DATA)

    const calls = (compilePdfFromTex as ReturnType<typeof mock>).mock.calls
    const lastCall = calls[calls.length - 1]
    // Real generateTexFromCoverLetter is called — output contains document structure
    expect(typeof lastCall[0]).toBe('string')
    expect(lastCall[0]).toContain('\\begin{document}')
    expect(lastCall[0]).toContain('\\end{document}')
  })

  it('returns buffer content from compilePdfFromTex', async () => {
    const expectedBuffer = Buffer.from('%PDF-1.4 specific content')
    mockCompilePdfFromTex.mockResolvedValueOnce(expectedBuffer)

    const result = await generateCoverLetterPdf(SAMPLE_DATA)

    expect(result).toEqual(expectedBuffer)
  })

  it('uses default templateId when templateId is invalid', async () => {
    const dataWithBadTemplate: CoverLetterData = {
      ...SAMPLE_DATA,
      templateId: 'nonexistent' as 'default',
    }
    mockCompilePdfFromTex.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'))

    // Should not throw — falls back to 'default'
    const result = await generateCoverLetterPdf(dataWithBadTemplate)
    expect(result).toBeInstanceOf(Buffer)

    const calls = (compilePdfFromTex as ReturnType<typeof mock>).mock.calls
    const lastCall = calls[calls.length - 1]
    // preamble path still uses cover-letter-default (the default template)
    expect(lastCall[1]).toContain('cover-letter-default')
  })
})

describe('generateCoverLetterPdf — TeX pipeline (real generate-tex)', () => {
  it('generated TeX contains sender name', async () => {
    mockCompilePdfFromTex.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'))

    await generateCoverLetterPdf(SAMPLE_DATA)

    const calls = (compilePdfFromTex as ReturnType<typeof mock>).mock.calls
    const lastCall = calls[calls.length - 1]
    const tex = lastCall[0] as string
    expect(tex).toContain('John Doe')
  })

  it('generated TeX contains \\input{preamble}', async () => {
    mockCompilePdfFromTex.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'))

    await generateCoverLetterPdf(SAMPLE_DATA)

    const calls = (compilePdfFromTex as ReturnType<typeof mock>).mock.calls
    const lastCall = calls[calls.length - 1]
    const tex = lastCall[0] as string
    expect(tex).toContain('\\input{preamble}')
  })
})
