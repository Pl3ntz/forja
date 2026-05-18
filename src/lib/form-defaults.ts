import type { Locale } from './locales.js'
import type { CvInput } from './zod-schemas/cv.js'
import { DEFAULT_CV_TEMPLATE_ID } from './templates.js'

const DEFAULTS: Record<Locale, CvInput> = {
  pt: {
    templateId: DEFAULT_CV_TEMPLATE_ID,
    sectionOrder: ['summary', 'education', 'experience', 'projects', 'skills', 'languages', 'certifications'],
    header: {
      name: '',
      location: '',
      phone: '',
      email: '',
      linkedin: '',
      github: '',
      title: '',
    },
    summary: {
      title: 'Resumo Profissional',
      text: '',
    },
    education: {
      title: 'Formacao Academica',
      items: [],
    },
    experience: {
      title: 'Experiencia Profissional',
      items: [],
    },
    projects: {
      title: 'Projetos Principais',
      items: [],
    },
    skills: {
      title: 'Habilidades Tecnicas',
      categories: [],
    },
    languages: {
      title: 'Idiomas',
      items: [],
    },
    certifications: {
      title: 'Licencas e Certificacoes',
      items: [],
    },
  },
  en: {
    templateId: DEFAULT_CV_TEMPLATE_ID,
    sectionOrder: ['summary', 'education', 'experience', 'projects', 'skills', 'languages', 'certifications'],
    header: {
      name: '',
      location: '',
      phone: '',
      email: '',
      linkedin: '',
      github: '',
      title: '',
    },
    summary: {
      title: 'Professional Summary',
      text: '',
    },
    education: {
      title: 'Education',
      items: [],
    },
    experience: {
      title: 'Professional Experience',
      items: [],
    },
    projects: {
      title: 'Key Projects',
      items: [],
    },
    skills: {
      title: 'Technical Skills',
      categories: [],
    },
    languages: {
      title: 'Languages',
      items: [],
    },
    certifications: {
      title: 'Certifications',
      items: [],
    },
  },
}

export function getFormDefaults(locale: Locale): CvInput {
  return DEFAULTS[locale]
}
