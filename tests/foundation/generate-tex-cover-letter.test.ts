import { describe, it, expect } from 'vitest'
import { generateTexFromCoverLetter } from '../../scripts/generate-tex.js'
import type { CoverLetterData } from '../../src/types/cover-letter.js'

const baseData: CoverLetterData = {
  id: 'cl-test-1',
  userId: 'user-test-1',
  locale: 'en',
  templateId: 'default',
  cvId: null,
  title: 'Application for Senior Engineer',
  pdfFilename: 'John_Doe_Cover_Letter.pdf',
  sender: {
    name: 'John Doe',
    title: 'Software Engineer',
    location: 'San Francisco, CA',
    email: 'john@example.com',
    phone: '+1 555-0100',
    linkedin: 'linkedin.com/in/johndoe',
  },
  recipient: {
    salutation: 'Dear Hiring Manager',
    name: 'Jane Smith',
    company: 'Acme Corp',
    address: '123 Main St, NY',
  },
  letterDate: 'May 18, 2026',
  body: [
    { label: 'Opening', content: 'I am writing to express my interest in the Senior Engineer position.' },
    { label: '', content: 'My experience includes building distributed systems at scale.' },
    { label: 'Conclusion', content: 'I look forward to the opportunity to discuss my qualifications.' },
  ],
  closingPhrase: 'Sincerely,',
  signature: 'John Doe',
  customLatex: '',
  createdAt: '2026-05-18T00:00:00.000Z',
  updatedAt: '2026-05-18T00:00:00.000Z',
}

describe('generateTexFromCoverLetter — document structure', () => {
  it('renders \\input{preamble} and document wrapper', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('\\input{preamble}')
    expect(tex).toContain('\\begin{document}')
    expect(tex).toContain('\\end{document}')
  })

  it('uses english babel package for en locale', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('\\usepackage[english]{babel}')
  })

  it('uses brazilian babel package for pt locale', () => {
    const ptData: CoverLetterData = { ...baseData, locale: 'pt' }
    const tex = generateTexFromCoverLetter(ptData)
    expect(tex).toContain('\\usepackage[brazilian]{babel}')
  })
})

describe('generateTexFromCoverLetter — sender block', () => {
  it('renders sender name', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('John Doe')
  })

  it('renders sender title', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('Software Engineer')
  })

  it('renders sender location', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('San Francisco, CA')
  })

  it('renders sender phone', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('+1 555-0100')
  })

  it('renders sender email', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('john@example.com')
  })

  it('renders sender linkedin', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('linkedin.com/in/johndoe')
  })

  it('emits \\letterHeader command', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('\\letterHeader{')
  })
})

describe('generateTexFromCoverLetter — title bar', () => {
  it('renders Cover Letter title', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('Cover Letter')
  })
})

describe('generateTexFromCoverLetter — date', () => {
  it('renders letterDate when non-empty', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('May 18, 2026')
  })

  it('does NOT render date block when letterDate is empty', () => {
    const data: CoverLetterData = { ...baseData, letterDate: '' }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).not.toContain('May 18, 2026')
  })
})

describe('generateTexFromCoverLetter — recipient block', () => {
  it('renders recipient name', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('Jane Smith')
  })

  it('renders recipient company', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('Acme Corp')
  })

  it('renders recipient address', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('123 Main St, NY')
  })

  it('does NOT render tabular when all recipient fields empty', () => {
    const data: CoverLetterData = {
      ...baseData,
      recipient: { salutation: 'Dear Sir', name: '', company: '', address: '' },
    }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).not.toContain('Jane Smith')
    expect(tex).not.toContain('Acme Corp')
    expect(tex).not.toContain('tabular')
  })
})

describe('generateTexFromCoverLetter — salutation', () => {
  it('renders salutation text', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('Dear Hiring Manager')
  })
})

describe('generateTexFromCoverLetter — body paragraphs', () => {
  it('renders paragraph with bold label when label is non-empty', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('\\textbf{Opening:}')
    expect(tex).toContain('I am writing to express my interest')
  })

  it('renders paragraph without bold label prefix when label is empty', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('My experience includes building distributed systems')
    // Should not render \\textbf{:} for empty label
    expect(tex).not.toContain('\\textbf{:}')
  })

  it('renders Conclusion paragraph with label', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('\\textbf{Conclusion:}')
    expect(tex).toContain('I look forward to the opportunity')
  })

  it('renders all body paragraphs', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('I am writing to express')
    expect(tex).toContain('My experience includes')
    expect(tex).toContain('I look forward to the opportunity')
  })

  it('renders empty body with no paragraph blocks', () => {
    const data: CoverLetterData = { ...baseData, body: [] }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).not.toContain('\\textbf{Opening:}')
    expect(tex).not.toContain('I am writing to express')
  })
})

describe('generateTexFromCoverLetter — closing', () => {
  it('emits \\letterClosing command', () => {
    const tex = generateTexFromCoverLetter(baseData)
    expect(tex).toContain('\\letterClosing{Sincerely,}{John Doe}')
  })

  it('renders custom closing phrase', () => {
    const data: CoverLetterData = { ...baseData, closingPhrase: 'Best regards,' }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).toContain('\\letterClosing{Best regards,}{John Doe}')
  })
})

describe('generateTexFromCoverLetter — LaTeX special char escaping', () => {
  it('escapes & in sender name', () => {
    const data: CoverLetterData = {
      ...baseData,
      sender: { ...baseData.sender, name: 'Smith & Jones' },
    }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).toContain('Smith \\& Jones')
    expect(tex).not.toContain('Smith & Jones')
  })

  it('escapes % in body content', () => {
    const data: CoverLetterData = {
      ...baseData,
      body: [{ label: '', content: 'Increased revenue by 30%.' }],
    }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).toContain('30\\%')
  })

  it('escapes # in recipient address', () => {
    const data: CoverLetterData = {
      ...baseData,
      recipient: { ...baseData.recipient, address: 'Apt #5, 10 Main St' },
    }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).toContain('Apt \\#5')
  })
})

describe('generateTexFromCoverLetter — templateId fallback', () => {
  it('falls back to default template when templateId is invalid', () => {
    const data: CoverLetterData = { ...baseData, templateId: 'nonexistent' as 'default' }
    const tex = generateTexFromCoverLetter(data)
    expect(tex).toContain('\\input{preamble}')
    expect(tex).toContain('\\begin{document}')
  })
})
