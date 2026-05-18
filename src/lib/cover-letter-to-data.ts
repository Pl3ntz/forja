import type { CoverLetterData } from '../types/cover-letter.js'
import type { CoverLetterInput } from './zod-schemas/cover-letter.js'

interface CoverLetterRow {
  readonly id: string
  readonly userId: string
  readonly cvId: string | null
  readonly locale: string
  readonly templateId: string
  readonly title: string
  readonly pdfFilename: string
  readonly senderName: string
  readonly senderTitle: string
  readonly senderLocation: string
  readonly senderEmail: string
  readonly senderPhone: string
  readonly senderLinkedin: string
  readonly recipientSalutation: string
  readonly recipientName: string
  readonly recipientCompany: string
  readonly recipientAddress: string
  readonly letterDate: string
  readonly closingPhrase: string
  readonly signature: string
  readonly customLatex: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface CoverLetterBodyItemRow {
  readonly id: string
  readonly coverLetterId: string
  readonly orderIndex: number
  readonly label: string
  readonly content: string
}

export function coverLetterRowsToData(
  letter: CoverLetterRow,
  bodyItems: readonly CoverLetterBodyItemRow[],
): CoverLetterData {
  return {
    id: letter.id,
    userId: letter.userId,
    cvId: letter.cvId,
    locale: letter.locale as 'pt' | 'en',
    templateId: letter.templateId as 'default',
    title: letter.title,
    pdfFilename: letter.pdfFilename,
    sender: {
      name: letter.senderName,
      title: letter.senderTitle,
      location: letter.senderLocation,
      email: letter.senderEmail,
      phone: letter.senderPhone,
      linkedin: letter.senderLinkedin,
    },
    recipient: {
      salutation: letter.recipientSalutation,
      name: letter.recipientName,
      company: letter.recipientCompany,
      address: letter.recipientAddress,
    },
    letterDate: letter.letterDate,
    body: bodyItems.map((item) => ({
      label: item.label,
      content: item.content,
    })),
    closingPhrase: letter.closingPhrase,
    signature: letter.signature,
    customLatex: letter.customLatex,
    createdAt: letter.createdAt.toISOString(),
    updatedAt: letter.updatedAt.toISOString(),
  }
}

export function coverLetterInputToData(
  input: CoverLetterInput,
  userId: string,
  id: string,
): CoverLetterData {
  return {
    id,
    userId,
    cvId: input.cvId,
    locale: input.locale,
    templateId: input.templateId,
    title: input.title,
    pdfFilename: input.pdfFilename,
    sender: { ...input.sender },
    recipient: { ...input.recipient },
    letterDate: input.letterDate,
    body: input.body.map((item) => ({ ...item })),
    closingPhrase: input.closingPhrase,
    signature: input.signature,
    customLatex: input.customLatex,
    createdAt: '',
    updatedAt: '',
  }
}
