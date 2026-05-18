import { describe, it, expect } from 'vitest'

// Structural smoke tests — verify components export React function components
// and that schema contracts align with form expectations.
// RTL is not a project dependency; full rendering tests are deferred to Wave 4 (Playwright).

describe('HeaderForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/HeaderForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('ExperienceForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/ExperienceForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CertificationsForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CertificationsForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

describe('CvEditorForm', () => {
  it('exports a default React function component', async () => {
    const mod = await import('../../src/client/components/CvEditorForm.js')
    expect(typeof mod.default).toBe('function')
  })
})

// Schema contract tests — verify new fields are accepted/defaulted correctly

describe('HeaderForm — header.title schema contract', () => {
  it('cvInputSchema defaults header.title to empty string', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse({
      header: { name: 'Jane', location: '', phone: '', email: '', linkedin: '', github: '' },
      summary: { title: '', text: '' },
      education: { title: '', items: [] },
      experience: { title: '', items: [] },
      projects: { title: '', items: [] },
      skills: { title: '', categories: [] },
      languages: { title: '', items: [] },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.header.title).toBe('')
  })

  it('cvInputSchema accepts header.title up to 200 chars', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse({
      header: { name: 'Jane', location: '', phone: '', email: '', linkedin: '', github: '', title: 'Data Engineer | Cloud Specialist' },
      summary: { title: '', text: '' },
      education: { title: '', items: [] },
      experience: { title: '', items: [] },
      projects: { title: '', items: [] },
      skills: { title: '', categories: [] },
      languages: { title: '', items: [] },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.header.title).toBe('Data Engineer | Cloud Specialist')
  })
})

describe('ExperienceForm — intro and skills schema contract', () => {
  const basePayload = {
    header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
    summary: { title: '', text: '' },
    education: { title: '', items: [] },
    experience: {
      title: 'Exp',
      items: [{ company: 'Acme', role: 'Eng', date: '2020-2023', location: '', highlights: [] }],
    },
    projects: { title: '', items: [] },
    skills: { title: '', categories: [] },
    languages: { title: '', items: [] },
  }

  it('experience item defaults intro to empty string', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].intro).toBe('')
  })

  it('experience item defaults skills to empty string', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].skills).toBe('')
  })

  it('experience item accepts intro up to 2000 chars', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const longIntro = 'I led a cross-functional team. '.repeat(60).slice(0, 2000)
    const result = cvInputSchema.safeParse({
      ...basePayload,
      experience: {
        title: 'Exp',
        items: [{ company: 'Acme', role: 'Eng', date: '2020-2023', location: '', highlights: [], intro: longIntro }],
      },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].intro).toBe(longIntro)
  })

  it('experience item accepts skills up to 500 chars', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const skills = 'Python, Scala, Spark, AWS'
    const result = cvInputSchema.safeParse({
      ...basePayload,
      experience: {
        title: 'Exp',
        items: [{ company: 'Acme', role: 'Eng', date: '2020-2023', location: '', highlights: [], skills }],
      },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.experience.items[0].skills).toBe(skills)
  })
})

