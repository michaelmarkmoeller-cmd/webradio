import { test, expect } from '@playwright/test'

// Omlagt 14-07-2026 (BUG-01, se BUGS.md): whole-card dnd-kit-drag direkte i gridet
// blev erstattet af en dedikeret "rediger rækkefølge"-liste (ReorderListModal). Grid-kortet
// har intet dnd-kit længere — kun klik (afspil), stille 2-sek. hold (slet), og hold+bevæg
// >8px (åbner reorder-listen). Selve trækket sker i modalen via et håndtag-ikon med
// dnd-kit's PointerSensor (activationConstraint: { distance: 4 }) — bevægelses-baseret,
// ikke forsinkelses-baseret som den gamle 250ms-mekanisme, hvilket gør det pålideligt at
// simulere headless (ingen timing-race at ramme).

const URL = 'https://webradio-chi.vercel.app'

async function loadApp(page: import('@playwright/test').Page) {
  await page.goto(URL)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
}

async function goToCategory(page: import('@playwright/test').Page, cat = "80's") {
  await page.locator('button.px-4.py-1\\.5.rounded-full').filter({ hasText: cat }).first().click()
  await page.waitForTimeout(600)
  await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 5000 })
}

// Holds pointer down on a card and moves it past REORDER_MOVE_THRESHOLD_PX (8px) —
// opens the ReorderListModal in a sortable (category) view.
async function holdAndMove(page: import('@playwright/test').Page, cardIndex = 0) {
  const card = page.locator('.rounded-xl.border.px-4').nth(cardIndex)
  await card.scrollIntoViewIfNeeded()
  const box = await card.boundingBox()
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx, cy + 20, { steps: 5 })
  await page.waitForTimeout(150)
  // Mouse events (unlike touch) have no implicit pointer capture — if the modal opened
  // mid-gesture, releasing at the original card position may now hit the modal's
  // backdrop (onClick={onClose}) and immediately close it. Move over the modal's own
  // content first (stopPropagation'd), so the release can't be misread as a backdrop click.
  const hint = page.getByText('Træk i håndtaget for at ændre rækkefølgen')
  if (await hint.isVisible().catch(() => false)) {
    const hintBox = await hint.boundingBox()
    if (hintBox) await page.mouse.move(hintBox.x + hintBox.width / 2, hintBox.y + hintBox.height / 2, { steps: 3 })
  }
  await page.mouse.up()
}

// Holds pointer down on a card completely still for longer than LONG_PRESS_MS (2000ms) —
// triggers the delete confirmation dialog.
async function holdStill(page: import('@playwright/test').Page, cardIndex = 0, ms = 2200) {
  const card = page.locator('.rounded-xl.border.px-4').nth(cardIndex)
  await card.scrollIntoViewIfNeeded()
  const box = await card.boundingBox()
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.waitForTimeout(ms)
  await page.mouse.up()
}

// Drags the handle icon of ReorderListModal row `fromIndex` onto row `toIndex`.
// Assumes the modal is already open.
async function dragReorderRow(page: import('@playwright/test').Page, fromIndex: number, toIndex: number) {
  const rows = page.locator('[data-testid="reorder-row"]')
  const handle = rows.nth(fromIndex).locator('button[aria-label="Træk for at ændre rækkefølge"]')
  const handleBox = await handle.boundingBox()
  const targetBox = await rows.nth(toIndex).boundingBox()
  if (!handleBox || !targetBox) return false
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 10, { steps: 5 })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  return true
}

