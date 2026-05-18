import { createHash } from 'node:crypto'
import Groq from 'groq-sdk'
import { z } from 'zod'
import { cvInputSchema, type CvInput } from './zod-schemas/cv.js'
import { DEFAULT_CV_TEMPLATE_ID } from './templates.js'
import { atsScoreResponseSchema, type AtsScoreResponse } from './zod-schemas/ats-score.js'
import { runRuleBasedChecks, type RuleBasedResult, type SectionScore, type ValidationIssue, type ValidationPositive } from './cv-validation/index.js'
import type { Locale, SectionKey } from './cv-validation/types.js'

const MODEL = 'llama-3.3-70b-versatile'
const TIMEOUT_MS = 30_000

function stripForAi(input: CvInput): Record<string, unknown> {
  const { customLatex, templateId, ...rest } = input
  return rest
}

const atsCache = new Map<string, { result: AtsScoreResponse; expiry: number }>()
const ATS_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

function hashInput(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

function timeoutPromise(): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
  })
}

function buildPdfParsePrompt(locale: string | undefined, schemaJson: string): string {
  const localeInstructions = locale
    ? `- The CV is in ${locale === 'pt' ? 'Portuguese' : 'English'}. Set locale to "${locale}". Use section titles in ${locale === 'pt' ? 'Portuguese' : 'English'}:
  ${locale === 'pt'
    ? '- "Resumo Profissional", "Formacao Academica", "Experiencia Profissional", "Projetos", "Habilidades", "Idiomas"'
    : '- "Professional Summary", "Education", "Experience", "Projects", "Skills", "Languages"'}`
    : `- Auto-detect the language of the CV. Set locale to "pt" if Portuguese, "en" if English or any other language.
- Use section titles matching the detected language:
  - Portuguese: "Resumo Profissional", "Formacao Academica", "Experiencia Profissional", "Projetos", "Habilidades", "Idiomas"
  - English: "Professional Summary", "Education", "Experience", "Projects", "Skills", "Languages"`

  return `You are a CV/resume parser. Extract ALL information from the provided resume text into structured JSON.

Rules:
${localeInstructions}
- Each bullet point or achievement = one separate string in the highlights array
- For skills, group by category (e.g. "Programming Languages", "Frameworks"). The "values" field is a comma-separated string of skills in that category
- For languages, include name and proficiency level
- Empty or missing fields = empty string ""
- Keep dates in the original format found in the CV
- Do NOT invent or hallucinate information not present in the text
- Set templateId to "${DEFAULT_CV_TEMPLATE_ID}"
- Extract the person's name, location, phone, email, LinkedIn URL, and GitHub URL from the header/contact section
- If a section is not present in the CV, use an empty title and empty items array

You must respond ONLY with valid JSON matching this schema:
${schemaJson}`
}

function buildTranslatePrompt(targetLocale: string, schemaJson: string): string {
  const targetLang = targetLocale === 'pt' ? 'Brazilian Portuguese' : 'English'
  const sectionTitles = targetLocale === 'pt'
    ? '"Resumo Profissional", "Formacao Academica", "Experiencia Profissional", "Projetos Principais", "Habilidades Tecnicas", "Idiomas"'
    : '"Professional Summary", "Education", "Professional Experience", "Key Projects", "Technical Skills", "Languages"'

  return `Translate CV to ${targetLang}. Set locale="${targetLocale}".
Section titles: ${sectionTitles}
Translate: titles, summary, highlights, job titles, degrees, skill names, language levels.
Keep: proper names, companies, URLs, emails, phones, tech names (React, Python, etc).
Keep same JSON structure. Professional tone.

You must respond ONLY with valid JSON matching this schema:
${schemaJson}`
}

// --- LLM categorical grading ---

const llmGradeSchema = z.object({
  summaryGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  experienceGrade: z.enum(['A', 'B', 'C', 'D', 'F']),
  overallImpression: z.enum(['A', 'B', 'C', 'D', 'F']),
  topSuggestion: z.string(),
})

