import { test, expect, Page } from '@playwright/test'
import { createTestStation, deleteTestStation, cleanupTestStationByName, waitForStationByName } from './db-helper'

const URL = 'https://webradio-chi.vercel.app'
const TEST_STREAM = 'https://stream.laut.fm/radio70'

async function loadApp(page: Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

/**
 * Creates a test station via Firestore REST API (Node.js side) and waits for
 * it to appear in the browser via onSnapshot. Returns { name, id }.
 */
async function createAndWaitForStation(page: Page): Promise<{ name: string; id: string }> {
  const uniqueName = `TEST_QA_${Date.now()}`
  // Create via REST API — no browser-side Firestore write, no serverTimestamp() hang
  const id = await createTestStation(uniqueName, TEST_STREAM, "80's")
  // Wait for onSnapshot to deliver the new station to the browser
  await page.locator('button.rounded-full').filter({ hasText: 'Alle' }).click()
  await page.waitForTimeout(500)
  // Reload to pick up any IndexedDB + snapshot diff
  await page.reload()
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
  await page.locator('button.rounded-full').filter({ hasText: 'Alle' }).click()
  await page.waitForTimeout(1000)
  await expect(
    page.locator('.rounded-xl.border.px-4').filter({ has: page.locator(`h3:text-is("${uniqueName}")`) })
  ).toBeVisible({ timeout: 10000 })
  return { name: uniqueName, id }
}

/** Long-press a station card and confirm delete. Falls back to REST delete on failure. */
async function longPressDelete(page: Page, stationName: string, stationId?: string) {
  try {
    const card = page.locator('.rounded-xl.border.px-4')
      .filter({ has: page.locator(`h3:text-is("${stationName}")`) }).first()
    if (await card.count() === 0) return
    const box = await card.boundingBox()
    if (!box) return
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(2200)
    await page.mouse.up()
    const sletBtn = page.locator('button:has-text("Slet")').last()
    if (await sletBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sletBtn.click()
      await page.waitForTimeout(1000)
    }
  } catch {
    // Fallback: delete via REST API if UI delete failed
    if (stationId) await deleteTestStation(stationId).catch(() => {})
  }
}

// ─────────────────────────────────────────────
// TC-10: Slet station
// ─────────────────────────────────────────────
test.describe('TC-10: Slet station', () => {

  test('TC-10-01: Long-press 2 sek viser slet-dialog', async ({ page }) => {
    await loadApp(page)
    const { name: stationName, id } = await createAndWaitForStation(page)

    try {
      const card = page.locator('.rounded-xl.border.px-4')
        .filter({ has: page.locator(`h3:text-is("${stationName}")`) }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      const box = await card.boundingBox()
      if (!box) test.fail()

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(2200)
      await page.mouse.up()

      await expect(page.locator('text=Slet station')).toBeVisible({ timeout: 2000 })
    } finally {
      await page.locator('button:has-text("Annuller")').click().catch(() => {})
      await longPressDelete(page, stationName, id)
      await deleteTestStation(id).catch(() => {})
    }
  })

  test('TC-10-02: Bekræft sletning fjerner station', async ({ page }) => {
    await loadApp(page)
    const { name: stationName, id } = await createAndWaitForStation(page)

    try {
      const card = page.locator('.rounded-xl.border.px-4')
        .filter({ has: page.locator(`h3:text-is("${stationName}")`) }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      const box = await card.boundingBox()
      if (!box) test.fail()

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(2200)
      await page.mouse.up()

      await expect(page.locator('text=Slet station')).toBeVisible({ timeout: 2000 })
      await page.locator('button:has-text("Slet")').last().click()
      await page.waitForTimeout(2000)

      await expect(
        page.locator('.rounded-xl.border.px-4').filter({ has: page.locator(`h3:text-is("${stationName}")`) })
      ).not.toBeVisible()
    } finally {
      await deleteTestStation(id).catch(() => {})
    }
  })

  test('TC-10-03: Annuller beholder station', async ({ page }) => {
    await loadApp(page)
    const { name: stationName, id } = await createAndWaitForStation(page)

    try {
      const card = page.locator('.rounded-xl.border.px-4')
        .filter({ has: page.locator(`h3:text-is("${stationName}")`) }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      const box = await card.boundingBox()
      if (!box) test.fail()

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(2200)
      await page.mouse.up()

      await expect(page.locator('text=Slet station')).toBeVisible({ timeout: 2000 })
      await page.locator('button:has-text("Annuller")').click()

      await expect(page.locator('text=Slet station')).not.toBeVisible()
      await expect(card).toBeVisible()
    } finally {
      await longPressDelete(page, stationName, id)
      await deleteTestStation(id).catch(() => {})
    }
  })

  test('TC-10-04: Kort klik åbner ikke slet-dialog', async ({ page }) => {
    await loadApp(page)
    const { name: stationName, id } = await createAndWaitForStation(page)

    try {
      const card = page.locator('.rounded-xl.border.px-4')
        .filter({ has: page.locator(`h3:text-is("${stationName}")`) }).first()
      await expect(card).toBeVisible({ timeout: 5000 })

      await card.click()
      await page.waitForTimeout(500)
      await expect(page.locator('text=Slet station')).not.toBeVisible()
    } finally {
      await longPressDelete(page, stationName, id)
      await deleteTestStation(id).catch(() => {})
    }
  })

  test('TC-10-05: Mus udenfor kort annullerer long-press', async ({ page }) => {
    await loadApp(page)
    const { name: stationName, id } = await createAndWaitForStation(page)

    try {
      const card = page.locator('.rounded-xl.border.px-4')
        .filter({ has: page.locator(`h3:text-is("${stationName}")`) }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      const box = await card.boundingBox()
      if (!box) test.fail()

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(1000)
      // Move outside the card → cancelPress()
      await page.mouse.move(box.x + box.width / 2, box.y - 20)
      await page.mouse.up()
      await page.waitForTimeout(1500)

      await expect(page.locator('text=Slet station')).not.toBeVisible()
    } finally {
      await longPressDelete(page, stationName, id)
      await deleteTestStation(id).catch(() => {})
    }
  })

})

// ─────────────────────────────────────────────
// TC-11: Tilføj station
// ─────────────────────────────────────────────
test.describe('TC-11: Tilføj station', () => {

  test('TC-11-01: Modal åbner ved klik på "+ Tilføj station"', async ({ page }) => {
    await loadApp(page)
    await page.locator('header').locator('button:has-text("Tilføj station")').click()
    await expect(page.locator('text=Tilføj station').first()).toBeVisible()
    await expect(page.locator('input[placeholder="f.eks. Radio Nova"]')).toBeVisible()
    await expect(page.locator('input[type="url"]')).toBeVisible()
    await page.locator('button:has-text("Annuller")').click()
  })

  test('TC-11-02: Gem-knap deaktiveret ved tom formular', async ({ page }) => {
    await loadApp(page)
    await page.locator('header').locator('button:has-text("Tilføj station")').click()
    await expect(page.locator('input[placeholder="f.eks. Radio Nova"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    await page.locator('button:has-text("Annuller")').click()
  })

  test('TC-11-03: Station gemmes og vises i gitteret', async ({ page }) => {
    // Part A: verify the UI submission flow (form → handleSubmit called)
    // Part B: verify the grid renders correctly when a new station is added
    // Note: browser-side addDoc with persistentLocalCache conflicts with the active
    // onSnapshot stream in headless Chrome (IndexedDB transaction conflict). The
    // write is therefore tested via the REST API from Node.js side.
    await loadApp(page)
    const uniqueName = `TEST_QA_${Date.now()}`

    try {
      // Part A — UI: form fills correctly, submit button enables, handleSubmit is triggered
      await page.locator('header').locator('button:has-text("Tilføj station")').click()
      await expect(page.locator('input[placeholder="f.eks. Radio Nova"]')).toBeVisible()
      await page.locator('input[placeholder="f.eks. Radio Nova"]').fill(uniqueName)
      await page.locator('input[placeholder="https://stream.example.com/live"]').fill(TEST_STREAM)
      const submitBtn = page.locator('button[type="submit"]')
      await expect(submitBtn).toBeEnabled({ timeout: 5000 })
      await submitBtn.click()
      // BUG-02 (rettet 14-07-2026): tomme valgfrie felter (bitrate/land) sendte tidligere
      // `undefined` til Firestore, som addDoc afviste — modalen fejlede stille med en
      // generisk toast i stedet for at gemme. sanitizeStationData() strippede nu problemet,
      // så submit skal lykkes og lukke modalen.
      await page.waitForTimeout(800)
      const hasErrorToast = await page.locator('text=Kunne ikke tilføje stationen').isVisible()
      const modalClosed = !(await page.locator('input[placeholder="f.eks. Radio Nova"]').isVisible())
      expect(hasErrorToast, 'BUG-02 regression — station med tomme valgfrie felter fejlede').toBe(false)
      expect(modalClosed, 'modal lukkede ikke efter succesfuld submit').toBe(true)

      // Part B — Grid: station created via REST API appears via onSnapshot
      const id = await createTestStation(uniqueName + '_grid', TEST_STREAM, "80's")
      await page.locator('button.rounded-full').filter({ hasText: 'Alle' }).click()
      await page.waitForTimeout(1000)
      await expect(
        page.locator('.rounded-xl.border.px-4').filter({ has: page.locator(`h3:text-is("${uniqueName}_grid")`) })
      ).toBeVisible({ timeout: 10000 })
      await deleteTestStation(id)
    } finally {
      await cleanupTestStationByName(uniqueName)
      await cleanupTestStationByName(uniqueName + '_grid')
    }
  })

  test('TC-11-04: Modal lukkes ved klik på X', async ({ page }) => {
    await loadApp(page)
    await page.locator('header').locator('button:has-text("Tilføj station")').click()
    await expect(page.locator('input[placeholder="f.eks. Radio Nova"]')).toBeVisible()
    const closeBtn = page.locator('.fixed.inset-0.z-50 button').filter({
      has: page.locator('svg path[d*="M6 18L18 6"]'),
    }).first()
    await closeBtn.click()
    await expect(page.locator('input[placeholder="f.eks. Radio Nova"]')).not.toBeVisible()
  })

  test('TC-11-05: Ugyldig URL viser toast-fejl', async ({ page }) => {
    await loadApp(page)
    await page.locator('header').locator('button:has-text("Tilføj station")').click()
    await page.locator('input[placeholder="f.eks. Radio Nova"]').fill('Test Station')
    await page.locator('input[placeholder="https://stream.example.com/live"]').fill('ftp://stream.example.com/live')
    const submitBtn = page.locator('button[type="submit"]')
    if (await submitBtn.isEnabled()) {
      await submitBtn.click()
      await expect(page.locator('text=Stream URL skal starte med')).toBeVisible({ timeout: 3000 })
    } else {
      await expect(submitBtn).toBeDisabled()
    }
    await page.locator('button:has-text("Annuller")').click().catch(() => {})
  })

})

