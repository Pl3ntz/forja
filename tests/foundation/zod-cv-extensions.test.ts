import { describe, it, expect } from 'vitest'
import { cvInputSchema, cvCreateSchema } from '../../src/lib/zod-schemas/cv.js'
import { DEFAULT_CV_TEMPLATE_ID, CV_TEMPLATE_IDS } from '../../src/lib/templates.js'

describe('cvInputSchema — templateId uses DEFAULT_CV_TEMPLATE_ID', () => {
  it('defaults templateId to DEFAULT_CV_TEMPLATE_ID when not provided', () => {
    const result = cvInputSchema.safeParse({
      header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
      summary: { title: '', text: '' },
      education: { title: '', items: [] },
      experience: { title: '', items: [] },
      projects: { title: '', items: [] },
      skills: { title: '', categories: [] },
      languages: { title: '', items: [] },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.templateId).toBe(DEFAULT_CV_TEMPLATE_ID)
    expect(result.data.templateId).toBe('jake')
  })

  it('accepts modern templateId', () => {
    const result = cvInputSchema.safeParse({
      templateId: 'modern',
      header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
      summary: { title: '', text: '' },
      education: { title: '', items: [] },
      experience: { title: '', items: [] },
      projects: { title: '', items: [] },
      skills: { title: '', categories: [] },
      languages: { title: '', items: [] },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.templateId).toBe('modern')
  })

  it('rejects invalid templateId', () => {
    const result = cvInputSchema.safeParse({
      templateId: 'classic',
      header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
      summary: { title: '', text: '' },
      education: { title: '', items: [] },
      experience: { title: '', items: [] },
      projects: { title: '', items: [] },
      skills: { title: '', categories: [] },
      languages: { title: '', items: [] },
    })
    expect(result.success).toBe(false)
  })
})

describe('cvInputSchema — header.title new optional field', () => {
  const basePayload = {
    header: { name: 'John', location: '', phone: '', email: '', linkedin: '', github: '' },
    summary: { title: '', text: '' },
    education: { title: '', items: [] },
    experience: { title: '', items: [] },
    projects: { title: '', items: [] },
    skills: { title: '', categories: [] },
    languages: { title: '', items: [] },
  }

  it('defaults header.title to empty string when not provided', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.header.title).toBe('')
  })

  it('accepts header.title when provided', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      header: { ...basePayload.header, title: 'Software Engineer' },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.header.title).toBe('Software Engineer')
  })

  it('rejects header.title exceeding 200 chars', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      header: { ...basePayload.header, title: 'a'.repeat(201) },
    })
    expect(result.success).toBe(false)
  })

  it('old payload without header.title still parses (backward compat)', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
  })
})

describe('cvInputSchema — experience item new optional fields', () => {
  const baseExp = {
    company: 'Acme', role: 'Engineer', date: '2020-2023',
    location: 'NYC', highlights: [],
  }
  const basePayload = {
    header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
    summary: { title: '', text: '' },
    education: { title: '', items: [] },
    experience: { title: 'Exp', items: [baseExp] },
    projects: { title: '', items: [] },
    skills: { title: '', categories: [] },
    languages: { title: '', items: [] },
  }

  it('defaults experience item intro to empty string', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].intro).toBe('')
  })

  it('defaults experience item skills to empty string', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].skills).toBe('')
  })

  it('accepts experience item with intro and skills', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      experience: {
        title: 'Exp',
        items: [{ ...baseExp, intro: 'Led team of 5.', skills: 'TypeScript, React' }],
      },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].intro).toBe('Led team of 5.')
    expect(result.data.experience.items[0].skills).toBe('TypeScript, React')
  })

  it('rejects experience item intro exceeding 2000 chars', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      experience: {
        title: 'Exp',
        items: [{ ...baseExp, intro: 'x'.repeat(2001) }],
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects experience item skills exceeding 500 chars', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      experience: {
        title: 'Exp',
        items: [{ ...baseExp, skills: 'x'.repeat(501) }],
      },
    })
    expect(result.success).toBe(false)
  })

  it('old payload without intro/skills still parses (backward compat)', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
  })
})

describe('cvInputSchema — certifications section', () => {
  const basePayload = {
    header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
    summary: { title: '', text: '' },
    education: { title: '', items: [] },
    experience: { title: '', items: [] },
    projects: { title: '', items: [] },
    skills: { title: '', categories: [] },
    languages: { title: '', items: [] },
  }

  it('defaults certifications to undefined or structured default when not provided', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    // certifications is optional; either undefined or has default shape
  })

  it('accepts certifications section with items', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      certifications: {
        title: 'Certifications',
        items: [
          { name: 'AWS Certified', issuer: 'Amazon', year: '2023' },
          { name: 'CKA', issuer: 'CNCF', year: '2022' },
        ],
      },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.certifications?.items[0].name).toBe('AWS Certified')
  })

  it('accepts certification item with optional issuer and year', () => {
    const result = cvInputSchema.safeParse({
      ...basePayload,
      certifications: {
        title: 'Certs',
        items: [{ name: 'Docker Certified' }],
      },
    })
    expect(result.success).toBe(true)
  })

  it('old payload without certifications still parses (backward compat)', () => {
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
  })
})

describe('cvCreateSchema — templateId default', () => {
  it('defaults templateId to DEFAULT_CV_TEMPLATE_ID', () => {
    const result = cvCreateSchema.safeParse({ locale: 'en' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.templateId).toBe(DEFAULT_CV_TEMPLATE_ID)
  })

  it('accepts modern templateId', () => {
    const result = cvCreateSchema.safeParse({ locale: 'en', templateId: 'modern' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.templateId).toBe('modern')
  })
})
