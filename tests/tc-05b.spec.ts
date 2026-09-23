import { test, expect, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-05b
const URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'

async function loadApp(page: Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function playStation(page: Page, name: string) {
  await page.locator('.rounded-xl.border.px-4', { hasText: name }).first().click()
  await page.waitForSelector('[aria-label="Pause"]', { timeout: 10000 })
}

function irisBody(artist: string, title: string, airtime: Date, durationSec = 240) {
  return JSON.stringify({
    result: { found: '1', entry: [{
      airtime: airtime.toISOString(),
      duration: String(durationSec),
      song: { found: '1', entry: [{ title, artist: { found: '1', entry: [{ name: artist }] } }] },
    }] },
  })
}

// ─────────────────────────────────────────────
// TC-05 (fortsat): "Nu spiller" fra netværks-API (80s80s/90s90s/BOB!/bigFM/Klassik)
// ─────────────────────────────────────────────
test.describe('TC-05: Nu spiller fra netværks-API', () => {

  test('TC-05-08: Sangtitel fra netværks-API vises i stedet for ICY', async ({ page }) => {
    let icyCalls = 0
    await page.route('**/api/icy-meta**', (route) => {
      icyCalls++
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: '80s80s Digital Web', icySupported: true }) })
    })
    await page.route('**/iris-80s80s.loverad.io/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: irisBody('TC05 Artist', 'TC05 Song', new Date()) })
    })
    await loadApp(page)
    await playStation(page, '80s80s Radio')
    const player = page.locator('.fixed.bottom-0')
    await expect(player.locator('text=TC05 Artist - TC05 Song')).toBeVisible({ timeout: 5000 })
    // Stationsnavnet fra ICY må ikke vises som sangtitel, og ICY-endpointet skal ikke kaldes
    await expect(player.locator('text=80s80s Digital Web')).not.toBeVisible()
    expect(icyCalls).toBe(0)
  })

  test('TC-05-09: Forældet nummer fra API vises ikke', async ({ page }) => {
    await page.route('**/iris-80s80s.loverad.io/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: irisBody('TC05 Old Artist', 'TC05 Old Song', new Date(Date.now() - 60 * 60_000)) })
    })
    await loadApp(page)
    await playStation(page, '80s80s Radio')
    await page.waitForTimeout(2000)
    await expect(page.locator('.fixed.bottom-0').locator('text=TC05 Old Song')).not.toBeVisible()
  })

  test('TC-05-10: API-fejl giver ingen titel og afspilning fortsætter', async ({ page }) => {
    await page.route('**/iris-80s80s.loverad.io/**', (route) => route.fulfill({ status: 500, body: 'error' }))
    await loadApp(page)
    await playStation(page, '80s80s Radio')
    await page.waitForTimeout(2000)
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
    await expect(page.locator('.fixed.bottom-0 .truncate', { hasText: ' - ' })).toHaveCount(0)
  })

  test('TC-05-11: Klassik Radio Christmas bruger streamabc-API (dublet fjernes)', async ({ page }) => {
    await page.route('**/api.streamabc.net/metadata/channel/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ artist: 'TC05 Composer', song: 'TC05 Carol;TC05 Carol' }) })
    })
    // Jul-kategorien er kun synlig i julesæsonen — fastlås datoen (timers kører videre)
    await page.clock.setFixedTime(new Date('2026-12-10T12:00:00'))
    await loadApp(page)
    await playStation(page, 'Klassik Radio Christmas')
    const player = page.locator('.fixed.bottom-0')
    await expect(player.locator('text=TC05 Composer - TC05 Carol')).toBeVisible({ timeout: 5000 })
    await expect(player.locator('text=TC05 Carol;TC05 Carol')).not.toBeVisible()
  })

  test('TC-05-12: Bauer DK-station henter sangtitel via /api/now-playing', async ({ page }) => {
    let requestedStation: string | null = null
    await page.route('**/api/now-playing**', (route) => {
      requestedStation = new globalThis.URL(route.request().url()).searchParams.get('station')
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: 'TC05 Dansk Kunstner - TC05 Dansk Sang', end: new Date(Date.now() + 120_000).toISOString() }) })
    })
    await loadApp(page)
    await playStation(page, "Danske 80'er Hits")
    await expect(page.locator('.fixed.bottom-0').locator('text=TC05 Dansk Kunstner - TC05 Dansk Sang')).toBeVisible({ timeout: 5000 })
    expect(requestedStation).toBe('deh')
  })

  test('TC-05-13: Forældet Bauer-nummer vises ikke', async ({ page }) => {
    await page.route('**/api/now-playing**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: 'TC05 Gammel Dansk Sang', end: new Date(Date.now() - 30 * 60_000).toISOString() }) })
    })
    await loadApp(page)
    await playStation(page, 'NOVA')
    await page.waitForTimeout(2000)
    await expect(page.locator('.fixed.bottom-0').locator('text=TC05 Gammel Dansk Sang')).not.toBeVisible()
  })

})
