import { Hono } from 'hono'
import { eq, and, asc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  cvs,
  cvEducationItems,
  cvExperienceItems,
  cvProjectItems,
  cvSkillCategories,
  cvLanguageItems,
} from '../../db/schema/index.js'
import { cvInputSchema, cvCreateSchema } from '../../lib/zod-schemas/cv.js'
import { cvRowsToCvData, cvInputToCvData } from '../../lib/cv-to-data.js'
import { renderCvPreview, renderGhostPreview } from '../../lib/preview-renderer.js'
import { loadCvById, getUserCvs } from '../../lib/load-cv.js'
import { generatePdf, generatePdfFromCustomLatex } from '../../lib/pdf-generator.js'
import { isValidUuid } from '../../lib/validation.js'
import { getFormDefaults } from '../../lib/form-defaults.js'
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit.js'
import { analyzeCvAtsScore, parseCvFromPdf, translateCvContent } from '../../lib/ai-client.js'
import { generateTexFromData } from '../../../scripts/generate-tex.js'
import type { Locale } from '../../lib/locales.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { CvData } from '../../types/cv.js'

function sanitizeNameForFilename(fullName: string): string {
  return fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_')
}

function buildPdfFilename(name: string): string {
  const sanitized = sanitizeNameForFilename(name)
  return `${sanitized}_Resume.pdf`
}

const app = new Hono()

// GET / — list user CVs
app.get('/', async (c) => {
  const userId = c.get('user').id
  try {
    const cvList = await getUserCvs(userId)
    return c.json(cvList)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar CVs'
    return c.json({ error: message }, 500)
  }
})

// POST / — create CV
app.post('/', async (c) => {
  const userId = c.get('user').id

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = cvCreateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const { locale, title, templateId } = parsed.data
  const defaults = getFormDefaults(locale as Locale)

  try {
    const [inserted] = await db
      .insert(cvs)
      .values({
        userId,
        locale,
        title,
        templateId,
        summaryTitle: defaults.summary.title,
        educationTitle: defaults.education.title,
        experienceTitle: defaults.experience.title,
        projectsTitle: defaults.projects.title,
        skillsTitle: defaults.skills.title,
        languagesTitle: defaults.languages.title,
      })
      .returning({ id: cvs.id, title: cvs.title, locale: cvs.locale, templateId: cvs.templateId })

    return c.json(inserted, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao criar CV'
    return c.json({ error: message }, 500)
  }
})

// GET /sample-preview — render sample CV preview for a given locale
app.get('/sample-preview', async (c) => {
  const locale = (c.req.query('locale') === 'en' ? 'en' : 'pt') as Locale

  try {
    const filePath = resolve(process.cwd(), `data/cv.${locale}.yaml`)
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = parseYaml(raw) as CvData

    const cv: CvData = {
      ...parsed,
      meta: {
        ...parsed.meta,
        templateId: parsed.meta.templateId ?? 'jake',
        locale,
      },
    }

    const html = renderCvPreview(cv)
    return c.html(html)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar preview de exemplo'
    console.error('[sample-preview] Error:', message)
    return c.json({ error: message }, 500)
  }
})

// GET /:cvId — fetch CV
app.get('/:cvId', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  const userId = c.get('user').id

  try {
    const [cv] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
      .limit(1)

    if (!cv) {
      return c.json({ error: 'CV não encontrado' }, 404)
    }

    const [education, experience, projects, skills, languages] =
      await Promise.all([
        db.select().from(cvEducationItems).where(eq(cvEducationItems.cvId, cv.id)).orderBy(asc(cvEducationItems.orderIndex)),
        db.select().from(cvExperienceItems).where(eq(cvExperienceItems.cvId, cv.id)).orderBy(asc(cvExperienceItems.orderIndex)),
        db.select().from(cvProjectItems).where(eq(cvProjectItems.cvId, cv.id)).orderBy(asc(cvProjectItems.orderIndex)),
        db.select().from(cvSkillCategories).where(eq(cvSkillCategories.cvId, cv.id)).orderBy(asc(cvSkillCategories.orderIndex)),
        db.select().from(cvLanguageItems).where(eq(cvLanguageItems.cvId, cv.id)).orderBy(asc(cvLanguageItems.orderIndex)),
      ])

    const cvData = cvRowsToCvData(cv, education, experience, projects, skills, languages)

    const result = {
      templateId: cvData.meta.templateId,
      locale: cvData.meta.locale,
      sectionOrder: cvData.meta.sectionOrder,
      customLatex: cv.customLatex ?? undefined,
      customSections: cvData.customSections ?? undefined,
      header: cvData.header,
      summary: cvData.summary,
      education: cvData.education,
      experience: cvData.experience,
      projects: cvData.projects,
      skills: cvData.skills,
      languages: cvData.languages,
    }

    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar CV'
    return c.json({ error: message }, 500)
  }
})

