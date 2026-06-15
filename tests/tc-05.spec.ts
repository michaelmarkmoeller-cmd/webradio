import { test, expect } from '@playwright/test'

const URL = 'https://webradio-chi.vercel.app'

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function playFirst(page: import('@playwright/test').Page) {
  const card = page.locator('.rounded-xl.border.px-4').first()
  await card.click()
  await page.waitForSelector('[aria-label="Pause"]', { timeout: 10000 })
  return card
}

// ─────────────────────────────────────────────
// TC-05: ICY stream-metadata
// ─────────────────────────────────────────────
test.describe('TC-05: ICY stream-metadata', () => {

  test('TC-05-01: ICY-titel vises i player', async ({ page }) => {
    await page.route('**/api/icy-meta**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: 'TC05 Test Song', genre: null, icySupported: true }) })
    })
    await loadApp(page)
    await playFirst(page)
    await expect(page.locator('.fixed.bottom-0').locator('text=TC05 Test Song')).toBeVisible({ timeout: 5000 })
  })

  test('TC-05-02: ICY-genre vises i player', async ({ page }) => {
    await page.route('**/api/icy-meta**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: null, genre: 'TC05 Genre', icySupported: true }) })
    })
    await loadApp(page)
    await playFirst(page)
    await expect(page.locator('.fixed.bottom-0').locator('text=TC05 Genre')).toBeVisible({ timeout: 5000 })
  })

  test('TC-05-03: Ingen polling ved icySupported:false', async ({ page }) => {
    let requestCount = 0
    await page.route('**/api/icy-meta**', (route) => {
      requestCount++
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ icySupported: false }) })
    })
    await loadApp(page)
    await playFirst(page)
    // Wait for first request to complete
    await page.waitForTimeout(1000)
    const countAfterFirst = requestCount
    expect(countAfterFirst).toBe(1)
    // Wait another 5s and verify no additional requests
    await page.waitForTimeout(5000)
    expect(requestCount).toBe(1)
  })

  test('TC-05-04: Metadata ryddes ved stationsskift', async ({ page }) => {
    await page.route('**/api/icy-meta**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: 'TC05 Persistent Title', icySupported: true }) })
    })
    await loadApp(page)
    await playFirst(page)
    const player = page.locator('.fixed.bottom-0')
    await expect(player.locator('text=TC05 Persistent Title')).toBeVisible({ timeout: 5000 })

    // Update mock BEFORE switching: new station returns a different title so we can
    // confirm the old one is gone regardless of whether the new poll fires immediately.
    await page.route('**/api/icy-meta**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: 'TC05 New Station Title', icySupported: true }) })
    })

    // Switch to second station
    await page.locator('.rounded-xl.border.px-4').nth(1).click()
    await page.waitForTimeout(1500)
    // Old title from station 1 should be gone
    await expect(player.locator('text=TC05 Persistent Title')).not.toBeVisible()
  })

  test('TC-05-05: Apostrof i titel vises korrekt', async ({ page }) => {
    await page.route('**/api/icy-meta**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: "Don't Stop Me Now", icySupported: true }) })
    })
    await loadApp(page)
    await playFirst(page)
    // Title with apostrophe should display correctly
    await expect(page.locator('.fixed.bottom-0').locator("text=Don't Stop Me Now")).toBeVisible({ timeout: 5000 })
  })

  test('TC-05-06: Tom ICY-blok stopper ikke polling', async ({ page }) => {
    await page.clock.install()
    let requestCount = 0
    await page.route('**/api/icy-meta**', (route) => {
      requestCount++
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title: null, icySupported: true }) })
    })
    await loadApp(page)
    await playFirst(page)
    await page.waitForTimeout(1000)
    expect(requestCount).toBe(1)
    // Fast-forward past the 30s polling interval
    await page.clock.fastForward(35000)
    await page.waitForTimeout(500) // allow fetch to complete
    expect(requestCount).toBeGreaterThanOrEqual(2)
  })

  test('TC-05-07: Abort ved stationsskift', async ({ page }) => {
    let callIndex = 0
    await page.route('**/api/icy-meta**', (route) => {
      const title = callIndex++ === 0 ? 'Station One Title' : 'Station Two Title'
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ title, icySupported: true }) })
    })
    await loadApp(page)
    await playFirst(page)
    const player = page.locator('.fixed.bottom-0')
    await expect(player.locator('text=Station One Title')).toBeVisible({ timeout: 5000 })

    await page.locator('.rounded-xl.border.px-4').nth(1).click()
    await page.waitForTimeout(1000)
    // First station's metadata should be gone after switch
    await expect(player.locator('text=Station One Title')).not.toBeVisible()
  })

})
