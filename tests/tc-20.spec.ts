import { test, expect, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-20
const APP_URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'

const ICY_STATION = 'SomaFM Metal Detector'  // ICY-station uden netværks-API
const IRIS_STATION = '80s80s Radio'          // Loverad/Iris
const BAUER_STATION = 'NOVA'                 // Bauer Media DK / Radioplay
const DR_STATION = 'DR P3'                   // DR sender "/ Kunstner - Titel"

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

// Et Apple Music-søgeresultat. `art` er et id, der ender i billed-URL'en (så testen kan se hvilket resultat der blev valgt)
interface Hit { artist: string; track: string; album: string; art: string }
const appleArt = (id: string) => `https://tc20-art.test/${id}/600x600bb.jpg`

// Mock af iTunes Search API. `terms` fanger de søgeord appen sender
async function mockApple(page: Page, hits: Hit[], terms: string[] = []) {
  await page.route('**/itunes.apple.com/search**', (route) => {
    terms.push(new URL(route.request().url()).searchParams.get('term') ?? '')
    route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        resultCount: hits.length,
        results: hits.map(h => ({
          artistName: h.artist, trackName: h.track, collectionName: h.album,
          artworkUrl100: `https://tc20-art.test/${h.art}/100x100bb.jpg`,
        })),
      }),
    })
  })
}

async function mockImages(page: Page) {
  for (const host of ['tc20-art.test', 'tc20-iris.test', 'tc20-bauer.test']) {
    await page.route(`**/${host}/**`, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }))
  }
  await page.route('**/api/artwork**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }))
}

async function mockIcy(page: Page, title: string, calls?: { n: number }) {
  await page.route('**/api/icy-meta**', (route) => {
    if (calls) calls.n++
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title, genre: null, icySupported: true }) })
  })
}

async function mockIris(page: Page, artist: string, title: string, coverXl?: string) {
  await page.route('**/iris-80s80s.loverad.io/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ result: { found: '1', entry: [{
      airtime: new Date().toISOString(), duration: '240',
      song: { found: '1', entry: [{ title, artist: { found: '1', entry: [{ name: artist }] }, cover_art_url_xl: coverXl }] },
    }] } }),
  }))
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
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Afspiller' })

async function openSheet(page: Page, stationName: string) {
  await bar(page).locator('.font-display', { hasText: stationName }).first().click()
  await expect(sheet(page)).toBeVisible()
}

const bigCover = (page: Page, art: string) => sheet(page).locator(`img[src="${appleArt(art)}"]`)
const sourceLabel = (page: Page, src: string) => sheet(page).getByText(`Cover fra ${src}`, { exact: true })

