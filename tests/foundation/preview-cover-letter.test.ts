import { describe, it, expect } from 'vitest'
import { renderCoverLetterPreview } from '../../src/lib/preview-renderer.js'
import type { CoverLetterData } from '../../src/types/cover-letter.js'

const MINIMAL: CoverLetterData = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userId: 'user-1',
  cvId: null,
  locale: 'en',
  templateId: 'default',
  title: '',
  pdfFilename: '',
  sender: { name: '', title: '', location: '', email: '', phone: '', linkedin: '' },
  recipient: { salutation: '', name: '', company: '', address: '' },
  letterDate: '',
  body: [],
  closingPhrase: '',
  signature: '',
  customLatex: '',
  createdAt: '',
  updatedAt: '',
}

const FULL: CoverLetterData = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  userId: 'user-2',
  cvId: null,
  locale: 'en',
  templateId: 'default',
  title: 'Application for Senior Engineer',
  pdfFilename: 'John_Doe_Cover_Letter.pdf',
  sender: {
    name: 'John Doe',
    title: 'Senior Engineer',
    location: 'San Francisco, CA',
    email: 'john@example.com',
    phone: '+1 555-0100',
    linkedin: 'linkedin.com/in/johndoe',
  },
  recipient: {
    salutation: 'Dear Hiring Manager',
    name: 'Jane Smith',
    company: 'Acme Corp',
    address: '123 Main St, New York, NY 10001',
  },
  letterDate: 'January 15, 2025',
  body: [
    { label: 'Apresentação', content: 'I am excited to apply for the Senior Engineer role.' },
    { label: 'Achievements', content: 'I have built systems handling 10TB daily.' },
    { label: '', content: 'I look forward to discussing further.' },
  ],
  closingPhrase: 'Sincerely,',
  signature: 'John Doe',
  customLatex: '',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
}

describe('renderCoverLetterPreview — structure', () => {
  it('returns string starting with <!DOCTYPE html>', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    expect(typeof html).toBe('string')
    expect(html.startsWith('<!doctype html>')).toBe(true)
  })

  it('contains <html> and </html> tags', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('injects cover-letter CSS into <style> tag', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    // CSS file contains .cv-letter__header class
    expect(html).toContain('.cv-letter__header')
  })
})

describe('renderCoverLetterPreview — full data rendering', () => {
  it('renders sender name in header', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('John Doe')
  })

  it('renders sender title as subtitle', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('Senior Engineer')
  })

  it('renders sender email as link', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('john@example.com')
  })

  it('renders letter date', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('January 15, 2025')
  })

  it('renders recipient salutation', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('Dear Hiring Manager')
  })

  it('renders recipient company', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('Acme Corp')
  })

  it('renders body paragraph content', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('I am excited to apply for the Senior Engineer role.')
    expect(html).toContain('I have built systems handling 10TB daily.')
    expect(html).toContain('I look forward to discussing further.')
  })

  it('wraps body paragraphs in cv-letter__paragraph class', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('class="cv-letter__paragraph"')
  })

  it('renders paragraph label wrapped in cv-letter__paragraph-label strong', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('<strong class="cv-letter__paragraph-label">Apresentação:</strong>')
    expect(html).toContain('<strong class="cv-letter__paragraph-label">Achievements:</strong>')
  })

  it('does NOT emit label strong tag for empty label', () => {
    const html = renderCoverLetterPreview(FULL)
    // Third body item has empty label — no empty <strong> should appear for it
    const matches = html.match(/<strong class="cv-letter__paragraph-label"><\/strong>/g)
    expect(matches).toBeNull()
  })

  it('renders closing phrase', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('Sincerely,')
  })

  it('renders signature', () => {
    const html = renderCoverLetterPreview(FULL)
    // signature rendered in closing section — text appears somewhere
    const count = (html.match(/John Doe/g) ?? []).length
    expect(count).toBeGreaterThanOrEqual(2) // once in header, once in closing
  })
})

describe('renderCoverLetterPreview — empty/omission rules', () => {
  it('empty body items array → no cv-letter__paragraph elements emitted', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    expect(html).not.toContain('class="cv-letter__paragraph"')
  })

  it('empty sender name → no h1 with empty content', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    // When name is empty the header should either omit name or render empty — we assert no isolated <h1></h1> stray
    const emptyH1Match = html.match(/<h1>\s*<\/h1>/)
    expect(emptyH1Match).toBeNull()
  })

  it('empty letterDate → date block not emitted', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    expect(html).not.toContain('class="cv-letter__date"')
  })

  it('empty closingPhrase → closing phrase div not emitted', () => {
    const html = renderCoverLetterPreview(MINIMAL)
    // The phrase div should not appear when closing phrase is empty
    expect(html).not.toContain('<div class="cv-letter__closing">')
  })
})

describe('renderCoverLetterPreview — HTML escaping (no LaTeX)', () => {
  it('escapes & in sender name', () => {
    const data: CoverLetterData = {
      ...MINIMAL,
      sender: { ...MINIMAL.sender, name: 'Smith & Wesson' },
    }
    const html = renderCoverLetterPreview(data)
    expect(html).toContain('Smith &amp; Wesson')
    expect(html).not.toContain('Smith & Wesson')
  })

  it('escapes < in body paragraph content', () => {
    const data: CoverLetterData = {
      ...MINIMAL,
      body: [{ label: '', content: 'Score <90 is acceptable' }],
    }
    const html = renderCoverLetterPreview(data)
    expect(html).toContain('Score &lt;90 is acceptable')
    expect(html).not.toContain('Score <90 is acceptable')
  })

  it('does NOT apply LaTeX escape — backslash is literal', () => {
    const data: CoverLetterData = {
      ...MINIMAL,
      body: [{ label: '', content: 'see \\textbf{this}' }],
    }
    const html = renderCoverLetterPreview(data)
    // backslash comes through unchanged (no LaTeX escaping)
    expect(html).toContain('\\textbf{this}')
  })
})

describe('renderCoverLetterPreview — locale', () => {
  it('sets lang attribute from locale', () => {
    const ptData: CoverLetterData = { ...FULL, locale: 'pt' }
    const html = renderCoverLetterPreview(ptData)
    expect(html).toContain('lang="pt"')
  })

  it('defaults to en locale when locale is en', () => {
    const html = renderCoverLetterPreview(FULL)
    expect(html).toContain('lang="en"')
  })
})
