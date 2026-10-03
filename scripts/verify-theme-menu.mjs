import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { THEMES, THEME_CATEGORIES } from '../src/app/themes.js';
import { SPORTS_CLUBS, SPORTS_GROUPS } from '../src/app/sports-clubs.js';
const ordered = THEME_CATEGORIES.flatMap(category => category.themes);
const last = THEMES.find(([id]) => id === ordered.at(-1));
const requested = process.env.DECK_VERIFY_THEMES?.split(',');
if (requested) assert.ok(requested.every(id => THEMES.some(([theme]) => theme === id)), 'Unknown verification theme');

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo');
const browser = await chromium.launch({ channel:'chrome', headless:true });
try {
  for (const width of [1456, 820, 390, 320]) {
    const page = await browser.newPage({ viewport:{width,height:900}, reducedMotion:'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(origin, {waitUntil:'networkidle'});
    const trigger = page.getByRole('button', {name:/Choose color theme/});
    const open = async () => {
      await trigger.click();
      await page.getByRole('menu', {name:'Color themes'}).waitFor();
    };
    await open();
    assert.equal(await page.getByRole('menuitemradio').count(), THEMES.length);
    for (const category of THEME_CATEGORIES) {
      assert.equal(await page.getByRole('group', {name:category.label}).getByRole('menuitemradio').count(), category.themes.length);
    }
    for (const group of SPORTS_GROUPS) assert.equal(await page.getByRole('group', {name:group.label, exact:true}).getByRole('menuitemradio').count(), group.themes.length);
    await page.keyboard.press('End');
    assert.equal(await page.locator(':focus').getAttribute('aria-label'), `${last[1]}: ${last[2]}`);
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator(':focus').getAttribute('aria-label'), /^Midnight:/);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator(':focus').getAttribute('aria-label'), `${last[1]}: ${last[2]}`);
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    for (const id of requested || Object.keys(SPORTS_CLUBS)) {
      if (requested && !requested.includes(id)) continue;
      await open();
      const [ , label ] = THEMES.find(([key]) => key === id);
      const item = page.getByRole('menuitemradio', {name:new RegExp(`^${label}:`)});
      await item.scrollIntoViewIfNeeded();
      const popover = await page.getByRole('menu', {name:'Color themes'}).boundingBox();
      assert.ok(popover.x >= 0 && popover.x + popover.width <= width + 1);
      assert.ok(popover.y >= 0 && popover.y + popover.height <= 901);
      assert.match(await item.locator('.theme-preview').evaluate(el => getComputedStyle(el).backgroundImage), /url\(/);
      await item.click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), id);
      assert.equal(await page.evaluate(() => localStorage.getItem('deck-theme')), id);
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.locator('html').getAttribute('data-theme'), id);
      if (SPORTS_CLUBS[id] && width > 760) {
        assert.equal(await page.locator('.sports-identity img').evaluate(el => el.complete && el.naturalWidth > 0), true);
      } else if (SPORTS_CLUBS[id]) {
        assert.equal(await page.locator('.sports-mobile-brand img').evaluate(el => el.complete && el.naturalWidth > 0), true);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await open();
      assert.equal(await page.locator('[aria-checked="true"]').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Verified grouped picker, keyboard navigation, sports selection, assets, and persistence at ${width}px`);
  }
} finally { await browser.close(); }
