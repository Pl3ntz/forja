/**
 * E2E tests — Cover Letter feature
 *
 * Required environment variables (create a .env.test or export before running):
 *   E2E_USER_EMAIL      - email of a registered test user
 *   E2E_USER_PASSWORD   - password of that test user
 *
 * Run with:
 *   bunx playwright test tests/e2e/cover-letter.spec.ts
 *   # or after adding the "e2e" script to package.json:
 *   bun run e2e
 *
 * Prerequisites:
 *   1. Dev server must be running:  bun run dev:server  +  bunx vite
 *   2. Playwright must be installed:
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

async function openNewCoverLetterForm(page: Page): Promise<void> {
  // "Nova Carta" button opens the creation popover
  await page.click('button:has-text("Nova Carta")')
  // Wait for the form popover to be visible
  await page.waitForSelector('#cl-title', { timeout: 5_000 })
}

// ── shared login state ────────────────────────────────────────────────────────
// We use a storageState approach: log in once, reuse across tests in this file.

let _authContext: BrowserContext | undefined

test.describe('Cover Letter — critical journeys', () => {
  // Log in once before any test in this suite
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await login(page)
    await page.close()
    _authContext = context
  })

  test.afterAll(async () => {
    await _authContext?.close()
  })

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard already authenticated
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
  })

  // ── 1. Create cover letter without CV link ──────────────────────────────────
  test('create cover letter without CV link opens empty editor', async ({ page }) => {
    await openNewCoverLetterForm(page)

    // Leave title empty, locale defaults to Português, CV stays "Nenhum"
    await page.click('button:has-text("Criar"):not([disabled])')

    // Should navigate to /cover-letter/<uuid>
    await page.waitForURL(/\/cover-letter\/[0-9a-f-]{36}/, { timeout: 15_000 })

    // Editor header visible — title input is empty (placeholder shown)
    const titleInput = page.locator('input[aria-label="Titulo da carta de apresentacao"]')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveValue('')

    // Sender tab is active by default
    await expect(page.locator('#cl-tab-sender[aria-selected="true"]')).toBeVisible()

    // Sender name input is empty (no CV linked → no snapshot)
    await expect(page.locator('#cl-sender-name')).toHaveValue('')
  })

  // ── 2. Create cover letter with CV link → sender snapshot ──────────────────
  test('create cover letter linked to CV pre-fills sender section from CV snapshot', async ({
    page,
  }) => {
    // Pre-condition: user must have at least one CV with name + email + linkedin.
    // The test creates a minimal CV via the API first so it's self-contained.
    const cvRes = await page.request.post(`${BASE_URL}/api/cv`, {
      data: { locale: 'en' },
    })
    expect(cvRes.status()).toBe(201)
    const cv = await cvRes.json()
    const cvId: string = cv.id

    // Patch the CV header fields so the snapshot has data to pull from.
    // The CV schema requires title-keyed objects with item arrays.
    await page.request.put(`${BASE_URL}/api/cv/${cvId}`, {
      data: {
        locale: 'en',
        templateId: 'jake',
        header: {
          name: 'Jane Doe',
          title: '',
          location: '',
          phone: '',
          email: 'jane@example.com',
          linkedin: 'linkedin.com/in/janedoe',
          github: '',
        },
        summary: { title: 'Summary', text: '' },
        education: { title: 'Education', items: [] },
        experience: { title: 'Experience', items: [] },
        projects: { title: 'Projects', items: [] },
        skills: { title: 'Skills', categories: [] },
        languages: { title: 'Languages', items: [] },
      },
    })

    // Reload dashboard so the new CV appears in the dropdown
    await page.reload()
    await page.waitForLoadState('networkidle')

    await openNewCoverLetterForm(page)

    // Select the just-created CV in the "Vincular" dropdown
    await page.selectOption('#cl-cv', cvId)
    await page.click('button:has-text("Criar"):not([disabled])')

    await page.waitForURL(/\/cover-letter\/[0-9a-f-]{36}/, { timeout: 15_000 })

    // Sender section should be pre-populated from CV snapshot
    await expect(page.locator('#cl-sender-name')).toHaveValue('Jane Doe')
    await expect(page.locator('#cl-sender-email')).toHaveValue('jane@example.com')
    await expect(page.locator('#cl-sender-linkedin')).toHaveValue('linkedin.com/in/janedoe')

    // Cleanup: delete the CV via API (cover letter cvId will be set null by FK on delete)
    await page.request.delete(`${BASE_URL}/api/cv/${cvId}`)
  })

  // ── 3. Fill sections → autosave → reload persists data ─────────────────────
  test('cover letter data persists after reload (autosave)', async ({ page }) => {
    // Create a fresh cover letter to work with
    await openNewCoverLetterForm(page)
    await page.fill('#cl-title', 'Autosave Test Letter')
    await page.click('button:has-text("Criar"):not([disabled])')
    await page.waitForURL(/\/cover-letter\/[0-9a-f-]{36}/, { timeout: 15_000 })

    const url = page.url()

    // Change the title in the editor header input
    const titleInput = page.locator('input[aria-label="Titulo da carta de apresentacao"]')
    await titleInput.clear()
    await titleInput.fill('Autosave Integration Test')

    // Wait for autosave: status indicator goes "Salvando..." then "Salvo" / "Tudo salvo"
    await page.waitForFunction(
      () => {
        const statusEl = document.querySelector('[role="status"]')
        return statusEl?.textContent?.includes('Salvo')
      },
      { timeout: 10_000 },
    )

    // Fill recipient tab
    await page.click('#cl-tab-recipient')
    await page.locator('input[id="cl-recipient-company"]').fill('Acme Corp')

    // Wait for another autosave cycle
    await page.waitForFunction(
      () => {
        const statusEl = document.querySelector('[role="status"]')
        return statusEl?.textContent?.includes('Salvo')
      },
      { timeout: 10_000 },
    )

    // Fill body: add a paragraph
    await page.click('#cl-tab-body')
    await page.click('button[aria-label="Adicionar paragrafo"]')
    await page.fill('#cl-body-content-0', 'I am excited to apply for this role.')

    // Wait for autosave
    await page.waitForFunction(
      () => document.querySelector('[role="status"]')?.textContent?.includes('Salvo'),
      { timeout: 10_000 },
    )

    // Fill closing
    await page.click('#cl-tab-closing')
    await page.fill('#cl-closing-phrase', 'Sincerely,')
    await page.fill('#cl-signature', 'Jane Doe')

    await page.waitForFunction(
      () => document.querySelector('[role="status"]')?.textContent?.includes('Salvo'),
      { timeout: 10_000 },
    )

    // Reload the same URL and verify all data persisted
    await page.goto(url)
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('input[aria-label="Titulo da carta de apresentacao"]'),
    ).toHaveValue('Autosave Integration Test')

    await page.click('#cl-tab-body')
    await expect(page.locator('#cl-body-content-0')).toHaveValue(
      'I am excited to apply for this role.',
    )

    await page.click('#cl-tab-closing')
    await expect(page.locator('#cl-closing-phrase')).toHaveValue('Sincerely,')
    await expect(page.locator('#cl-signature')).toHaveValue('Jane Doe')
  })

  // ── 4. Download PDF ─────────────────────────────────────────────────────────
  test('download PDF produces a PDF file with expected filename pattern', async ({ page }) => {
    // Create a cover letter with a sender name so the filename is deterministic
    const apiRes = await page.request.post(`${BASE_URL}/api/cover-letter`, {
      data: { locale: 'en', title: 'PDF Test' },
    })
    expect(apiRes.status()).toBe(201)
    const { id: clId } = await apiRes.json()

    // Patch sender name so the filename is non-generic.
    // Body must match coverLetterInputSchema exactly.
    await page.request.put(`${BASE_URL}/api/cover-letter/${clId}`, {
      data: {
        locale: 'en',
        title: 'PDF Test',
        cvId: null,
        pdfFilename: '',
        customLatex: '',
        sender: {
          name: 'Jane Doe',
          title: '',
          location: '',
          email: '',
          phone: '',
          linkedin: '',
        },
        recipient: { salutation: 'Dear Hiring Manager', name: '', company: '', address: '' },
        letterDate: '',
        body: [],
        closingPhrase: 'Sincerely,',
        signature: '',
      },
    })

    await page.goto(`${BASE_URL}/cover-letter/${clId}`)
    await page.waitForLoadState('networkidle')

    // Intercept the download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button[aria-label="Baixar PDF"]'),
    ])

    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.pdf$/i)
    // Server builds filename as sanitized(name) + "_Cover_Letter.pdf"
    expect(filename.toLowerCase()).toContain('cover_letter')

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/cover-letter/${clId}`)
  })

  // ── 5. Delete cover letter from dashboard ──────────────────────────────────
  test('deleting a cover letter from dashboard removes the card', async ({ page }) => {
    // Create via API so test doesn't depend on UI creation flow
    const apiRes = await page.request.post(`${BASE_URL}/api/cover-letter`, {
      data: { locale: 'en', title: 'To Be Deleted' },
    })
    expect(apiRes.status()).toBe(201)
    const { id: clId } = await apiRes.json()

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Register dialog handler BEFORE triggering the action that spawns it
    page.on('dialog', (dialog) => dialog.accept())

    // Open the "..." context menu for this cover letter
    const listItem = page.locator(`li:has-text("To Be Deleted")`)
    await expect(listItem).toBeVisible()
    await listItem.locator('button[aria-label="Mais ações"]').click()

    // Click Excluir in the menu
    await page.locator('[role="menuitem"]:has-text("Excluir")').click()

    // Card should disappear after confirm
    await expect(listItem).not.toBeVisible({ timeout: 8_000 })
  })

  // ── 6. Linked CV deleted — cover letter still works (business rule 3A) ──────
  test('cover letter remains accessible after its linked CV is deleted', async ({ page }) => {
    // Create a temporary CV
    const cvRes = await page.request.post(`${BASE_URL}/api/cv`, {
      data: { locale: 'en' },
    })
    expect(cvRes.status()).toBe(201)
    const { id: cvId } = await cvRes.json()

    // Create a cover letter linked to that CV
    const clRes = await page.request.post(`${BASE_URL}/api/cover-letter`, {
      data: { locale: 'en', title: 'Orphan Test', cvId },
    })
    expect(clRes.status()).toBe(201)
    const { id: clId } = await clRes.json()

    // Delete the CV (FK is set null — cover letter should survive)
    const delRes = await page.request.delete(`${BASE_URL}/api/cv/${cvId}`)
    expect(delRes.status()).toBe(200)

    // Open the cover letter — must load without error
    await page.goto(`${BASE_URL}/cover-letter/${clId}`)
    await page.waitForLoadState('networkidle')

    // Editor header is present — page did not redirect to /dashboard
    await expect(page.locator('input[aria-label="Titulo da carta de apresentacao"]')).toBeVisible()

    // No error banner visible
    const errorBanner = page.locator('[role="alert"]')
    await expect(errorBanner).not.toBeVisible()

    // Cleanup
    await page.request.delete(`${BASE_URL}/api/cover-letter/${clId}`)
  })
})
