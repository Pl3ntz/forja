import type { CvData } from '../types/cv.js'
import type { Locale } from './locales.js'
import { DEFAULT_CV_TEMPLATE_ID } from './templates.js'

interface CvRow {
  readonly id: string
  readonly locale: string
  readonly title: string
  readonly pdfFilename: string | null
  readonly templateId: string | null
  readonly name: string
  readonly location: string
  readonly phone: string
  readonly email: string
  readonly linkedin: string
  readonly github: string
  readonly headerTitle: string
  readonly summaryTitle: string
  readonly summaryText: string
  readonly educationTitle: string
  readonly experienceTitle: string
  readonly projectsTitle: string
  readonly skillsTitle: string
  readonly languagesTitle: string
  readonly certificationsTitle?: string
  readonly sectionOrder: string | null
  readonly customSections: string | null
  readonly customLatex: string | null
}

interface EducationRow {
  readonly institution: string
  readonly degree: string
  readonly date: string
  readonly location: string
  readonly highlights: string[] | null
}

interface ExperienceRow {
  readonly company: string
  readonly role: string
  readonly date: string
  readonly location: string
  readonly highlights: string[] | null
  readonly intro: string
  readonly skills: string
}

interface CertificationRow {
  readonly name: string
  readonly issuer: string
  readonly year: string
}

interface ProjectRow {
  readonly name: string
  readonly tech: string
  readonly date: string
  readonly highlights: string[] | null
}

interface SkillRow {
  readonly name: string
  readonly values: string
}

interface LanguageRow {
  readonly name: string
  readonly level: string
}

export function cvRowsToCvData(
  cv: CvRow,
  education: readonly EducationRow[],
  experience: readonly ExperienceRow[],
  projects: readonly ProjectRow[],
  skills: readonly SkillRow[],
  languages: readonly LanguageRow[],
  certifications: readonly CertificationRow[] = [],
): CvData {
  let sectionOrder: string[] | undefined
  if (cv.sectionOrder) {
    try {
      sectionOrder = JSON.parse(cv.sectionOrder) as string[]
    } catch {
      sectionOrder = undefined
    }
  }

  let customSections: { id: string; title: string; items: { text: string }[] }[] | undefined
  if (cv.customSections) {
    try {
      customSections = JSON.parse(cv.customSections) as typeof customSections
    } catch {
      customSections = undefined
    }
  }

  return {
    meta: {
      locale: cv.locale,
      pdfFilename: cv.pdfFilename ?? `cv-${cv.locale}`,
      templateId: cv.templateId ?? DEFAULT_CV_TEMPLATE_ID,
      sectionOrder,
    },
    header: {
      name: cv.name,
      location: cv.location,
      phone: cv.phone,
      email: cv.email,
      linkedin: cv.linkedin,
      github: cv.github,
      title: cv.headerTitle,
    },
    summary: {
      title: cv.summaryTitle,
      text: cv.summaryText,
    },
    education: {
      title: cv.educationTitle,
      items: education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        date: e.date,
        location: e.location,
        highlights: e.highlights ?? [],
      })),
    },
    experience: {
      title: cv.experienceTitle,
      items: experience.map((e) => ({
        company: e.company,
        role: e.role,
        date: e.date,
        location: e.location,
        highlights: e.highlights ?? [],
        intro: e.intro,
        skills: e.skills,
      })),
    },
    projects: {
      title: cv.projectsTitle,
      items: projects.map((p) => ({
        name: p.name,
        tech: p.tech,
        date: p.date,
        highlights: p.highlights ?? [],
      })),
    },
    skills: {
      title: cv.skillsTitle,
      categories: skills.map((s) => ({
        name: s.name,
        values: s.values,
      })),
    },
    languages: {
      title: cv.languagesTitle,
      items: languages.map((l) => ({
        name: l.name,
        level: l.level,
      })),
    },
    certifications: certifications.length > 0
      ? {
          title: cv.certificationsTitle ?? 'Certifications',
          items: certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
            year: c.year,
          })),
        }
      : undefined,
    customSections,
  }
}

export function cvInputToCvData(
  input: {
    readonly header: CvData['header']
    readonly summary: CvData['summary']
    readonly education: CvData['education']
    readonly experience: CvData['experience']
    readonly projects: CvData['projects']
    readonly skills: CvData['skills']
    readonly languages: CvData['languages']
    readonly certifications?: CvData['certifications']
    readonly templateId?: string
    readonly sectionOrder?: readonly string[]
    readonly customSections?: readonly { readonly id: string; readonly title: string; readonly items: readonly { readonly text: string }[] }[]
  },
  locale: Locale,
  pdfFilename?: string,
  templateId?: string,
): CvData {
  return {
    meta: {
      locale,
      pdfFilename: pdfFilename ?? `cv-${locale}`,
      templateId: templateId ?? input.templateId ?? DEFAULT_CV_TEMPLATE_ID,
      sectionOrder: input.sectionOrder,
    },
    header: input.header,
    summary: input.summary,
    education: input.education,
    experience: input.experience,
    projects: input.projects,
    skills: input.skills,
    languages: input.languages,
    certifications: input.certifications,
    customSections: input.customSections,
  }
}
