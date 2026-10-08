import { test, expect, type Page } from '@playwright/test'

// Kan peges mod lokal dev-server før deploy: WEBRADIO_URL=http://localhost:5173 npx playwright test tc-19
const URL = process.env.WEBRADIO_URL ?? 'https://webradio-chi.vercel.app'
const CATEGORY = 'Rock'

async function loadApp(page: Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function goToCategory(page: Page, cat: string) {
  await page.locator('button.px-4.py-1\\.5.rounded-full').filter({ hasText: cat }).first().click()
  await page.waitForTimeout(600)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 5000 })
}

// Stationsnavnene i kategorien, i den rækkefølge gridet viser dem (= den rækkefølge PREV/NEXT følger)
async function categoryNames(page: Page): Promise<string[]> {
  return (await page.locator('.rounded-xl.border.px-4 h3').allInnerTexts()).map(n => n.trim())
}

async function playCard(page: Page, index: number) {
  await page.locator('.rounded-xl.border.px-4').nth(index).click()
  await page.waitForSelector('.fixed.bottom-0 [aria-label="Pause"]', { timeout: 10000 })
}

const bar = (page: Page) => page.locator('.fixed.bottom-0')
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Afspiller' })
const barName = (page: Page) => bar(page).locator('.font-display').first()

async function openSheet(page: Page) {
  await barName(page).click()
  await expect(sheet(page)).toBeVisible()
}

// ─────────────────────────────────────────────
// TC-19: Forrige / næste station i den store afspiller
// ─────────────────────────────────────────────
test.describe('TC-19: Forrige / næste station', () => {

  test('TC-19-01: NEXT spiller næste station i kategorien', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    expect(names.length).toBeGreaterThan(2)
    await playCard(page, 0)
    await openSheet(page)
    await sheet(page).locator('[aria-label="Næste station"]').click()
    await expect(barName(page)).toHaveText(names[1])
    await expect(sheet(page).locator('[aria-label="Pause"]')).toBeVisible()
  })

  test('TC-19-02: NEXT på den sidste station spiller den første', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    await playCard(page, names.length - 1)
    await openSheet(page)
    await sheet(page).locator('[aria-label="Næste station"]').click()
    await expect(barName(page)).toHaveText(names[0])
  })

  test('TC-19-03: PREV på den første station spiller den sidste', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    await playCard(page, 0)
    await openSheet(page)
    await sheet(page).locator('[aria-label="Forrige station"]').click()
    await expect(barName(page)).toHaveText(names[names.length - 1])
  })

  test('TC-19-04: PREV spiller forrige station midt i kategorien', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    await playCard(page, 2)
    await openSheet(page)
    await sheet(page).locator('[aria-label="Forrige station"]').click()
    await expect(barName(page)).toHaveText(names[1])
    await sheet(page).locator('[aria-label="Forrige station"]').click()
    await expect(barName(page)).toHaveText(names[0])
  })

  test('TC-19-05: Følger stationens egen kategori, også når "Alle" er valgt', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    const last = names[names.length - 1]
    // Tilbage til "Alle" og start den sidste Rock-station derfra
    await page.getByRole('button', { name: 'Alle', exact: true }).click()
    await page.waitForTimeout(400)
    await page.locator('.rounded-xl.border.px-4', { has: page.locator('h3', { hasText: new RegExp(`^${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first().click()
    await page.waitForSelector('.fixed.bottom-0 [aria-label="Pause"]', { timeout: 10000 })
    await openSheet(page)
    await sheet(page).locator('[aria-label="Næste station"]').click()
    // Wrap-around inden for Rock — ikke videre til næste station i "Alle"
    await expect(barName(page)).toHaveText(names[0])
  })

  test('TC-19-06: NEXT på en pauset station starter den nye station', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    await playCard(page, 0)
    await openSheet(page)
    await sheet(page).locator('[aria-label="Pause"]').click()
    await expect(sheet(page).locator('[aria-label="Afspil"]')).toBeVisible()
    await sheet(page).locator('[aria-label="Næste station"]').click()
    await expect(barName(page)).toHaveText(names[1])
    await expect(sheet(page).locator('[aria-label="Pause"]')).toBeVisible()
  })

  test('TC-19-07: PREV/NEXT har samme farve som play/pause og er 20 % mindre', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    await playCard(page, 0)
    await openSheet(page)
    const play = sheet(page).locator('[aria-label="Pause"]')
    const prev = sheet(page).locator('[aria-label="Forrige station"]')
    const next = sheet(page).locator('[aria-label="Næste station"]')
    const bg = (l: typeof play) => l.evaluate(e => getComputedStyle(e).backgroundColor)
    expect(await bg(prev)).toBe(await bg(play))
    expect(await bg(next)).toBe(await bg(play))
    const pw = (await play.boundingBox())!.width
    for (const b of [prev, next]) {
      const box = (await b.boundingBox())!
      expect(box.width / pw).toBeCloseTo(0.8, 1)
      expect(box.height / pw).toBeCloseTo(0.8, 1)
    }
    // Rækkefølge: PREV · play · NEXT
    const xs = [await prev.boundingBox(), await play.boundingBox(), await next.boundingBox()].map(b => b!.x)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  test('TC-19-08: Låseskærm/headset (MediaSession previoustrack/nexttrack) skifter station', async ({ page }) => {
    // Opfang de handlere appen registrerer, så de kan kaldes som låseskærmen ville gøre
    await page.addInitScript(() => {
      const w = window as unknown as { __ms: Record<string, () => void> }
      w.__ms = {}
      const ms = navigator.mediaSession
      const orig = ms.setActionHandler.bind(ms)
      ms.setActionHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
        if (handler) w.__ms[action] = () => handler({ action } as MediaSessionActionDetails)
        orig(action, handler)
      }
    })
    await loadApp(page)
    await goToCategory(page, CATEGORY)
    const names = await categoryNames(page)
    await playCard(page, 1)
    const registered = await page.evaluate(() => {
      const h = (window as unknown as { __ms: Record<string, unknown> }).__ms
      return { prev: typeof h.previoustrack, next: typeof h.nexttrack }
    })
    expect(registered).toEqual({ prev: 'function', next: 'function' })
    await page.evaluate(() => (window as unknown as { __ms: Record<string, () => void> }).__ms.nexttrack())
    await expect(barName(page)).toHaveText(names[2])
    await page.evaluate(() => (window as unknown as { __ms: Record<string, () => void> }).__ms.previoustrack())
    await expect(barName(page)).toHaveText(names[1])
  })
})
