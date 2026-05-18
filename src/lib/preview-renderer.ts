import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CvData, CvCertifications } from '../types/cv.js'
import type { CoverLetterData } from '../types/cover-letter.js'
import {
  getTemplate,
  isValidTemplateId,
  DEFAULT_TEMPLATE_ID,
  type TemplateId,
  getCoverLetterTemplate,
  isValidCoverLetterTemplateId,
  DEFAULT_COVER_LETTER_TEMPLATE_ID,
  type CoverLetterTemplateId,
} from './templates.js'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderHeader(header: CvData['header'], cssClass = '', sectionId = '', opts: { showTitle?: boolean } = {}): string {
  const dataAttr = sectionId ? ` data-section="${escapeHtml(sectionId)}"` : ''
  const cls = cssClass ? ` ${cssClass}` : ''
  const titleLine = (opts.showTitle && header.title)
    ? `\n  <div class="cv-header__title">${escapeHtml(header.title)}</div>`
    : ''
  return `<header class="cv-header${cls}"${dataAttr}>
  <h1>${escapeHtml(header.name)}</h1>${titleLine}
  <div class="location">${escapeHtml(header.location)}</div>
  <div class="contacts">
    <span>${escapeHtml(header.phone)}</span>
    <span class="separator">|</span>
    <a href="mailto:${escapeHtml(header.email)}">${escapeHtml(header.email)}</a>
    <span class="separator">|</span>
    <a href="https://${escapeHtml(header.linkedin)}">${escapeHtml(header.linkedin)}</a>
    <span class="separator">|</span>
    <a href="https://${escapeHtml(header.github)}">${escapeHtml(header.github)}</a>
  </div>
</header>`
}

function renderSection(title: string, content: string, sectionId = '', cssClass = ''): string {
  const dataAttr = sectionId ? ` data-section="${escapeHtml(sectionId)}"` : ''
  const cls = cssClass ? ` ${cssClass}` : ''
  return `<section class="cv-section${cls}"${dataAttr}>
  <h2>${escapeHtml(title)}</h2>
  ${content}
</section>`
}

function renderSummary(summary: CvData['summary'], sectionId = '', cssClass = ''): string {
  return renderSection(
    summary.title,
    `<div class="cv-summary"><p>${escapeHtml(summary.text)}</p></div>`,
    sectionId,
    cssClass,
  )
}

function renderHighlights(highlights: readonly string[]): string {
  if (highlights.length === 0) return ''
  const items = highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('\n')
  return `<ul class="cv-highlights">${items}</ul>`
}

function renderEducation(education: CvData['education'], sectionId = '', cssClass = ''): string {
  const items = education.items
    .map(
      (item) => `<div class="cv-entry">
  <div class="cv-entry-header">
    <span class="primary">${escapeHtml(item.institution)}</span>
    <span class="secondary">${escapeHtml(item.date)}</span>
  </div>
  <div class="cv-entry-sub">
    <span class="role">${escapeHtml(item.degree)}</span>
    <span class="location">${escapeHtml(item.location)}</span>
  </div>
  ${renderHighlights(item.highlights)}
</div>`,
    )
    .join('\n')
  return renderSection(education.title, items, sectionId, cssClass)
}

function renderExperienceItem(item: CvData['experience']['items'][number], opts: { showIntroSkills?: boolean } = {}): string {
  const introLine = (opts.showIntroSkills && item.intro)
    ? `\n  <p class="cv-experience__intro">${escapeHtml(item.intro)}</p>`
    : ''
  const skillsLine = (opts.showIntroSkills && item.skills)
    ? `\n  <p class="cv-experience__skills">Skills: ${escapeHtml(item.skills)}</p>`
    : ''
  return `<div class="cv-entry">
  <div class="cv-entry-header">
    <span class="primary">${escapeHtml(item.company)}</span>
    <span class="secondary">${escapeHtml(item.date)}</span>
  </div>
  <div class="cv-entry-sub">
    <span class="role">${escapeHtml(item.role)}</span>
    <span class="location">${escapeHtml(item.location)}</span>
  </div>${introLine}${skillsLine}
  ${renderHighlights(item.highlights)}
</div>`
}

function renderExperience(experience: CvData['experience'], sectionId = '', cssClass = '', opts: { showIntroSkills?: boolean } = {}): string {
  const items = experience.items
    .map((item) => renderExperienceItem(item, opts))
    .join('\n')
  return renderSection(experience.title, items, sectionId, cssClass)
}

