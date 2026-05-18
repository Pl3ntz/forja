import { z } from 'zod'
import { COVER_LETTER_TEMPLATE_IDS, DEFAULT_COVER_LETTER_TEMPLATE_ID } from '../templates.js'

const senderSchema = z.object({
  name: z.string().max(200).default(''),
  title: z.string().max(200).default(''),
  location: z.string().max(200).default(''),
  email: z.string().max(200).default(''),
  phone: z.string().max(50).default(''),
  linkedin: z.string().max(300).default(''),
})

const recipientSchema = z.object({
  salutation: z.string().max(200).default('Dear Hiring Manager'),
  name: z.string().max(200).default(''),
  company: z.string().max(200).default(''),
  address: z.string().max(500).default(''),
})

const bodyItemSchema = z.object({
  label: z.string().max(100).default(''),
  content: z.string().max(3000).default(''),
})

export const coverLetterInputSchema = z.object({
  locale: z.enum(['pt', 'en']),
  templateId: z.enum(COVER_LETTER_TEMPLATE_IDS).default(DEFAULT_COVER_LETTER_TEMPLATE_ID),
  cvId: z.string().uuid().nullable().default(null),
  title: z.string().max(200).default(''),
  pdfFilename: z.string().max(200).default(''),
  sender: senderSchema.optional().transform(v => senderSchema.parse(v ?? {})),
  recipient: recipientSchema.optional().transform(v => recipientSchema.parse(v ?? {})),
  letterDate: z.string().max(100).default(''),
  body: z.array(bodyItemSchema).max(6).default([]),
  closingPhrase: z.string().max(100).default('Sincerely,'),
  signature: z.string().max(200).default(''),
  customLatex: z.string().max(100_000).default(''),
})

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>

export const coverLetterCreateSchema = coverLetterInputSchema.extend({
  locale: z.enum(['pt', 'en']),
})
