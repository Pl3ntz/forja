import { describe, it, expect } from 'vitest'
import {
  CV_TEMPLATE_IDS,
  COVER_LETTER_TEMPLATE_IDS,
  DEFAULT_CV_TEMPLATE_ID,
  DEFAULT_COVER_LETTER_TEMPLATE_ID,
  CV_TEMPLATES,
  COVER_LETTER_TEMPLATES,
  getCvTemplate,
  getCoverLetterTemplate,
  isValidCvTemplateId,
  isValidCoverLetterTemplateId,
  // backward-compat aliases
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE_ID,
  TEMPLATES,
  getTemplate,
  isValidTemplateId,
} from '../../src/lib/templates.js'

describe('CV template registry', () => {
  it('CV_TEMPLATE_IDS contains jake and modern', () => {
    expect(CV_TEMPLATE_IDS).toContain('jake')
    expect(CV_TEMPLATE_IDS).toContain('modern')
  })

  it('DEFAULT_CV_TEMPLATE_ID is jake', () => {
    expect(DEFAULT_CV_TEMPLATE_ID).toBe('jake')
  })

  it('CV_TEMPLATES has both jake and modern entries', () => {
    expect(CV_TEMPLATES.jake).toBeDefined()
    expect(CV_TEMPLATES.modern).toBeDefined()
  })

  it('CV_TEMPLATES jake entry has required shape', () => {
    const t = CV_TEMPLATES.jake
    expect(t.id).toBe('jake')
    expect(typeof t.name).toBe('string')
    expect(typeof t.description).toBe('string')
    expect(typeof t.latexDir).toBe('string')
    expect(typeof t.cssDir).toBe('string')
  })

  it('CV_TEMPLATES modern entry has required shape', () => {
    const t = CV_TEMPLATES.modern
    expect(t.id).toBe('modern')
    expect(t.latexDir).toBe('latex/modern')
    expect(t.cssDir).toBe('src/styles/templates/modern')
  })

  it('getCvTemplate returns correct template for valid id', () => {
    expect(getCvTemplate('jake').id).toBe('jake')
    expect(getCvTemplate('modern').id).toBe('modern')
  })

  it('isValidCvTemplateId returns true for valid ids', () => {
    expect(isValidCvTemplateId('jake')).toBe(true)
    expect(isValidCvTemplateId('modern')).toBe(true)
  })

  it('isValidCvTemplateId returns false for unknown ids', () => {
    expect(isValidCvTemplateId('unknown')).toBe(false)
    expect(isValidCvTemplateId('')).toBe(false)
    expect(isValidCvTemplateId('classic')).toBe(false)
  })
})

describe('Cover letter template registry', () => {
  it('COVER_LETTER_TEMPLATE_IDS contains default', () => {
    expect(COVER_LETTER_TEMPLATE_IDS).toContain('default')
  })

  it('DEFAULT_COVER_LETTER_TEMPLATE_ID is default', () => {
    expect(DEFAULT_COVER_LETTER_TEMPLATE_ID).toBe('default')
  })

  it('COVER_LETTER_TEMPLATES has default entry', () => {
    expect(COVER_LETTER_TEMPLATES.default).toBeDefined()
  })

  it('COVER_LETTER_TEMPLATES default entry has required shape', () => {
    const t = COVER_LETTER_TEMPLATES.default
    expect(t.id).toBe('default')
    expect(t.latexDir).toBe('latex/cover-letter-default')
    expect(t.cssDir).toBe('src/styles/templates/cover-letter-default')
  })

  it('getCoverLetterTemplate returns default template', () => {
    expect(getCoverLetterTemplate('default').id).toBe('default')
  })

  it('isValidCoverLetterTemplateId returns true for default', () => {
    expect(isValidCoverLetterTemplateId('default')).toBe(true)
  })

  it('isValidCoverLetterTemplateId returns false for unknown ids', () => {
    expect(isValidCoverLetterTemplateId('jake')).toBe(false)
    expect(isValidCoverLetterTemplateId('')).toBe(false)
  })
})

describe('backward-compat aliases', () => {
  it('TEMPLATE_IDS is alias for CV_TEMPLATE_IDS', () => {
    expect(TEMPLATE_IDS).toBe(CV_TEMPLATE_IDS)
  })

  it('DEFAULT_TEMPLATE_ID is alias for DEFAULT_CV_TEMPLATE_ID', () => {
    expect(DEFAULT_TEMPLATE_ID).toBe(DEFAULT_CV_TEMPLATE_ID)
  })

  it('TEMPLATES is alias for CV_TEMPLATES', () => {
    expect(TEMPLATES).toBe(CV_TEMPLATES)
  })

  it('getTemplate resolves via CV registry', () => {
    expect(getTemplate('jake').id).toBe('jake')
  })

  it('isValidTemplateId delegates to CV variant', () => {
    expect(isValidTemplateId('jake')).toBe(true)
    expect(isValidTemplateId('modern')).toBe(true)
    expect(isValidTemplateId('unknown')).toBe(false)
  })
})