// ─────────────────────────────────────────────
// TC-20: Albumcover via Apple Music + kilde-tekst
// ─────────────────────────────────────────────
test.describe('TC-20: Cover-opslag', () => {

  test('TC-20-01: ICY-station får cover fra Apple Music — kilde står under "Now Playing"', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Satan - Trial by fire')
    await mockApple(page, [{ artist: 'Satan', track: 'Trial by Fire', album: 'Court In The Act', art: 'satan' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator(`img[src="${appleArt('satan')}"]`)).toBeVisible({ timeout: 8000 })
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'satan')).toBeVisible()
    const label = sourceLabel(page, 'Apple Music')
    await expect(label).toBeVisible()
    // Lige under "Now Playing", samme skriftstørrelse og farve
    const np = sheet(page).getByText('Now Playing', { exact: true })
    expect((await label.boundingBox())!.y).toBeGreaterThan((await np.boundingBox())!.y)
    const style = (l: typeof np) => l.evaluate(e => { const s = getComputedStyle(e); return { size: s.fontSize, color: s.color } })
    expect(await style(label)).toEqual(await style(np))
  })

  test('TC-20-02: Intet match hos Apple → stationslogo og ingen kilde-tekst', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Ukendt Kunstner - Ukendt Nummer')
    await mockApple(page, [{ artist: 'Helt Anden', track: 'Noget Andet', album: 'X', art: 'forkert' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator('text=Ukendt Kunstner - Ukendt Nummer')).toBeVisible({ timeout: 5000 })
    await openSheet(page, ICY_STATION)
    await page.waitForTimeout(800)
    await expect(sheet(page).locator('img[src*="tc20-art.test"]')).toHaveCount(0)
    await expect(sheet(page).getByText(/^Cover fra /)).toHaveCount(0)
    await expect(sheet(page).locator(`img[alt="${ICY_STATION}"]`)).toBeVisible()
  })

  test('TC-20-03: Iris-station — eget Apple-opslag har forrang over Iris\' cover', async ({ page }) => {
    await mockImages(page)
    await mockIris(page, 'Gazebo', 'I Like Chopin', 'https://tc20-iris.test/opsamling.jpg')
    await mockApple(page, [{ artist: 'Gazebo', track: 'I Like Chopin', album: 'The Syndrone', art: 'syndrone' }])
    await loadApp(page)
    await playStation(page, IRIS_STATION)
    await openSheet(page, IRIS_STATION)
    await expect(bigCover(page, 'syndrone')).toBeVisible({ timeout: 8000 })
    await expect(sheet(page).locator('img[src*="tc20-iris.test"]')).toHaveCount(0)
    await expect(sourceLabel(page, 'Apple Music')).toBeVisible()
  })

  test('TC-20-04: Iris-station uden Apple-match bruger Iris\' cover — kilde "Loverad/Iris"', async ({ page }) => {
    await mockImages(page)
    await mockIris(page, 'TC20 Artist', 'TC20 Song', 'https://tc20-iris.test/iris.jpg')
    await mockApple(page, [])
    await loadApp(page)
    await playStation(page, IRIS_STATION)
    await openSheet(page, IRIS_STATION)
    await expect(sheet(page).locator('img[src="https://tc20-iris.test/iris.jpg"]')).toBeVisible({ timeout: 8000 })
    await expect(sourceLabel(page, 'Loverad/Iris')).toBeVisible()
  })

  test('TC-20-05: Iris uden cover → Apple Music bruges som fallback', async ({ page }) => {
    await mockImages(page)
    await mockIris(page, 'Pet Shop Boys', 'Always On My Mind')
    await mockApple(page, [{ artist: 'Pet Shop Boys', track: 'Always On My Mind', album: 'Actually', art: 'psb' }])
    await loadApp(page)
    await playStation(page, IRIS_STATION)
    await openSheet(page, IRIS_STATION)
    await expect(bigCover(page, 'psb')).toBeVisible({ timeout: 8000 })
    await expect(sourceLabel(page, 'Apple Music')).toBeVisible()
  })

  test('TC-20-06: Bauer-station viser kilde "Bauer/Radioplay"', async ({ page }) => {
    await mockImages(page)
    await page.route('**/api/now-playing**', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ title: 'TC20 Artist - TC20 Song', cover: 'https://tc20-bauer.test/bauer.jpg', end: null }),
    }))
    await mockApple(page, [])
    await loadApp(page)
    await playStation(page, BAUER_STATION)
    await openSheet(page, BAUER_STATION)
    await expect(sheet(page).locator('img[src="https://tc20-bauer.test/bauer.jpg"]')).toBeVisible({ timeout: 8000 })
    await expect(sourceLabel(page, 'Bauer/Radioplay')).toBeVisible()
  })

  test('TC-20-07: Rangordning — single vinder over album og opsamling', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Pet Shop Boys - Always On My Mind')
    await mockApple(page, [
      { artist: 'Pet Shop Boys', track: 'Always On My Mind', album: 'PopArt: The Hits', art: 'opsamling' },
      { artist: 'Pet Shop Boys', track: 'Always On My Mind', album: 'Actually', art: 'album' },
      { artist: 'Pet Shop Boys', track: 'Always On My Mind', album: 'Always On My Mind - Single', art: 'single' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'single')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-08: Rangordning — album vinder over opsamling', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Pet Shop Boys - Always On My Mind')
    await mockApple(page, [
      { artist: 'Pet Shop Boys', track: 'Always On My Mind', album: 'Greatest Hits Collection', art: 'opsamling' },
      { artist: 'Pet Shop Boys', track: 'Always On My Mind', album: 'Actually', art: 'album' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'album')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-09: Senere versioner (rework, remix, live, år i titlen) afvises', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Gazebo - I Like Chopin')
    await mockApple(page, [
      { artist: 'GAZEBO', track: "I Like Chopin (Hamaeel's Rework 2022)", album: "I Like Chopin (Hamaeel's Rework 2022) - Single", art: 'rework' },
      { artist: 'Gazebo', track: 'I Like Chopin 2020 (Coronaversion)', album: 'I Like Chopin 2020 - Single', art: 'aar' },
      { artist: 'Gazebo', track: 'I Like Chopin (Live)', album: 'I Like... Live!', art: 'live' },
      { artist: 'Gazebo', track: 'I Like Chopin', album: 'The Syndrone', art: 'syndrone' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'syndrone')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-10: Nævner radioens titel selv "Remix", er en remix-version tilladt', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Silent Circle - Stop the rain in the night (Extended Remix)')
    await mockApple(page, [
      { artist: 'Silent Circle', track: 'Stop the Rain in the Night', album: 'No. 1 Jubiläums Edition', art: 'album' },
      { artist: 'Silent Circle', track: 'Stop the Rain in the Night (Extended Remix)', album: 'Stop the Rain in the Night (Extended Remix) - Single', art: 'remix' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'remix')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-11: Søgeordet: "&" → "and" og versionsangivelse i parentes udelades', async ({ page }) => {
    const terms: string[] = []
    await mockImages(page)
    await mockApple(page, [], terms)
    await mockIcy(page, 'Blur - Girls & Boys (Extended Remix)')
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect.poll(() => terms.length, { timeout: 8000 }).toBeGreaterThan(0)
    expect(terms[0]).toBe('Blur Girls and Boys')
  })

  test('TC-20-12: "Feat. X" uden parentes og byttet hoved-/gæstekunstner matcher', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Tegan & Sara - Feel It In My Bones Feat. Tiësto')
    await mockApple(page, [{ artist: 'Tiësto', track: 'Feel It In My Bones (feat. Tegan & Sara)', album: 'Kaleidoscope', art: 'tiesto' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'tiesto')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-13: Årstal som hale på titlen ("* 1984", "- 1987") ignoreres', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Tony Esposito - Kalimba de luna * 1984')
    await mockApple(page, [{ artist: 'Tony Esposito', track: 'Kalimba De Luna', album: 'Procession', art: 'kalimba' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'kalimba')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-14: DR — "/ " foran kunstneren fjernes, og cover slås op', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, '/ Freya Skye - bad taste')
    await mockApple(page, [{ artist: 'Freya Skye', track: 'bad taste', album: 'bad taste - Single', art: 'freya' }])
    await loadApp(page)
    await playStation(page, DR_STATION)
    await expect(bar(page).locator('text=Freya Skye - bad taste')).toBeVisible({ timeout: 8000 })
    await expect(bar(page).locator('text=/ Freya Skye')).toHaveCount(0)
    await openSheet(page, DR_STATION)
    await expect(bigCover(page, 'freya')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-15: Småfejl i kunstnerens stavemåde tåles', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Gazilion Zero  - Living In A Bubble')
    await mockApple(page, [{ artist: 'Gazillion Zero', track: 'Living In a Bubble', album: 'Frequencies of Life', art: 'gazillion' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'gazillion')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-16: Apple-coveret sendes også til låseskærmen (MediaSession)', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Satan - Trial by fire')
    await mockApple(page, [{ artist: 'Satan', track: 'Trial by Fire', album: 'Court In The Act', art: 'satan' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator(`img[src="${appleArt('satan')}"]`)).toBeVisible({ timeout: 8000 })
    await expect.poll(() => page.evaluate(() => navigator.mediaSession.metadata?.artwork[0]?.src ?? '')).toContain(
      `/api/artwork?url=${encodeURIComponent(appleArt('satan'))}`)
  })

  test('TC-20-17: Samme nummer slås kun op én gang (cache), også efter flere polls', async ({ page }) => {
    const terms: string[] = []
    const icy = { n: 0 }
    await page.clock.install()
    await mockImages(page)
    await mockIcy(page, 'Satan - Trial by fire', icy)
    await mockApple(page, [{ artist: 'Satan', track: 'Trial by Fire', album: 'Court In The Act', art: 'satan' }], terms)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator(`img[src="${appleArt('satan')}"]`)).toBeVisible({ timeout: 8000 })
    await page.clock.runFor(95_000)  // tre 30 sek.-polls
    await expect.poll(() => icy.n, { timeout: 5000 }).toBeGreaterThanOrEqual(3)
    expect(terms.length).toBe(1)
    // Coveret blev stående (ingen flimren tilbage til logoet)
    await expect(bar(page).locator(`img[src="${appleArt('satan')}"]`)).toBeVisible()
  })
})
