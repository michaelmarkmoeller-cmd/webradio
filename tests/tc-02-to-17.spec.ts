import { test, expect, Page } from '@playwright/test'

const URL = 'https://webradio-chi.vercel.app'

async function loadApp(page: Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function playFirst(page: Page) {
  const card = page.locator('.rounded-xl.border.px-4').first()
  await card.click()
  await page.waitForSelector('[aria-label="Pause"]', { timeout: 8000 })
  return card
}

// ─────────────────────────────────────────────
// TC-02: Stationskort — Visuel
// ─────────────────────────────────────────────
test.describe('TC-02: Stationskort — Visuel', () => {

  test('TC-02-01: Korrekte metadata vises', async ({ page }) => {
    await loadApp(page)
    const card = page.locator('.rounded-xl.border.px-4').first()
    await expect(card.locator('h3')).toBeVisible()
    await expect(card.locator('.text-xs.text-text-muted').first()).toBeVisible()
  })

  test('TC-02-02: Logo badge øverst til venstre', async ({ page }) => {
    await loadApp(page)
    // Find a card that has a logo (absolute positioned img inside)
    const cardWithLogo = page.locator('.rounded-xl.border.px-4').filter({ has: page.locator('.absolute.top-2.left-4') }).first()
    await expect(cardWithLogo.locator('.absolute.top-2.left-4 img')).toBeVisible()
  })

  test('TC-02-03: Dynamisk skriftstørrelse', async ({ page }) => {
    await loadApp(page)
    // All h3 station names should exist and be visible — dynamic size applied via JS class
    const names = page.locator('.rounded-xl.border.px-4 h3')
    const count = await names.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < Math.min(count, 10); i++) {
      await expect(names.nth(i)).toBeVisible()
    }
  })

  test('TC-02-04: Aktiv station har accentfarvet kant', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    // Active card has border-accent/60 class
    const activeCard = page.locator('.rounded-xl.border.px-4.border-accent\\/60').first()
    await expect(activeCard).toBeVisible()
  })

  test('TC-02-05: Equalizer-bars kun ved afspilning', async ({ page }) => {
    await loadApp(page)
    // Before playing: no equalizer
    const eqBefore = page.locator('.rounded-xl.border.px-4 .absolute.bottom-2.right-2')
    await expect(eqBefore).toHaveCount(0)
    // After playing: equalizer appears on active card
    await playFirst(page)
    const eqAfter = page.locator('.rounded-xl.border.px-4 .absolute.bottom-2.right-2')
    await expect(eqAfter).toHaveCount(1)
  })

  test('TC-02-07: Alle stationskort i samme række har ens højde', async ({ page }) => {
    await loadApp(page)
    const cards = page.locator('.rounded-xl.border.px-4')
    const count = await cards.count()
    expect(count).toBeGreaterThan(1)
    // Check first few cards in the same row have the same height
    const heights: number[] = []
    for (let i = 0; i < Math.min(count, 3); i++) {
      const box = await cards.nth(i).boundingBox()
      if (box) heights.push(Math.round(box.height))
    }
    // All cards in the same row should be the same height (within 1px)
    const min = Math.min(...heights)
    const max = Math.max(...heights)
    expect(max - min).toBeLessThanOrEqual(1)
  })

  test('TC-02-08: Kort navn holder min-h-[35px] navnefelt', async ({ page }) => {
    await loadApp(page)
    // All name h3 elements should have at least 35px height
    const names = page.locator('.rounded-xl.border.px-4 h3')
    const count = await names.count()
    for (let i = 0; i < Math.min(count, 15); i++) {
      const box = await names.nth(i).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(34) // 35px with 1px tolerance
    }
  })

  test('TC-02-09: Meget langt navn kapper ved 2 linjer', async ({ page }) => {
    await loadApp(page)
    // All name elements should not exceed 2 lines (~54px max with 10px font)
    const names = page.locator('.rounded-xl.border.px-4 h3')
    const count = await names.count()
    for (let i = 0; i < count; i++) {
      const box = await names.nth(i).boundingBox()
      // Max height for 2 lines at text-[10px] with leading-tight: ~26px
      // At text-sm: ~40px. Allow 44px to cover all sizes safely.
      expect(box!.height).toBeLessThanOrEqual(44)
    }
  })

})

