import { describe, it, expect } from 'vitest'
import { DEFAULT_CV_TEMPLATE_ID } from '../../src/lib/templates.js'
import { getFormDefaults } from '../../src/lib/form-defaults.js'

describe('hardcode cleanup — form-defaults uses DEFAULT_CV_TEMPLATE_ID', () => {
  it('getFormDefaults("pt").templateId equals DEFAULT_CV_TEMPLATE_ID', () => {
    const defaults = getFormDefaults('pt')
    expect(defaults.templateId).toBe(DEFAULT_CV_TEMPLATE_ID)
  })

  it('getFormDefaults("en").templateId equals DEFAULT_CV_TEMPLATE_ID', () => {
    const defaults = getFormDefaults('en')
    expect(defaults.templateId).toBe(DEFAULT_CV_TEMPLATE_ID)
  })

  it('DEFAULT_CV_TEMPLATE_ID is jake (sanity check)', () => {
    expect(DEFAULT_CV_TEMPLATE_ID).toBe('jake')
  })
})
