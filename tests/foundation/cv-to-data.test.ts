import { describe, it, expect } from 'vitest'
import { cvRowsToCvData, cvInputToCvData } from '../../src/lib/cv-to-data.js'

// Minimal base row fixtures

const baseCvRow = {
  id: 'cv-1',
  locale: 'en',
  title: 'My CV',
  pdfFilename: null,
  templateId: null,
  name: 'Jane Doe',
  location: 'NYC',
  phone: '555-0000',
  email: 'jane@example.com',
  linkedin: 'janedoe',
  github: 'jdoe',
  headerTitle: '',
  summaryTitle: 'Summary',
  summaryText: 'A summary.',
  educationTitle: 'Education',
  experienceTitle: 'Experience',
  projectsTitle: 'Projects',
  skillsTitle: 'Skills',
  languagesTitle: 'Languages',
  certificationsTitle: 'Certifications',
  sectionOrder: null,
  customSections: null,
  customLatex: null,
}

const baseExperienceRow = {
  company: 'Acme',
  role: 'Engineer',
  date: '2020-2023',
  location: 'NYC',
  highlights: ['Did things'],
  intro: '',
  skills: '',
}

const baseCertificationRow = {
  name: 'AWS Certified',
  issuer: 'Amazon',
  year: '2023',
}

// --- cvRowsToCvData ---

describe('cvRowsToCvData — header.title', () => {
  it('maps headerTitle empty string to header.title empty string', () => {
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], [])
    expect(data.header.title).toBe('')
  })

  it('maps headerTitle non-empty to header.title', () => {
    const cv = { ...baseCvRow, headerTitle: 'Software Engineer' }
    const data = cvRowsToCvData(cv, [], [], [], [], [], [])
    expect(data.header.title).toBe('Software Engineer')
  })

  it('header.title is always a string (never undefined)', () => {
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], [])
    expect(typeof data.header.title).toBe('string')
  })
})

describe('cvRowsToCvData — experience intro and skills', () => {
  it('maps intro empty string from row to experience item', () => {
    const data = cvRowsToCvData(baseCvRow, [], [baseExperienceRow], [], [], [], [])
    expect(data.experience.items[0].intro).toBe('')
  })

  it('maps intro non-empty value from row to experience item', () => {
    const row = { ...baseExperienceRow, intro: 'Led team of 5 engineers.' }
    const data = cvRowsToCvData(baseCvRow, [], [row], [], [], [], [])
    expect(data.experience.items[0].intro).toBe('Led team of 5 engineers.')
  })

  it('maps skills empty string from row to experience item', () => {
    const data = cvRowsToCvData(baseCvRow, [], [baseExperienceRow], [], [], [], [])
    expect(data.experience.items[0].skills).toBe('')
  })

  it('maps skills non-empty value from row to experience item', () => {
    const row = { ...baseExperienceRow, skills: 'TypeScript, React, Node.js' }
    const data = cvRowsToCvData(baseCvRow, [], [row], [], [], [], [])
    expect(data.experience.items[0].skills).toBe('TypeScript, React, Node.js')
  })

  it('intro and skills are always strings (never undefined)', () => {
    const data = cvRowsToCvData(baseCvRow, [], [baseExperienceRow], [], [], [], [])
    expect(typeof data.experience.items[0].intro).toBe('string')
    expect(typeof data.experience.items[0].skills).toBe('string')
  })
})

describe('cvRowsToCvData — certifications', () => {
  it('returns no certifications when rows array is empty', () => {
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], [])
    expect(data.certifications).toBeUndefined()
  })

  it('builds certifications section from rows', () => {
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], [baseCertificationRow])
    expect(data.certifications).toBeDefined()
    expect(data.certifications!.items).toHaveLength(1)
    expect(data.certifications!.items[0].name).toBe('AWS Certified')
    expect(data.certifications!.items[0].issuer).toBe('Amazon')
    expect(data.certifications!.items[0].year).toBe('2023')
  })

  it('maps multiple certification rows preserving order', () => {
    const rows = [
      { name: 'CKA', issuer: 'CNCF', year: '2022' },
      { name: 'AWS Certified', issuer: 'Amazon', year: '2023' },
    ]
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], rows)
    expect(data.certifications!.items[0].name).toBe('CKA')
    expect(data.certifications!.items[1].name).toBe('AWS Certified')
  })

  it('maps empty issuer and year strings from row', () => {
    const row = { name: 'Docker Certified', issuer: '', year: '' }
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], [row])
    expect(data.certifications!.items[0].issuer).toBe('')
    expect(data.certifications!.items[0].year).toBe('')
  })

  it('uses certificationsTitle from CV row as section title', () => {
    const cv = { ...baseCvRow, certificationsTitle: 'My Certs' }
    const data = cvRowsToCvData(cv, [], [], [], [], [], [baseCertificationRow])
    expect(data.certifications!.title).toBe('My Certs')
  })
})

