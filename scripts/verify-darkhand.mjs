import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { THEMES, THEME_CATEGORIES } from '../src/app/themes.js';
const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8120';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo');
assert.equal(THEMES[0][0], 'darkhand');
assert.equal(THEME_CATEGORIES[0].themes[0], 'darkhand');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
 for (const width of [1920, 1456, 1200, 820, 390, 320]) {
  const page = await browser.newPage({ viewport: { width, height: 1080 }, reducedMotion: 'reduce' });
  const errors = [];
  const external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {
    const url = r.url();
    if (/^https?:/.test(url) && !url.startsWith(origin) && !url.includes('favicon.ico') && !url.includes('icons.duckduckgo.com')) {
      external.push(url);
    }
  });
  await page.addInitScript(() => localStorage.setItem('deck-theme', 'darkhand'));
  if (width === 1920) await page.route('**/api/rpc', async route => {
    const payload = route.request().postDataJSON();
    if (payload.method === 'delugedeck.get_speed_history') {
      const now = Date.now();
      await route.fulfill({ json: { result: { now, interval: 2000, samples: [[now - 10000, 1024, 512], [now - 8000, 2048, 512], [now, 2048, 1024]] } } });
    } else if (payload.method === 'web.get_torrent_status' && ['peers', 'trackers'].includes(payload.params?.[1]?.[0])) {
      await route.fulfill({ json: { result: { peers: [{ ip: '203.0.113.10:51413', client: 'Fixture peer', country: 'US', progress: .5, down_speed: 1024, up_speed: 2048 }], trackers: [{ url: 'https://tracker.example.test/announce?passkey=private-fixture', tier: 0 }] } } });
    } else await route.continue();
  });
  await page.goto(origin);
  await page.locator('.dh-stat strong').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.dh-stat').count(), 6);
  if (width === 1920) {
    await page.getByText('Daemon history · recorded while your browser is closed').waitFor();
    assert.ok(await page.locator('.dh-plot svg path[stroke="#3ecf8e"]').evaluate(n => (n.getAttribute('d').match(/M/g) || []).length === 2), 'Daemon downtime must break chart lines');
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: viewport overflow`);
  if (width > 760) {
   await page.locator('tbody tr[role="button"]').first().click();
   await page.getByRole('region', { name: 'Torrent details', exact: true }).waitFor();
   if (width === 1920) {
     await page.getByRole('tab', { name: 'peers', exact: true }).click();
     await page.getByRole('cell', { name: '203.0.113.10:51413', exact: true }).waitFor();
     await page.getByRole('tab', { name: 'trackers', exact: true }).click();
     await page.getByRole('cell', { name: 'tracker.example.test', exact: true }).waitFor();
     assert.equal(await page.getByText('private-fixture').count(), 0);
     await page.getByRole('tab', { name: 'overview', exact: true }).click();
   }
   await page.getByRole('separator', { name: 'Resize torrent details' }).focus();
   await page.keyboard.press('ArrowUp');
   const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('deck-darkhand-layout')));
   assert.ok(stored.height >= 140);
   await page.getByRole('button', { name: 'Collapse torrent details', exact: true }).click();
   await page.getByRole('button', { name: 'Open torrent details', exact: true }).click();
   await page.getByRole('group', { name: 'Stats placement' }).getByRole('button', { name: 'Above' }).click();
   await page.waitForFunction(() => document.querySelector('.dh-overview').getBoundingClientRect().top < document.querySelector('.table-shell').getBoundingClientRect().top);
   await page.getByRole('group', { name: 'Details placement' }).getByRole('button', { name: 'Right' }).click();
   await page.reload();
   assert.equal(await page.getByRole('group', { name: 'Details placement' }).getByRole('button', { name: 'Right' }).getAttribute('aria-pressed'), 'true');
   assert.equal(await page.getByRole('group', { name: 'Stats placement' }).getByRole('button', { name: 'Above' }).getAttribute('aria-pressed'), 'true');
  } else {
   assert.ok(await page.locator('.mobile-transfers').evaluate(n => n.getBoundingClientRect().top < document.querySelector('.dh-overview').getBoundingClientRect().top));
  }
  await page.getByLabel('Speed chart range', { exact: true }).selectOption('129600');
  await page.reload();
  assert.equal(await page.getByLabel('Speed chart range', { exact: true }).inputValue(), '129600');
  await page.getByRole('button', { name: /Choose color theme/ }).click();
  const regular = page.getByRole('group', { name: 'Regular themes' });
  assert.match(await regular.getByRole('menuitemradio').nth(1).getAttribute('aria-label'), /^Darkhand:/);
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, [], 'Darkhand should make no third-party font/icon/telemetry requests');
  await page.screenshot({ path: `/tmp/darkhand-${width}.png`, fullPage: true });
  console.log(`Darkhand ${width}px: layout, persistence, chart, local assets and controls passed`);
  await page.close();
 }
} finally { await browser.close(); }
