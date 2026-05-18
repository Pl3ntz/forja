import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module before importing the module under test
const mockSelect = vi.fn(() => ({}))
const mockDb = {
  select: mockSelect,
}

vi.mock('../../src/db/index.js', () => ({ db: mockDb }))

// After mocking, import the module under test
const { loadCoverLetter } = await import('../../src/lib/load-cover-letter.js')

// ---- helpers to build DB row shapes ----

function makeLetter(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cl-1',
    userId: 'user-1',
    cvId: null,
    locale: 'en',
    templateId: 'default',
    title: 'My Cover Letter',
    pdfFilename: 'John_Doe_Cover_Letter.pdf',
    senderName: 'John Doe',
    senderTitle: 'Engineer',
    senderLocation: 'NYC',
    senderEmail: 'john@example.com',
    senderPhone: '+1 555-0000',
    senderLinkedin: '',
    recipientSalutation: 'Dear Hiring Manager',
    recipientName: '',
    recipientCompany: 'Acme',
    recipientAddress: '',
    letterDate: '2025-01-01',
    closingPhrase: 'Sincerely,',
    signature: 'John Doe',
    customLatex: '',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
    ...overrides,
  }
}

function makeBodyItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bi-1',
    coverLetterId: 'cl-1',
    orderIndex: 0,
    label: 'Opening',
    content: 'I am writing...',
    ...overrides,
  }
}

// ---- Chainable mock builder ----

function buildChain(finalResult: unknown) {
  const chain: Record<string, unknown> = {}
  chain.from = vi.fn(() => chain)
  chain.where = vi.fn(() => chain)
  chain.limit = vi.fn(() => Promise.resolve(finalResult))
  chain.orderBy = vi.fn(() => Promise.resolve(finalResult))
  return chain
}

describe('loadCoverLetter — not found cases', () => {
  it('returns null when the cover letter does not exist', async () => {
    const letterChain = buildChain([])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-nonexistent')
    expect(result).toBeNull()
  })

  it('returns null when the cover letter belongs to another user', async () => {
    // Letter exists but userId mismatch — DB where clause returns empty
    const letterChain = buildChain([])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('wrong-user', 'cl-1')
    expect(result).toBeNull()
  })
})

describe('loadCoverLetter — success cases', () => {
  beforeEach(() => {
    mockSelect.mockReset()
  })

  it('returns CoverLetterData when letter found with no body items', async () => {
    const letter = makeLetter()
    const letterChain = buildChain([letter])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-1')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('cl-1')
    expect(result!.userId).toBe('user-1')
    expect(result!.body).toEqual([])
  })

  it('returns CoverLetterData with body items mapped', async () => {
    const letter = makeLetter()
    const items = [
      makeBodyItem({ orderIndex: 0, label: 'Opening', content: 'First paragraph' }),
      makeBodyItem({ id: 'bi-2', orderIndex: 1, label: 'Body', content: 'Second paragraph' }),
    ]
    const letterChain = buildChain([letter])
    const bodyChain = buildChain(items)
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-1')
    expect(result).not.toBeNull()
    expect(result!.body).toHaveLength(2)
    expect(result!.body[0].label).toBe('Opening')
    expect(result!.body[1].label).toBe('Body')
  })

  it('maps sender fields correctly', async () => {
    const letter = makeLetter({ senderName: 'Alice', senderEmail: 'alice@example.com' })
    const letterChain = buildChain([letter])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-1')
    expect(result!.sender.name).toBe('Alice')
    expect(result!.sender.email).toBe('alice@example.com')
  })

  it('maps recipient fields correctly', async () => {
    const letter = makeLetter({ recipientCompany: 'TechCorp', recipientSalutation: 'To Whom It May Concern' })
    const letterChain = buildChain([letter])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-1')
    expect(result!.recipient.company).toBe('TechCorp')
    expect(result!.recipient.salutation).toBe('To Whom It May Concern')
  })

  it('maps locale, templateId, title, pdfFilename', async () => {
    const letter = makeLetter({ locale: 'pt', templateId: 'default', title: 'My Letter', pdfFilename: 'letter.pdf' })
    const letterChain = buildChain([letter])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-1')
    expect(result!.locale).toBe('pt')
    expect(result!.templateId).toBe('default')
    expect(result!.title).toBe('My Letter')
    expect(result!.pdfFilename).toBe('letter.pdf')
  })

  it('maps cvId (nullable)', async () => {
    const cvId = '550e8400-e29b-41d4-a716-446655440000'
    const letter = makeLetter({ cvId })
    const letterChain = buildChain([letter])
    const bodyChain = buildChain([])
    let callCount = 0
    mockSelect.mockImplementation(() => {
      callCount++
      return callCount === 1 ? letterChain : bodyChain
    })

    const result = await loadCoverLetter('user-1', 'cl-1')
    expect(result!.cvId).toBe(cvId)
  })
})
