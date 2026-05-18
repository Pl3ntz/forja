import { resolve } from 'node:path'
import type { CvData } from '../types/cv.js'
import type { CoverLetterData } from '../types/cover-letter.js'
import { generateTexFromData, generateTexFromCoverLetter } from '../../scripts/generate-tex.js'
import { compilePdfFromTex } from '../../scripts/compile-pdf.js'
import { pdfQueue } from './pdf-queue.js'
import {
  getCvTemplate,
  isValidCvTemplateId,
  DEFAULT_CV_TEMPLATE_ID,
  getCoverLetterTemplate,
  isValidCoverLetterTemplateId,
  DEFAULT_COVER_LETTER_TEMPLATE_ID,
} from './templates.js'
import { validateUserLatex, DangerousLatexError } from './latex-validation.js'

export async function generatePdf(cvData: CvData): Promise<Buffer> {
  return pdfQueue.add(async () => {
    const templateId = isValidCvTemplateId(cvData.meta.templateId)
      ? cvData.meta.templateId
      : DEFAULT_CV_TEMPLATE_ID
    const config = getCvTemplate(templateId)
    const preamblePath = resolve(process.cwd(), config.latexDir, 'preamble.tex')
    const tex = generateTexFromData(cvData)
    return compilePdfFromTex(tex, preamblePath)
  }) as Promise<Buffer>
}

export async function generatePdfFromCustomLatex(latex: string): Promise<Buffer> {
  validateUserLatex(latex)
  return pdfQueue.add(async () => {
    return compilePdfFromTex(latex)
  }) as Promise<Buffer>
}

export async function generateCoverLetterPdf(data: CoverLetterData): Promise<Buffer> {
  return pdfQueue.add(async () => {
    const templateId = isValidCoverLetterTemplateId(data.templateId)
      ? data.templateId
      : DEFAULT_COVER_LETTER_TEMPLATE_ID
    const config = getCoverLetterTemplate(templateId)
    const preamblePath = resolve(process.cwd(), config.latexDir, 'preamble.tex')
    const tex = generateTexFromCoverLetter(data)
    return compilePdfFromTex(tex, preamblePath)
  }) as Promise<Buffer>
}

export async function generateCoverLetterPdfFromCustomLatex(latex: string, _baseName = 'CoverLetter'): Promise<Buffer> {
  validateUserLatex(latex)
  return pdfQueue.add(async () => {
    const preamblePath = resolve(process.cwd(), 'latex/cover-letter-default/preamble.tex')
    return compilePdfFromTex(latex, preamblePath)
  }) as Promise<Buffer>
}

export { DangerousLatexError }
