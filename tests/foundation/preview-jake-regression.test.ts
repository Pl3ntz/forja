import { describe, it, expect } from 'vitest'
import { renderCvPreview } from '../../src/lib/preview-renderer.js'
import type { CvData } from '../../src/types/cv.js'

// Jake fixture with ALL new fields populated — regression verifies jake ignores them
const JAKE_WITH_NEW_FIELDS: CvData = {
  meta: {
    locale: 'en',
    pdfFilename: 'Jake_Resume.pdf',
    templateId: 'jake',
    sectionOrder: ['summary', 'experience', 'education', 'projects', 'skills', 'languages'],
  },
  header: {
    name: 'Jake Doe',
    title: 'Software Engineer',      // new field
    location: 'Austin, TX',
    phone: '+1 555-9999',
    email: 'jake@example.com',
    linkedin: 'linkedin.com/in/jakedoe',
    github: 'github.com/jakedoe',
  },
  summary: { title: 'Summary', text: 'Full stack engineer.' },
  experience: {
    title: 'Experience',
    items: [
      {
        company: 'Corp A',
        role: 'Engineer',
        date: '2020 -- Present',
        location: 'Remote',
        highlights: ['Built things', 'Shipped features'],
        intro: 'Team lead for 5 engineers.',     // new field
        skills: 'TypeScript, React, Node.js',     // new field
      },
    ],
  },
  education: {
    title: 'Education',
    items: [
      {
        institution: 'University B',
        degree: 'B.Sc. Computer Science',
        date: '2016 -- 2020',
        location: 'NYC',
        highlights: ['Graduated with honors'],
      },
    ],
  },
  projects: {
    title: 'Projects',
    items: [
      { name: 'My Project', tech: 'TypeScript', date: '2023', highlights: ['Implemented feature X'] },
    ],
  },
  skills: {
    title: 'Skills',
    categories: [
      { name: 'Languages', values: 'TypeScript, JavaScript' },
      { name: 'Frameworks', values: 'React, Node.js' },
    ],
  },
  languages: {
    title: 'Languages',
    items: [{ name: 'English', level: 'Native' }],
  },
  certifications: {
    title: 'Certifications',
    items: [{ name: 'AWS Cert', issuer: 'Amazon', year: '2023' }], // new section
  },
}

describe('renderCvPreview — jake template regression', () => {
  it('returns valid HTML document', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('</html>')
  })

  it('renders name from header', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('Jake Doe')
  })

  it('renders summary section', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('Full stack engineer.')
  })

  it('renders experience company and role', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('Corp A')
    expect(html).toContain('Engineer')
  })

  it('renders experience highlights', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('Built things')
    expect(html).toContain('Shipped features')
  })

  it('renders education section', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('University B')
    expect(html).toContain('B.Sc. Computer Science')
  })

  it('renders projects section', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('My Project')
    expect(html).toContain('TypeScript')
  })

  it('renders skills section', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('TypeScript, JavaScript')
  })

  it('renders languages section', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).toContain('English')
    expect(html).toContain('Native')
  })

  it('does NOT render cv-header__title for jake template (new field silently ignored by jake CSS)', () => {
    // The header title field is non-empty but jake renderHeader does not emit cv-header__title
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).not.toContain('class="cv-header__title"')
  })

  it('does NOT render cv-experience__intro for jake template', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).not.toContain('class="cv-experience__intro"')
  })

  it('does NOT render cv-experience__skills for jake template', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).not.toContain('class="cv-experience__skills"')
  })

  it('does NOT render cv-certifications section for jake template', () => {
    // jake sectionOrder does not include certifications — section not rendered
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    expect(html).not.toContain('class="cv-certifications"')
    expect(html).not.toContain('AWS Cert')
  })

  it('has consistent section structure (cv-section class for each non-empty section)', () => {
    const html = renderCvPreview(JAKE_WITH_NEW_FIELDS)
    const sectionMatches = html.match(/class="cv-section"/g) ?? []
    // summary, experience, education, projects, skills, languages = 6 sections
    expect(sectionMatches.length).toBe(6)
  })
})
