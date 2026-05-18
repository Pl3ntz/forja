import { eq, and, asc } from 'drizzle-orm'
import type { CoverLetterData } from '../types/cover-letter.js'
import { db } from '../db/index.js'
import { coverLetters, coverLetterBodyItems } from '../db/schema/index.js'
import { coverLetterRowsToData } from './cover-letter-to-data.js'

export async function loadCoverLetter(
  userId: string,
  coverLetterId: string,
): Promise<CoverLetterData | null> {
  const [letter] = await db
    .select()
    .from(coverLetters)
    .where(and(eq(coverLetters.id, coverLetterId), eq(coverLetters.userId, userId)))
    .limit(1)

  if (!letter) return null

  const bodyItems = await db
    .select()
    .from(coverLetterBodyItems)
    .where(eq(coverLetterBodyItems.coverLetterId, letter.id))
    .orderBy(asc(coverLetterBodyItems.orderIndex))

  return coverLetterRowsToData(letter, bodyItems)
}
