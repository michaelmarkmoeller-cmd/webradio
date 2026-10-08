import { test, expect, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-20
const APP_URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'

const ICY_STATION = 'SomaFM Metal Detector'  // ICY-station uden netværks-API
const IRIS_STATION = '80s80s Radio'          // Loverad/Iris
const BAUER_STATION = 'NOVA'                 // Bauer Media DK / Radioplay
const DR_STATION = 'DR P3'                   // DR sender "/ Kunstner - Titel"
const NORD_STATION = 'Radio Nord'            // Radio Nord sender "Kunstner, Titel" (komma)
const ANR_STATION = 'Radio ANR'              // ANR sender "TITEL-KUNSTNER" (store bogstaver, ingen mellemrum)

import zlib from 'node:zlib'

function crc32(buf: Buffer): number {
  let c = ~0
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)) }
  return ~c >>> 0
}

// Ensfarvet RGB-PNG (w×h) — bruges til at lave et "blankt hvidt" og et almindeligt cover
function solidPng(w: number, h: number, [r, g, b]: [number, number, number]): Buffer {
  const row = Buffer.alloc(w * 3 + 1)
  for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b }
  const raw = Buffer.concat(Array.from({ length: h }, () => row))
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])))
    return Buffer.concat([len, Buffer.from(type), data, crc])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

// Apple-billeder med CORS (så appen kan måle dem): 'blank' = hvidt standardcover, alt andet = rødt
async function mockMeasurableImages(page: Page) {
  await page.route('**/tc20-art.test/**', (route) => route.fulfill({
    status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' },
    body: route.request().url().includes('/blank/') ? solidPng(64, 64, [255, 255, 255]) : solidPng(64, 64, [200, 30, 30]),
  }))
}

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

// Et Apple Music-søgeresultat. `art` er et id, der ender i billed-URL'en (så testen kan se hvilket resultat der blev valgt)
interface Hit { artist: string; track: string; album: string; art: string; various?: boolean; genre?: string }
const appleArt = (id: string) => `https://tc20-art.test/${id}/600x600bb.jpg`

