import { Hono } from 'hono'
import { eq, and, asc, desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { coverLetters, coverLetterBodyItems, cvs } from '../../db/schema/index.js'
import { coverLetterInputSchema } from '../../lib/zod-schemas/cover-letter.js'
import { loadCoverLetter } from '../../lib/load-cover-letter.js'
import { validateUserLatex, DangerousLatexError } from '../../lib/latex-validation.js'
import { isValidUuid } from '../../lib/validation.js'
import { DEFAULT_COVER_LETTER_TEMPLATE_ID } from '../../lib/templates.js'
import { renderCoverLetterPreview } from '../../lib/preview-renderer.js'
import { coverLetterInputToData } from '../../lib/cover-letter-to-data.js'
import { checkRateLimit, rateLimitResponse } from '../../lib/rate-limit.js'
import {
  generateCoverLetterPdf,
  generateCoverLetterPdfFromCustomLatex,
} from '../../lib/pdf-generator.js'

function sanitizeNameForFilename(fullName: string): string {
  return fullName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_')
}

function sanitizePdfFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 200) || 'Cover_Letter.pdf'
}

function buildCoverLetterPdfFilename(name: string): string {
  const sanitized = sanitizeNameForFilename(name)
  return sanitizePdfFilename(`${sanitized}_Cover_Letter.pdf`)
}

const app = new Hono()

// GET / — list user cover letters
app.get('/', async (c) => {
  const userId = c.get('user').id
  try {
    const list = await db
      .select({
        id: coverLetters.id,
        title: coverLetters.title,
        locale: coverLetters.locale,
        templateId: coverLetters.templateId,
        createdAt: coverLetters.createdAt,
        updatedAt: coverLetters.updatedAt,
        cvId: coverLetters.cvId,
      })
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId))
      .orderBy(desc(coverLetters.updatedAt))

    return c.json(list)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar cartas de apresentação'
    return c.json({ error: message }, 500)
  }
})

// POST / — create cover letter
app.post('/', async (c) => {
  const userId = c.get('user').id

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = coverLetterInputSchema
    .pick({ locale: true, title: true })
    .extend({
      locale: coverLetterInputSchema.shape.locale,
      title: coverLetterInputSchema.shape.title.optional(),
      cvId: coverLetterInputSchema.shape.cvId.optional(),
    })
    .safeParse(body)

  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const { locale, title = '', cvId = null } = parsed.data

  // Attempt to snapshot sender fields from CV when cvId is provided
  let senderName = ''
  let senderTitle = ''
  let senderLocation = ''
  let senderEmail = ''
  let senderPhone = ''
  let senderLinkedin = ''
  let resolvedCvId: string | null = null

  if (cvId) {
    const [cv] = await db
      .select({
        id: cvs.id,
        name: cvs.name,
        headerTitle: cvs.headerTitle,
        location: cvs.location,
        email: cvs.email,
        phone: cvs.phone,
        linkedin: cvs.linkedin,
      })
      .from(cvs)
      .where(and(eq(cvs.id, cvId), eq(cvs.userId, userId)))
      .limit(1)

    if (cv) {
      senderName = cv.name ?? ''
      senderTitle = cv.headerTitle ?? ''
      senderLocation = cv.location ?? ''
      senderEmail = cv.email ?? ''
      senderPhone = cv.phone ?? ''
      senderLinkedin = cv.linkedin ?? ''
      resolvedCvId = cv.id
    }
    // If CV not found (user doesn't own it), proceed with empty sender fields
  }

  const pdfFilename = senderName
    ? buildCoverLetterPdfFilename(senderName)
    : 'Cover_Letter.pdf'

  try {
    const [inserted] = await db
      .insert(coverLetters)
      .values({
        userId,
        locale,
        title: title ?? '',
        templateId: DEFAULT_COVER_LETTER_TEMPLATE_ID,
        cvId: resolvedCvId,
        pdfFilename,
        senderName,
        senderTitle,
        senderLocation,
        senderEmail,
        senderPhone,
        senderLinkedin,
      })
      .returning({ id: coverLetters.id })

    return c.json({ id: inserted.id }, 201)
  } catch (error) {
    console.error('[cover-letter POST] insert failed:', error)
    const message = error instanceof Error ? error.message : 'Falha ao criar carta de apresentação'
    return c.json({ error: message }, 500)
  }
})

// GET /:id — fetch cover letter
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  if (!isValidUuid(id)) {
    return c.json({ error: 'ID de carta de apresentação inválido' }, 400)
  }

  const userId = c.get('user').id

  try {
    const data = await loadCoverLetter(userId, id)
    if (!data) {
      return c.json({ error: 'Carta de apresentação não encontrada' }, 404)
    }
    return c.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar carta de apresentação'
    return c.json({ error: message }, 500)
  }
})

