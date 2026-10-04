import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Fictional, stationary library: measure redundant work separately from live
// rate changes. An optional prior bundle makes before/after comparisons repeatable.
process.env.DELUGE_DEMO = '1';
const { server } = await import('../server/index.mjs');
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const torrents = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [
  `torrent-${index}`, { queue: index, name: `Performance fixture ${index}`, state: 'Paused', progress: 42,
    total_size: 1000000, download_payload_rate: 0, upload_payload_rate: 0, ratio: 0, tracker_host: '', time_added: 1700000000 },
]));
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const results = [];
try {
  const modes = process.env.DECK_BASELINE_JS ? ['before', 'after'] : ['after'];
  for (const mode of modes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (!localStorage.getItem('deck-theme')) localStorage.setItem('deck-theme', 'dark');
      window.tableMeasurements = 0;
      const clone = HTMLTableElement.prototype.cloneNode;
      HTMLTableElement.prototype.cloneNode = function(...args) {
        if (this.classList.contains('auto-sized-table')) window.tableMeasurements++;
        return clone.apply(this, args);
      };
    });
    if (mode === 'before') {
      const body = await readFile(process.env.DECK_BASELINE_JS, 'utf8');
      await page.route('**/assets/*.js', route => route.fulfill({ contentType: 'text/javascript', body }));
    }
    await page.route('**/api/torrents', route => route.fulfill({ json: { torrents, connected: true, stats: { download_rate: 0, upload_rate: 0 } } }));
    const started = Date.now();
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelectorAll('tbody tr[role="button"]').length > 0);
    const readyMs = Date.now() - started;
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const initial = await page.evaluate(() => ({ nodes: document.querySelectorAll('.auto-sized-table *').length, ornaments: document.querySelectorAll('.progress-wrap svg').length, measurements: window.tableMeasurements }));
    await page.getByRole('checkbox', { name: 'Select Performance fixture 0', exact: true }).check();
    await page.waitForTimeout(200);
    const selectionMeasurements = await page.evaluate(() => window.tableMeasurements);
    // Force two refreshes without waiting for the adaptive idle interval.
    const refresh = page.getByRole('button', { name: 'Refresh torrents', exact: true });
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Control+k');
      await Promise.all([page.waitForResponse(response => response.url().endsWith('/api/torrents')), refresh.click()]);
      await page.waitForTimeout(200);
    }
    const idleMeasurements = await page.evaluate(() => window.tableMeasurements);
    const result = { mode, torrents: 300, readyMs, tableNodes: initial.nodes, hiddenHolidaySvgs: initial.ornaments, selectionMeasurements: selectionMeasurements - initial.measurements, unchangedFeedMeasurements: idleMeasurements - selectionMeasurements };
    if (mode === 'after') {
      assert.equal(result.hiddenHolidaySvgs, 0);
      assert.equal(result.selectionMeasurements, 0);
      assert.equal(result.unchangedFeedMeasurements, 0);
      for (const [theme, selector] of [['independence', '.independence-flag'], ['halloween', '.potion-vial'], ['christmas', '.candy-cane']]) {
        await page.evaluate(theme => { localStorage.setItem('deck-theme', theme); }, theme);
        await page.reload();
        await page.waitForFunction(() => document.querySelectorAll('tbody tr[role="button"]').length > 0);
        const visible = await page.locator('tbody tr[role="button"]').count();
        assert.ok(visible > 0 && visible < 100);
        assert.equal(await page.locator(`.progress-wrap ${selector}`).count(), visible);
        assert.equal(await page.locator('.progress-wrap svg').count(), visible);
      }
    }
    assert.deepEqual(errors, []);
    results.push(result);
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
  if (process.env.DECK_PERFORMANCE_OUTPUT) await writeFile(process.env.DECK_PERFORMANCE_OUTPUT, JSON.stringify(results, null, 2) + '\n');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
