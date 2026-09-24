import { test, expect, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-17b
const URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

// Audio-elementet ligger ikke i DOM'en — fang det, tæl nye forbindelser (loadstart) og gem
// MediaSession-handlerne, så låseskærmens PLAY/PAUSE kan kaldes direkte. visibilityState kan
// overstyres for at simulere låst skærm / app i baggrunden.
async function instrument(page: Page) {
  // Lokal dev-server kender ikke Vercel-funktionen /api/artwork (logoer fra produktion er "fremmede" på localhost)
  await page.route('**/api/artwork**', (r) => r.fulfill({ status: 204, body: '' }))
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    const Orig = window.Audio
    w.__loadstarts = 0
    w.__hidden = false
    window.Audio = function (src?: string) {
      const a = new Orig(src)
      // Første element = radiostreamen; det næste er bridge-elementet med stilhedsløkken (iOS)
      if (w.__audio) { w.__bridge = a; return a }
      a.addEventListener('loadstart', () => { w.__loadstarts = (w.__loadstarts as number) + 1 })
      w.__audio = a
      return a
    } as unknown as typeof Audio
    const handlers: Record<string, () => void> = {}
    w.__ms = handlers
    const orig = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession)
    navigator.mediaSession.setActionHandler = (action, h) => { if (h) handlers[action] = h as () => void; orig(action, h) }
    Object.defineProperty(document, 'visibilityState', { get: () => (w.__hidden ? 'hidden' : 'visible') })
    // Simulerede lydenheder: antallet styres af testen (headset ud = færre enheder)
    w.__devices = 3
    navigator.mediaDevices.enumerateDevices = async () =>
      Array.from({ length: w.__devices as number }, (_, i) => ({ deviceId: String(i), kind: 'audiooutput', label: '', groupId: '' }) as MediaDeviceInfo)
  })
}

// silent = audio-elementet spiller stilhedsløkken (blob-URL) i stedet for radiostreamen
type AudioState = { paused: boolean; silent: boolean; loop: boolean; loadstarts: number; ms: string }
const audioState = (page: Page) => page.evaluate((): AudioState => {
  const w = window as unknown as { __audio: HTMLAudioElement; __loadstarts: number }
  return { paused: w.__audio.paused, silent: w.__audio.src.startsWith('blob:'), loop: w.__audio.loop, loadstarts: w.__loadstarts, ms: navigator.mediaSession.playbackState }
})
const setHidden = (page: Page, hidden: boolean) => page.evaluate((h) => {
  (window as unknown as { __hidden: boolean }).__hidden = h
  document.dispatchEvent(new Event('visibilitychange'))
}, hidden)
const setDevices = (page: Page, n: number) => page.evaluate((c) => {
  (window as unknown as { __devices: number }).__devices = c
  navigator.mediaDevices.dispatchEvent(new Event('devicechange'))
}, n)
const lockScreen = (page: Page, action: 'play' | 'pause') =>
  page.evaluate((a) => (window as unknown as { __ms: Record<string, () => void> }).__ms[a](), action)

async function loadAndPlay(page: Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
  await page.locator('.rounded-xl.border.px-4').first().click()
  await page.waitForSelector('[aria-label="Pause"]', { timeout: 10000 })
  // Første forbindelses loadstart skal være talt, før testene læser tælleren
  await expect.poll(() => page.evaluate(() => (window as unknown as { __loadstarts?: number }).__loadstarts ?? 1)).toBeGreaterThan(0)
}

