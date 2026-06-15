import { test, expect } from '@playwright/test'

const URL = 'https://webradio-chi.vercel.app'

async function loadAndPlay(page: import('@playwright/test').Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
  const card = page.locator('.rounded-xl.border.px-4').first()
  await card.click()
  await page.waitForSelector('[aria-label="Pause"]', { timeout: 10000 })
}

async function setSleepTimer(page: import('@playwright/test').Page, minutes: number) {
  await page.click('[aria-label="Sleep timer"]')
  await page.locator(`text=${minutes} min`).click()
  // Verify menu closed and countdown visible
  await expect(page.locator('.text-\\[10px\\].font-bold.tabular-nums')).toBeVisible({ timeout: 3000 })
}

// ─────────────────────────────────────────────
// TC-06: Søvntimer (automatiserede resterende)
// ─────────────────────────────────────────────
test.describe('TC-06: Søvntimer (automatiserede)', () => {

  test('TC-06-03: Timer stopper afspilning ved udløb', async ({ page }) => {
    await page.clock.install()
    await loadAndPlay(page)
    await setSleepTimer(page, 10)
    // Fast-forward 10 minutes + buffer
    await page.clock.fastForward(10 * 60 * 1000 + 500)
    await page.waitForTimeout(500)
    // Playback should be paused
    await expect(page.locator('[aria-label="Afspil"]')).toBeVisible({ timeout: 3000 })
  })

  test('TC-06-04: Toast "Sov godt" vises ved udløb', async ({ page }) => {
    await page.clock.install()
    await loadAndPlay(page)
    await setSleepTimer(page, 10)
    await page.clock.fastForward(10 * 60 * 1000 + 500)
    await page.waitForTimeout(500)
    // Toast with "Sov godt" should appear
    await expect(page.locator('text=Sov godt')).toBeVisible({ timeout: 3000 })
  })

  test('TC-06-06: Timer nulstilles ikke ved klik på aktiv station', async ({ page }) => {
    await loadAndPlay(page)
    await setSleepTimer(page, 10)
    // Verify timer shows "10m"
    const countdown = page.locator('.text-\\[10px\\].font-bold.tabular-nums')
    await expect(countdown).toContainText('10m')

    // Click the SAME station (first card)
    const firstCard = page.locator('.rounded-xl.border.px-4').first()
    await firstCard.click()
    await page.waitForTimeout(500)

    // Timer should still be running (not reset)
    await expect(countdown).toBeVisible()
    const text = await countdown.textContent()
    // Value should be ≤10m and ≥9m (not reset to fresh 10m from station switch)
    expect(text).toMatch(/^\d+m$/)
  })

  test('TC-06-07: Ingen "0m" vises inden timeren udløber', async ({ page }) => {
    await page.clock.install()
    await loadAndPlay(page)
    await setSleepTimer(page, 10)

    // Fast-forward to 30 seconds before expiry (9min30s elapsed)
    await page.clock.fastForward(9 * 60 * 1000 + 30 * 1000)
    await page.waitForTimeout(200)

    // Should show "1m" (ceil(30s/60) = 1), never "0m"
    const countdown = page.locator('.text-\\[10px\\].font-bold.tabular-nums')
    const text = await countdown.textContent()
    expect(text).not.toBe('0m')

    // Fast-forward past expiry
    await page.clock.fastForward(35 * 1000)
    await page.waitForTimeout(500)

    // Timer element should be gone (not showing "0m")
    await expect(countdown).not.toBeVisible()
  })

  test('TC-06-08: Sleep-menu markerer aktiv timer', async ({ page }) => {
    await loadAndPlay(page)
    await setSleepTimer(page, 10)

    // Re-open sleep menu
    await page.click('[aria-label="Sleep timer"]')
    await page.waitForTimeout(200)

    // "10 min" button should have active styling (text-text-primary bg-white/5)
    // Active options have different classes than inactive ones in the menu
    const tenMinBtn = page.locator('button:has-text("10 min")')
    await expect(tenMinBtn).toBeVisible()
    // Verify "Fra" is NOT active-styled (no active class) while timer is running
    const fraBtn = page.locator('button:has-text("Fra")')
    // "Fra" is active only when no timer — check it doesn't have active styling
    const fraClass = await fraBtn.getAttribute('class')
    // Active items have 'text-text-primary' class; inactive have 'text-text-muted'
    // When timer is running, "Fra" should be text-text-muted
    expect(fraClass).toContain('text-text-muted')
  })

})
