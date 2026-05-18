import { z } from 'zod'
import { CV_TEMPLATE_IDS, DEFAULT_CV_TEMPLATE_ID } from '../templates.js'

const text = z.string().max(500)
const longText = z.string().max(5000)
const highlight = z.string().max(1000)

export const educationItemSchema = z.object({
  institution: text,
  degree: text,
  date: text,
  location: text,
  highlights: z.array(highlight).max(20),
})

export const experienceItemSchema = z.object({
  company: text,
  role: text,
  date: text,
  location: text,
  highlights: z.array(highlight).max(20),
  intro: z.string().max(2000).optional().default(''),
  skills: z.string().max(500).optional().default(''),
})

export const projectItemSchema = z.object({
  name: text,
  tech: text,
  date: text,
  highlights: z.array(highlight).max(20),
})

export const skillCategorySchema = z.object({
  name: text,
  values: longText,
})

export const languageItemSchema = z.object({
  name: text,
  level: text,
})

const sectionKey = z.enum(['summary', 'education', 'experience', 'projects', 'skills', 'languages'])

export const customSectionSchema = z.object({
  id: z.string().max(50),
  title: text,
  items: z.array(z.object({
    text: highlight,
  })).max(30),
})

export const certificationItemSchema = z.object({
  name: z.string().max(500),
  issuer: z.string().max(500).optional(),
  year: z.string().max(50).optional(),
})

export const certificationsSchema = z.object({
  title: text,
  items: z.array(certificationItemSchema).max(20),
})

export const cvInputSchema = z.object({
  templateId: z.enum(CV_TEMPLATE_IDS).optional().default(DEFAULT_CV_TEMPLATE_ID),
  locale: z.enum(['pt', 'en']).optional(),
  sectionOrder: z.array(z.string().max(50)).max(16).optional().refine(
    (arr) => !arr || new Set(arr).size === arr.length,
    { message: 'sectionOrder must not contain duplicates' },
  ),
  customSections: z.array(customSectionSchema).max(10).optional(),
  customLatex: z.string().max(100_000).optional(),
  header: z.object({
    name: text,
    location: text,
    phone: text,
    email: text,
    linkedin: text,
    github: text,
    title: z.string().max(200).optional().default(''),
  }),
  summary: z.object({
    title: text,
    text: longText,
  }),
  education: z.object({
    title: text,
    items: z.array(educationItemSchema).max(20),
  }),
  experience: z.object({
    title: text,
    items: z.array(experienceItemSchema).max(20),
  }),
  projects: z.object({
    title: text,
    items: z.array(projectItemSchema).max(20),
  }),
  skills: z.object({
    title: text,
    categories: z.array(skillCategorySchema).max(20),
  }),
  languages: z.object({
    title: text,
    items: z.array(languageItemSchema).max(20),
  }),
  certifications: certificationsSchema.optional(),
})

export type CvInput = z.infer<typeof cvInputSchema>

export const cvCreateSchema = z.object({
  title: z.string().max(200).optional().default(''),
  locale: z.enum(['pt', 'en']),
  templateId: z.enum(CV_TEMPLATE_IDS).optional().default(DEFAULT_CV_TEMPLATE_ID),
})