function renderCertifications(certifications: CvCertifications, sectionId = '', cssClass = ''): string {
  const items = certifications.items
    .map((item) => {
      const meta = [item.issuer, item.year].filter((v): v is string => Boolean(v)).map(escapeHtml).join(', ')
      const metaPart = meta ? ` — ${meta}` : ''
      return `<li><span class="cert-name">${escapeHtml(item.name)}</span>${metaPart}</li>`
    })
    .join('\n')
  return renderSection(
    certifications.title,
    `<div class="cv-certifications"><ul>${items}</ul></div>`,
    sectionId,
    cssClass,
  )
}

function renderProjects(projects: CvData['projects'], sectionId = '', cssClass = ''): string {
  const items = projects.items
    .map(
      (item) => `<div class="cv-entry">
  <div class="cv-project-header">
    <div>
      <span class="name">${escapeHtml(item.name)}</span>
      <span class="tech"> | ${escapeHtml(item.tech)}</span>
    </div>
    <span class="date">${escapeHtml(item.date)}</span>
  </div>
  ${renderHighlights(item.highlights)}
</div>`,
    )
    .join('\n')
  return renderSection(projects.title, items, sectionId, cssClass)
}

function renderSkills(skills: CvData['skills'], sectionId = '', cssClass = ''): string {
  const items = skills.categories
    .map(
      (cat) =>
        `<li><span class="category-name">${escapeHtml(cat.name)}</span>: ${escapeHtml(cat.values)}</li>`,
    )
    .join('\n')
  return renderSection(
    skills.title,
    `<ul class="cv-skills-list">${items}</ul>`,
    sectionId,
    cssClass,
  )
}

function renderLanguages(languages: CvData['languages'], sectionId = '', cssClass = ''): string {
  const items = languages.items
    .map(
      (lang) =>
        `<li><span class="lang-name">${escapeHtml(lang.name)}</span>: ${escapeHtml(lang.level)}</li>`,
    )
    .join('\n')
  return renderSection(
    languages.title,
    `<ul class="cv-languages-list">${items}</ul>`,
    sectionId,
    cssClass,
  )
}

const cssCache = new Map<string, string>()

function loadCss(templateId: TemplateId): string {
  const cacheKey = `cv:${templateId}`
  const cached = cssCache.get(cacheKey)
  if (cached) return cached

  const config = getTemplate(templateId)
  const css = ['cv-reset.css', 'cv-layout.css', 'cv-typography.css', 'cv-components.css']
    .map((file) => readFileSync(resolve(process.cwd(), config.cssDir, file), 'utf-8'))
    .join('\n')

  cssCache.set(cacheKey, css)
  return css
}

function loadCoverLetterCss(templateId: CoverLetterTemplateId): string {
  const cacheKey = `cl:${templateId}`
  const cached = cssCache.get(cacheKey)
  if (cached) return cached

  const config = getCoverLetterTemplate(templateId)
  const css = ['cv-reset.css', 'cv-layout.css', 'cv-typography.css', 'cv-components.css']
    .map((file) => readFileSync(resolve(process.cwd(), config.cssDir, file), 'utf-8'))
    .join('\n')

  cssCache.set(cacheKey, css)
  return css
}

function isSectionEmpty(key: string, cvData: CvData): boolean {
  switch (key) {
    case 'header': return !cvData.header.name
    case 'summary': return !cvData.summary.text
    case 'education': return cvData.education.items.length === 0
    case 'experience': return cvData.experience.items.length === 0
    case 'projects': return cvData.projects.items.length === 0
    case 'skills': return cvData.skills.categories.length === 0
    case 'languages': return cvData.languages.items.length === 0
    case 'certifications': return !cvData.certifications || cvData.certifications.items.length === 0
    default: {
      const cs = cvData.customSections?.find(s => s.id === key)
      return !cs || cs.items.length === 0
    }
  }
}

const GHOST_CSS = `
.cv-sample-section { opacity: 0.3; transition: opacity 0.3s ease; }
.cv-user-section { opacity: 1; }
[data-section].cv-active-section {
  outline: 2px dashed #e87040;
  outline-offset: 4px;
  border-radius: 4px;
}
`

