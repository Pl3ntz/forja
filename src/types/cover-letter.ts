import type { CoverLetterInput } from '../lib/zod-schemas/cover-letter.js'

export type CoverLetterData = CoverLetterInput & {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}
