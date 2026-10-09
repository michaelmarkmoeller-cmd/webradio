import { test, expect, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-21
const APP_URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'

const ICY_STATION = 'SomaFM Metal Detector'  // ICY-station uden netværks-API
const IRIS_STATION = '80s80s Radio'          // Loverad/Iris — oplyser nummerets sluttid
const BAUER_STATION = 'NOVA'                 // Bauer Media DK — oplyser nummerets sluttid

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

async function mockImages(page: Page) {
  await page.route('**/tc21-art.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }))
  await page.route('**/api/artwork**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }))
}

// Apple Music: returnér cover til "Satan - Trial by fire", ellers intet
async function mockApple(page: Page) {
  await page.route('**/itunes.apple.com/search**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ resultCount: 1, results: [{
      artistName: 'Satan', trackName: 'Trial by Fire', collectionName: 'Court In The Act',
      artworkUrl100: 'https://tc21-art.test/satan/100x100bb.jpg',
    }] }),
  }))
}

// ICY-mock med titel der kan skiftes undervejs (`state.title` = null giver en tom ICY-blok)
async function mockIcy(page: Page, state: { title: string | null; calls: number }) {
  await page.route('**/api/icy-meta**', (route) => {
    state.calls++
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title: state.title, genre: null, icySupported: true }) })
  })
}

