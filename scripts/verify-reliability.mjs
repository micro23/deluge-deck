// Browser regressions run only against this isolated Deluge fixture.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let writes = [];
let heldUpload;
let releaseUpload;
const json = (res, value) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); };
const proxy = { type: 3, hostname: 'proxy.test', port: 1080, username: 'fixture', password: 'fixture', force_proxy: true, proxy_tracker_connections: true };
const feed = { connected: true, torrents: { fixture: { name: 'Fixture torrent', state: 'Paused', queue: 0, total_size: 12, progress: 0 } }, stats: {} };
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/session') return json(res, { authenticated: true, connected: true, mode: 'live' });
    if (req.url === '/api/torrents') return json(res, feed);
    if (req.url.endsWith('/upload')) {
      if (heldUpload) await new Promise(resolve => { releaseUpload = resolve; });
      return json(res, { success: true, files: ['/tmp/fixture.torrent'] });
    }
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const { method, params } = JSON.parse(Buffer.concat(chunks));
      let result = true;
      if (method === 'web.update_ui') result = feed;
      else if (method === 'web.get_hosts') result = [['host-id', '127.0.0.1', 58846, 'username']];
      else if (method === 'web.get_host_status') result = ['host-id', 'Connected', '2.1'];
      else if (method === 'web.add_host') result = [true, 'added-id'];
      else if (method === 'web.get_plugins') result = { enabled_plugins: [], available_plugins: [] };
      else if (method === 'core.get_config') result = { proxy, download_location: '/tmp' };
      else if (method === 'core.get_free_space') result = 1024;
      else if (method === 'web.add_torrents') result = [[true, 'fixture-hash']];
      if (['core.set_config', 'web.add_torrents', 'web.add_host'].includes(method)) writes.push({ method, params });
      return json(res, { result });
    }
    const assetPath = req.url.startsWith('/assets/') ? req.url.slice(1) : 'index.html';
    let content = await readFile(path.join(root, 'dist', assetPath));
    if (req.url === '/deluge/') content = content.toString().replace('<head>', '<head><script>window.__DELUGE_DECK_PLUGIN__=true;</script>');
    res.setHeader('content-type', assetPath.endsWith('.js') ? 'text/javascript' : assetPath.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(content);
  } catch { res.writeHead(500); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  for (const pathname of ['/', '/deluge/']) {
    writes = [];
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}${pathname}`);
    await page.getByRole('checkbox', { name: 'Select Fixture torrent', exact: true }).waitFor();

    await page.getByRole('button', { name: 'Open Deluge Preferences', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Proxy host"]')?.value === 'proxy.test');
    await page.getByLabel('Proxy host', { exact: true }).fill('changed.test');
    assert.equal(await page.getByLabel('Proxy type', { exact: true }).inputValue(), 'SOCKS5_AUTH');
    await page.getByRole('button', { name: 'Save proxy', exact: true }).click();
    await page.getByText('Proxy settings saved.', { exact: true }).waitFor();
    assert.deepEqual(writes.at(-1).params[0].proxy, { ...proxy, hostname: 'changed.test' });
    await page.getByRole('button', { name: 'Close preferences', exact: true }).click();

    await page.getByRole('button', { name: 'Add torrent', exact: true }).first().click();
    await page.locator('input[type="file"]').setInputFiles({ name: 'broken.torrent', mimeType: 'application/x-bittorrent', buffer: Buffer.from('d') });
    await page.locator('.payload-error').waitFor();
    assert.match(await page.locator('.payload-error').textContent(), /invalid or truncated/);
    await page.getByRole('button', { name: 'Close add torrent', exact: true }).click();
    assert.equal(writes.some(call => call.method === 'web.add_torrents'), false);

    await page.getByRole('button', { name: 'Add torrent', exact: true }).first().click();
    await page.locator('input[type="file"]').setInputFiles({ name: 'valid.torrent', mimeType: 'application/x-bittorrent', buffer: Buffer.from('d4:infod6:lengthi12e4:name8:test.txtee') });
    await page.getByText('test.txt', { exact: true }).waitFor();
    heldUpload = true;
    await page.getByRole('button', { name: 'Add to Deluge', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Close add torrent"]')?.disabled);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog', { name: 'Review torrent', exact: true }).isVisible(), true);
    await page.mouse.click(5, 5);
    assert.equal(await page.getByRole('dialog', { name: 'Review torrent', exact: true }).isVisible(), true);
    await page.waitForFunction(() => document.querySelector('.add-modal')?.textContent.includes('Adding…'));
    while (!releaseUpload) await new Promise(resolve => setTimeout(resolve, 10));
    heldUpload = false;
    releaseUpload();
    releaseUpload = null;
    await page.getByRole('dialog', { name: 'Review torrent', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(writes.filter(call => call.method === 'web.add_torrents').length, 1);
    assert.deepEqual(writes.at(-1).params[0][0].options.file_priorities, [4]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('checkbox', { name: 'Select Fixture torrent', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Verified ${pathname === '/' ? 'companion' : 'hosted'}: proxy contract, malformed torrent handling, in-flight Add dismissal protection, payload priorities, mobile bounds.`);
  }
} finally {
  releaseUpload?.();
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
