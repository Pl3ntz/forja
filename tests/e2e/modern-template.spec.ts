/**
 * E2E tests — Modern CV template
 *
 * Required environment variables:
 *   E2E_USER_EMAIL      - email of a registered test user
 *   E2E_USER_PASSWORD   - password of that test user
 *
 * Run with:
 *   bunx playwright test tests/e2e/modern-template.spec.ts
 *
 * Prerequisites:
 *   1. Dev server running:  bun run dev:server  +  bunx vite
 *   2. Playwright installed:
 *      bun add -D @playwright/test && bunx playwright install chromium
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// ── helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:5173'
const EMAIL = process.env.E2E_USER_EMAIL ?? 'test@example.com'
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'testpassword'

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 })
}

/** Create a minimal CV via API and return its id */
async function createTestCv(page: Page): Promise<string> {
  const res = await page.request.post(`${BASE_URL}/api/cv`, {
    data: { locale: 'en' },
  })
  expect(res.status()).toBe(201)
  const { id } = await res.json()
  return id as string
}

/** Wait for save status to reach "Salvo" / "Tudo salvo" */
async function waitForSaved(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[role="status"]')
      return el?.textContent?.includes('Salvo')
    },
    { timeout: 12_000 },
  )
}

// ── shared auth context ───────────────────────────────────────────────────────

let _authContext: BrowserContext | undefined

test.describe('Modern CV template — critical journeys', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await login(page)
    await page.close()
    _authContext = ctx
  })

  test.afterAll(async () => {
    await _authContext?.close()
  })

  // ── 1. Switch jake → modern → preview updates + modern fields visible ───────
  test('switching template to modern renders new fields and updates preview', async ({ page }) => {
    const cvId = await createTestCv(page)

    await page.goto(`${BASE_URL}/editor/${cvId}`)
    await page.waitForLoadState('networkidle')

    // Template selector starts at "Jake's Resume"
    const templateSelect = page.locator('select[aria-label="Modelo"]')
    await expect(templateSelect).toHaveValue('jake')

    // Switch to modern
    await templateSelect.selectOption('modern')

    // header-title field is present in HeaderForm (id="header-title")
    // and should now be promoted/visible because of the modern template hint
    await page.click('#tab-header')
    await expect(page.locator('#header-title')).toBeVisible()

    // Fill header.title
    await page.fill('#header-title', 'Data Engineer | Cloud Specialist')
    await waitForSaved(page)

    // Preview iframe should contain the subtitle text
    const previewFrame = page.frameLocator('iframe[title*="preview"], iframe[title*="visualiz"]')
    await expect(previewFrame.locator('body')).toContainText('Data Engineer | Cloud Specialist', {
      timeout: 10_000,
    })

    // Navigate to experience tab and check intro/skills fields exist
    // The tab label varies (could be the section title from translations) — use id prefix
    await page.click('#tab-experience')

    // There must be at least one experience item to test these fields.
    // If none exist, add one via the "Adicionar Experiência" button (label from i18n fallback).
    const expIntroField = page.locator('#exp-0-intro')
    if (!(await expIntroField.isVisible())) {
      await page.locator('button:has-text("Adicionar Experiência")').click()
    }

    await expect(page.locator('#exp-0-intro')).toBeVisible()
    await expect(page.locator('#exp-0-skills')).toBeVisible()

    // Fill intro and skills
    await page.fill('#exp-0-intro', 'Led the data platform initiative')
    await page.fill('#exp-0-skills', 'Python, Spark')
    await waitForSaved(page)

    // Preview should show these values
    await expect(previewFrame.locator('body')).toContainText('Led the data platform initiative', {
      timeout: 10_000,
    })
    await expect(previewFrame.locator('body')).toContainText('Python, Spark', {
      timeout: 10_000,
    })

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/cv/${cvId}`)
  })

  // ── 2. Switch jake → modern → back to jake: modern fields preserved ─────────
  test('modern fields are preserved when switching back and forth between templates', async ({
    page,
  }) => {
    const cvId = await createTestCv(page)

    await page.goto(`${BASE_URL}/editor/${cvId}`)
    await page.waitForLoadState('networkidle')

    const templateSelect = page.locator('select[aria-label="Modelo"]')

    // Switch to modern and fill header.title
    await templateSelect.selectOption('modern')
    await page.click('#tab-header')
    await page.fill('#header-title', 'Subtitle Preserved Test')
    await waitForSaved(page)

    // Switch back to jake
    await templateSelect.selectOption('jake')
    await waitForSaved(page)

    // The header.title input still holds the value (form state preserved)
    await page.click('#tab-header')
    await expect(page.locator('#header-title')).toHaveValue('Subtitle Preserved Test')

    // Switch back to modern — value still there, preview renders it
    await templateSelect.selectOption('modern')
    await expect(page.locator('#header-title')).toHaveValue('Subtitle Preserved Test')

    const previewFrame = page.frameLocator('iframe[title*="preview"], iframe[title*="visualiz"]')
    await expect(previewFrame.locator('body')).toContainText('Subtitle Preserved Test', {
      timeout: 10_000,
    })

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/cv/${cvId}`)
  })

  // ── 3. Add certification → renders in modern preview → persists on reload ───
  test('certification added in modern template renders in preview and persists', async ({
    page,
  }) => {
    const cvId = await createTestCv(page)

    await page.goto(`${BASE_URL}/editor/${cvId}`)
    await page.waitForLoadState('networkidle')

    // Switch to modern
    await page.locator('select[aria-label="Modelo"]').selectOption('modern')

    // Click the certifications tab (label is "Certificações" or overridden section title)
    await page.click('#tab-certifications')

    // Confirm empty state message visible
    await expect(page.locator('text=/Nenhuma certifica/i')).toBeVisible()

    // Add one certification — button label is "Adicionar Certificacao" (i18n fallback)
    await page.locator('button:has-text("Adicionar Certificacao")').click()

    // Fill cert fields using stable IDs: cert-0-name, cert-0-issuer, cert-0-year
    await page.fill('#cert-0-name', 'AWS Solutions Architect')
    await page.fill('#cert-0-issuer', 'Amazon Web Services')
    await page.fill('#cert-0-year', '2024')

    await waitForSaved(page)

    // Preview should show the certification name
    const previewFrame = page.frameLocator('iframe[title*="preview"], iframe[title*="visualiz"]')
    await expect(previewFrame.locator('body')).toContainText('AWS Solutions Architect', {
      timeout: 10_000,
    })

    // Reload and verify cert persists
    await page.goto(`${BASE_URL}/editor/${cvId}`)
    await page.waitForLoadState('networkidle')

    await page.click('#tab-certifications')

    // The certification name should still be there
    await expect(page.locator('#cert-0-name')).toHaveValue('AWS Solutions Architect')

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/cv/${cvId}`)
  })

  // ── 4. Download PDF with modern template ────────────────────────────────────
  test('download PDF works with modern template selected', async ({ page }) => {
    const cvId = await createTestCv(page)

    await page.goto(`${BASE_URL}/editor/${cvId}`)
    await page.waitForLoadState('networkidle')

    // Switch to modern
    await page.locator('select[aria-label="Modelo"]').selectOption('modern')
    await waitForSaved(page)

    // Trigger download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button[aria-label="Baixar PDF"]'),
    ])

    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.pdf$/i)

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/cv/${cvId}`)
  })
})
