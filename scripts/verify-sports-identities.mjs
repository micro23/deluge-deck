import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { SPORTS_CLUBS } from '../src/app/sports-clubs.js';

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo');
const output = process.env.SCREENSHOT_DIR || '/tmp/deck-sports-identities';
await mkdir(output, { recursive:true });
const browser = await chromium.launch({ channel:'chrome', headless:true });
const finishes = new Set();
try {
  for (const theme of Object.keys(SPORTS_CLUBS)) {
    const page = await browser.newPage({ reducedMotion:'reduce' });
    await page.addInitScript(t => localStorage.setItem('deck-theme', t), theme);
    await page.goto(origin);
    await page.locator('.stat-card strong').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const [width,height] of [[1456,900],[1200,900],[820,1000],[390,844],[320,740]]) {
      await page.setViewportSize({width,height});
      await page.waitForTimeout(150);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} ${width}: viewport overflow`);
      const masthead = page.locator(theme === 'mets' ? '.mets-masthead' : '.sports-masthead');
      assert.equal(await masthead.isVisible(), width > 760);
      if (width > 760) {
        assert.ok(await masthead.evaluate(el => {
          const box = el.getBoundingClientRect();
          const nodes = [...el.querySelectorAll('span,strong,small,img')];
          return nodes.every(child => {
            const r = child.getBoundingClientRect();
            return r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom && child.scrollWidth <= child.clientWidth + 1;
          });
        }), `${theme} ${width}: masthead content clipped`);
        assert.ok(await page.locator('.sports-identity img').evaluate(el => el.complete && el.naturalWidth > 0), `${theme}: sidebar logo missing`);
      } else {
        assert.ok(await page.locator('.sports-mobile-brand').evaluate(el => {
          const r=el.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth && el.querySelector('img').naturalWidth > 0;
        }), `${theme} ${width}: mobile identity clipped`);
      }
      await page.screenshot({path:`${output}/${theme}-${width}.png`});
    }
    await page.setViewportSize({width:1456,height:900});
    if (theme !== 'mets') {
      const finish = await page.evaluate(() => {
        const card=getComputedStyle(document.querySelector('.stat-card'));
        const masthead=getComputedStyle(document.querySelector('.sports-masthead'));
        const wordmark=getComputedStyle(document.querySelector('.sports-wordmark'));
        return JSON.stringify([card.backgroundImage,card.borderRadius,masthead.backgroundImage,wordmark.fontFamily,wordmark.fontStyle]);
      });
      assert.ok(!finishes.has(finish), `${theme}: duplicate visual finish`);
      finishes.add(finish);
    }
    await page.locator('.sidebar').evaluate(el => el.classList.add('collapsed'));
    await page.waitForTimeout(150);
    assert.ok(await page.locator('.sports-identity img').evaluate(el => {
      const r=el.getBoundingClientRect(),box=el.closest('.sidebar').getBoundingClientRect();
      return r.left >= box.left && r.right <= box.right;
    }), `${theme}: collapsed logo clipped`);
    await page.close();
    console.log(`Verified ${theme}: masthead, mobile brand, collapsed logo, distinct finish`);
  }
} finally { await browser.close(); }