// --- cvInputToCvData ---

const baseInput = {
  templateId: 'jake' as const,
  header: { name: 'Jane Doe', location: 'NYC', phone: '', email: '', linkedin: '', github: '', title: '' },
  summary: { title: 'Summary', text: '' },
  education: { title: 'Education', items: [] },
  experience: {
    title: 'Experience',
    items: [
      {
        company: 'Acme', role: 'Engineer', date: '2020-2023',
        location: 'NYC', highlights: [], intro: '', skills: '',
      },
    ],
  },
  projects: { title: 'Projects', items: [] },
  skills: { title: 'Skills', categories: [] },
  languages: { title: 'Languages', items: [] },
} as const

describe('cvInputToCvData — header.title', () => {
  it('passes header.title from input to output', () => {
    const input = { ...baseInput, header: { ...baseInput.header, title: 'Staff Engineer' } }
    const data = cvInputToCvData(input, 'en')
    expect(data.header.title).toBe('Staff Engineer')
  })

  it('passes empty header.title through', () => {
    const data = cvInputToCvData(baseInput, 'en')
    expect(data.header.title).toBe('')
  })
})

describe('cvInputToCvData — experience intro and skills', () => {
  it('passes intro from input experience item to output', () => {
    const input = {
      ...baseInput,
      experience: {
        title: 'Experience',
        items: [{ ...baseInput.experience.items[0], intro: 'Led team of 5.' }],
      },
    }
    const data = cvInputToCvData(input, 'en')
    expect(data.experience.items[0].intro).toBe('Led team of 5.')
  })

  it('passes empty intro through', () => {
    const data = cvInputToCvData(baseInput, 'en')
    expect(data.experience.items[0].intro).toBe('')
  })

  it('passes skills from input experience item to output', () => {
    const input = {
      ...baseInput,
      experience: {
        title: 'Experience',
        items: [{ ...baseInput.experience.items[0], skills: 'TypeScript, Go' }],
      },
    }
    const data = cvInputToCvData(input, 'en')
    expect(data.experience.items[0].skills).toBe('TypeScript, Go')
  })

  it('passes empty skills through', () => {
    const data = cvInputToCvData(baseInput, 'en')
    expect(data.experience.items[0].skills).toBe('')
  })
})

describe('cvInputToCvData — certifications', () => {
  it('maps certifications from input to output', () => {
    const input = {
      ...baseInput,
      certifications: {
        title: 'Certifications',
        items: [{ name: 'AWS Certified', issuer: 'Amazon', year: '2023' }],
      },
    }
    const data = cvInputToCvData(input, 'en')
    expect(data.certifications).toBeDefined()
    expect(data.certifications!.title).toBe('Certifications')
    expect(data.certifications!.items[0].name).toBe('AWS Certified')
  })

  it('produces undefined certifications when input certifications absent', () => {
    const data = cvInputToCvData(baseInput, 'en')
    expect(data.certifications).toBeUndefined()
  })
})

describe('round-trip: empty input produces empty strings for new fields', () => {
  it('cvRowsToCvData produces empty strings for new fields with empty defaults', () => {
    const data = cvRowsToCvData(baseCvRow, [], [], [], [], [], [])
    expect(data.header.title).toBe('')
    // no experience items to check, but structure should be valid
    expect(data.experience.items).toHaveLength(0)
  })

  it('cvInputToCvData preserves empty string (not undefined) for new fields', () => {
    const data = cvInputToCvData(baseInput, 'en')
    expect(data.header.title).toBe('')
    expect(data.experience.items[0].intro).toBe('')
    expect(data.experience.items[0].skills).toBe('')
  })
})