// PUT /:cvId — update CV
app.put('/:cvId', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  const userId = c.get('user').id

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = cvInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const input = parsed.data

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: cvs.id })
        .from(cvs)
        .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
        .limit(1)

      if (!existing) {
        throw new Error('CV_NOT_FOUND')
      }

      await tx
        .update(cvs)
        .set({
          templateId: input.templateId,
          locale: input.locale ?? undefined,
          name: input.header.name,
          location: input.header.location,
          phone: input.header.phone,
          email: input.header.email,
          linkedin: input.header.linkedin,
          github: input.header.github,
          summaryTitle: input.summary.title,
          summaryText: input.summary.text,
          educationTitle: input.education.title,
          experienceTitle: input.experience.title,
          projectsTitle: input.projects.title,
          skillsTitle: input.skills.title,
          languagesTitle: input.languages.title,
          sectionOrder: input.sectionOrder ? JSON.stringify(input.sectionOrder) : null,
          customSections: input.customSections && input.customSections.length > 0 ? JSON.stringify(input.customSections) : null,
          customLatex: input.customLatex ?? null,
          updatedAt: new Date(),
        })
        .where(eq(cvs.id, cvId))

      await Promise.all([
        tx.delete(cvEducationItems).where(eq(cvEducationItems.cvId, cvId)),
        tx.delete(cvExperienceItems).where(eq(cvExperienceItems.cvId, cvId)),
        tx.delete(cvProjectItems).where(eq(cvProjectItems.cvId, cvId)),
        tx.delete(cvSkillCategories).where(eq(cvSkillCategories.cvId, cvId)),
        tx.delete(cvLanguageItems).where(eq(cvLanguageItems.cvId, cvId)),
      ])

      const inserts: Promise<unknown>[] = []

      if (input.education.items.length > 0) {
        inserts.push(
          tx.insert(cvEducationItems).values(
            input.education.items.map((item, i) => ({
              cvId, orderIndex: i,
              institution: item.institution, degree: item.degree,
              date: item.date, location: item.location, highlights: item.highlights,
            })),
          ),
        )
      }

      if (input.experience.items.length > 0) {
        inserts.push(
          tx.insert(cvExperienceItems).values(
            input.experience.items.map((item, i) => ({
              cvId, orderIndex: i,
              company: item.company, role: item.role,
              date: item.date, location: item.location, highlights: item.highlights,
            })),
          ),
        )
      }

      if (input.projects.items.length > 0) {
        inserts.push(
          tx.insert(cvProjectItems).values(
            input.projects.items.map((item, i) => ({
              cvId, orderIndex: i,
              name: item.name, tech: item.tech, date: item.date, highlights: item.highlights,
            })),
          ),
        )
      }

      if (input.skills.categories.length > 0) {
        inserts.push(
          tx.insert(cvSkillCategories).values(
            input.skills.categories.map((cat, i) => ({
              cvId, orderIndex: i, name: cat.name, values: cat.values,
            })),
          ),
        )
      }

      if (input.languages.items.length > 0) {
        inserts.push(
          tx.insert(cvLanguageItems).values(
            input.languages.items.map((lang, i) => ({
              cvId, orderIndex: i, name: lang.name, level: lang.level,
            })),
          ),
        )
      }

      await Promise.all(inserts)
    })

    return c.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'CV_NOT_FOUND') {
      return c.json({ error: 'CV não encontrado' }, 404)
    }
    const message = error instanceof Error ? error.message : 'Falha ao salvar CV'
    return c.json({ error: message }, 500)
  }
})