// ─────────────────────────────────────────────
// TC-17 (fortsat): Lydløs pause på iOS (BUG-15-opfølgning, 23-09-2026)
// ─────────────────────────────────────────────
test.describe('TC-17: Lydløs pause (iOS)', () => {
  test.use({ userAgent: IPHONE_UA })

  test.beforeEach(async ({ page }) => {
    await instrument(page)
    await page.clock.install()
    await loadAndPlay(page)
  })

  test('TC-17-05: Pause på iOS skifter til stilhedsløkke i stedet for at stoppe', async ({ page }) => {
    await page.click('[aria-label="Pause"]')
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
    expect(await audioState(page)).toMatchObject({ paused: false, silent: true, loop: true, ms: 'paused' })
  })

  test('TC-17-06: PLAY under lydløs pause kobler radiostreamen på igen', async ({ page }) => {
    const before = (await audioState(page)).loadstarts
    await page.click('[aria-label="Pause"]')
    await page.clock.fastForward(10_000)
    await page.click('[aria-label="Afspil"]')
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false, loop: false, ms: 'playing' })
    await expect.poll(async () => (await audioState(page)).loadstarts).toBeGreaterThan(before + 1)
  })

  test('TC-17-07: Pause i appen stoppes rigtigt efter 20 sek., hvis appen forbliver åben', async ({ page }) => {
    await page.click('[aria-label="Pause"]')
    await page.clock.fastForward(19_000)
    expect(await audioState(page)).toMatchObject({ paused: false, silent: true })
    await page.clock.fastForward(2_000)
    expect(await audioState(page)).toMatchObject({ paused: true })
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
  })

  test('TC-17-08: Låseskærm-pause holder stilhedsløkken i gang i 30 min., derefter rigtigt stop', async ({ page }) => {
    await setHidden(page, true)
    await lockScreen(page, 'pause')
    await page.clock.fastForward(29 * 60_000 + 50_000)
    expect(await audioState(page)).toMatchObject({ paused: false, silent: true })
    await page.clock.fastForward(15_000)
    expect(await audioState(page)).toMatchObject({ paused: true })
  })

  test('TC-17-09: Låseskærm-PLAY efter 2 min. lydløs pause kobler radiostreamen på igen', async ({ page }) => {
    const before = (await audioState(page)).loadstarts
    await setHidden(page, true)
    await lockScreen(page, 'pause')
    await page.clock.fastForward(2 * 60_000)
    await lockScreen(page, 'play')
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false, ms: 'playing' })
    await expect.poll(async () => (await audioState(page)).loadstarts).toBeGreaterThan(before + 1)
  })

  test('TC-17-10: Pause i appen → lås inden 20 sek. → lydløs pause fortsætter op til loftet', async ({ page }) => {
    await page.click('[aria-label="Pause"]')
    await page.clock.fastForward(10_000)
    await setHidden(page, true)
    await page.clock.fastForward(60_000)
    expect(await audioState(page)).toMatchObject({ paused: false, silent: true })
    await lockScreen(page, 'play')
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false, ms: 'playing' })
  })

  test('TC-17-11: Åbnes appen under lydløs pause, stoppes streamen 20 sek. senere', async ({ page }) => {
    await setHidden(page, true)
    await lockScreen(page, 'pause')
    await page.clock.fastForward(60_000)
    await setHidden(page, false)
    // Må ikke vise "spiller", selvom audio-elementet kører (stilhedsløkken)
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
    await page.clock.fastForward(21_000)
    expect(await audioState(page)).toMatchObject({ paused: true })
  })

  test('TC-17-12: PLAY efter loftet kobler streamen på igen som normalt', async ({ page }) => {
    const before = (await audioState(page)).loadstarts
    await setHidden(page, true)
    await lockScreen(page, 'pause')
    await page.clock.fastForward(30 * 60_000 + 1_000)
    await setHidden(page, false)
    await page.click('[aria-label="Afspil"]')
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false })
    // loadstart er et asynkront event — vent på det
    await expect.poll(async () => (await audioState(page)).loadstarts).toBeGreaterThan(before)
  })

  test('TC-17-13: Stationsskift under lydløs pause giver lyd på den nye station', async ({ page }) => {
    await page.click('[aria-label="Pause"]')
    await page.locator('.rounded-xl.border.px-4').nth(1).click()
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false })
  })

  test('TC-17-19: Headset ud under afspilning giver rigtigt stop, ikke lydløs pause', async ({ page }) => {
    await setDevices(page, 2)
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
    await page.clock.runFor(200)  // fade-out før stop
    expect(await audioState(page)).toMatchObject({ paused: true, silent: false })
    await expect(page.locator('text=Forbinder')).toHaveCount(0)
  })

  test('TC-17-20: Headset ind igen inden 10 sek. genoptager radiostreamen', async ({ page }) => {
    await setDevices(page, 2)
    await page.clock.runFor(3_000)
    await setDevices(page, 3)
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false, ms: 'playing' })
  })

  test('TC-17-21: MediaSession-pause fra samme frakobling omdannes til rigtigt stop med streamen klar', async ({ page }) => {
    await lockScreen(page, 'pause')  // iOS sender pause, lige før devicechange
    expect(await audioState(page)).toMatchObject({ silent: true })
    await setDevices(page, 2)
    await expect.poll(async () => (await audioState(page)).silent).toBe(false)
    expect(await audioState(page)).toMatchObject({ paused: true })
    await page.clock.runFor(2_000)
    await setDevices(page, 3)
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false })
  })

  test('TC-17-22: "Forbinder" vises ikke under lydløs pause', async ({ page }) => {
    await page.click('[aria-label="Pause"]')
    await page.evaluate(() => (window as unknown as { __audio: HTMLAudioElement }).__audio.dispatchEvent(new Event('waiting')))
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
    await expect(page.locator('text=Forbinder')).toHaveCount(0)
  })

  test('TC-17-23: Headset-PLAY med låst skærm uden stilhedsløkke holder siden vågen via bridge-elementet, til streamen spiller', async ({ page }) => {
    await page.click('[aria-label="Pause"]')
    await page.clock.runFor(21_000)  // lydløs pause udløber → rigtigt stop
    expect(await audioState(page)).toMatchObject({ paused: true })
    await setHidden(page, true)
    await lockScreen(page, 'play')
    const bridgePaused = () => page.evaluate(() => (window as unknown as { __bridge: HTMLAudioElement }).__bridge.paused)
    await expect.poll(bridgePaused).toBe(false)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __audio: HTMLAudioElement }).__audio.readyState), { timeout: 15000 }).toBeGreaterThan(2)
    await expect.poll(bridgePaused).toBe(true)
    expect(await audioState(page)).toMatchObject({ paused: false, silent: false, ms: 'playing' })
  })

  test('TC-17-14: Søvntimer stopper streamen rigtigt (ingen lydløs pause)', async ({ page }) => {
    await page.click('[aria-label="Sleep timer"]')
    await page.locator('text=10 min').click()
    await page.clock.fastForward(10 * 60_000 + 500)
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
    await page.clock.runFor(200)  // fade-out (8 × 10 ms) før det rigtige stop
    expect(await audioState(page)).toMatchObject({ paused: true, silent: false })
  })
})

test.describe('TC-17: Pause på pc (uændret)', () => {
  test('TC-17-15: Pause på pc stopper streamen med det samme', async ({ page }) => {
    await instrument(page)
    await loadAndPlay(page)
    await page.click('[aria-label="Pause"]')
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible()
    await page.waitForTimeout(300)
    expect(await audioState(page)).toMatchObject({ paused: true, silent: false })
  })
})
