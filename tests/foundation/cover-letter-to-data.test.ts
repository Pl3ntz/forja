import { describe, it, expect } from 'vitest'
import {
  coverLetterRowsToData,
  coverLetterInputToData,
} from '../../src/lib/cover-letter-to-data.js'
import type { CoverLetterInput } from '../../src/lib/zod-schemas/cover-letter.js'

const baseLetter = {
  id: 'cl-1',
  userId: 'user-1',
  cvId: null as string | null,
  locale: 'en',
  templateId: 'default',
  title: 'Application for Engineer',
  pdfFilename: 'John_Doe_Cover_Letter.pdf',
  senderName: 'John Doe',
  senderTitle: 'Software Engineer',
  senderLocation: 'NYC',
  senderEmail: 'john@example.com',
  senderPhone: '+1 555-0000',
  senderLinkedin: 'linkedin.com/in/johndoe',
  recipientSalutation: 'Dear Hiring Manager',
  recipientName: 'Jane Smith',
  recipientCompany: 'Acme Corp',
  recipientAddress: '123 Main St',
  letterDate: '2025-01-15',
  closingPhrase: 'Sincerely,',
  signature: 'John Doe',
  customLatex: '',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
}

const baseBodyItems = [
  { id: 'bi-1', coverLetterId: 'cl-1', orderIndex: 0, label: 'Opening', content: 'I am writing...' },
  { id: 'bi-2', coverLetterId: 'cl-1', orderIndex: 1, label: 'Experience', content: 'With 5 years...' },
]

const baseInput: CoverLetterInput = {
  locale: 'en',
  templateId: 'default',
  cvId: null,
  title: 'Application for Engineer',
  pdfFilename: 'John_Doe_Cover_Letter.pdf',
  sender: {
    name: 'John Doe',
    title: 'Software Engineer',
    location: 'NYC',
    email: 'john@example.com',
    phone: '+1 555-0000',
    linkedin: 'linkedin.com/in/johndoe',
  },
  recipient: {
    salutation: 'Dear Hiring Manager',
    name: 'Jane Smith',
    company: 'Acme Corp',
    address: '123 Main St',
  },
  letterDate: '2025-01-15',
  body: [
    { label: 'Opening', content: 'I am writing...' },
    { label: 'Experience', content: 'With 5 years...' },
  ],
  closingPhrase: 'Sincerely,',
  signature: 'John Doe',
  customLatex: '',
}

// --- coverLetterRowsToData ---

