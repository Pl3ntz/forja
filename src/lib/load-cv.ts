import { eq, and, asc, desc } from 'drizzle-orm'
import type { CvData } from '../types/cv.js'
import { db } from '../db/index.js'
import {
  cvs,
  cvEducationItems,
  cvExperienceItems,
  cvProjectItems,
  cvSkillCategories,
  cvLanguageItems,
  cvCertificationItems,
} from '../db/schema/index.js'
import { cvRowsToCvData } from './cv-to-data.js'

export async function loadCvById(
  cvId: string,
  userId: string,
): Promise<CvData | null> {
  const [cv] = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
    .limit(1)

  if (!cv) return null

  const [education, experience, projects, skills, languages, certifications] =
    await Promise.all([
      db
        .select()
        .from(cvEducationItems)
        .where(eq(cvEducationItems.cvId, cv.id))
        .orderBy(asc(cvEducationItems.orderIndex)),
      db
        .select()
        .from(cvExperienceItems)
        .where(eq(cvExperienceItems.cvId, cv.id))
        .orderBy(asc(cvExperienceItems.orderIndex)),
      db
        .select()
        .from(cvProjectItems)
        .where(eq(cvProjectItems.cvId, cv.id))
        .orderBy(asc(cvProjectItems.orderIndex)),
      db
        .select()
        .from(cvSkillCategories)
        .where(eq(cvSkillCategories.cvId, cv.id))
        .orderBy(asc(cvSkillCategories.orderIndex)),
      db
        .select()
        .from(cvLanguageItems)
        .where(eq(cvLanguageItems.cvId, cv.id))
        .orderBy(asc(cvLanguageItems.orderIndex)),
      db
        .select()
        .from(cvCertificationItems)
        .where(eq(cvCertificationItems.cvId, cv.id))
        .orderBy(asc(cvCertificationItems.orderIndex)),
    ])

  return cvRowsToCvData(cv, education, experience, projects, skills, languages, certifications)
}

export async function getUserCvs(
  userId: string,
): Promise<Array<{ id: string; title: string; locale: string; name: string; updatedAt: Date; templateId: string }>> {
  return db
    .select({
      id: cvs.id,
      title: cvs.title,
      locale: cvs.locale,
      name: cvs.name,
      updatedAt: cvs.updatedAt,
      templateId: cvs.templateId,
    })
    .from(cvs)
    .where(eq(cvs.userId, userId))
    .orderBy(desc(cvs.updatedAt))
}
