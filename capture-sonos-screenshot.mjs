// Midlertidigt script til at tage screenshot af Sonos-dropdown'en til brugervejledningen.
// Kører mod produktion (samme baseURL som playwright.config.ts).
import { chromium } from '@playwright/test'

const BASE_URL = 'https://webradio-chi.vercel.app'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
await page.goto(BASE_URL, { waitUntil: 'load' })

// Klik det første stationskort (cursor-pointer div i StationCard.tsx) for at aktivere player-baren
const firstCard = page.locator('div.cursor-pointer').first()
await firstCard.waitFor({ state: 'visible', timeout: 20000 })
await firstCard.click()

const sonosButton = page.getByLabel('Afspil på Sonos', { exact: true })
await sonosButton.waitFor({ state: 'visible', timeout: 15000 })

// Screenshot 1: player-baren i lukket tilstand, viser Sonos-ikonet i konteksten
const playerBar = page.locator('div.fixed.bottom-0')
await playerBar.screenshot({ path: 'public/guide/11-sonos-icon.png' })

await sonosButton.click()

await page.getByText('Bad', { exact: true }).waitFor({ state: 'visible', timeout: 5000 })
await page.waitForTimeout(300)

// Dropdown'en åbner opad og går ud over player-barens egen boks (absolute bottom-full) —
// derfor tages et klip af hele den nederste del af viewporten i stedet for kun player-bar-elementet.
await page.screenshot({
  path: 'public/guide/11-sonos-menu.png',
  clip: { x: 0, y: 300, width: 900, height: 400 },
})

await browser.close()
console.log('Screenshot gemt: public/guide/11-sonos-menu.png')