// ─────────────────────────────────────────────
// TC-09: Rediger rækkefølge
// ─────────────────────────────────────────────
test.describe('TC-09: Rediger rækkefølge', () => {

  test('TC-09-01: Kategori-visning har cursor-grab (hold+bevæg-hint)', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page)
    const cards = page.locator('.rounded-xl.border.px-4')
    if (await cards.count() < 2) test.skip()

    const classes = await cards.first().getAttribute('class')
    expect(classes).toContain('cursor-grab')
  })

  test('TC-09-02: "Alle"-visning: cursor-pointer, hold+bevæg åbner ikke reorder-listen', async ({ page }) => {
    await loadApp(page)
    const cards = page.locator('.rounded-xl.border.px-4')
    if (await cards.count() < 2) test.skip()

    const classes = await cards.first().getAttribute('class')
    expect(classes).toContain('cursor-pointer')
    expect(classes).not.toContain('cursor-grab')

    await holdAndMove(page, 0)
    await expect(page.locator('[data-testid="reorder-row"]')).toHaveCount(0)
  })

  test('TC-09-03: "Favoritter"-visning: hold+bevæg åbner ikke reorder-listen', async ({ page }) => {
    await loadApp(page)
    const card0 = page.locator('.rounded-xl.border.px-4').nth(0)
    const card1 = page.locator('.rounded-xl.border.px-4').nth(1)
    const heart0 = card0.locator('button[aria-label="Tilføj til favoritter"]')
    const heart1 = card1.locator('button[aria-label="Tilføj til favoritter"]')
    if (await heart0.count() > 0) await heart0.click()
    if (await heart1.count() > 0) await heart1.click()

    await page.locator('button.rounded-full').filter({ has: page.locator('svg') }).first().click()
    await page.waitForTimeout(500)
    const favCards = page.locator('.rounded-xl.border.px-4')
    if (await favCards.count() < 2) test.skip()

    const classes = await favCards.first().getAttribute('class')
    expect(classes).toContain('cursor-pointer')
    expect(classes).not.toContain('cursor-grab')

    await holdAndMove(page, 0)
    await expect(page.locator('[data-testid="reorder-row"]')).toHaveCount(0)

    // Cleanup
    await page.locator('button.rounded-full').filter({ hasText: 'Alle' }).click()
    await page.waitForTimeout(300)
    await card0.locator('button[aria-label="Fjern fra favoritter"]').click().catch(() => {})
    await card1.locator('button[aria-label="Fjern fra favoritter"]').click().catch(() => {})
  })

  test('TC-09-04: Stille hold (2 sek) viser slet-dialog, ikke reorder-listen', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page)
    if (await page.locator('.rounded-xl.border.px-4').count() < 1) test.skip()

    await holdStill(page, 0)
    await expect(page.getByText('Slet station')).toBeVisible()
    await expect(page.locator('[data-testid="reorder-row"]')).toHaveCount(0)

    // Cancel — do not actually delete
    await page.getByRole('button', { name: 'Annuller' }).click()
  })

  test('TC-09-05: Hold + bevæg åbner reorder-listen, ikke slet-dialogen', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page)
    if (await page.locator('.rounded-xl.border.px-4').count() < 2) test.skip()

    await holdAndMove(page, 0)
    await expect(page.locator('[data-testid="reorder-row"]').first()).toBeVisible()
    await expect(page.getByText('Slet station')).toHaveCount(0)

    await page.getByRole('button', { name: 'Færdig' }).click()
  })

  test('TC-09-06: Klik afspiller stadig station (ingen gestus-konflikt)', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page)
    if (await page.locator('.rounded-xl.border.px-4').count() < 1) test.skip()

    const card = page.locator('.rounded-xl.border.px-4').first()
    await card.click()
    await page.waitForTimeout(300)
    const classes = await card.getAttribute('class')
    expect(classes).toContain('border-accent/60') // isActive-styling sættes synkront ved playStation()
  })

  test('TC-09-07: Træk i håndtag ændrer rækkefølgen i reorder-listen', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page)
    if (await page.locator('.rounded-xl.border.px-4').count() < 3) test.skip()

    await holdAndMove(page, 0)
    const rows = page.locator('[data-testid="reorder-row"]')
    await expect(rows.first()).toBeVisible()

    const nameBefore = (await rows.nth(0).locator('span').first().textContent())?.trim()
    const dragged = await dragReorderRow(page, 0, 2)
    if (!dragged) test.skip()

    const nameAfter = (await rows.nth(0).locator('span').first().textContent())?.trim()
    expect(nameAfter).not.toBe(nameBefore)

    await page.getByRole('button', { name: 'Færdig' }).click()
  })

  test('TC-09-08: Ny rækkefølge persisteret efter reload (Firestore round-trip)', async ({ page }) => {
    await loadApp(page)
    await goToCategory(page)
    if (await page.locator('.rounded-xl.border.px-4').count() < 3) test.skip()

    await holdAndMove(page, 0)
    const rows = page.locator('[data-testid="reorder-row"]')
    await expect(rows.first()).toBeVisible()

    const dragged = await dragReorderRow(page, 0, 2)
    if (!dragged) test.skip()

    const nameAfterDrag = (await rows.nth(0).locator('span').first().textContent())?.trim()
    await page.getByRole('button', { name: 'Færdig' }).click()
    await page.waitForTimeout(500)

    await page.reload()
    await page.waitForSelector('.rounded-xl.border.px-4', { timeout: 15000 })
    await goToCategory(page)
    await page.waitForTimeout(1000)

    const nameAfterReload = (await page.locator('.rounded-xl.border.px-4').first().locator('h3').textContent())?.trim()
    expect(nameAfterReload).toBe(nameAfterDrag)
  })

})
