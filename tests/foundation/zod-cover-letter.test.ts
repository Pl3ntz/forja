import { describe, it, expect } from 'vitest'
import {
  coverLetterInputSchema,
  coverLetterCreateSchema,
  type CoverLetterInput,
} from '../../src/lib/zod-schemas/cover-letter.js'

describe('coverLetterInputSchema — defaults', () => {
  it('parses minimal input with only required locale field', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'en' })
    expect(result.success).toBe(true)
    if (!result.success) return
    const data = result.data
    expect(data.locale).toBe('en')
    expect(data.templateId).toBe('default')
    expect(data.cvId).toBeNull()
    expect(data.title).toBe('')
    expect(data.pdfFilename).toBe('')
    expect(data.letterDate).toBe('')
    expect(data.closingPhrase).toBe('Sincerely,')
    expect(data.signature).toBe('')
    expect(data.customLatex).toBe('')
    expect(data.body).toEqual([])
  })

  it('applies sender nested defaults', () => {
    const result = coverLetterInputSchema.parse({ locale: 'pt' })
    expect(result.sender.name).toBe('')
    expect(result.sender.title).toBe('')
    expect(result.sender.location).toBe('')
    expect(result.sender.email).toBe('')
    expect(result.sender.phone).toBe('')
    expect(result.sender.linkedin).toBe('')
  })

  it('applies recipient nested defaults', () => {
    const result = coverLetterInputSchema.parse({ locale: 'en' })
    expect(result.recipient.salutation).toBe('Dear Hiring Manager')
    expect(result.recipient.name).toBe('')
    expect(result.recipient.company).toBe('')
    expect(result.recipient.address).toBe('')
  })
})

describe('coverLetterInputSchema — valid inputs', () => {
  it('accepts pt locale', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'pt' })
    expect(result.success).toBe(true)
  })

  it('accepts en locale', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'en' })
    expect(result.success).toBe(true)
  })

  it('accepts valid templateId', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'en', templateId: 'default' })
    expect(result.success).toBe(true)
  })

  it('accepts null cvId', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'en', cvId: null })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.cvId).toBeNull()
  })

  it('accepts valid UUID cvId', () => {
    const result = coverLetterInputSchema.safeParse({
      locale: 'en',
      cvId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.cvId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('accepts body array up to 6 items', () => {
    const body = Array.from({ length: 6 }, (_, i) => ({
      label: `Para ${i + 1}`,
      content: `Content ${i + 1}`,
    }))
    const result = coverLetterInputSchema.safeParse({ locale: 'en', body })
    expect(result.success).toBe(true)
  })

  it('accepts complete valid payload', () => {
    const payload = {
      locale: 'en',
      templateId: 'default',
      cvId: null,
      title: 'Application for Software Engineer',
      pdfFilename: 'cover-letter.pdf',
      sender: {
        name: 'John Doe',
        title: 'Software Engineer',
        location: 'São Paulo, Brazil',
        email: 'john@example.com',
        phone: '+55 11 99999-9999',
        linkedin: 'linkedin.com/in/johndoe',
      },
      recipient: {
        salutation: 'Dear Hiring Manager',
        name: 'Jane Smith',
        company: 'Acme Corp',
        address: '123 Main St, New York, NY 10001',
      },
      letterDate: '2025-01-15',
      body: [
        { label: 'Opening', content: 'I am writing to express my interest...' },
        { label: 'Experience', content: 'With 5 years of experience...' },
      ],
      closingPhrase: 'Best regards,',
      signature: 'John Doe',
      customLatex: '',
    }
    const result = coverLetterInputSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})

describe('coverLetterInputSchema — validation failures', () => {
  it('rejects invalid locale', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'fr' })
    expect(result.success).toBe(false)
  })

  it('rejects missing locale', () => {
    const result = coverLetterInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid templateId', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'en', templateId: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('rejects cvId that is not a valid UUID', () => {
    const result = coverLetterInputSchema.safeParse({ locale: 'en', cvId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects body with more than 6 items', () => {
    const body = Array.from({ length: 7 }, (_, i) => ({
      label: `Para ${i + 1}`,
      content: `Content ${i + 1}`,
    }))
    const result = coverLetterInputSchema.safeParse({ locale: 'en', body })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 200 chars', () => {
    const result = coverLetterInputSchema.safeParse({
      locale: 'en',
      title: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rejects customLatex exceeding 100000 chars', () => {
    const result = coverLetterInputSchema.safeParse({
      locale: 'en',
      customLatex: 'x'.repeat(100_001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects body item content exceeding 3000 chars', () => {
    const result = coverLetterInputSchema.safeParse({
      locale: 'en',
      body: [{ label: 'Para', content: 'x'.repeat(3001) }],
    })
    expect(result.success).toBe(false)
  })
})

describe('coverLetterCreateSchema', () => {
  it('extends coverLetterInputSchema and requires locale', () => {
    const result = coverLetterCreateSchema.safeParse({ locale: 'en' })
    expect(result.success).toBe(true)
  })

  it('rejects when locale is missing', () => {
    const result = coverLetterCreateSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('CoverLetterInput type', () => {
  it('can construct a typed object from schema parse result', () => {
    const data: CoverLetterInput = coverLetterInputSchema.parse({ locale: 'en' })
    expect(data.locale).toBe('en')
  })
})
