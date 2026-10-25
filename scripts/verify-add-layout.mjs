import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';

const base = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${base}/api/health`).then(response => response.json())).mode, 'demo');
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
let count = 0;
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(8000);
  await page.goto(base);
  await page.locator('.app-shell').waitFor();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [theme] of THEMES) {
      console.log(`Checking ${theme} ${width}`);
      await page.evaluate(value => localStorage.setItem('deck-theme', value), theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.app-shell').waitFor();
      await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme);
      await page.keyboard.press('a');
      await page.getByRole('button', { name: 'Magnet link', exact: true }).click();
      await page.getByLabel('Magnet URI', { exact: true }).fill(`magnet:?xt=urn:btih:0123456789012345678901234567890123456789&dn=${encodeURIComponent('100% complete — ' + 'LongName'.repeat(20))}`);
      const preview = page.locator('.magnet-preview');
      const bounds = await preview.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const panel = element.closest('.link-panel').getBoundingClientRect();
        return { width: rect.width, left: rect.left, right: rect.right, panelLeft: panel.left, panelRight: panel.right };
      });
      assert.ok(bounds.width > 100, `${theme} ${width}: collapsed preview`);
      assert.ok(bounds.left >= bounds.panelLeft && bounds.right <= bounds.panelRight + 1, `${theme} ${width}: preview outside panel`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${theme} ${width}: page overflow`);
      const add = page.locator('.add-modal .modal-foot .primary-button');
      await add.scrollIntoViewIfNeeded();
      assert.equal(await add.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return element === target || element.contains(target);
      }), true, `${theme} ${width}: Add button covered`);
      if (theme === 'forest') await page.screenshot({ path: `/tmp/deck-97-add-${width}.png` });
      count++;
    }
    console.log(`Add dialog fits ${THEMES.length} themes at ${width}px.`);
  }
  console.log(`Verified ${count} magnet preview layouts and reachable Add buttons.`);
} finally {
  await browser.close();
}
