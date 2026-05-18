export const CV_TEMPLATE_IDS = ['jake', 'modern'] as const
export type CvTemplateId = (typeof CV_TEMPLATE_IDS)[number]
export const DEFAULT_CV_TEMPLATE_ID: CvTemplateId = 'jake'

export const COVER_LETTER_TEMPLATE_IDS = ['default'] as const
export type CoverLetterTemplateId = (typeof COVER_LETTER_TEMPLATE_IDS)[number]
export const DEFAULT_COVER_LETTER_TEMPLATE_ID: CoverLetterTemplateId = 'default'

export interface TemplateConfig {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly latexDir: string
  readonly cssDir: string
}

export const CV_TEMPLATES: Readonly<Record<CvTemplateId, TemplateConfig>> = {
  jake: {
    id: 'jake',
    name: "Jake's Resume",
    description: 'Clean single-column resume. Popular on Overleaf.',
    latexDir: 'latex/jake',
    cssDir: 'src/styles/templates/jake',
  },
  modern: {
    id: 'modern',
    name: 'Modern Resume',
    description: 'Modern single-column with title subtitle, role intros and certifications section.',
    latexDir: 'latex/modern',
    cssDir: 'src/styles/templates/modern',
  },
}

export const COVER_LETTER_TEMPLATES: Readonly<Record<CoverLetterTemplateId, TemplateConfig>> = {
  default: {
    id: 'default',
    name: 'Default Cover Letter',
    description: 'Single-page cover letter with header, salutation, body and closing.',
    latexDir: 'latex/cover-letter-default',
    cssDir: 'src/styles/templates/cover-letter-default',
  },
}

export function getCvTemplate(id: CvTemplateId): TemplateConfig {
  return CV_TEMPLATES[id]
}

export function getCoverLetterTemplate(id: CoverLetterTemplateId): TemplateConfig {
  return COVER_LETTER_TEMPLATES[id]
}

export function isValidCvTemplateId(value: string): value is CvTemplateId {
  return CV_TEMPLATE_IDS.includes(value as CvTemplateId)
}

export function isValidCoverLetterTemplateId(value: string): value is CoverLetterTemplateId {
  return COVER_LETTER_TEMPLATE_IDS.includes(value as CoverLetterTemplateId)
}

/** @deprecated use CV_TEMPLATE_IDS */
export const TEMPLATE_IDS = CV_TEMPLATE_IDS

/** @deprecated use CvTemplateId */
export type TemplateId = CvTemplateId

/** @deprecated use DEFAULT_CV_TEMPLATE_ID */
export const DEFAULT_TEMPLATE_ID = DEFAULT_CV_TEMPLATE_ID

/** @deprecated use CV_TEMPLATES */
export const TEMPLATES = CV_TEMPLATES

/** @deprecated use getCvTemplate */
export function getTemplate(id: CvTemplateId): TemplateConfig {
  return getCvTemplate(id)
}

/** @deprecated use isValidCvTemplateId */
export function isValidTemplateId(value: string): value is CvTemplateId {
  return isValidCvTemplateId(value)
}
