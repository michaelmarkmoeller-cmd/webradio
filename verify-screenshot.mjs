import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('https://webradio-chi.vercel.app', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Click Rock filter
const buttons = await page.locator('button').all();
for (const btn of buttons) {
  const text = await btn.textContent();
  if (text && text.trim() === 'Rock') {
    await btn.click();
    break;
  }
}
await page.waitForTimeout(1500);
await page.screenshot({ path: 'screenshot-rock-55pct.png', fullPage: false });
await browser.close();
console.log('Done');