// DELETE /:cvId — delete CV
app.delete('/:cvId', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  const userId = c.get('user').id

  try {
    const result = await db
      .delete(cvs)
      .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
      .returning({ id: cvs.id })

    if (result.length === 0) {
      return c.json({ error: 'CV não encontrado' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir CV'
    return c.json({ error: message }, 500)
  }
})

// POST /:cvId/preview — render CV preview
app.post('/:cvId/preview', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = cvInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const locale = (parsed.data.locale ?? 'en') as Locale
  const cvData = cvInputToCvData(parsed.data, locale, undefined, parsed.data.templateId)

  const ghost = c.req.query('ghost') === '1'
  if (ghost) {
    try {
      const filePath = resolve(process.cwd(), `data/cv.${locale}.yaml`)
      const raw = readFileSync(filePath, 'utf-8')
      const sampleParsed = parseYaml(raw) as CvData
      const sampleData: CvData = {
        ...sampleParsed,
        meta: {
          ...sampleParsed.meta,
          templateId: sampleParsed.meta.templateId ?? 'jake',
          locale,
        },
      }
      const html = renderGhostPreview(cvData, sampleData)
      return c.html(html)
    } catch (error) {
      console.error('[preview] Ghost mode failed, falling back:', error instanceof Error ? error.message : error)
      const html = renderCvPreview(cvData)
      return c.html(html)
    }
  }

  const html = renderCvPreview(cvData)
  return c.html(html)
})

// POST /:cvId/pdf — generate PDF
app.post('/:cvId/pdf', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  const userId = c.get('user').id

  try {
    // Verify ownership and get name for filename
    const [cvOwnership] = await db
      .select({ id: cvs.id, name: cvs.name })
      .from(cvs)
      .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
      .limit(1)
    if (!cvOwnership) {
      return c.json({ error: 'CV não encontrado' }, 404)
    }

    const pdfFilename = cvOwnership.name
      ? buildPdfFilename(cvOwnership.name)
      : 'Resume.pdf'

    // Check for custom LaTeX in request body
    let customLatex: string | undefined
    try {
      const body = await c.req.json()
      if (body && typeof body.customLatex === 'string' && body.customLatex.trim()) {
        customLatex = body.customLatex
      }
    } catch {
      // No body or invalid JSON — use default template
    }

    if (customLatex) {
      const pdfBuffer = await generatePdfFromCustomLatex(customLatex)
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${pdfFilename}"`,
        },
      })
    }

    const cvData = await loadCvById(cvId, userId)

    if (!cvData || !cvData.header.name) {
      return c.json({ error: 'Preencha ao menos seu nome antes de gerar o PDF' }, 400)
    }

    const pdfBuffer = await generatePdf(cvData)
    const locale = cvData.meta.locale

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar PDF'
    return c.json({ error: message }, 500)
  }
})

// POST /:cvId/latex — generate LaTeX source from current data
app.post('/:cvId/latex', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = cvInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou' }, 400)
  }

  const locale = (parsed.data.locale ?? 'en') as Locale
  const cvData = cvInputToCvData(parsed.data, locale, undefined, parsed.data.templateId)

  const tex = generateTexFromData(cvData)

  return c.text(tex)
})

