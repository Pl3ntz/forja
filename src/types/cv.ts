export interface CvMeta {
  readonly locale: string
  readonly pdfFilename: string
  readonly templateId: string
  readonly sectionOrder?: readonly string[]
}

export interface CvHeader {
  readonly name: string
  readonly location: string
  readonly phone: string
  readonly email: string
  readonly linkedin: string
  readonly github: string
  readonly title: string
}

export interface CvSummary {
  readonly title: string
  readonly text: string
}

export interface EducationItem {
  readonly institution: string
  readonly degree: string
  readonly date: string
  readonly location: string
  readonly highlights: readonly string[]
}

export interface CvEducation {
  readonly title: string
  readonly items: readonly EducationItem[]
}

export interface ExperienceItem {
  readonly company: string
  readonly role: string
  readonly date: string
  readonly location: string
  readonly highlights: readonly string[]
  readonly intro: string
  readonly skills: string
}

export interface CvExperience {
  readonly title: string
  readonly items: readonly ExperienceItem[]
}

export interface ProjectItem {
  readonly name: string
  readonly tech: string
  readonly date: string
  readonly highlights: readonly string[]
}

export interface CvProjects {
  readonly title: string
  readonly items: readonly ProjectItem[]
}

export interface SkillCategory {
  readonly name: string
  readonly values: string
}

export interface CvSkills {
  readonly title: string
  readonly categories: readonly SkillCategory[]
}

export interface LanguageItem {
  readonly name: string
  readonly level: string
}

export interface CvLanguages {
  readonly title: string
  readonly items: readonly LanguageItem[]
}

export interface CustomSectionItem {
  readonly text: string
}

export interface CustomSection {
  readonly id: string
  readonly title: string
  readonly items: readonly CustomSectionItem[]
}

export interface CertificationItem {
  readonly name: string
  readonly issuer?: string
  readonly year?: string
}

export interface CvCertifications {
  readonly title: string
  readonly items: readonly CertificationItem[]
}

export interface CvData {
  readonly meta: CvMeta
  readonly header: CvHeader
  readonly summary: CvSummary
  readonly education: CvEducation
  readonly experience: CvExperience
  readonly projects: CvProjects
  readonly skills: CvSkills
  readonly languages: CvLanguages
  readonly certifications?: CvCertifications
  readonly customSections?: readonly CustomSection[]
}
