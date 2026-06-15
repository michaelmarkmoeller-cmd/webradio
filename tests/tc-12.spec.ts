import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'

const URL = 'https://webradio-chi.vercel.app'

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function openImportExport(page: import('@playwright/test').Page) {
  await page.locator('button[title="Import / Eksport stationer"]').click()
  await expect(page.locator('text=Import / Eksport')).toBeVisible()
}

async function switchToImportTab(page: import('@playwright/test').Page) {
  await page.locator('button:has-text("Import")').last().click()
  await expect(page.locator('input[type="file"]')).toBeVisible()
}

// Upload a JSON buffer to the file input
async function uploadJson(page: import('@playwright/test').Page, data: object) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await page.waitForTimeout(500)
}

// ─────────────────────────────────────────────
// TC-12: Import / Eksport
// ─────────────────────────────────────────────
test.describe('TC-12: Import / Eksport', () => {

  test('TC-12-01: Eksport downloader JSON-fil', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    // Set up download intercept
    const downloadPromise = page.waitForEvent('download')
    await page.locator('button:has-text("Download JSON-fil")').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/webradio-stationer-.*\.json/)
  })

  test('TC-12-02: Eksporteret fil har korrekt format', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    const downloadPromise = page.waitForEvent('download')
    await page.locator('button:has-text("Download JSON-fil")').click()
    const download = await downloadPromise
    const filePath = await download.path()
    if (!filePath) test.fail()

    const content = readFileSync(filePath!, 'utf-8')
    const json = JSON.parse(content)
    expect(json).toHaveProperty('exportedAt')
    expect(json).toHaveProperty('count')
    expect(json).toHaveProperty('stations')
    expect(Array.isArray(json.stations)).toBe(true)
    expect(json.stations.length).toBeGreaterThan(0)
    const first = json.stations[0]
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('streamUrl')
    expect(first).toHaveProperty('category')
  })

  test('TC-12-03: Import af gyldig JSON viser korrekt preview', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    await switchToImportTab(page)

    const testData = {
      stations: [{
        name: 'Import Test Station',
        streamUrl: 'https://stream.example.com/test',
        category: "80's",
      }]
    }
    await uploadJson(page, testData)
    await expect(page.locator('text=✓ 1 gyldige')).toBeVisible()
    await expect(page.locator('text=Import Test Station')).toBeVisible()
    // Close without importing
    await page.locator('button').filter({ has: page.locator('svg path[d*="M6 18L18 6"]') }).first().click().catch(() => {})
    await page.keyboard.press('Escape')
  })

  test('TC-12-04: Import med manglende navn vises som ugyldig', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    await switchToImportTab(page)

    const testData = {
      stations: [{ streamUrl: 'https://stream.example.com/test', category: "80's" }]
    }
    await uploadJson(page, testData)
    await expect(page.locator('text=✗ 1 ugyldige')).toBeVisible()
    await expect(page.locator('text=Mangler navn')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('TC-12-05: Import med ugyldig URL vises som ugyldig', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    await switchToImportTab(page)

    const testData = {
      stations: [{ name: 'Bad URL Station', streamUrl: 'ftp://stream.example.com', category: "80's" }]
    }
    await uploadJson(page, testData)
    await expect(page.locator('text=✗ 1 ugyldige')).toBeVisible()
    await expect(page.locator('text=Ugyldig URL')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('TC-12-06: Import med ukendt kategori vises som ugyldig', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    await switchToImportTab(page)

    const testData = {
      stations: [{ name: 'Bad Cat Station', streamUrl: 'https://stream.example.com/test', category: 'Ukendt' }]
    }
    await uploadJson(page, testData)
    await expect(page.locator('text=✗ 1 ugyldige')).toBeVisible()
    await expect(page.locator('text=Ukendt kategori')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('TC-12-07: Import springer duplikat over (samme streamUrl)', async ({ page }) => {
    await loadApp(page)
    // Get an existing station's stream URL from the page
    const existingUrl = await page.evaluate(() => {
      // Zustand store is not on window, so use a known stream URL from the existing stations
      // We'll check the result text after importing
      return null
    })

    await openImportExport(page)
    // First export to get a real station URL
    const downloadPromise = page.waitForEvent('download')
    await page.locator('button:has-text("Download JSON-fil")').click()
    const download = await downloadPromise
    const filePath = await download.path()
    if (!filePath) test.skip()

    const exported = JSON.parse(readFileSync(filePath!, 'utf-8'))
    const firstStation = exported.stations[0]

    // Now import the same station
    await switchToImportTab(page)
    const testData = { stations: [firstStation] }
    await uploadJson(page, testData)

    // Valid: 1
    await expect(page.locator('text=✓ 1 gyldige')).toBeVisible()
    // Import it
    await page.locator('button:has-text("Importér 1 stationer")').click()
    await page.waitForTimeout(2000)
    // Toast should mention "sprunget over"
    await expect(page.locator('text=sprunget over')).toBeVisible({ timeout: 5000 })
  })

  test('TC-12-08: http:// logo fjernes, station er gyldig', async ({ page }) => {
    await loadApp(page)
    await openImportExport(page)
    await switchToImportTab(page)

    const testData = {
      stations: [{
        name: 'HTTP Logo Station',
        streamUrl: 'https://stream.example.com/test',
        category: "80's",
        logoUrl: 'http://example.com/logo.png', // http:// — should be stripped
      }]
    }
    await uploadJson(page, testData)
    // Station should still be valid (logoUrl stripped but station OK)
    await expect(page.locator('text=✓ 1 gyldige')).toBeVisible()
    // Should show ✓ OK in status column
    await expect(page.locator('text=✓ OK')).toBeVisible()
    await page.keyboard.press('Escape')
  })

})
