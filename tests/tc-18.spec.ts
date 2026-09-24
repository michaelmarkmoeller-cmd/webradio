import { test, expect, devices, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-18
const URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'

const NET_STATION = '80s80s Radio'           // Loverad/Iris — sangtitel + cover fra netværks-API
const ICY_STATION = 'SomaFM Metal Detector'  // ICY-station — aldrig albumcover
const TEST_COVER = 'https://tc18-cover.test/cover-600.jpg'
// 1×1 PNG — så cover-billedet kan "indlæses" uden netværk
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

function irisBody(artist: string, title: string, coverXl?: string) {
  return JSON.stringify({
    result: { found: '1', entry: [{
      airtime: new Date().toISOString(),
      duration: '240',
      song: { found: '1', entry: [{ title, artist: { found: '1', entry: [{ name: artist }] }, cover_art_url_xl: coverXl }] },
    }] },
  })
}

// Netværks-API med (eller uden) cover, ICY med titel — ingen rigtige metadata-kald
async function mockMeta(page: Page, withCover = true) {
  await page.route('**/iris-80s80s.loverad.io/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: irisBody('TC18 Artist', 'TC18 Song', withCover ? TEST_COVER : undefined),
  }))
  await page.route('**/tc18-cover.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }))
  await page.route('**/api/artwork**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }))
  await page.route('**/api/icy-meta**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ title: 'TC18 Icy Artist - TC18 Icy Song', genre: 'TC18 Metal', icySupported: true }),
  }))
}

