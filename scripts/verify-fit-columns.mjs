import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';
import { tableStorageKey } from '../src/app/terminal-theme.js';

const preview = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
const requested = process.env.DECK_VERIFY_THEMES?.split(',');
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  for (const [theme] of THEMES) {
    if (requested && !requested.includes(theme)) continue;
    const page = await browser.newPage();
    await page.addInitScript(theme => localStorage.setItem('deck-theme', theme), theme);
    for (const width of [1600, 900]) {
      await page.setViewportSize({width, height:1000});
      await page.goto(preview);
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
    const nameLayout = await page.locator('.torrent-name').first().evaluate(name => {
      const box = name.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(name.querySelector('strong'));
      return {
        rightGap:name.parentElement.getBoundingClientRect().right-box.right,
        indents:[...range.getClientRects()].map(line=>Math.abs(line.left-box.left)),
      };
    });
    assert.ok(nameLayout.rightGap<=2 && nameLayout.indents.every(indent=>indent<=1), `${theme}: names use all remaining width and align left`);
    await page.close();
    console.log(`PASS ${theme}: columns fit wide and narrow panes`);
  }
  for (const theme of ['forest', 'terminal', 'darkhand']) {
    if (requested && !requested.includes(theme)) continue;
    const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
    await page.addInitScript(({ theme, widthsKey }) => {
      localStorage.setItem('deck-theme', theme);
      const prefix = widthsKey.replace('-column-widths', '');
      localStorage.setItem(`${prefix}-table-layout-version`, '2026-09-content-aware-columns');
      localStorage.setItem(widthsKey, JSON.stringify({ name: 9000, state: 24, progress: 24 }));
    }, { theme, widthsKey: tableStorageKey(theme, 'widths') });
    await page.goto(preview);
    const state = page.locator('td[data-column="state"] .table-state-label').first();
    await state.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await state.evaluate(label => label.scrollWidth <= label.clientWidth + 1), `${theme}: narrow saved State still fits the word Downloading`);
    const progress = page.locator('td[data-column="progress"] .progress-wrap').first();
    assert.ok(await progress.evaluate(wrap => {
      const track = wrap.querySelector('.progress-track').getBoundingClientRect();
      const label = wrap.querySelector(':scope > span');
      const bounds = label.getBoundingClientRect();
      const readable = track.width > 12 && bounds.height < 25 && label.scrollWidth <= label.clientWidth + 1;
      return readable && (bounds.top >= track.bottom || (bounds.top === track.top && bounds.bottom === track.bottom));
    }), `${theme}: progress bar and percentage fit, including Darkhand’s centered label`);

    const sizeHeading = page.locator('thead th[data-column="size"] .sort-button');
    await sizeHeading.focus();
    await page.keyboard.press('Shift+ArrowRight');
    const order = () => page.locator('thead th[data-column]').evaluateAll(headings => headings.map(heading => heading.dataset.column));
    assert.deepEqual((await order()).slice(0, 4), ['name', 'state', 'progress', 'size']);
    assert.ok(await sizeHeading.evaluate(button => button === document.activeElement));
    await page.reload();
    await sizeHeading.waitFor();
    assert.deepEqual((await order()).slice(0, 4), ['name', 'state', 'progress', 'size']);
    if (theme === 'forest') {
      await page.setViewportSize({ width: 939, height: 1000 });
      const divider = page.getByRole('separator', { name: 'Resize State column' });
      await divider.focus();
      const before = Number(await divider.getAttribute('aria-valuenow'));
      await page.keyboard.press('Shift+ArrowRight');
      await page.waitForFunction(width => {
        const divider = document.querySelector('[aria-label="Resize State column"]');
        return Number(divider?.getAttribute('aria-valuenow')) >= width + 10;
      }, before, { timeout: 3000 });
    }
    await page.locator('.column-menu-trigger').click();
    const options = page.getByRole('group', { name: 'Column visibility' }).getByRole('checkbox');
    const optionCount = await options.count();
    for (const checkbox of await options.all()) await checkbox.check();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.setViewportSize({ width: 761, height: 1000 });
    await page.waitForFunction(() => {
      const shell = document.querySelector('.table-shell');
      return shell && shell.scrollWidth <= shell.clientWidth + 1;
    });
    assert.equal((await order()).length, optionCount + 1, `${theme}: all optional columns remain visible in a 761px desktop viewport`);
    await page.close();
    console.log(`PASS ${theme}: saved width extremes and keyboard column order`);
  }
} finally { await browser.close(); }