describe('CertificationsForm — certifications schema contract', () => {
  const basePayload = {
    header: { name: '', location: '', phone: '', email: '', linkedin: '', github: '' },
    summary: { title: '', text: '' },
    education: { title: '', items: [] },
    experience: { title: '', items: [] },
    projects: { title: '', items: [] },
    skills: { title: '', categories: [] },
    languages: { title: '', items: [] },
  }

  it('certifications section is optional (payload without it parses)', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse(basePayload)
    expect(result.success).toBe(true)
  })

  it('certifications section accepts items with name, issuer, year', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse({
      ...basePayload,
      certifications: {
        title: 'Certifications',
        items: [
          { name: 'AWS Certified Developer', issuer: 'Amazon', year: '2023' },
          { name: 'CKA' },
        ],
      },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.certifications?.items).toHaveLength(2)
    expect(result.data.certifications?.items[0].name).toBe('AWS Certified Developer')
    expect(result.data.certifications?.items[0].issuer).toBe('Amazon')
    expect(result.data.certifications?.items[0].year).toBe('2023')
  })

  it('certification item without issuer and year is valid', async () => {
    const { cvInputSchema } = await import('../../src/lib/zod-schemas/cv.js')
    const result = cvInputSchema.safeParse({
      ...basePayload,
      certifications: {
        title: 'Certs',
        items: [{ name: 'Docker Certified Associate' }],
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('CvEditorForm — template selector constants', () => {
  it('CV_TEMPLATE_IDS contains jake and modern', async () => {
    const { CV_TEMPLATE_IDS } = await import('../../src/lib/templates.js')
    expect(CV_TEMPLATE_IDS).toContain('jake')
    expect(CV_TEMPLATE_IDS).toContain('modern')
  })

  it('CV_TEMPLATES has name for jake', async () => {
    const { CV_TEMPLATES } = await import('../../src/lib/templates.js')
    expect(CV_TEMPLATES.jake.name).toBe("Jake's Resume")
  })

  it('CV_TEMPLATES has name for modern', async () => {
    const { CV_TEMPLATES } = await import('../../src/lib/templates.js')
    expect(CV_TEMPLATES.modern.name).toBe('Modern Resume')
  })
})

describe('form-defaults — certifications in sectionOrder', () => {
  it('pt default sectionOrder includes certifications', async () => {
    const { getFormDefaults } = await import('../../src/lib/form-defaults.js')
    const defaults = getFormDefaults('pt')
    expect(defaults.sectionOrder).toContain('certifications')
  })

  it('en default sectionOrder includes certifications', async () => {
    const { getFormDefaults } = await import('../../src/lib/form-defaults.js')
    const defaults = getFormDefaults('en')
    expect(defaults.sectionOrder).toContain('certifications')
  })

  it('pt default certifications section has expected title', async () => {
    const { getFormDefaults } = await import('../../src/lib/form-defaults.js')
    const defaults = getFormDefaults('pt')
    expect(defaults.certifications?.title).toBe('Licencas e Certificacoes')
  })

  it('en default certifications section has expected title', async () => {
    const { getFormDefaults } = await import('../../src/lib/form-defaults.js')
    const defaults = getFormDefaults('en')
    expect(defaults.certifications?.title).toBe('Certifications')
  })
})

describe('i18n — new labels present', () => {
  it('en header has title and titleHint labels', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('en')
    expect(labels.header.title).toBe('Title (subtitle)')
    expect(typeof labels.header.titleHint).toBe('string')
  })

  it('pt header has title and titleHint labels', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('pt')
    expect(labels.header.title).toBe('Titulo (subtitulo)')
    expect(typeof labels.header.titleHint).toBe('string')
  })

  it('en experience has intro and skills labels', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('en')
    expect(labels.experience.intro).toBe('Intro paragraph')
    expect(labels.experience.skills).toBe('Skills line')
    expect(typeof labels.experience.introHint).toBe('string')
    expect(typeof labels.experience.skillsHint).toBe('string')
  })

  it('pt experience has intro and skills labels', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('pt')
    expect(labels.experience.intro).toBe('Paragrafo introdutorio')
    expect(labels.experience.skills).toBe('Linha de habilidades')
  })

  it('en certifications section has all required labels', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('en')
    expect(labels.certifications.sectionTitle).toBe('Section Title')
    expect(labels.certifications.name).toBe('Certification Name')
    expect(labels.certifications.issuer).toBe('Issuer (optional)')
    expect(labels.certifications.year).toBe('Year (optional)')
    expect(labels.certifications.addItem).toBe('Add Certification')
    expect(typeof labels.certifications.empty).toBe('string')
  })

  it('pt certifications section has all required labels', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('pt')
    expect(labels.certifications.sectionTitle).toBe('Titulo da Secao')
    expect(labels.certifications.addItem).toBe('Adicionar Certificacao')
  })

  it('en editor template label is present', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('en')
    expect(labels.editor.template).toBe('Template')
  })

  it('pt editor template label is present', async () => {
    const { getTranslations } = await import('../../src/lib/i18n/index.js')
    const labels = getTranslations('pt')
    expect(labels.editor.template).toBe('Modelo')
  })
})