async function loadApp(page: Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function playStation(page: Page, name: string) {
  await page.locator('.rounded-xl.border.px-4', { hasText: name }).first().click()
  await page.waitForSelector('.fixed.bottom-0 [aria-label="Pause"]', { timeout: 10000 })
}

const bar = (page: Page) => page.locator('.fixed.bottom-0')
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Afspiller' })

// Tryk på en "tom" del af player-baren (stationsnavnet)
async function openSheet(page: Page, stationName: string) {
  await bar(page).locator('.font-display', { hasText: stationName }).first().click()
  await expect(sheet(page)).toBeVisible()
}

async function expectClosedAndStillPlaying(page: Page) {
  await expect(sheet(page)).toHaveCount(0, { timeout: 2000 })
  await expect(bar(page).locator('[aria-label="Pause"]')).toBeVisible()
  await expect(bar(page).locator('text=Live')).toBeVisible()
}

// ─────────────────────────────────────────────
// TC-18: Stor afspiller (NowPlayingSheet)
// ─────────────────────────────────────────────
test.describe('TC-18: Stor afspiller', () => {

  test('TC-18-01: Tryk på player-baren åbner den store afspiller', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    // Glider op — står ikke længere forskudt nedad
    await expect.poll(() => sheet(page).evaluate(e => getComputedStyle(e).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  })

  test('TC-18-02: Knapper i player-baren åbner ikke den store afspiller', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await bar(page).locator('[aria-label="Sleep timer"]').click()
    await bar(page).locator('[aria-label="Sleep timer"]').click()
    await bar(page).locator('[aria-label="Afspil på Sonos"]').click()
    await bar(page).locator('[aria-label="Afspil på Sonos"]').click()
    await bar(page).locator('[aria-label="Lydstyrke"]').click()
    await bar(page).locator('[aria-label="Pause"]').click()
    await expect(bar(page).locator('[aria-label="Afspil"]')).toBeVisible()
    await expect(sheet(page)).toHaveCount(0)
  })

  test('TC-18-03: Albumcover vises stort og stationslogo lille', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await expect(bar(page).locator(`img[src="${TEST_COVER}"]`)).toBeVisible({ timeout: 5000 })
    await openSheet(page, NET_STATION)
    const big = sheet(page).locator(`img[src="${TEST_COVER}"]`)
    await expect(big).toBeVisible()
    expect((await big.boundingBox())!.width).toBeGreaterThan(250)
    const small = sheet(page).locator(`img[alt="${NET_STATION}"]`)
    await expect(small).toBeVisible()
    expect((await small.boundingBox())!.width).toBeLessThan(60)
  })

  test('TC-18-04: Uden albumcover vises stationslogoet stort', async ({ page }) => {
    await mockMeta(page, false)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await expect(bar(page).locator('text=TC18 Artist - TC18 Song')).toBeVisible({ timeout: 5000 })
    await openSheet(page, NET_STATION)
    await expect(sheet(page).locator(`img[src="${TEST_COVER}"]`)).toHaveCount(0)
    const logos = sheet(page).locator(`img[alt="${NET_STATION}"]`)
    await expect(logos).toHaveCount(1)
    expect((await logos.boundingBox())!.width).toBeGreaterThan(250)
  })

  test('TC-18-05: Titel og kunstner vises hver for sig', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await expect(bar(page).locator('text=TC18 Artist - TC18 Song')).toBeVisible({ timeout: 5000 })
    await openSheet(page, NET_STATION)
    await expect(sheet(page).locator('.text-2xl', { hasText: 'TC18 Song' })).toBeVisible()
    await expect(sheet(page).locator('.text-lg', { hasText: 'TC18 Artist' })).toBeVisible()
    await expect(sheet(page).locator('text=TC18 Artist - TC18 Song')).toHaveCount(0)
  })

  test('TC-18-06: Tryk på albumcoveret lukker — musikken spiller videre', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await expect(bar(page).locator(`img[src="${TEST_COVER}"]`)).toBeVisible({ timeout: 5000 })
    await openSheet(page, NET_STATION)
    await sheet(page).locator(`img[src="${TEST_COVER}"]`).click()
    await expectClosedAndStillPlaying(page)
  })

  test('TC-18-07: Tryk på det lille stationslogo lukker — musikken spiller videre', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await expect(bar(page).locator(`img[src="${TEST_COVER}"]`)).toBeVisible({ timeout: 5000 })
    await openSheet(page, NET_STATION)
    await sheet(page).locator(`img[alt="${NET_STATION}"]`).click()
    await expectClosedAndStillPlaying(page)
  })

  test('TC-18-08: Tryk på det store stationslogo (uden cover) lukker', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await sheet(page).locator(`img[alt="${ICY_STATION}"]`).click()
    await expectClosedAndStillPlaying(page)
  })

  test('TC-18-09: ⌄-pilen og Escape lukker', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    await sheet(page).locator('[aria-label="Luk afspiller"]').first().click()
    await expectClosedAndStillPlaying(page)
    await openSheet(page, NET_STATION)
    await page.keyboard.press('Escape')
    await expectClosedAndStillPlaying(page)
  })

  test('TC-18-11: Play/pause i den store afspiller styrer afspilningen', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    await sheet(page).locator('[aria-label="Pause"]').click()
    await expect(sheet(page).locator('[aria-label="Afspil"]')).toBeVisible()
    await expect(sheet(page).locator('text=Pause').first()).toBeVisible()
    await expect(bar(page).locator('[aria-label="Afspil"]')).toBeVisible()
    await sheet(page).locator('[aria-label="Afspil"]').click()
    await expect(sheet(page).locator('text=Live')).toBeVisible({ timeout: 10000 })
    await expect(bar(page).locator('[aria-label="Pause"]')).toBeVisible()
  })

  test('TC-18-12: Favorit-hjertet tilføjer og fjerner favorit', async ({ page }) => {
    // Ny browser-kontekst = nyt device-ID → skriver kun i testens egen favorites/{deviceId}
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    await sheet(page).locator('[aria-label="Tilføj til favoritter"]').click()
    await expect(sheet(page).locator('[aria-label="Fjern fra favoritter"]')).toBeVisible()
    const card = page.locator('.rounded-xl.border.px-4', { hasText: NET_STATION }).first()
    await expect(card.locator('[aria-label="Fjern fra favoritter"]')).toHaveCount(1)
    // Ryd op
    await sheet(page).locator('[aria-label="Fjern fra favoritter"]').click()
    await expect(sheet(page).locator('[aria-label="Tilføj til favoritter"]')).toBeVisible()
    await expect(card.locator('[aria-label="Tilføj til favoritter"]')).toHaveCount(1)
  })

  test('TC-18-13: Stream-detaljer for netværks-API-station', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    const box = sheet(page).locator('dl')
    await expect(box).toContainText('192 kbps')
    await expect(box).toContainText('MP3')
    await expect(box).toContainText('Tyskland')
    await expect(box).toContainText('Netværks-API (Loverad/Iris)')
    await expect(sheet(page).locator('text=https://streams.80s80s.de/web/')).toBeVisible()
    // Kategori-badge og flag
    await expect(sheet(page).locator('span', { hasText: /^80's$/ })).toBeVisible()
    await expect(sheet(page).locator('img[src*="flagcdn.com/w40/de"]')).toBeVisible()
  })

  test('TC-18-14: ICY-station viser ICY som kilde og genre', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator('text=TC18 Icy Artist - TC18 Icy Song')).toBeVisible({ timeout: 5000 })
    await openSheet(page, ICY_STATION)
    const box = sheet(page).locator('dl')
    await expect(box).toContainText('ICY (streamen)')
    await expect(box).toContainText('TC18 Metal')
    await expect(sheet(page).locator('.text-2xl', { hasText: 'TC18 Icy Song' })).toBeVisible()
  })

  test('TC-18-15: Søvntimer i den store afspiller følger player-baren', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    await sheet(page).locator('[aria-label="Sleep timer"]').click()
    await sheet(page).locator('button', { hasText: /^30 min$/ }).click()
    await expect(sheet(page).locator('[aria-label="Sleep timer"]')).toContainText(/(29|30) min/)
    await expect(bar(page).locator('[aria-label="Sleep timer"]')).toContainText(/(29|30)m/)
    // Slå fra igen
    await sheet(page).locator('[aria-label="Sleep timer"]').click()
    await sheet(page).locator('button', { hasText: /^Fra$/ }).click()
    await expect(sheet(page).locator('[aria-label="Sleep timer"]')).toContainText('Søvntimer')
  })

  test('TC-18-16: Sonos-menuen åbner med alle tre rum', async ({ page }) => {
    // Kun åbning af menuen — intet rum vælges, så der sendes intet til de rigtige højttalere
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    await sheet(page).locator('[aria-label="Afspil på Sonos"]').click()
    for (const room of ['Bad', 'Køkken', 'Stue']) {
      await expect(sheet(page).locator(`[aria-label="Afspil på Sonos ${room}"]`)).toBeVisible()
    }
    await expect(sheet(page)).toBeVisible()
  })

  test('TC-18-17: Volumen-slider vises på pc', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    const slider = sheet(page).locator('[aria-label="Lydstyrke"]')
    await expect(slider).toBeVisible()
    await slider.fill('0.5')
    await expect(bar(page).locator('[aria-label="Lydstyrke"]')).toHaveValue('0.5')
  })
})

// iPhone: touch + iOS-UA
test.describe('TC-18: Stor afspiller (iPhone)', () => {
  // Chromium med iPhone-viewport, -UA og touch (enhedens defaultBrowserType er webkit)
  const { defaultBrowserType: _webkit, ...iPhone } = devices['iPhone 13']
  test.use(iPhone)

  test('TC-18-10: Swipe ned lukker — kort swipe glider tilbage', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    const cdp = await page.context().newCDPSession(page)
    async function swipe(dy: number) {
      const x = 200, y = 300
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / 10 }] })
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await swipe(50)
    await page.waitForTimeout(500)
    await expect(sheet(page)).toBeVisible()
    await swipe(250)
    await expectClosedAndStillPlaying(page)
  })

  test('TC-18-18: Volumen-slider skjult på iOS', async ({ page }) => {
    await mockMeta(page)
    await loadApp(page)
    await playStation(page, NET_STATION)
    await openSheet(page, NET_STATION)
    await expect(sheet(page).locator('[aria-label="Lydstyrke"]')).toHaveCount(0)
    await expect(sheet(page).locator('[aria-label="Pause"]')).toBeVisible()
  })
})