// POST /:cvId/ats-score — ATS analysis
app.post('/:cvId/ats-score', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  const userId = c.get('user').id

  const { allowed, retryAfterMs } = checkRateLimit(`ats-score:${userId}`, {
    windowMs: 3_600_000,
    maxRequests: 10,
  })
  if (!allowed) {
    return rateLimitResponse(retryAfterMs)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = cvInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const locale = parsed.data.locale ?? 'en'

  try {
    const result = await analyzeCvAtsScore(parsed.data, locale)
    return c.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ATS analysis failed'
    console.error('[ats-score] ATS analysis failed:', message)

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('rate_limit') || message.includes('429')) {
      return c.json({ error: 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.' }, 503)
    }

    return c.json({ error: 'Falha ao analisar CV. Tente novamente.' }, 422)
  }
})

// POST /:cvId/import — import CV from PDF
app.post('/:cvId/import', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  if (!process.env.GROQ_API_KEY) {
    return c.json({ error: 'Importação de PDF não disponível' }, 503)
  }

  const userId = c.get('user').id

  const { allowed, retryAfterMs } = checkRateLimit(`import:${userId}`, {
    windowMs: 3_600_000,
    maxRequests: 5,
  })
  if (!allowed) {
    return rateLimitResponse(retryAfterMs)
  }

  const [cv] = await db
    .select({ locale: cvs.locale })
    .from(cvs)
    .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
    .limit(1)

  if (!cv) {
    return c.json({ error: 'CV não encontrado' }, 404)
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]

  let formData: FormData
  try {
    formData = await c.req.raw.formData()
  } catch {
    return c.json({ error: 'Dados do formulário inválidos' }, 400)
  }

  const file = formData.get('pdf')
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Nenhum arquivo PDF fornecido' }, 400)
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB.' }, 400)
  }

  if (file.type !== 'application/pdf') {
    return c.json({ error: 'Apenas arquivos PDF são aceitos' }, 400)
  }

  const buffer = await file.arrayBuffer()
  const header = new Uint8Array(buffer.slice(0, 4))
  const isPdf = PDF_MAGIC_BYTES.every((byte, i) => header[i] === byte)
  if (!isPdf) {
    return c.json({ error: 'Arquivo não é um PDF válido' }, 400)
  }

  try {
    const cvData = await parseCvFromPdf(buffer, cv.locale)
    return c.json(cvData)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse CV'
    console.error('[import] PDF import failed:', message)

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('rate_limit') || message.includes('429')) {
      return c.json({ error: 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.' }, 503)
    }
    if (message.includes('blocked by safety')) {
      return c.json({ error: 'O conteúdo do PDF foi bloqueado pelo filtro de segurança. Tente um arquivo diferente.' }, 422)
    }
    if (message.includes('empty response') || message.includes('Could not extract text')) {
      return c.json({ error: 'Não foi possível ler o PDF. Verifique se o arquivo não está protegido ou corrompido.' }, 422)
    }

    return c.json({ error: 'Falha ao extrair dados do PDF. Tente um arquivo diferente.' }, 422)
  }
})