// PUT /:id — update cover letter
app.put('/:id', async (c) => {
  const id = c.req.param('id')
  if (!isValidUuid(id)) {
    return c.json({ error: 'ID de carta de apresentação inválido' }, 400)
  }

  const userId = c.get('user').id

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = coverLetterInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const input = parsed.data

  // Validate customLatex security
  if (input.customLatex) {
    try {
      validateUserLatex(input.customLatex)
    } catch {
      return c.json({ error: 'LaTeX customizado contém comandos inválidos' }, 400)
    }
  }

  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: coverLetters.id })
        .from(coverLetters)
        .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
        .limit(1)

      if (!existing) {
        throw new Error('COVER_LETTER_NOT_FOUND')
      }

      // Verify cvId ownership before allowing the update
      let resolvedCvId = input.cvId
      if (resolvedCvId !== null && resolvedCvId !== undefined) {
        const ownedCv = await tx
          .select({ id: cvs.id })
          .from(cvs)
          .where(and(eq(cvs.id, resolvedCvId), eq(cvs.userId, userId)))
          .limit(1)
        if (ownedCv.length === 0) {
          resolvedCvId = null
        }
      }

      await tx
        .update(coverLetters)
        .set({
          locale: input.locale,
          templateId: input.templateId,
          cvId: resolvedCvId,
          title: input.title,
          pdfFilename: input.pdfFilename,
          senderName: input.sender.name,
          senderTitle: input.sender.title,
          senderLocation: input.sender.location,
          senderEmail: input.sender.email,
          senderPhone: input.sender.phone,
          senderLinkedin: input.sender.linkedin,
          recipientSalutation: input.recipient.salutation,
          recipientName: input.recipient.name,
          recipientCompany: input.recipient.company,
          recipientAddress: input.recipient.address,
          letterDate: input.letterDate,
          closingPhrase: input.closingPhrase,
          signature: input.signature,
          customLatex: input.customLatex,
          updatedAt: new Date(),
        })
        .where(eq(coverLetters.id, id))

      // Delete-and-reinsert body items (mirror cv-language-items pattern)
      await tx.delete(coverLetterBodyItems).where(eq(coverLetterBodyItems.coverLetterId, id))

      if (input.body.length > 0) {
        await tx.insert(coverLetterBodyItems).values(
          input.body.map((item, i) => ({
            coverLetterId: id,
            orderIndex: i,
            label: item.label,
            content: item.content,
          })),
        )
      }
    })

    return c.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'COVER_LETTER_NOT_FOUND') {
      return c.json({ error: 'Carta de apresentação não encontrada' }, 404)
    }
    const message = error instanceof Error ? error.message : 'Falha ao salvar carta de apresentação'
    return c.json({ error: message }, 500)
  }
})

// DELETE /:id — delete cover letter
app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  if (!isValidUuid(id)) {
    return c.json({ error: 'ID de carta de apresentação inválido' }, 400)
  }

  const userId = c.get('user').id

  try {
    const result = await db
      .delete(coverLetters)
      .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
      .returning({ id: coverLetters.id })

    if (result.length === 0) {
      return c.json({ error: 'Carta de apresentação não encontrada' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir carta de apresentação'
    return c.json({ error: message }, 500)
  }
})

// POST /:id/preview — render HTML preview
app.post('/:id/preview', async (c) => {
  const id = c.req.param('id')
  if (!isValidUuid(id)) {
    return c.json({ error: 'ID de carta de apresentação inválido' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = coverLetterInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const userId = c.get('user').id
  const data = coverLetterInputToData(parsed.data, userId, id)
  const html = renderCoverLetterPreview(data)
  return c.html(html)
})

// POST /:id/pdf — generate PDF
app.post('/:id/pdf', async (c) => {
  const id = c.req.param('id')
  if (!isValidUuid(id)) {
    return c.json({ error: 'ID de carta de apresentação inválido' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const parsed = coverLetterInputSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validação falhou', details: parsed.error.issues }, 400)
  }

  const input = parsed.data

  if (input.customLatex) {
    try {
      validateUserLatex(input.customLatex)
    } catch (err) {
      if (err instanceof DangerousLatexError) {
        return c.json({ error: 'LaTeX customizado contém comandos inválidos' }, 400)
      }
      return c.json({ error: 'Erro na validação do LaTeX' }, 400)
    }
  }

  const userId = (c.get('user') as { id: string }).id

  // Ownership check
  const owned = await db
    .select({ id: coverLetters.id })
    .from(coverLetters)
    .where(and(eq(coverLetters.id, id), eq(coverLetters.userId, userId)))
    .limit(1)
  if (owned.length === 0) {
    return c.json({ error: 'Carta não encontrada' }, 404)
  }

  // Per-user rate limit
  const { allowed, retryAfterMs } = checkRateLimit(`cover-letter-pdf:${userId}`, {
    windowMs: 60_000,
    maxRequests: 5,
  })
  if (!allowed) {
    return c.json(
      { error: 'Muitas tentativas de geração de PDF. Tente novamente em 1 minuto.' },
      429,
    )
  }

  const data = coverLetterInputToData(input, userId, id)

  // Derive filename server-side; never trust user-supplied pdfFilename for the header
  const filename = buildCoverLetterPdfFilename(input.sender.name || 'Cover_Letter')

  try {
    const pdfBuffer = input.customLatex
      ? await generateCoverLetterPdfFromCustomLatex(input.customLatex, filename)
      : await generateCoverLetterPdf(data)

    return c.body(new Uint8Array(pdfBuffer), 200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar PDF'
    return c.json({ error: message }, 500)
  }
})

export { app as coverLetterApi }
export default app
