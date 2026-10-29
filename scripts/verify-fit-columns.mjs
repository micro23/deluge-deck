import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  for (const [theme] of THEMES) {
    const page = await browser.newPage();
    await page.addInitScript(theme => localStorage.setItem('deck-theme', theme), theme);
    for (const width of [1600, 900]) {
      await page.setViewportSize({width, height:1000});
      await page.goto(process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118');
      await page.locator('.auto-sized-table').waitFor();
      await page.waitForTimeout(200);
      const bounds = await page.locator('.table-shell').evaluate(shell => ({
        available:shell.clientWidth, scroll:shell.scrollWidth,
        table:shell.querySelector('table').getBoundingClientRect().width,
        hidden:[...shell.querySelectorAll('thead th[data-column]')].filter(th => !th.getBoundingClientRect().width).length,
      }));
      assert.ok(bounds.scroll <= bounds.available + 1, `${theme} ${width}: horizontal overflow ${JSON.stringify(bounds)}`);
      assert.equal(bounds.hidden,0,`${theme}: no enabled columns hidden`);
    }
    await page.close();
    console.log(`PASS ${theme}: columns fit wide and narrow panes`);
  }
} finally { await browser.close(); }