const GHOST_SCRIPT = `
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'highlight-section') {
    document.querySelectorAll('[data-section]').forEach(function(el) {
      el.classList.remove('cv-active-section');
    });
    var t = document.querySelector('[data-section="' + e.data.section + '"]');
    if (t) {
      t.classList.add('cv-active-section');
      t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});
</script>
`

export function renderGhostPreview(userData: CvData, sampleData: CvData): string {
  const templateId = isValidTemplateId(userData.meta.templateId)
    ? userData.meta.templateId
    : DEFAULT_TEMPLATE_ID
  const css = loadCss(templateId)

  const isModern = templateId === 'modern'

  const DEFAULT_ORDER = ['summary', 'education', 'experience', 'projects', 'skills', 'languages'] as const
  const order = userData.meta.sectionOrder ?? DEFAULT_ORDER

  const pick = (key: string) => {
    const empty = isSectionEmpty(key, userData)
    const source = empty ? sampleData : userData
    const cls = empty ? 'cv-sample-section' : 'cv-user-section'
    return { source, cls }
  }

  const headerPick = pick('header')
  const headerHtml = renderHeader(headerPick.source.header, headerPick.cls, 'header', { showTitle: isModern })

  const sectionHtml = order.map(k => {
    if (k.startsWith('custom-')) {
      const cs = userData.customSections?.find(s => s.id === k)
      if (!cs || cs.items.length === 0) return ''
      const items = cs.items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')
      return renderSection(cs.title, `<ul class="cv-highlights">${items}</ul>`, k, 'cv-user-section')
    }

    const { source, cls } = pick(k)

    const renderers: Record<string, () => string> = {
      summary: () => renderSummary(source.summary, k, cls),
      education: () => renderEducation(source.education, k, cls),
      experience: () => renderExperience(source.experience, k, cls, { showIntroSkills: isModern }),
      projects: () => renderProjects(source.projects, k, cls),
      skills: () => renderSkills(source.skills, k, cls),
      languages: () => renderLanguages(source.languages, k, cls),
      certifications: () => (source.certifications && source.certifications.items.length > 0)
        ? renderCertifications(source.certifications, k, cls)
        : '',
    }

    return renderers[k]?.() ?? ''
  }).join('\n')

  const body = [headerHtml, sectionHtml].join('\n')

  return `<!doctype html>
<html lang="${escapeHtml(userData.meta.locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}${GHOST_CSS}</style>
</head>
<body>
  <main class="cv-page">
    ${body}
  </main>
${GHOST_SCRIPT}
</body>
</html>`
}

export function renderCvPreview(cvData: CvData): string {
  const templateId = isValidTemplateId(cvData.meta.templateId)
    ? cvData.meta.templateId
    : DEFAULT_TEMPLATE_ID
  const css = loadCss(templateId)

  const isModern = templateId === 'modern'

  const DEFAULT_ORDER = ['summary', 'education', 'experience', 'projects', 'skills', 'languages'] as const
  const order = cvData.meta.sectionOrder ?? DEFAULT_ORDER

  const renderCustomSection = (sectionId: string): string => {
    const cs = cvData.customSections?.find(s => s.id === sectionId)
    if (!cs || cs.items.length === 0) return ''
    const items = cs.items.map(item => `<li>${escapeHtml(item.text)}</li>`).join('\n')
    return renderSection(cs.title, `<ul class="cv-highlights">${items}</ul>`)
  }

  const renderers: Record<string, () => string> = {
    summary: () => cvData.summary.text ? renderSummary(cvData.summary) : '',
    education: () => cvData.education.items.length > 0 ? renderEducation(cvData.education) : '',
    experience: () => cvData.experience.items.length > 0
      ? renderExperience(cvData.experience, '', '', { showIntroSkills: isModern })
      : '',
    projects: () => cvData.projects.items.length > 0 ? renderProjects(cvData.projects) : '',
    skills: () => cvData.skills.categories.length > 0 ? renderSkills(cvData.skills) : '',
    languages: () => cvData.languages.items.length > 0 ? renderLanguages(cvData.languages) : '',
    certifications: () => (cvData.certifications && cvData.certifications.items.length > 0)
      ? renderCertifications(cvData.certifications)
      : '',
  }

  const body = [renderHeader(cvData.header, '', '', { showTitle: isModern }), ...order.map(k => {
    if (k.startsWith('custom-')) return renderCustomSection(k)
    return renderers[k]?.() ?? ''
  })].join('\n')

  return `<!doctype html>
<html lang="${escapeHtml(cvData.meta.locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
  <main class="cv-page">
    ${body}
  </main>
</body>
</html>`
}

