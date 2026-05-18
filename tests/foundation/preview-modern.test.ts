import { describe, it, expect } from 'vitest'
import { renderCvPreview } from '../../src/lib/preview-renderer.js'
import type { CvData } from '../../src/types/cv.js'

const MODERN_FULL: CvData = {
  meta: {
    locale: 'en',
    pdfFilename: 'Jane_Doe_Resume.pdf',
    templateId: 'modern',
    sectionOrder: ['summary', 'experience', 'education', 'certifications', 'skills', 'languages'],
  },
  header: {
    name: 'Jane Doe',
    title: 'Data Engineer | Cloud Specialist',
    location: 'San Francisco, CA',
    phone: '+1 555-0100',
    email: 'jane@example.com',
    linkedin: 'linkedin.com/in/janedoe',
    github: 'github.com/janedoe',
  },
  summary: {
    title: 'Summary',
    text: 'Experienced data engineer with 8 years.',
  },
  experience: {
    title: 'Experience',
    items: [
      {
        company: 'Acme Data Corp',
        role: 'Senior Data Engineer',
        date: 'Jan 2020 -- Present',
        location: 'Remote',
        highlights: ['Built ETL pipelines', 'Reduced latency by 60%'],
        intro: 'Led the data platform across 3 business units.',
        skills: 'Python, Apache Spark, Airflow',
      },
      {
        company: 'Beta Analytics',
        role: 'Data Engineer',
        date: 'Jun 2017 -- Dec 2019',
        location: 'New York, NY',
        highlights: ['Migrated legacy ETL'],
        intro: '',
        skills: '',
      },
    ],
  },
  education: {
    title: 'Education',
    items: [
      {
        institution: 'State University',
        degree: 'B.Sc. Computer Science',
        date: '2013 -- 2017',
        location: 'Austin, TX',
        highlights: [],
      },
    ],
  },
  projects: { title: 'Projects', items: [] },
  skills: {
    title: 'Skills',
    categories: [{ name: 'Languages', values: 'Python, SQL' }],
  },
  languages: {
    title: 'Languages',
    items: [{ name: 'English', level: 'Native' }],
  },
  certifications: {
    title: 'Certifications',
    items: [
      { name: 'AWS Solutions Architect', issuer: 'Amazon', year: '2022' },
      { name: 'GCP Data Engineer', issuer: 'Google', year: '2021' },
    ],
  },
}

const JAKE_BASE: CvData = {
  meta: {
    locale: 'en',
    pdfFilename: 'Jake_Resume.pdf',
    templateId: 'jake',
  },
  header: {
    name: 'Jake Doe',
    title: 'Software Engineer',
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
        highlights: ['Built things'],
        intro: 'Team lead.',
        skills: 'TypeScript, React',
      },
    ],
  },
  education: {
    title: 'Education',
    items: [
      {
        institution: 'University B',
        degree: 'B.Sc.',
        date: '2016 -- 2020',
        location: 'NYC',
        highlights: [],
      },
    ],
  },
  projects: {
    title: 'Projects',
    items: [
      { name: 'My Project', tech: 'TypeScript', date: '2023', highlights: ['Did X'] },
    ],
  },
  skills: { title: 'Skills', categories: [{ name: 'Lang', values: 'TypeScript' }] },
  languages: { title: 'Languages', items: [{ name: 'English', level: 'Native' }] },
  certifications: {
    title: 'Certifications',
    items: [{ name: 'Some Cert', issuer: 'Issuer', year: '2023' }],
  },
}

describe('renderCvPreview — modern template new fields', () => {
  it('renders cv-header__title when header.title is non-empty', () => {
    const html = renderCvPreview(MODERN_FULL)
    expect(html).toContain('class="cv-header__title"')
    expect(html).toContain('Data Engineer | Cloud Specialist')
  })

  it('does NOT emit cv-header__title element when header.title is empty', () => {
    const data: CvData = {
      ...MODERN_FULL,
      header: { ...MODERN_FULL.header, title: '' },
    }
    const html = renderCvPreview(data)
    expect(html).not.toContain('class="cv-header__title"')
  })

  it('renders cv-experience__intro when experience item intro is non-empty', () => {
    const html = renderCvPreview(MODERN_FULL)
    expect(html).toContain('class="cv-experience__intro"')
    expect(html).toContain('Led the data platform across 3 business units.')
  })

  it('does NOT emit cv-experience__intro when intro is empty', () => {
    const data: CvData = {
      ...MODERN_FULL,
      experience: {
        title: 'Experience',
        items: [
          {
            ...MODERN_FULL.experience.items[0],
            intro: '',
            skills: '',
          },
        ],
      },
    }
    const html = renderCvPreview(data)
    expect(html).not.toContain('class="cv-experience__intro"')
  })

  it('renders cv-experience__skills with "Skills:" prefix when skills non-empty', () => {
    const html = renderCvPreview(MODERN_FULL)
    expect(html).toContain('class="cv-experience__skills"')
    expect(html).toContain('Skills:')
    expect(html).toContain('Python, Apache Spark, Airflow')
  })

  it('does NOT emit cv-experience__skills when skills is empty', () => {
    // Beta Analytics item has empty skills
    const data: CvData = {
      ...MODERN_FULL,
      experience: {
        title: 'Experience',
        items: [MODERN_FULL.experience.items[1]], // Beta Analytics — empty intro and skills
      },
    }
    const html = renderCvPreview(data)
    expect(html).not.toContain('class="cv-experience__skills"')
  })

  it('renders certifications section when certifications.items is non-empty', () => {
    const html = renderCvPreview(MODERN_FULL)
    expect(html).toContain('Certifications')
    expect(html).toContain('AWS Solutions Architect')
    expect(html).toContain('Amazon')
    expect(html).toContain('2022')
    expect(html).toContain('GCP Data Engineer')
    expect(html).toContain('Google')
    expect(html).toContain('2021')
  })

  it('wraps certifications in cv-certifications class', () => {
    const html = renderCvPreview(MODERN_FULL)
    expect(html).toContain('class="cv-certifications"')
  })

  it('does NOT emit certifications section when certifications is absent', () => {
    const data: CvData = { ...MODERN_FULL, certifications: undefined }
    const html = renderCvPreview(data)
    expect(html).not.toContain('class="cv-certifications"')
  })

  it('does NOT emit certifications section when certifications.items is empty', () => {
    const data: CvData = {
      ...MODERN_FULL,
      certifications: { title: 'Certifications', items: [] },
    }
    const html = renderCvPreview(data)
    expect(html).not.toContain('class="cv-certifications"')
  })

  it('certifications appear in sectionOrder position — before skills in output', () => {
    const html = renderCvPreview(MODERN_FULL)
    const certPos = html.indexOf('AWS Solutions Architect')
    const skillsPos = html.indexOf('Python, SQL')
    expect(certPos).toBeGreaterThan(0)
    expect(skillsPos).toBeGreaterThan(0)
    expect(certPos).toBeLessThan(skillsPos)
  })

  it('does NOT emit empty <p></p> for empty intro/skills fields', () => {
    const html = renderCvPreview(MODERN_FULL)
    // No empty paragraph tags from empty fields
    expect(html).not.toMatch(/<p class="cv-experience__intro">\s*<\/p>/)
    expect(html).not.toMatch(/<p class="cv-experience__skills">\s*<\/p>/)
  })
})
