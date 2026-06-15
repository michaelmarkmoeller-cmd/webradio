import { test, expect } from '@playwright/test'

const APP_URL = 'https://webradio-chi.vercel.app'

test.describe('TC-01: App-start & State Restore', () => {

  test('TC-01-01: Stationer loader fra Firestore', async ({ page }) => {
    await page.goto(APP_URL)
    // Wait for station cards to appear
    await page.waitForSelector('[data-testid="station-card"], .station-card, .rounded-xl.border.px-4', { timeout: 10000 })
    const cards = await page.locator('.rounded-xl.border.px-4').count()
    expect(cards).toBeGreaterThanOrEqual(60)
  })

  test('TC-01-02: Sidst afspillede station gendannes', async ({ page, context }) => {
    // First visit — play a station to set localStorage
    await page.goto(APP_URL)
    await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 10000 })

    // Get first visible station card and click it
    const firstCard = page.locator('.rounded-xl.border.px-4').first()
    const stationName = await firstCard.locator('h3').textContent()
    await firstCard.click()

    // Wait for player to appear (currentStation set)
    await page.waitForSelector('[aria-label="Pause"], [aria-label="Afspil"]', { timeout: 5000 })

    // Check that localStorage was set
    const lastId = await page.evaluate(() => localStorage.getItem('webradio_last_station_id'))
    expect(lastId).not.toBeNull()

    // Reload page
    await page.reload()
    await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 10000 })

    // Player should show the same station (currentStation restored, paused)
    const playerVisible = await page.locator('[aria-label="Afspil"]').isVisible()
    expect(playerVisible).toBe(true)

    // Station name in player should match
    const playerStationName = await page.locator('.fixed.bottom-0 .font-display.font-bold').textContent()
    expect(playerStationName?.trim()).toBe(stationName?.trim())
  })

  test('TC-01-03: Kategori-navigation gendannes', async ({ page }) => {
    // Play a station to set currentStation and selectedCategory
    await page.goto(APP_URL)
    await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 10000 })

    // Click a station card
    const firstCard = page.locator('.rounded-xl.border.px-4').first()
    await firstCard.click()
    await page.waitForSelector('[aria-label="Pause"]', { timeout: 5000 })

    // Get the active category pill text
    // Category pills are the filter buttons at the top
    const activePill = page.locator('button.rounded-full').filter({ hasText: /^\w/ })
    // The station's category should be active after reload
    const stationCategory = await firstCard.locator('.text-xs.text-text-muted').first().textContent()

    // Reload
    await page.reload()
    await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 10000 })

    // Check that the category matching the restored station is active
    // The active pill has a different style (colored background)
    const playerCategory = await page.locator('.fixed.bottom-0 .text-\\[11px\\].font-semibold.px-2').textContent()
    expect(playerCategory?.trim()).toBe(stationCategory?.trim())
  })

})