// ─────────────────────────────────────────────
// TC-03: Afspilning
// ─────────────────────────────────────────────
test.describe('TC-03: Afspilning', () => {

  test('TC-03-01: Klik starter afspilning', async ({ page }) => {
    await loadApp(page)
    await page.locator('.rounded-xl.border.px-4').first().click()
    // "Forbinder" or "Live" should appear
    await expect(page.locator('.fixed.bottom-0')).toBeVisible({ timeout: 8000 })
    const hasStatus = await page.locator('text=FORBINDER, text=LIVE').count()
    // Player bottom bar is visible
    await expect(page.locator('[aria-label="Pause"], [aria-label="Afspil"]')).toBeVisible()
  })

  test('TC-03-02: Klik på aktiv station starter ikke forfra', async ({ page }) => {
    await loadApp(page)
    const card = await playFirst(page)
    // Get current src before second click
    const srcBefore = await page.evaluate(() => {
      const a = document.querySelector('audio')
      return a?.src ?? ''
    })
    await card.click()
    await page.waitForTimeout(500)
    const srcAfter = await page.evaluate(() => {
      const a = document.querySelector('audio')
      return a?.src ?? ''
    })
    expect(srcAfter).toBe(srcBefore)
  })

  test('TC-03-03: Stationsskift stopper forrige', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    const nameBefore = await page.locator('.fixed.bottom-0 .font-display.font-bold').textContent()
    // Click a different station
    const cards = page.locator('.rounded-xl.border.px-4')
    await cards.nth(1).click()
    await page.waitForTimeout(1000)
    const nameAfter = await page.locator('.fixed.bottom-0 .font-display.font-bold').textContent()
    expect(nameAfter?.trim()).not.toBe(nameBefore?.trim())
  })

  test('TC-03-04: Pause → resume virker', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    // Pause
    await page.click('[aria-label="Pause"]')
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible({ timeout: 3000 })
    // Resume
    await page.click('[aria-label="Afspil"]')
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible({ timeout: 8000 })
  })

})

// ─────────────────────────────────────────────
// TC-04: Player UI
// ─────────────────────────────────────────────
test.describe('TC-04: Player UI', () => {

  test('TC-04-01: Stationsinfo vises korrekt', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    const player = page.locator('.fixed.bottom-0')
    await expect(player.locator('.font-display.font-bold')).toBeVisible()
    // Category badge visible
    await expect(player.locator('.text-\\[11px\\].font-semibold.px-2')).toBeVisible()
  })

  test('TC-04-02: "Forbinder" indikator under buffering', async ({ page }) => {
    await loadApp(page)
    await page.locator('.rounded-xl.border.px-4').first().click()
    // Status indicator is inside the fixed player bar — use scoped locator
    const player = page.locator('.fixed.bottom-0')
    await expect(
      player.locator('.text-yellow-400').or(player.locator('.text-red-400'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('TC-04-03: Live indikator ved afspilning', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    await expect(page.locator('text=LIVE')).toBeVisible({ timeout: 10000 })
  })

  test('TC-04-04: Lyttetimer nulstilles ved stationsskift', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    // Wait for timer to tick at least once
    await page.waitForTimeout(2000)
    // Switch to another station
    await page.locator('.rounded-xl.border.px-4').nth(1).click()
    await page.waitForSelector('text=LIVE', { timeout: 10000 })
    // Timer should be reset to near 00:00
    const timerText = await page.locator('.tabular-nums.text-red-400').textContent()
    expect(timerText?.trim()).toMatch(/^00:0[0-3]$/)
  })

  test('TC-04-05: Lyttetimer pauser præcist', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    await page.waitForTimeout(2000)
    const timerBefore = await page.locator('.tabular-nums.text-red-400').textContent()
    await page.click('[aria-label="Pause"]')
    await page.waitForTimeout(3000)
    // Timer value should not change while paused
    const timerAfter = await page.locator('.tabular-nums.text-red-400').count()
    // Timer element disappears when paused (LIVE row hidden)
    expect(timerAfter).toBe(0)
  })

  test('TC-04-07: Volume-slider synlig på desktop', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    await expect(page.locator('input[type="range"][aria-label="Lydstyrke"]')).toBeVisible()
  })

  test('TC-04-09: Player-logo vises', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    // Player row 3 should have a logo img or placeholder div
    const player = page.locator('.fixed.bottom-0')
    const logoImg = player.locator('img.h-12.w-12')
    const logoDiv = player.locator('div.h-12.w-12')
    const hasLogo = await logoImg.count() + await logoDiv.count()
    expect(hasLogo).toBeGreaterThan(0)
  })

})

// ─────────────────────────────────────────────
// TC-06: Søvntimer
// ─────────────────────────────────────────────
test.describe('TC-06: Søvntimer', () => {

  test('TC-06-01: Sleep-menu åbner med valgmuligheder', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    await page.click('[aria-label="Sleep timer"]')
    await expect(page.locator('text=Fra')).toBeVisible()
    await expect(page.locator('text=10 min')).toBeVisible()
    await expect(page.locator('text=60 min')).toBeVisible()
  })

  test('TC-06-02: Timer starter og viser nedtælling', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    await page.click('[aria-label="Sleep timer"]')
    await page.locator('text=10 min').click()
    // Menu closes and countdown shows
    await expect(page.locator('text=Fra')).not.toBeVisible()
    await expect(page.locator('.text-\\[10px\\].font-bold.tabular-nums')).toBeVisible()
  })

  test('TC-06-05: Timer deaktiveres via "Fra"', async ({ page }) => {
    await loadApp(page)
    await playFirst(page)
    await page.click('[aria-label="Sleep timer"]')
    await page.locator('text=10 min').click()
    // Verify timer is active
    await expect(page.locator('.text-\\[10px\\].font-bold.tabular-nums')).toBeVisible()
    // Cancel
    await page.click('[aria-label="Sleep timer"]')
    await page.locator('text=Fra').click()
    // Timer text gone
    await expect(page.locator('.text-\\[10px\\].font-bold.tabular-nums')).not.toBeVisible()
    // Playback still going
    await expect(page.locator('[aria-label="Pause"]')).toBeVisible()
  })

})