// POST /import-pdf — one-click: upload PDF → parse → create CV with data → return id
app.post('/import-pdf', async (c) => {
  if (!process.env.GROQ_API_KEY) {
    return c.json({ error: 'Importação de PDF não disponível. Configure GROQ_API_KEY.' }, 503)
  }

  const userId = c.get('user').id

  const { allowed, retryAfterMs } = checkRateLimit(`import:${userId}`, {
    windowMs: 3_600_000,
    maxRequests: 5,
  })
  if (!allowed) {
    return rateLimitResponse(retryAfterMs)
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]

  let formData: FormData
  try {
    formData = await c.req.raw.formData()
  } catch {
    return c.json({ error: 'Dados do formulário inválidos' }, 400)
  }

  const file = formData.get('pdf')
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'Nenhum arquivo PDF fornecido' }, 400)
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB.' }, 400)
  }
  if (file.type !== 'application/pdf') {
    return c.json({ error: 'Apenas arquivos PDF são aceitos' }, 400)
  }

  const buffer = await file.arrayBuffer()
  const header = new Uint8Array(buffer.slice(0, 4))
  const isPdf = PDF_MAGIC_BYTES.every((byte, i) => header[i] === byte)
  if (!isPdf) {
    return c.json({ error: 'Arquivo não é um PDF válido' }, 400)
  }

  // Parse PDF with AI (auto-detect locale)
  let cvData: import('../../lib/zod-schemas/cv.js').CvInput
  try {
    cvData = await parseCvFromPdf(buffer)
    console.log('[import-pdf] AI parsed successfully, locale:', cvData.locale)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse CV'
    console.error('[import-pdf] AI parse failed:', message)

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('rate_limit') || message.includes('429')) {
      return c.json({ error: 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.' }, 503)
    }
    if (message.includes('blocked by safety')) {
      return c.json({ error: 'O conteúdo do PDF foi bloqueado pelo filtro de segurança.' }, 422)
    }
    if (message.includes('empty response') || message.includes('Could not extract text')) {
      return c.json({ error: 'Não foi possível ler o PDF. Verifique se não está protegido ou corrompido.' }, 422)
    }
    return c.json({ error: 'Falha ao extrair dados do PDF. Tente um arquivo diferente.' }, 422)
  }

  // Create CV and save all data in one transaction
  const locale = (cvData.locale ?? 'en') as Locale
  const defaults = getFormDefaults(locale)
  const title = cvData.header.name || (locale === 'pt' ? 'CV Importado' : 'Imported CV')

  try {
    const [inserted] = await db
      .insert(cvs)
      .values({
        userId,
        locale,
        title,
        templateId: cvData.templateId ?? 'jake',
        name: cvData.header.name,
        location: cvData.header.location,
        phone: cvData.header.phone,
        email: cvData.header.email,
        linkedin: cvData.header.linkedin,
        github: cvData.header.github,
        summaryTitle: cvData.summary.title || defaults.summary.title,
        summaryText: cvData.summary.text,
        educationTitle: cvData.education.title || defaults.education.title,
        experienceTitle: cvData.experience.title || defaults.experience.title,
        projectsTitle: cvData.projects.title || defaults.projects.title,
        skillsTitle: cvData.skills.title || defaults.skills.title,
        languagesTitle: cvData.languages.title || defaults.languages.title,
      })
      .returning({ id: cvs.id })

    const cvId = inserted.id
    const inserts: Promise<unknown>[] = []

    if (cvData.education.items.length > 0) {
      inserts.push(
        db.insert(cvEducationItems).values(
          cvData.education.items.map((item, i) => ({
            cvId, orderIndex: i,
            institution: item.institution, degree: item.degree,
            date: item.date, location: item.location, highlights: item.highlights,
          })),
        ),
      )
    }
    if (cvData.experience.items.length > 0) {
      inserts.push(
        db.insert(cvExperienceItems).values(
          cvData.experience.items.map((item, i) => ({
            cvId, orderIndex: i,
            company: item.company, role: item.role,
            date: item.date, location: item.location, highlights: item.highlights,
          })),
        ),
      )
    }
    if (cvData.projects.items.length > 0) {
      inserts.push(
        db.insert(cvProjectItems).values(
          cvData.projects.items.map((item, i) => ({
            cvId, orderIndex: i,
            name: item.name, tech: item.tech, date: item.date, highlights: item.highlights,
          })),
        ),
      )
    }
    if (cvData.skills.categories.length > 0) {
      inserts.push(
        db.insert(cvSkillCategories).values(
          cvData.skills.categories.map((cat, i) => ({
            cvId, orderIndex: i, name: cat.name, values: cat.values,
          })),
        ),
      )
    }
    if (cvData.languages.items.length > 0) {
      inserts.push(
        db.insert(cvLanguageItems).values(
          cvData.languages.items.map((lang, i) => ({
            cvId, orderIndex: i, name: lang.name, level: lang.level,
          })),
        ),
      )
    }

    await Promise.all(inserts)

    return c.json({ id: cvId }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar CV'
    console.error('[import-pdf] DB save failed:', message)
    return c.json({ error: message }, 500)
  }
})