// Mock af iTunes Search API. `terms` fanger de søgeord appen sender
async function mockApple(page: Page, hitsOrFn: Hit[] | ((country: string) => Hit[]), terms: string[] = [], countries: string[] = []) {
  await page.route('**/itunes.apple.com/search**', (route) => {
    const u = new URL(route.request().url())
    terms.push(u.searchParams.get('term') ?? '')
    const country = u.searchParams.get('country') ?? ''
    countries.push(country)
    const hits = typeof hitsOrFn === 'function' ? hitsOrFn(country) : hitsOrFn
    route.fulfill({
      status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        resultCount: hits.length,
        results: hits.map(h => ({
          artistName: h.artist, trackName: h.track, collectionName: h.album,
          collectionArtistName: h.various ? 'Various Artists' : undefined, primaryGenreName: h.genre,
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

  test('TC-20-22: Bauer-station — eget Apple-opslag har forrang over Bauers cover', async ({ page }) => {
    await mockImages(page)
    await page.route('**/api/now-playing**', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ title: 'Gazebo - I Like Chopin', cover: 'https://tc20-bauer.test/opsamling.jpg', end: null }),
    }))
    await mockApple(page, [{ artist: 'Gazebo', track: 'I Like Chopin', album: 'The Syndrone', art: 'syndrone' }])
    await loadApp(page)
    await playStation(page, BAUER_STATION)
    await openSheet(page, BAUER_STATION)
    await expect(bigCover(page, 'syndrone')).toBeVisible({ timeout: 8000 })
    await expect(sheet(page).locator('img[src*="tc20-bauer.test"]')).toHaveCount(0)
    await expect(sourceLabel(page, 'Apple Music')).toBeVisible()
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
  test('TC-20-18: Soundtrack og "Various Artists"-udgivelser vælges ikke frem for studiealbummet', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Billy Ocean - Love really hurts without you')
    await mockApple(page, [
      { artist: 'Billy Ocean', track: 'Love Really Hurts Without You', album: 'Filth (Music From the Original Motion Picture)', art: 'filth', various: true, genre: 'Soundtrack' },
      { artist: 'Billy Ocean', track: 'Love Really Hurts Without You', album: 'Blame It On The Boogie', art: 'various', various: true },
      { artist: 'Billy Ocean', track: 'Love Really Hurts Without You', album: 'Billy Ocean (Expanded Edition)', art: 'studio' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'studio')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-19: Kunstnerens egen opsamling vælges frem for "Various Artists"-opsamlinger', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'Billy Ocean - Love really hurts without you')
    await mockApple(page, [
      { artist: 'Billy Ocean', track: 'Love Really Hurts Without You', album: 'Essential - Girls Night In', art: 'various', various: true },
      { artist: 'Billy Ocean', track: 'Love Really Hurts Without You', album: 'Filth (Music From the Original Motion Picture)', art: 'filth', various: true, genre: 'Soundtrack' },
      { artist: 'Billy Ocean', track: 'Love Really Hurts Without You', album: 'The Very Best of Billy Ocean', art: 'own' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'own')).toBeVisible({ timeout: 8000 })
  })

  test('TC-20-20: Blankt hvidt standardcover springes over — næste kandidat vælges', async ({ page }) => {
    await mockImages(page)
    await mockMeasurableImages(page)
    await mockIcy(page, "Luv' - Casanova (Spanish Version) (1979)")
    await mockApple(page, [
      { artist: "Luv'", track: 'Casanova - Spanish Version', album: "Luv' - EP", art: 'blank' },
      { artist: "Luv'", track: 'Casanova', album: "Lots Of Luv'", art: 'lots' },
    ])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'lots')).toBeVisible({ timeout: 8000 })
    await expect(sheet(page).locator('img[src*="/blank/"]')).toHaveCount(0)
    await expect(sourceLabel(page, 'Apple Music')).toBeVisible()
  })

  test('TC-20-21: Er alle kandidater blanke, vises stationslogoet', async ({ page }) => {
    await mockImages(page)
    await mockMeasurableImages(page)
    await mockIcy(page, "Luv' - Casanova")
    await mockApple(page, [{ artist: "Luv'", track: 'Casanova', album: "Luv' - EP", art: 'blank' }])
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await expect(bar(page).locator("text=Luv' - Casanova")).toBeVisible({ timeout: 5000 })
    await openSheet(page, ICY_STATION)
    await page.waitForTimeout(1500)
    await expect(sheet(page).locator('img[src*="tc20-art.test"]')).toHaveCount(0)
    await expect(sheet(page).getByText(/^Cover fra /)).toHaveCount(0)
    await expect(sheet(page).locator(`img[alt="${ICY_STATION}"]`)).toBeVisible()
  })
  test('TC-20-23: ANR — "TITEL-KUNSTNER" vendes til "Kunstner - Titel", og cover slås op', async ({ page }) => {
    await mockImages(page)
    await mockIcy(page, 'OPALITE-TAYLOR SWIFT')
    await mockApple(page, [{ artist: 'Taylor Swift', track: 'Opalite', album: 'The Life of a Showgirl', art: 'opalite' }])
    await loadApp(page)
    await playStation(page, ANR_STATION)
    await expect(bar(page).locator('text=Taylor Swift - Opalite')).toBeVisible({ timeout: 8000 })
    await openSheet(page, ANR_STATION)
    await expect(sheet(page).locator('.text-2xl', { hasText: 'Opalite' })).toBeVisible()
    await expect(sheet(page).locator('.text-lg', { hasText: 'Taylor Swift' })).toBeVisible()
    await expect(bigCover(page, 'opalite')).toBeVisible({ timeout: 8000 })
  })
  test('TC-20-24: Nummer der kun findes i Apples danske butik får cover (Danmark søges først)', async ({ page }) => {
    const countries: string[] = []
    await mockImages(page)
    await mockIcy(page, 'FASCINATION-ALPHABEAT')
    await mockApple(page, (c) => c === 'dk' ? [{ artist: 'Alphabeat', track: 'Fascination', album: 'Fascination - Single', art: 'alphabeat' }] : [], [], countries)
    await page.route('**/api/icy-meta**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title: 'FASCINATION-ALPHABEAT', icySupported: true }) }))
    await loadApp(page)
    await playStation(page, ANR_STATION)
    await expect(bar(page).locator('text=Alphabeat - Fascination')).toBeVisible({ timeout: 8000 })
    await openSheet(page, ANR_STATION)
    await expect(bigCover(page, 'alphabeat')).toBeVisible({ timeout: 8000 })
    expect(countries[0]).toBe('dk')
    expect(countries).toEqual(['dk'])   // fundet i første butik → intet ekstra opslag
  })

  test('TC-20-25: Findes nummeret ikke i den danske butik, prøves USA', async ({ page }) => {
    const countries: string[] = []
    await mockImages(page)
    await mockIcy(page, 'Satan - Trial by fire')
    await mockApple(page, (c) => c === 'us' ? [{ artist: 'Satan', track: 'Trial by Fire', album: 'Court In The Act', art: 'satan-us' }] : [], [], countries)
    await loadApp(page)
    await playStation(page, ICY_STATION)
    await openSheet(page, ICY_STATION)
    await expect(bigCover(page, 'satan-us')).toBeVisible({ timeout: 8000 })
    expect(countries).toEqual(['dk', 'us'])
  })
  test('TC-20-26: Radio Nord — "Kunstner, Titel" (komma) bliver til "Kunstner - Titel", og cover slås op', async ({ page }) => {
    const terms: string[] = []
    await mockImages(page)
    await mockIcy(page, 'Andreas Odbjerg, Jeg tror jeg elsker dig for evigt')
    await mockApple(page, [{ artist: 'Andreas Odbjerg', track: 'Jeg tror jeg elsker dig for evigt', album: 'Jeg tror jeg elsker dig for evigt - Single', art: 'odbjerg' }], terms)
    await loadApp(page)
    await playStation(page, NORD_STATION)
    await expect(bar(page).locator('text=Andreas Odbjerg - Jeg tror jeg elsker dig for evigt')).toBeVisible({ timeout: 8000 })
    await openSheet(page, NORD_STATION)
    await expect(sheet(page).locator('.text-lg', { hasText: 'Andreas Odbjerg' })).toBeVisible()
    await expect(bigCover(page, 'odbjerg')).toBeVisible({ timeout: 8000 })
    expect(terms[0]).toBe('Andreas Odbjerg Jeg tror jeg elsker dig for evigt')
  })
})