// ─── Cover Letter Preview ────────────────────────────────────────────────────

function renderCoverLetterHeader(data: CoverLetterData): string {
  const phonePart = data.sender.phone
    ? `<span>${escapeHtml(data.sender.phone)}</span><span class="separator"> | </span>`
    : ''
  const emailPart = data.sender.email
    ? `<a href="mailto:${escapeHtml(data.sender.email)}">${escapeHtml(data.sender.email)}</a>`
    : ''
  const linkedinPart = data.sender.linkedin
    ? `<span class="separator"> | </span><a href="https://${escapeHtml(data.sender.linkedin)}">${escapeHtml(data.sender.linkedin)}</a>`
    : ''
  const contactLine = phonePart || emailPart || linkedinPart
    ? `<div class="contacts">${phonePart}${emailPart}${linkedinPart}</div>`
    : ''
  const subtitleLine = data.sender.title
    ? `<div class="subtitle">${escapeHtml(data.sender.title)}</div>`
    : ''
  const locationLine = data.sender.location
    ? `<div class="location">${escapeHtml(data.sender.location)}</div>`
    : ''

  if (!data.sender.name) return ''

  return `<header class="cv-letter__header">
  <h1>${escapeHtml(data.sender.name)}</h1>${subtitleLine ? `\n  ${subtitleLine}` : ''}${locationLine ? `\n  ${locationLine}` : ''}${contactLine ? `\n  ${contactLine}` : ''}
</header>`
}

function renderCoverLetterBody(data: CoverLetterData): string {
  if (data.body.length === 0) return ''
  const paragraphs = data.body.map((item) => {
    const labelPart = item.label
      ? `<strong class="cv-letter__paragraph-label">${escapeHtml(item.label)}:</strong> `
      : ''
    return `<p class="cv-letter__paragraph">${labelPart}${escapeHtml(item.content)}</p>`
  }).join('\n')
  return `<div class="cv-letter__body">\n${paragraphs}\n</div>`
}

export function renderCoverLetterPreview(data: CoverLetterData): string {
  const templateId = isValidCoverLetterTemplateId(data.templateId)
    ? data.templateId
    : DEFAULT_COVER_LETTER_TEMPLATE_ID
  const css = loadCoverLetterCss(templateId)

  const headerHtml = renderCoverLetterHeader(data)

  const titleBarHtml = data.title
    ? `<div class="cv-letter__title-bar"><h2>${escapeHtml(data.title)}</h2></div>`
    : ''

  const dateHtml = data.letterDate
    ? `<div class="cv-letter__date">${escapeHtml(data.letterDate)}</div>`
    : ''

  const recipientLines = [
    data.recipient.name,
    data.recipient.company,
    data.recipient.address,
  ].filter(Boolean)
  const recipientHtml = recipientLines.length > 0
    ? `<div class="cv-letter__recipient">${recipientLines.map(l => `<p>${escapeHtml(l)}</p>`).join('\n')}</div>`
    : ''

  const salutationHtml = data.recipient.salutation
    ? `<p class="cv-letter__salutation">${escapeHtml(data.recipient.salutation)}</p>`
    : ''

  const bodyHtml = renderCoverLetterBody(data)

  const closingHtml = data.closingPhrase
    ? `<div class="cv-letter__closing"><div class="phrase">${escapeHtml(data.closingPhrase)}</div>${data.signature ? `\n<div class="cv-letter__signature">${escapeHtml(data.signature)}</div>` : ''}</div>`
    : ''

  const sections = [headerHtml, titleBarHtml, dateHtml, recipientHtml, salutationHtml, bodyHtml, closingHtml]
    .filter(Boolean)
    .join('\n')

  return `<!doctype html>
<html lang="${escapeHtml(data.locale)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
  <main class="cv-page">
    ${sections}
  </main>
</body>
</html>`
}