// POST /:cvId/clone-translate — clone CV to another locale with translation
app.post('/:cvId/clone-translate', async (c) => {
  const cvId = c.req.param('cvId')
  if (!isValidUuid(cvId)) {
    return c.json({ error: 'ID de CV inválido' }, 400)
  }

  const userId = c.get('user').id

  const { allowed, retryAfterMs } = checkRateLimit(`clone-translate:${userId}`, {
    windowMs: 3_600_000,
    maxRequests: 5,
  })
  if (!allowed) {
    return rateLimitResponse(retryAfterMs)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const targetLocale = (body as { targetLocale?: string })?.targetLocale
  if (targetLocale !== 'pt' && targetLocale !== 'en') {
    return c.json({ error: 'targetLocale deve ser "pt" ou "en"' }, 400)
  }

  // Load original CV
  const [cv] = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
    .limit(1)

  if (!cv) {
    return c.json({ error: 'CV não encontrado' }, 404)
  }

  const [education, experience, projects, skills, languages] =
    await Promise.all([
      db.select().from(cvEducationItems).where(eq(cvEducationItems.cvId, cv.id)).orderBy(asc(cvEducationItems.orderIndex)),
      db.select().from(cvExperienceItems).where(eq(cvExperienceItems.cvId, cv.id)).orderBy(asc(cvExperienceItems.orderIndex)),
      db.select().from(cvProjectItems).where(eq(cvProjectItems.cvId, cv.id)).orderBy(asc(cvProjectItems.orderIndex)),
      db.select().from(cvSkillCategories).where(eq(cvSkillCategories.cvId, cv.id)).orderBy(asc(cvSkillCategories.orderIndex)),
      db.select().from(cvLanguageItems).where(eq(cvLanguageItems.cvId, cv.id)).orderBy(asc(cvLanguageItems.orderIndex)),
    ])

  const cvData = cvRowsToCvData(cv, education, experience, projects, skills, languages)

  // Build CvInput from original data (deep copy to satisfy mutable type)
  const originalInput: import('../../lib/zod-schemas/cv.js').CvInput = {
    templateId: (cvData.meta.templateId ?? 'jake') as 'jake',
    locale: cvData.meta.locale as 'pt' | 'en',
    sectionOrder: cvData.meta.sectionOrder ? [...cvData.meta.sectionOrder] : undefined,
    customSections: cvData.customSections ? cvData.customSections.map(cs => ({ id: cs.id, title: cs.title, items: cs.items.map(i => ({ text: i.text })) })) : undefined,
    header: { ...cvData.header },
    summary: { ...cvData.summary },
    education: { title: cvData.education.title, items: cvData.education.items.map(i => ({ ...i, highlights: [...i.highlights] })) },
    experience: { title: cvData.experience.title, items: cvData.experience.items.map(i => ({ ...i, highlights: [...i.highlights] })) },
    projects: { title: cvData.projects.title, items: cvData.projects.items.map(i => ({ ...i, highlights: [...i.highlights] })) },
    skills: { title: cvData.skills.title, categories: cvData.skills.categories.map(c => ({ ...c })) },
    languages: { title: cvData.languages.title, items: cvData.languages.items.map(l => ({ ...l })) },
  }

  // Try translation via AI, fallback to copy with locale section titles
  let translatedInput: import('../../lib/zod-schemas/cv.js').CvInput
  let translated = false
  try {
    translatedInput = await translateCvContent(originalInput, targetLocale)
    translatedInput.locale = targetLocale as 'pt' | 'en'
    translated = true
  } catch (error) {
    console.error('[clone-translate] Translation failed, using fallback:', error instanceof Error ? error.message : error)
    const defaults = getFormDefaults(targetLocale as Locale)
    translatedInput = {
      ...originalInput,
      locale: targetLocale,
      summary: { ...originalInput.summary, title: defaults.summary.title },
      education: { ...originalInput.education, title: defaults.education.title },
      experience: { ...originalInput.experience, title: defaults.experience.title },
      projects: { ...originalInput.projects, title: defaults.projects.title },
      skills: { ...originalInput.skills, title: defaults.skills.title },
      languages: { ...originalInput.languages, title: defaults.languages.title },
    }
  }

  // Save as new CV
  const title = translatedInput.header.name || (targetLocale === 'pt' ? 'CV Clonado' : 'Cloned CV')

  try {
    const [inserted] = await db
      .insert(cvs)
      .values({
        userId,
        locale: targetLocale,
        title,
        templateId: translatedInput.templateId ?? 'jake',
        name: translatedInput.header.name,
        location: translatedInput.header.location,
        phone: translatedInput.header.phone,
        email: translatedInput.header.email,
        linkedin: translatedInput.header.linkedin,
        github: translatedInput.header.github,
        summaryTitle: translatedInput.summary.title,
        summaryText: translatedInput.summary.text,
        educationTitle: translatedInput.education.title,
        experienceTitle: translatedInput.experience.title,
        projectsTitle: translatedInput.projects.title,
        skillsTitle: translatedInput.skills.title,
        languagesTitle: translatedInput.languages.title,
        sectionOrder: translatedInput.sectionOrder ? JSON.stringify(translatedInput.sectionOrder) : null,
        customSections: translatedInput.customSections && translatedInput.customSections.length > 0 ? JSON.stringify(translatedInput.customSections) : null,
      })
      .returning({ id: cvs.id })

    const newCvId = inserted.id
    const inserts: Promise<unknown>[] = []

    if (translatedInput.education.items.length > 0) {
      inserts.push(
        db.insert(cvEducationItems).values(
          translatedInput.education.items.map((item, i) => ({
            cvId: newCvId, orderIndex: i,
            institution: item.institution, degree: item.degree,
            date: item.date, location: item.location, highlights: item.highlights,
          })),
        ),
      )
    }
    if (translatedInput.experience.items.length > 0) {
      inserts.push(
        db.insert(cvExperienceItems).values(
          translatedInput.experience.items.map((item, i) => ({
            cvId: newCvId, orderIndex: i,
            company: item.company, role: item.role,
            date: item.date, location: item.location, highlights: item.highlights,
          })),
        ),
      )
    }
    if (translatedInput.projects.items.length > 0) {
      inserts.push(
        db.insert(cvProjectItems).values(
          translatedInput.projects.items.map((item, i) => ({
            cvId: newCvId, orderIndex: i,
            name: item.name, tech: item.tech, date: item.date, highlights: item.highlights,
          })),
        ),
      )
    }
    if (translatedInput.skills.categories.length > 0) {
      inserts.push(
        db.insert(cvSkillCategories).values(
          translatedInput.skills.categories.map((cat, i) => ({
            cvId: newCvId, orderIndex: i, name: cat.name, values: cat.values,
          })),
        ),
      )
    }
    if (translatedInput.languages.items.length > 0) {
      inserts.push(
        db.insert(cvLanguageItems).values(
          translatedInput.languages.items.map((lang, i) => ({
            cvId: newCvId, orderIndex: i, name: lang.name, level: lang.level,
          })),
        ),
      )
    }

    await Promise.all(inserts)

    return c.json({ id: newCvId, locale: targetLocale, translated }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao clonar CV'
    console.error('[clone-translate] DB save failed:', message)
    return c.json({ error: message }, 500)
  }
})

export default app