type LlmGradeResult = z.infer<typeof llmGradeSchema>

const GRADE_PENALTY: Record<string, number> = {
  A: 0,
  B: -1,
  C: -2,
  D: -3,
  F: -5,
}

function buildCategoricalGradePrompt(): string {
  return `You are an expert resume reviewer. Evaluate this CV's writing quality.
Respond ONLY with JSON:
{
  "summaryGrade": "A"|"B"|"C"|"D"|"F",
  "experienceGrade": "A"|"B"|"C"|"D"|"F",
  "overallImpression": "A"|"B"|"C"|"D"|"F",
  "topSuggestion": "<single most impactful improvement>"
}
Grades: A=excellent, B=good, C=fair, D=needs work, F=major issues`
}

async function fetchLlmGrade(cvInput: CvInput): Promise<LlmGradeResult | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  try {
    const groq = new Groq({ apiKey })
    const stripped = stripForAi(cvInput)
    const apiCall = groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildCategoricalGradePrompt() },
        { role: 'user', content: `CV Data:\n${JSON.stringify(stripped)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      seed: 42,
    })
    const response = await Promise.race([apiCall, timeoutPromise()])
    const text = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(text)
    return llmGradeSchema.parse(parsed)
  } catch (err) {
    console.warn('[ats-score] LLM grading failed, using rule-based only:', err instanceof Error ? err.message : err)
    return null
  }
}

// --- Convert rule-based results to AtsScoreResponse shape ---

const SECTION_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  en: {
    contact: 'Contact Information',
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    languages: 'Languages',
    formatting: 'Formatting & ATS Compatibility',
    dateContinuity: 'Career Continuity',
  },
  pt: {
    contact: 'Informações de Contato',
    summary: 'Resumo Profissional',
    experience: 'Experiência Profissional',
    education: 'Formação Acadêmica',
    skills: 'Habilidades',
    projects: 'Projetos',
    languages: 'Idiomas',
    formatting: 'Formatação & Compatibilidade ATS',
    dateContinuity: 'Continuidade de Carreira',
  },
}

const SECTION_KEY_MAP: Record<string, SectionKey> = {
  contact: 'header',
  summary: 'summary',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  languages: 'languages',
  formatting: 'general',
  dateContinuity: 'experience',
}

function convertToCategories(result: RuleBasedResult, locale: Locale) {
  const names = SECTION_DISPLAY_NAMES[locale] ?? SECTION_DISPLAY_NAMES.en
  return Object.entries(result.sections).map(([key, section]) => {
    const pct = section.max > 0 ? Math.round((section.earned / section.max) * 100) : 100
    const feedback = section.issues.length > 0
      ? section.issues.map(i => i.text).join('; ')
      : pct >= 80 ? 'Good' : 'Needs improvement'
    return {
      name: names[key] ?? key,
      score: pct,
      feedback,
      section: SECTION_KEY_MAP[key] ?? ('general' as const),
    }
  })
}

function collectSuggestions(result: RuleBasedResult) {
  const all: ValidationIssue[] = []
  for (const section of Object.values(result.sections)) {
    all.push(...section.issues)
  }
  // Sort: critical first, then recommended, then optional
  const order = { critical: 0, recommended: 1, optional: 2 }
  all.sort((a, b) => order[a.priority] - order[b.priority])
  return all.map(i => ({
    text: i.text,
    priority: i.priority,
    section: i.section,
  }))
}

function collectPositives(result: RuleBasedResult) {
  const all: ValidationPositive[] = []
  for (const section of Object.values(result.sections)) {
    all.push(...section.positives)
  }
  return all.map(p => ({
    text: p.text,
    section: p.section,
  }))
}

// --- Main export ---

export async function analyzeCvAtsScore(
  cvInput: CvInput,
  locale: string,
): Promise<AtsScoreResponse> {
  const stripped = stripForAi(cvInput)
  const cacheKey = hashInput({ cv: stripped, locale })
  const cached = atsCache.get(cacheKey)
  if (cached && cached.expiry > Date.now()) {
    return cached.result
  }

  const loc: Locale = locale === 'pt' ? 'pt' : 'en'

  // 1. Rule-based checks (synchronous, deterministic, free)
  const ruleResult = runRuleBasedChecks(cvInput, loc)

  // 2. Convert to categories, suggestions, and positives
  const categories = convertToCategories(ruleResult, loc)
  const suggestions = collectSuggestions(ruleResult)
  const positives = collectPositives(ruleResult)

  // 3. LLM categorical grading (best-effort)
  const llmResult = await fetchLlmGrade(cvInput)

  let llmPenalty = 0
  let llmGrade: 'A' | 'B' | 'C' | 'D' | 'F' | undefined

  if (llmResult) {
    const summaryPenalty = GRADE_PENALTY[llmResult.summaryGrade] ?? 0
    const experiencePenalty = GRADE_PENALTY[llmResult.experienceGrade] ?? 0
    llmPenalty = summaryPenalty + experiencePenalty // max -10
    llmGrade = llmResult.overallImpression

    // Add LLM top suggestion if present
    if (llmResult.topSuggestion.trim()) {
      suggestions.push({
        text: llmResult.topSuggestion,
        priority: 'recommended',
        section: 'general',
      })
    }
  }

  const overallScore = Math.max(0, Math.min(100, ruleResult.totalScore + llmPenalty))

  const breakdown = {
    contact: ruleResult.sections.contact.earned,
    summary: ruleResult.sections.summary.earned,
    experience: ruleResult.sections.experience.earned,
    education: ruleResult.sections.education.earned,
    skills: ruleResult.sections.skills.earned,
    formatting: ruleResult.sections.formatting.earned,
    dateContinuity: ruleResult.sections.dateContinuity.earned,
    languages: ruleResult.sections.languages.earned,
    projects: ruleResult.sections.projects.earned,
  }

  const result: AtsScoreResponse = {
    overallScore,
    categories,
    suggestions,
    positives,
    ruleScore: ruleResult.totalScore,
    llmGrade,
    breakdown,
  }

  atsCache.set(cacheKey, { result, expiry: Date.now() + ATS_CACHE_TTL })
  return result
}

export async function parseCvFromPdf(
  pdfBuffer: ArrayBuffer,
  locale?: string,
): Promise<CvInput> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  // Extract text from PDF using pdf-parse
  const pdfParse = (await import('pdf-parse')).default
  const pdfData = await pdfParse(Buffer.from(pdfBuffer))
  const pdfText = pdfData.text

  if (!pdfText.trim()) {
    throw new Error('Could not extract text from PDF — file may be image-based or corrupted')
  }

  const groq = new Groq({ apiKey })
  const schemaJson = JSON.stringify(z.toJSONSchema(cvInputSchema))

  const apiCall = groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: buildPdfParsePrompt(locale, schemaJson) },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  })

  const response = await Promise.race([apiCall, timeoutPromise()])
  const text = response.choices[0]?.message?.content ?? ''

  if (!text) {
    throw new Error('AI returned empty response — PDF text may be unreadable')
  }

  const parsed = JSON.parse(text)
  return cvInputSchema.parse(parsed)
}

export async function translateCvContent(
  cvInput: CvInput,
  targetLocale: string,
): Promise<CvInput> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const groq = new Groq({ apiKey })
  const schemaJson = JSON.stringify(z.toJSONSchema(cvInputSchema))

  const apiCall = groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: buildTranslatePrompt(targetLocale, schemaJson) },
      { role: 'user', content: `CV Data to translate:\n${JSON.stringify(stripForAi(cvInput))}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  })

  const response = await Promise.race([apiCall, timeoutPromise()])
  const text = response.choices[0]?.message?.content ?? ''

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid translation response from AI service')
  }

  return cvInputSchema.parse(parsed)
}