const COVER_LETTER_GHOST_SAMPLE: Record<string, CoverLetterData> = {
  en: {
    id: 'sample',
    userId: 'sample',
    cvId: null,
    locale: 'en',
    templateId: 'default',
    title: 'Application for Software Engineer',
    pdfFilename: 'Sample_Cover_Letter.pdf',
    sender: {
      name: 'Your Name',
      title: 'Software Engineer',
      location: 'City, State',
      email: 'your.email@example.com',
      phone: '+1 555-0000',
      linkedin: 'linkedin.com/in/yourprofile',
    },
    recipient: {
      salutation: 'Dear Hiring Manager',
      name: 'Hiring Manager',
      company: 'Company Name',
      address: '123 Main Street, City, State',
    },
    letterDate: 'January 1, 2025',
    body: [
      { label: 'Introduction', content: 'I am excited to apply for the Software Engineer position at your company. My background in software development aligns well with your requirements.' },
      { label: 'Experience', content: 'Over the past 5 years, I have built scalable systems used by thousands of users. I am particularly proud of reducing latency by 40% in my previous role.' },
      { label: 'Closing', content: 'I look forward to the opportunity to discuss how my experience can contribute to your team. Thank you for your consideration.' },
    ],
    closingPhrase: 'Sincerely,',
    signature: 'Your Name',
    customLatex: '',
    createdAt: '',
    updatedAt: '',
  },
  pt: {
    id: 'sample',
    userId: 'sample',
    cvId: null,
    locale: 'pt',
    templateId: 'default',
    title: 'Candidatura para Engenheiro de Software',
    pdfFilename: 'Modelo_Carta_Apresentacao.pdf',
    sender: {
      name: 'Seu Nome',
      title: 'Engenheiro de Software',
      location: 'Cidade, Estado',
      email: 'seu.email@exemplo.com.br',
      phone: '+55 11 99999-0000',
      linkedin: 'linkedin.com/in/seuperfil',
    },
    recipient: {
      salutation: 'Prezado(a) Recrutador(a)',
      name: 'Recrutador(a)',
      company: 'Nome da Empresa',
      address: 'Rua Principal, 123, Cidade, Estado',
    },
    letterDate: '1 de janeiro de 2025',
    body: [
      { label: 'Apresentação', content: 'Tenho o prazer de me candidatar à vaga de Engenheiro de Software. Minha experiência em desenvolvimento de sistemas está alinhada com os requisitos da posição.' },
      { label: 'Realizações', content: 'Nos últimos 5 anos, desenvolvi sistemas escaláveis utilizados por milhares de usuários, incluindo a redução de latência em 40% no meu cargo anterior.' },
      { label: 'Fechamento', content: 'Fico à disposição para discutir como minha experiência pode contribuir para sua equipe. Agradeço pela atenção.' },
    ],
    closingPhrase: 'Atenciosamente,',
    signature: 'Seu Nome',
    customLatex: '',
    createdAt: '',
    updatedAt: '',
  },
}

export function renderCoverLetterGhostPreview(userData: CoverLetterData, sampleData?: CoverLetterData): string {
  const sample = sampleData ?? (COVER_LETTER_GHOST_SAMPLE[userData.locale] ?? COVER_LETTER_GHOST_SAMPLE['en'])
  const merged: CoverLetterData = {
    id: userData.id,
    userId: userData.userId,
    cvId: userData.cvId,
    locale: userData.locale,
    templateId: userData.templateId,
    title: userData.title || sample.title,
    pdfFilename: userData.pdfFilename || sample.pdfFilename,
    sender: {
      name: userData.sender.name || sample.sender.name,
      title: userData.sender.title || sample.sender.title,
      location: userData.sender.location || sample.sender.location,
      email: userData.sender.email || sample.sender.email,
      phone: userData.sender.phone || sample.sender.phone,
      linkedin: userData.sender.linkedin || sample.sender.linkedin,
    },
    recipient: {
      salutation: userData.recipient.salutation || sample.recipient.salutation,
      name: userData.recipient.name || sample.recipient.name,
      company: userData.recipient.company || sample.recipient.company,
      address: userData.recipient.address || sample.recipient.address,
    },
    letterDate: userData.letterDate || sample.letterDate,
    body: userData.body.length > 0 ? userData.body : sample.body,
    closingPhrase: userData.closingPhrase || sample.closingPhrase,
    signature: userData.signature || sample.signature,
    customLatex: userData.customLatex,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  }
  return renderCoverLetterPreview(merged)
}