async function loadApp(page: Page) {
  await page.goto(APP_URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function playStation(page: Page, name: string) {
  await page.locator('.rounded-xl.border.px-4', { hasText: name }).first().click()
  await page.waitForSelector('.fixed.bottom-0 [aria-label="Pause"]', { timeout: 10000 })
}

const bar = (page: Page) => page.locator('.fixed.bottom-0')

// ─────────────────────────────────────────────
// TC-21: Hurtigere skift af titel/cover
// ─────────────────────────────────────────────
test.describe('TC-21: Hurtigere skift af titel', () => {

  test('TC-21-01: ICY hentes hvert 10. sekund (ikke hvert 30.)', async ({ page }) => {
    const state = { title: 'TC21 Artist - TC21 Song' as string | null, calls: 0 }
    await page.clock.install()
    await mockImages(page)
    await mockApple(page)
    await mockIcy(page, state)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator('text=TC21 Artist - TC21 Song')).toBeVisible({ timeout: 8000 })
    const before = state.calls
    await page.clock.runFor(35_000)
    // 35 sek. = tre hentninger à 10 sek. (med 30 sek.-intervallet var det kun én)
    await expect.poll(() => state.calls - before, { timeout: 5000 }).toBeGreaterThanOrEqual(3)
  })

  test('TC-21-02: Nyt ICY-nummer vises inden for 10 sekunder', async ({ page }) => {
    const state = { title: 'Gammel Artist - Gammelt Nummer' as string | null, calls: 0 }
    await page.clock.install()
    await mockImages(page)
    await mockApple(page)
    await mockIcy(page, state)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator('text=Gammel Artist - Gammelt Nummer')).toBeVisible({ timeout: 8000 })
    state.title = 'Ny Artist - Nyt Nummer'
    await page.clock.runFor(10_500)
    await expect(bar(page).locator('text=Ny Artist - Nyt Nummer')).toBeVisible({ timeout: 5000 })
  })

  test('TC-21-03: Tom ICY-blok beholder titel og cover — ryddes først efter ca. et minut', async ({ page }) => {
    const state = { title: 'Satan - Trial by fire' as string | null, calls: 0 }
    await page.clock.install()
    await mockImages(page)
    await mockApple(page)
    await mockIcy(page, state)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator('img[src="https://tc21-art.test/satan/600x600bb.jpg"]')).toBeVisible({ timeout: 8000 })
    state.title = null   // tomme blokke
    await page.clock.runFor(25_000)
    await expect.poll(() => state.calls, { timeout: 5000 }).toBeGreaterThanOrEqual(3)
    await expect(bar(page).locator('text=Satan - Trial by fire')).toBeVisible()
    await expect(bar(page).locator('img[src="https://tc21-art.test/satan/600x600bb.jpg"]')).toBeVisible()
    await page.clock.runFor(50_000)   // i alt 75 sek. uden titel
    await expect(bar(page).locator('text=Satan - Trial by fire')).toHaveCount(0, { timeout: 5000 })
  })

  test('TC-21-04: Iris hentes igen lige efter nummerets slutning (ikke efter fast interval)', async ({ page }) => {
    let calls = 0
    await page.clock.install()
    await mockImages(page)
    await mockApple(page)
    await page.route('**/iris-80s80s.loverad.io/**', (route) => {
      calls++
      const first = calls === 1
      // 1. nummer: startet for 1 sek. siden, varer 13 sek. → slutter om ca. 12 sek.
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ result: { found: '1', entry: [{
          airtime: new Date(Date.now() - 1000).toISOString(), duration: first ? '13' : '240',
          song: { found: '1', entry: [{ title: first ? 'TC21 Forste' : 'TC21 Anden', artist: { found: '1', entry: [{ name: 'TC21 Iris' }] } }] },
        }] } }),
      })
    })
    await loadApp(page)
    await playStation(page, IRIS_STATION)
    await expect(bar(page).locator('text=TC21 Iris - TC21 Forste')).toBeVisible({ timeout: 8000 })
    await page.clock.runFor(8_000)
    expect(calls).toBe(1)                       // endnu ikke — nummeret er ikke slut
    await page.clock.runFor(8_000)              // forbi sluttid + 2 sek.
    await expect(bar(page).locator('text=TC21 Iris - TC21 Anden')).toBeVisible({ timeout: 5000 })
    expect(calls).toBe(2)
  })

  test('TC-21-05: Bauer hentes igen lige efter nummerets slutning', async ({ page }) => {
    let calls = 0
    await page.clock.install()
    await mockImages(page)
    await mockApple(page)
    await page.route('**/api/now-playing**', (route) => {
      calls++
      const first = calls === 1
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: first ? 'TC21 Bauer - Forste' : 'TC21 Bauer - Anden', cover: null, end: new Date(Date.now() + (first ? 8000 : 240_000)).toISOString() }),
      })
    })
    await loadApp(page)
    await playStation(page, BAUER_STATION)
    await expect(bar(page).locator('text=TC21 Bauer - Forste')).toBeVisible({ timeout: 8000 })
    await page.clock.runFor(4_000)
    expect(calls).toBe(1)
    await page.clock.runFor(8_000)              // forbi sluttid (8 sek.) + 2 sek.
    await expect(bar(page).locator('text=TC21 Bauer - Anden')).toBeVisible({ timeout: 5000 })
    expect(calls).toBe(2)
  })

  test('TC-21-06: Bauer-API caches kun kort (ca. 5 sek.) — ikke længere 15', async ({ page }) => {
    // Vercel skjuler s-maxage i svaret til klienten, så adfærden måles: efter 6-7 sek. må svaret ikke længere være
    // et friskt HIT (med den gamle s-maxage=15 ville det stadig have været det)
    const url = `${APP_URL}/api/now-playing?station=nov`
    const first = await page.request.get(url)
    expect(first.status()).toBe(200)
    await new Promise(r => setTimeout(r, 6500))
    const later = await page.request.get(url)
    expect(later.status()).toBe(200)
    expect(later.headers()['x-vercel-cache']).not.toBe('HIT')
  })

  test('TC-21-07: Titlen hentes straks når appen bliver synlig igen', async ({ page }) => {
    const state = { title: 'Gammel Artist - Gammelt Nummer' as string | null, calls: 0 }
    await page.clock.install()
    await mockImages(page)
    await mockApple(page)
    await mockIcy(page, state)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator('text=Gammel Artist - Gammelt Nummer')).toBeVisible({ timeout: 8000 })
    state.title = 'Ny Artist - Nyt Nummer'
    // Uret står stille (ingen runFor) — kun "appen bliver synlig" udløser en hentning
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(bar(page).locator('text=Ny Artist - Nyt Nummer')).toBeVisible({ timeout: 5000 })
  })
})
