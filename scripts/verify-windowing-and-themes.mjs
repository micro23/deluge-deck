import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { chromium } from 'playwright';
import { terminalColumnWidths, tableStorageKey } from '../src/app/terminal-theme.js';
import { THEMES } from '../src/app/themes.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const { version } = JSON.parse(await readFile(path.join(root, 'package.json')));
const data = path.join(root, 'plugin/deluge_deck/data');
const baseline = process.env.DECK_BASELINE_DIST;
let librarySize = 5000;
let delayForest = 0;
const names = Array.from({ length: 5000 }, (_, index) => `Fixture ${String(index).padStart(5, '0')}`);
const feed = () => ({ connected: true, torrents: Object.fromEntries(names.slice(0, librarySize).map((name, index) => [`hash-${index}`, { queue: index, name, state: 'Paused', progress: 42, total_size: 1000000, ratio: 0, tracker_host: '', num_seeds: 0, total_seeds: 0, num_peers: 0, total_peers: 0 }])), stats: { download_rate: 0, upload_rate: 0, free_space: 1000000000, num_connections: 0 } });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const json = (res, value) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  try {
    if (url.pathname === '/api/session') return json(res, { mode: 'demo', authenticated: true, connected: true });
    if (url.pathname === '/api/torrents') return json(res, feed());
    if (url.pathname === '/api/rpc' || url.pathname === '/deluge/json') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const input = JSON.parse(Buffer.concat(chunks));
      const result = input.method === 'web.update_ui' ? feed() : input.method === 'delugedeck.get_speed_history' ? { now: 1700000000000, interval: 2000, samples: [] } : input.method === 'web.get_torrent_files' ? [] : input.method === 'web.get_torrent_status' ? {} : true;
      return json(res, { result });
    }
    if (url.pathname === '/deluge/') {
      res.setHeader('content-type', 'text/html');
      return res.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${['-style', '-plugin', ''].map(suffix => `<script src="/deluge/js/delugedeck/deluge-deck-${version}${suffix}.js"></script>`).join('')}</body></html>`);
    }
    let file;
    if (url.pathname === '/baseline/') file = path.join(baseline, 'index.html');
    else if (url.pathname.startsWith('/deluge/js/delugedeck/')) file = path.join(data, path.basename(url.pathname));
    else if (url.pathname.startsWith('/deluge/deluge-deck-resources/')) file = path.join(data, 'resources', url.pathname.slice('/deluge/deluge-deck-resources/'.length));
    else file = path.join(root, 'dist', url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    try { await stat(file); } catch { if (baseline && url.pathname.startsWith('/assets/')) file = path.join(baseline, url.pathname.slice(1)); }
    if (delayForest && /\/themes\/forest-/.test(url.pathname)) await new Promise(resolve => setTimeout(resolve, delayForest));
    const content = await readFile(file);
    res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('cache-control', file.endsWith('manifest.json') || file.endsWith('deck-themes.json') ? 'no-cache' : 'public, max-age=31536000, immutable');
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const output = [];
try {
  for (const [mode, pathname] of [['companion', '/'], ['hosted', '/deluge/']]) {
    librarySize = 5000;
    const page = await browser.newPage({ viewport: { width: 1456, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('request', request => requests.push(request.url()));
    await page.goto(origin + pathname);
    await page.locator('tbody tr[role="button"]').first().waitFor();
    await page.waitForTimeout(800);
    const visible = await page.locator('tbody tr[role="button"]').count();
    assert.ok(visible > 0 && visible < 80, `${mode}: bounded desktop rows: ${visible}`);
    assert.equal(requests.filter(url => /\/themes\/(?!dark-)[\w-]+\.json/.test(url)).length, 0, `${mode}: only the selected theme loads initially`);
    assert.equal(requests.filter(url => /theme-previews|\/gallery-/.test(url)).length, 0);
    await page.getByRole('checkbox', { name: `Select ${names[0]}`, exact: true }).check();
    await page.locator('.table-shell').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await page.getByRole('checkbox', { name: `Select ${names[4999]}`, exact: true }).check();
    assert.match(await page.locator('.bulk-count').textContent(), /2 selected/);
    await page.locator('.table-shell').evaluate(element => { element.scrollTop = 0; });
    await page.getByRole('checkbox', { name: `Select ${names[0]}`, exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: `Select ${names[0]}`, exact: true }).isChecked(), true);
    await page.getByRole('checkbox', { name: 'Select all filtered torrents', exact: true }).check();
    assert.match(await page.locator('.bulk-count').textContent(), /5000 selected/);
    await page.locator('th[data-column="name"] .sort-button').click();
    await page.locator('th[data-column="name"] .sort-button').click();
    await page.getByRole('checkbox', { name: `Select ${names[4999]}`, exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: `Select ${names[4999]}`, exact: true }).isChecked(), true);
    await page.getByRole('checkbox', { name: 'Select all filtered torrents', exact: true }).uncheck();
    await page.locator('tbody tr[role="button"]').first().focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.activeElement?.dataset.virtualIndex === '4999');
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => document.activeElement?.dataset.virtualIndex === '4998');
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.activeElement?.dataset.virtualIndex === '0');
    await page.keyboard.press('PageDown');
    assert.ok(Number(await page.evaluate(() => document.activeElement?.dataset.virtualIndex)) > 0);
    await page.locator('.search-wrap input').first().fill('04999');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr[role="button"]').length === 1);
    await page.locator('.search-wrap input').first().fill('');
    await page.locator('tbody tr[role="button"]').first().waitFor();

    const choose = async label => { await page.locator('.theme-trigger').click(); await page.getByRole('menuitemradio', { name: new RegExp(`^${label}:`) }).click(); };
    // Simulate a failed theme request: the current theme remains intact.
    await page.route('**/themes/forest-*.json', route => route.fulfill({ status: 503, body: '' }));
    await choose('Forest');
    await page.getByText('Theme resources could not be loaded. Please try again.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    assert.equal(await page.evaluate(() => localStorage.getItem('deck-theme')), 'dark');
    await page.unroute('**/themes/forest-*.json');
    delayForest = 400;
    await choose('Forest'); await choose('Ocean');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'ocean');
    await page.waitForTimeout(500); delayForest = 0;
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'ocean', 'Late theme replies cannot replace a newer choice');
    const oceanRequests = requests.filter(url => /\/themes\/ocean-/.test(url)).length;
    await choose('Midnight'); await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await choose('Ocean'); await page.waitForFunction(() => document.documentElement.dataset.theme === 'ocean');
    assert.equal(requests.filter(url => /\/themes\/ocean-/.test(url)).length, oceanRequests, 'Warm switches reuse cached theme rules');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.mobile-transfer').first().waitFor();
    assert.ok(await page.locator('.mobile-transfer').count() < 80);
    await page.locator('.mobile-transfer-open').first().focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.activeElement?.closest('[data-virtual-index]')?.dataset.virtualIndex === '4999');
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.activeElement?.closest('[data-virtual-index]')?.dataset.virtualIndex === '0');
    await page.getByRole('checkbox', { name: 'Select all filtered torrents', exact: true }).check();
    assert.match(await page.locator('.bulk-count').textContent(), /5000 selected/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    output.push({ mode, torrents: 5000, desktopRows: visible, mobileRows: await page.locator('.mobile-transfer').count() });
    await page.close();
  }
  if (baseline) {
    librarySize = 4;
    const inspect = async (pathname, theme, width) => {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(({ theme, key, widths }) => { localStorage.setItem('deck-theme', theme); localStorage.setItem(key, JSON.stringify(widths)); }, { theme, key: tableStorageKey(theme, 'widths'), widths: terminalColumnWidths });
      await page.goto(origin + pathname); await page.getByRole('checkbox', { name: 'Select Fixture 00000', exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      await page.waitForTimeout(800);
      // Automatic column sizing can settle differently across independently loaded pages.
      // Compare cell typography and vertical geometry, plus exact outer layout.
      const state = await page.evaluate(() => [...document.querySelectorAll('.app-shell,.sidebar,.topbar,.workspace,.stat-card,.dh-stat,.table-shell,.table-shell th,.table-shell td,.mobile-transfer')].map(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        return { tag: element.tagName, box: [element.matches('th,td') ? 0 : rect.x, rect.y, element.matches('th,td') ? 0 : rect.width, rect.height].map(n => Math.round(n * 10) / 10), style: ['color', 'background-color', 'background-image', 'font-family', 'font-size', 'font-weight', 'padding', 'border-color'].map(key => style.getPropertyValue(key)) };
      }));
      await page.close(); return state;
    };
    for (const [theme] of THEMES) {
      for (const width of [1456, 390]) assert.deepEqual(await inspect('/', theme, width), await inspect('/baseline/', theme, width), `${theme} ${width}: lazy styles retain the original geometry and computed styles`);
      console.log(`Baseline rendering retained: ${theme}, desktop and phone`);
    }
  }
  console.log(JSON.stringify(output, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