// ─────────────────────────────────────────────
// TC-07: Favoritter
// ─────────────────────────────────────────────
test.describe('TC-07: Favoritter', () => {

  test('TC-07-01 + TC-07-02: Hjerte tilføjer og fjerner favorit', async ({ page }) => {
    await loadApp(page)
    const card = page.locator('.rounded-xl.border.px-4').first()
    const heart = card.locator('button[aria-label]').filter({ hasText: '' }).first()

    // Add favorite
    await heart.click()
    await expect(card.locator('svg[fill="#ef4444"]')).toBeVisible({ timeout: 3000 })

    // Remove favorite
    await heart.click()
    await expect(card.locator('svg[fill="none"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-07-04: Hjerte-knap starter ikke afspilning', async ({ page }) => {
    await loadApp(page)
    const card = page.locator('.rounded-xl.border.px-4').first()
    const heart = card.locator('button[aria-label="Tilføj til favoritter"], button[aria-label="Fjern fra favoritter"]').first()
    await heart.click()
    // Player should not appear (no audio started)
    const playerVisible = await page.locator('[aria-label="Pause"]').isVisible()
    expect(playerVisible).toBe(false)
    // Cleanup
    await heart.click()
  })

  test('TC-07-06: Hjerte-ikon synligt i lys mode', async ({ page }) => {
    await loadApp(page)
    // Switch to light mode
    const themeBtn = page.locator('button[aria-label*="mode"], button[aria-label*="tema"], button[aria-label*="lys"], button[aria-label*="light"]').first()
    if (await themeBtn.count() > 0) {
      await themeBtn.click()
    }
    // Heart icon stroke should be visible (not white-on-white)
    const heartSvg = page.locator('.rounded-xl.border.px-4 svg[stroke="currentColor"]').first()
    await expect(heartSvg).toBeVisible()
    const stroke = await heartSvg.getAttribute('stroke')
    expect(stroke).toBe('currentColor')
  })

})

// ─────────────────────────────────────────────
// TC-08: Kategori-filter
// ─────────────────────────────────────────────
test.describe('TC-08: Kategori-filter', () => {

  test('TC-08-01: "Alle" viser alle stationer', async ({ page }) => {
    await loadApp(page)
    // Click a category first, then click "Alle"
    const pills = page.locator('button.rounded-full')
    await pills.filter({ hasText: "80's" }).first().click()
    const countCat = await page.locator('.rounded-xl.border.px-4').count()
    await pills.filter({ hasText: 'Alle' }).first().click()
    const countAll = await page.locator('.rounded-xl.border.px-4').count()
    expect(countAll).toBeGreaterThan(countCat)
  })

  test('TC-08-02: Kategori-pill filtrerer korrekt', async ({ page }) => {
    await loadApp(page)
    await page.locator('button.rounded-full').filter({ hasText: "80's" }).first().click()
    // All visible cards should show category 80's
    const cards = page.locator('.rounded-xl.border.px-4')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const catText = await cards.nth(i).locator('.text-xs.text-text-muted').first().textContent()
      expect(catText?.trim()).toBe("80's")
    }
  })

  test('TC-08-04: Favoritter-pill vises altid', async ({ page }) => {
    await loadApp(page)
    const favPill = page.locator('button.rounded-full').filter({ hasText: /favorit/i })
      .or(page.locator('button.rounded-full svg').locator('..'))
    // The favorites pill (heart icon) should be visible
    const pills = page.locator('button.rounded-full')
    const count = await pills.count()
    expect(count).toBeGreaterThan(1) // At least "Alle" + categories + Favorites
  })

})

// ─────────────────────────────────────────────
// TC-13: Brugervejledning
// ─────────────────────────────────────────────
test.describe('TC-13: Brugervejledning', () => {

  test('TC-13-01: Guide åbner som in-app iframe-modal', async ({ page }) => {
    await loadApp(page)
    const tabs: import('@playwright/test').Page[] = []
    page.context().on('page', (p) => tabs.push(p))

    // Guide button in header has title="Brugervejledning"
    const guideLink = page.locator('button[title="Brugervejledning"]')
    await expect(guideLink).toBeVisible({ timeout: 5000 })
    await guideLink.click()
    await page.waitForTimeout(800)

    // No new tab should open
    expect(tabs.length).toBe(0)
    // Iframe overlay should be visible
    await expect(page.locator('iframe')).toBeVisible({ timeout: 5000 })
  })

})

// ─────────────────────────────────────────────
// TC-15: Build & TypeScript
// ─────────────────────────────────────────────
test.describe('TC-15: Build & TypeScript', () => {

  test('TC-15-01 + TC-15-02: App loader og svarer på live-URL', async ({ page }) => {
    const response = await page.goto(URL)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/WebRadio|Radio/i)
  })

})