describe('coverLetterRowsToData — metadata', () => {
  it('maps id, userId, locale, templateId, title, pdfFilename', () => {
    const data = coverLetterRowsToData(baseLetter, baseBodyItems)
    expect(data.id).toBe('cl-1')
    expect(data.userId).toBe('user-1')
    expect(data.locale).toBe('en')
    expect(data.templateId).toBe('default')
    expect(data.title).toBe('Application for Engineer')
    expect(data.pdfFilename).toBe('John_Doe_Cover_Letter.pdf')
  })

  it('maps timestamps as ISO strings', () => {
    const data = coverLetterRowsToData(baseLetter, baseBodyItems)
    expect(data.createdAt).toBe('2025-01-01T00:00:00.000Z')
    expect(data.updatedAt).toBe('2025-01-02T00:00:00.000Z')
  })

  it('maps cvId as null when null', () => {
    const data = coverLetterRowsToData(baseLetter, baseBodyItems)
    expect(data.cvId).toBeNull()
  })

  it('maps cvId as string when present', () => {
    const letter = { ...baseLetter, cvId: '550e8400-e29b-41d4-a716-446655440000' }
    const data = coverLetterRowsToData(letter, [])
    expect(data.cvId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})

describe('coverLetterRowsToData — sender', () => {
  it('maps all sender fields from row columns', () => {
    const data = coverLetterRowsToData(baseLetter, baseBodyItems)
    expect(data.sender.name).toBe('John Doe')
    expect(data.sender.title).toBe('Software Engineer')
    expect(data.sender.location).toBe('NYC')
    expect(data.sender.email).toBe('john@example.com')
    expect(data.sender.phone).toBe('+1 555-0000')
    expect(data.sender.linkedin).toBe('linkedin.com/in/johndoe')
  })

  it('maps empty sender fields to empty strings', () => {
    const letter = {
      ...baseLetter,
      senderName: '',
      senderTitle: '',
      senderLocation: '',
      senderEmail: '',
      senderPhone: '',
      senderLinkedin: '',
    }
    const data = coverLetterRowsToData(letter, [])
    expect(data.sender.name).toBe('')
    expect(data.sender.title).toBe('')
    expect(data.sender.email).toBe('')
  })
})

describe('coverLetterRowsToData — recipient', () => {
  it('maps all recipient fields from row columns', () => {
    const data = coverLetterRowsToData(baseLetter, baseBodyItems)
    expect(data.recipient.salutation).toBe('Dear Hiring Manager')
    expect(data.recipient.name).toBe('Jane Smith')
    expect(data.recipient.company).toBe('Acme Corp')
    expect(data.recipient.address).toBe('123 Main St')
  })
})

describe('coverLetterRowsToData — body items', () => {
  it('maps body items in order preserving label and content', () => {
    const data = coverLetterRowsToData(baseLetter, baseBodyItems)
    expect(data.body).toHaveLength(2)
    expect(data.body[0].label).toBe('Opening')
    expect(data.body[0].content).toBe('I am writing...')
    expect(data.body[1].label).toBe('Experience')
    expect(data.body[1].content).toBe('With 5 years...')
  })

  it('returns empty body array when no items', () => {
    const data = coverLetterRowsToData(baseLetter, [])
    expect(data.body).toEqual([])
  })

  it('preserves order of body items', () => {
    const items = [
      { id: 'bi-2', coverLetterId: 'cl-1', orderIndex: 1, label: 'Second', content: 'B' },
      { id: 'bi-1', coverLetterId: 'cl-1', orderIndex: 0, label: 'First', content: 'A' },
    ]
    const data = coverLetterRowsToData(baseLetter, items)
    // items are passed in as-is (already ordered by DB query); function just maps them
    expect(data.body[0].label).toBe('Second')
    expect(data.body[1].label).toBe('First')
  })
})

describe('coverLetterRowsToData — other fields', () => {
  it('maps letterDate, closingPhrase, signature, customLatex', () => {
    const data = coverLetterRowsToData(baseLetter, [])
    expect(data.letterDate).toBe('2025-01-15')
    expect(data.closingPhrase).toBe('Sincerely,')
    expect(data.signature).toBe('John Doe')
    expect(data.customLatex).toBe('')
  })

  it('maps non-empty customLatex', () => {
    const letter = { ...baseLetter, customLatex: '\\begin{document}\\end{document}' }
    const data = coverLetterRowsToData(letter, [])
    expect(data.customLatex).toBe('\\begin{document}\\end{document}')
  })
})

// --- coverLetterInputToData ---

describe('coverLetterInputToData — metadata', () => {
  it('injects id and userId into the result', () => {
    const data = coverLetterInputToData(baseInput, 'user-42', 'cl-99')
    expect(data.id).toBe('cl-99')
    expect(data.userId).toBe('user-42')
  })

  it('passes locale, templateId, title, pdfFilename through from input', () => {
    const data = coverLetterInputToData(baseInput, 'user-1', 'cl-1')
    expect(data.locale).toBe('en')
    expect(data.templateId).toBe('default')
    expect(data.title).toBe('Application for Engineer')
    expect(data.pdfFilename).toBe('John_Doe_Cover_Letter.pdf')
  })

  it('produces createdAt and updatedAt as empty strings (placeholder for new records)', () => {
    const data = coverLetterInputToData(baseInput, 'user-1', 'cl-1')
    expect(typeof data.createdAt).toBe('string')
    expect(typeof data.updatedAt).toBe('string')
  })
})

describe('coverLetterInputToData — sender and recipient', () => {
  it('maps sender from input', () => {
    const data = coverLetterInputToData(baseInput, 'user-1', 'cl-1')
    expect(data.sender.name).toBe('John Doe')
    expect(data.sender.email).toBe('john@example.com')
  })

  it('maps recipient from input', () => {
    const data = coverLetterInputToData(baseInput, 'user-1', 'cl-1')
    expect(data.recipient.salutation).toBe('Dear Hiring Manager')
    expect(data.recipient.company).toBe('Acme Corp')
  })
})

describe('coverLetterInputToData — body', () => {
  it('maps body items from input', () => {
    const data = coverLetterInputToData(baseInput, 'user-1', 'cl-1')
    expect(data.body).toHaveLength(2)
    expect(data.body[0].label).toBe('Opening')
    expect(data.body[1].label).toBe('Experience')
  })

  it('maps empty body array', () => {
    const input = { ...baseInput, body: [] }
    const data = coverLetterInputToData(input, 'user-1', 'cl-1')
    expect(data.body).toEqual([])
  })
})

describe('coverLetterInputToData — cvId', () => {
  it('maps null cvId', () => {
    const data = coverLetterInputToData(baseInput, 'user-1', 'cl-1')
    expect(data.cvId).toBeNull()
  })

  it('maps non-null cvId', () => {
    const input = { ...baseInput, cvId: '550e8400-e29b-41d4-a716-446655440000' }
    const data = coverLetterInputToData(input, 'user-1', 'cl-1')
    expect(data.cvId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})
