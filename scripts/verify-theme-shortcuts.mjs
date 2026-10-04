import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { THEMES, THEME_ORDER } from '../src/app/themes.js';

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal(new Set(THEME_ORDER).size, THEMES.length);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1456, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('deck-theme', 'darkhand'));
  await page.goto(origin);
  await page.locator('tbody tr[role="button"]').first().waitFor();
  const theme = () => page.locator('html').getAttribute('data-theme');
  const press = async (key, expected) => {
    await page.keyboard.press(key);
    await page.waitForFunction(id => document.documentElement.dataset.theme === id, expected);
    assert.equal(await page.evaluate(() => localStorage.getItem('deck-theme')), expected);
  };
  await page.getByRole('button', { name: /Choose color theme/ }).click();
  const labels = await page.getByRole('menuitemradio').evaluateAll(items => items.map(item => item.getAttribute('aria-label')));
  assert.deepEqual(labels, THEME_ORDER.map(id => {
    const [, label, description] = THEMES.find(([key]) => key === id);
    return `${label}: ${description}`;
  }));
  // Keep focus in the picker: each key must visit exactly the next/previous item.
  for (const id of [...THEME_ORDER.slice(1), THEME_ORDER[0]]) await press('t', id);
  for (const id of [...THEME_ORDER.slice(1).reverse(), THEME_ORDER[0]]) await press('Shift+T', id);
  await page.keyboard.press('Escape');
  await page.locator('tbody tr[role="button"]').first().focus();
  await press('t', 'terminal');
  await press('d', 'darkhand');
  await page.locator('tbody tr[role="button"]').first().dblclick();
  await page.locator('.dh-inline-details,.dh-details-scroll .drawer').first().waitFor();
  await page.locator('.dh-details-card button').first().focus();
  await press('Shift+T', THEME_ORDER.at(-1));
  await press('d', 'darkhand');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await page.locator('.preferences-modal').waitFor();
  await page.locator('.preferences-modal button').first().focus();
  await press('t', 'terminal');
  await press('Shift+T', 'darkhand');
  await page.locator('.preferences-modal select').first().focus();
  await press('t', 'terminal');
  await press('Shift+T', 'darkhand');
  await page.keyboard.press('Escape');
  const search = page.locator('.search-wrap input');
  await search.focus();
  await page.keyboard.press('t');
  await page.keyboard.press('Shift+T');
  assert.equal(await search.inputValue(), 'tT');
  assert.equal(await theme(), 'darkhand');
  await search.fill('');
  // Editable descendants and textarea fields also keep their typing.
  for (const html of ['<textarea></textarea>', '<div contenteditable="true"><span>edit</span></div>']) {
    await page.evaluate(markup => {
      const host = document.createElement('div');
      host.id = 'shortcut-edit-test'; host.innerHTML = markup;
      document.body.append(host); host.firstElementChild.focus();
    }, html);
    await page.keyboard.press('t');
    await page.keyboard.press('Shift+T');
    assert.equal(await theme(), 'darkhand');
    await page.locator('#shortcut-edit-test').evaluate(el => el.remove());
  }
  await page.getByRole('button', { name: /Choose color theme/ }).focus();
  for (const key of ['Control+t', 'Alt+t']) {
    await page.keyboard.press(key);
    assert.equal(await theme(), 'darkhand');
  }
  assert.deepEqual(errors, []);
  console.log(`Verified all ${THEME_ORDER.length} themes forward/backward in picker order, wraparound, focused controls, torrent details, preferences, and editable fields.`);
} finally { await browser.close(); }
