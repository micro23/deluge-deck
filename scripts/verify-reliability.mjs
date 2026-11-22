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
let uploadPaths = ['/tmp/fixture.torrent'];
let addResult = [[true, 'fixture-hash']];
let freeBytes = 1024;
let linkResult = null;
let rejectLogout = false;
const json = (res, value) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); };
const proxy = { type: 3, hostname: 'proxy.test', port: 1080, username: 'fixture', password: 'fixture', force_proxy: true, proxy_tracker_connections: true };
let config = { proxy, download_location: '/tmp' };
const feed = { connected: true, torrents: { fixture: { name: 'Fixture torrent', state: 'Paused', queue: 0, total_size: 12, progress: 0 } }, stats: {} };
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/session') return json(res, { authenticated: true, connected: true, mode: 'live' });
    if (req.url === '/api/session/disconnect') {
      if (rejectLogout) res.statusCode = 503;
      return json(res, rejectLogout ? { error: 'Fixture session service unavailable.' } : { ok: true });
    }
    if (req.url === '/api/torrents') return json(res, feed);
    if (req.url.endsWith('/upload')) {
      if (heldUpload) await new Promise(resolve => { releaseUpload = resolve; });
      return json(res, { success: true, files: uploadPaths });
    }
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const { method, params } = JSON.parse(Buffer.concat(chunks));
      let result = true;
      if (method === 'auth.delete_session' && rejectLogout)
        return json(res, { error: { code: 4, message: 'Fixture session service unavailable.' } });
      if (method === 'web.update_ui') result = feed;
      else if (method === 'web.get_hosts') result = [['host-id', '127.0.0.1', 58846, 'username']];
      else if (method === 'web.get_host_status') result = ['host-id', 'Connected', '2.1'];
      else if (method === 'web.add_host') result = [true, 'added-id'];
      else if (method === 'web.get_plugins') result = { enabled_plugins: [], available_plugins: [] };
      else if (method === 'core.get_config') result = config;
      else if (method === 'core.set_config') { config = { ...config, ...params[0] }; result = null; }
      else if (method === 'core.get_free_space') result = freeBytes;
      else if (method === 'web.add_torrents') result = addResult;
      else if (['core.add_torrent_magnet', 'core.add_torrent_url'].includes(method)) result = linkResult;
      if (['core.set_config', 'web.add_torrents', 'web.add_host'].includes(method)) writes.push({ method, params });
      return json(res, { result });
    }
    const themePath = req.url.replace(/^\/deluge\/deluge-deck-resources\//, '/').replace('/manifest.json', '/deck-themes.json');
    const assetPath = /^(?:\/assets\/|\/themes\/|\/deck-themes\.json$)/.test(themePath) ? themePath.slice(1) : 'index.html';
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
    uploadPaths = ['/tmp/fixture.torrent'];
    addResult = [[true, 'fixture-hash']];
    freeBytes = 1024;
    config = { proxy, download_location: '/tmp' };
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}${pathname}`);
    await page.getByRole('checkbox', { name: 'Select Fixture torrent', exact: true }).waitFor();

    const preferences = page.getByRole('button', { name: 'Open Deluge Preferences', exact: true });
    const closePreferences = page.getByRole('button', { name: 'Close preferences', exact: true });
    const isFocused = locator => locator.evaluate(element => document.activeElement === element);
    await preferences.click();
    assert.ok(await isFocused(closePreferences), 'Preferences receives focus on open');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await isFocused(page.getByRole('dialog', { name: 'Deluge Preferences', exact: true }).getByRole('button', { name: 'Done', exact: true })));
    await page.keyboard.press('Tab');
    assert.ok(await isFocused(closePreferences), 'Tab wraps to the first control');
    await page.waitForFunction(() => document.querySelector('[aria-label="Proxy host"]')?.value === 'proxy.test');
    await page.getByLabel('Proxy host', { exact: true }).fill('changed.test');
    assert.equal(await page.getByLabel('Proxy type', { exact: true }).inputValue(), 'SOCKS5_AUTH');
    await page.getByRole('button', { name: 'Save proxy', exact: true }).click();
    await page.getByText('Proxy settings saved.', { exact: true }).waitFor();
    assert.deepEqual(writes.at(-1).params[0].proxy, { ...proxy, hostname: 'changed.test' });
    await closePreferences.click();
    assert.ok(await isFocused(preferences), 'Closing Preferences restores the opener');

    const details = page.getByRole('table', { name: 'Torrents' }).getByRole('row')
      .getByRole('button', { name: 'Open details for Fixture torrent', exact: true });
    await details.press('Enter');
    assert.ok(await isFocused(page.getByRole('button', { name: 'Close details', exact: true })));
    await page.keyboard.press('Escape');
    assert.ok(await isFocused(details));

    const actions = page.getByRole('button', { name: 'Actions for Fixture torrent', exact: true });
    await actions.press('Enter');
    assert.ok(await isFocused(page.getByRole('button', { name: 'View details', exact: true })));
    await page.keyboard.press('Escape');
    assert.ok(await isFocused(actions));

    const globalControls = page.getByRole('button', { name: 'Open global session controls', exact: true });
    await globalControls.press('Enter');
    assert.ok(await isFocused(page.getByRole('dialog', { name: 'Global session controls', exact: true })));
    await page.keyboard.press('Tab');
    assert.ok(await isFocused(page.getByRole('dialog', { name: 'Global session controls', exact: true }).getByRole('spinbutton').first()));
    await page.keyboard.press('Escape');
    assert.ok(await isFocused(globalControls));

    const account = page.getByRole('button', { name: 'Open account menu', exact: true });
    await account.press('Enter');
    assert.ok(await isFocused(page.getByRole('menuitem', { name: /Log out/ })));
    await page.keyboard.press('Escape');
    assert.ok(await isFocused(account));

    await page.keyboard.press('Control+k');
    const commandSearch = page.getByRole('textbox', { name: 'Command search', exact: true });
    assert.ok(await isFocused(commandSearch));
    await commandSearch.fill('no matching command');
    await page.getByText('No matching commands.', { exact: true }).waitFor();
    await commandSearch.fill('focus search');
    await commandSearch.press('Enter');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Search torrents');

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

    const openAdd = () => page.getByRole('button', { name: 'Add torrent', exact: true }).first().click();
    const submitAdd = () => page.getByRole('button', { name: 'Add to Deluge', exact: true }).click();
    const returnToReview = async () => {
      await page.getByRole('button', { name: 'Return to review', exact: true }).click();
      await page.getByRole('dialog', { name: 'Review torrent', exact: true }).waitFor();
    };
    const addError = page.getByRole('dialog', { name: 'Deluge could not add this torrent', exact: true });
    // The daemon has room for the two payloads, but not their alignment padding.
    await openAdd();
    const padded = 'd4:infod5:filesld6:lengthi3e4:pathl1:aee' +
      'd4:attr1:p6:lengthi16381e4:pathl4:.pad5:16381ee' +
      'd6:lengthi2e4:pathl1:beeeee';
    await page.locator('input[type="file"]').setInputFiles({ name: 'padded.torrent',
      mimeType: 'application/x-bittorrent', buffer: Buffer.from(padded) });
    await page.getByText('2 of 2 selected · 5 B', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Download a', exact: true }).uncheck();
    await submitAdd();
    await page.getByRole('dialog', { name: 'Review torrent', exact: true }).waitFor({ state: 'hidden' });
    assert.deepEqual(writes.at(-1).params[0][0].options.file_priorities, [0, 0, 4]);

    await openAdd();
    await page.getByRole('button', { name: 'Magnet link', exact: true }).click();
    await page.getByLabel('Magnet URI', { exact: true }).fill('magnet:?xt=urn:btih:0123456789012345678901234567890123456789&dn=100%25%20complete');
    assert.equal(await page.locator('.magnet-preview strong').textContent(), '100% complete');
    await submitAdd();
    await addError.waitFor();
    assert.match(await addError.textContent(), /did not add this torrent/);
    assert.ok(await isFocused(page.getByRole('button', { name: 'Return to review', exact: true })));
    await returnToReview();
    assert.match(await page.getByLabel('Magnet URI', { exact: true }).inputValue(), /100%25/);
    await page.getByRole('button', { name: 'Torrent URL', exact: true }).click();
    await page.getByPlaceholder('https://example.com/file.torrent', { exact: true }).fill('https://example.test/duplicate.torrent');
    await submitAdd();
    await addError.waitFor();
    assert.match(await addError.textContent(), /did not add this torrent/);
    await page.getByRole('button', { name: 'Close add error', exact: true }).click();

    await openAdd();
    const metadata = name => ({ name, mimeType: 'application/x-bittorrent', buffer: Buffer.from('d4:infod6:lengthi12e4:name8:test.txtee') });
    await page.locator('input[type="file"]').setInputFiles([metadata('first.torrent'), metadata('second.torrent')]);
    await page.getByText('test.txt', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Select none', exact: true }).click();
    await submitAdd();
    await addError.waitFor();
    assert.match(await addError.textContent(), /Select at least one payload file in first.torrent/);
    await returnToReview();
    await page.getByRole('button', { name: 'Select all', exact: true }).click();
    freeBytes = -1;
    await submitAdd();
    await addError.waitFor();
    assert.match(await addError.textContent(), /folder exists and is accessible/);
    await returnToReview();
    freeBytes = 1024;
    const writesBeforeMismatch = writes.filter(call => call.method === 'web.add_torrents').length;
    await submitAdd();
    await addError.waitFor();
    assert.match(await addError.textContent(), /did not accept those torrent files/);
    assert.equal(writes.filter(call => call.method === 'web.add_torrents').length, writesBeforeMismatch);
    await returnToReview();
    uploadPaths = ['/tmp/first.torrent', '/tmp/second.torrent'];
    addResult = [[true, 'first-id'], [true, null]];
    await submitAdd();
    await addError.waitFor();
    assert.match(await addError.textContent(), /1 torrent\(s\) added/);
    assert.match(await addError.textContent(), /second.torrent/);
    await returnToReview();
    assert.equal(await page.getByLabel('Select first.torrent for adding', { exact: true }).isChecked(), false);
    assert.equal(await page.getByLabel('Select second.torrent for adding', { exact: true }).isChecked(), true);
    uploadPaths = ['/tmp/second.torrent'];
    addResult = [[true, 'second-id']];
    await submitAdd();
    await page.getByRole('dialog', { name: 'Review torrent', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).params[0].length, 1);
    assert.equal(writes.at(-1).params[0][0].path, '/tmp/second.torrent');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('checkbox', { name: 'Select Fixture torrent', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const logout = page.getByRole('menuitem', { name: /Log out/ });
    rejectLogout = true;
    await account.click();
    await logout.click();
    await page.getByText(/Sign-out could not be confirmed.*Fixture session service unavailable/).waitFor();
    assert.equal(await account.isVisible(), true);
    rejectLogout = false;
    await account.click();
    await logout.click();
    await page.locator('input[type="password"]').waitFor();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Verified ${pathname === '/' ? 'companion' : 'hosted'}: keyboard focus and command search, proxy contract, malformed metadata, in-flight Add protection, payload priorities, magnet preview, failed link adds, invalid download folders, incomplete uploads, partial batch retry, mobile bounds.`);
  }
} finally {
  releaseUpload?.();
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
