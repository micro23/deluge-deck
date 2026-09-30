// Run after npm run build. Uses an isolated daemon fixture and never changes
// the user's torrents. CHROME_PATH may point to an installed Chrome binary.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const pluginData = process.env.DECK_PLUGIN_DATA;
const names = ['Selected download', 'Unselected seed', 'Selected paused'];
let torrents;
let calls;
let failNext;
let releaseAction;
let heldAction;
const reset = () => {
  torrents = Object.fromEntries(names.map((name, index) => [String(index), {
    name, state: ['Downloading', 'Seeding', 'Paused'][index],
    progress: index === 1 ? 100 : 25, total_size: 1000, queue: index,
  }]));
  calls = [];
  failNext = false;
  heldAction = false;
};
const json = (res, value) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(value));
};
const feed = () => ({ torrents, stats: {}, connected: true });
const server = http.createServer(async (req, res) => {
  if (pluginData && req.url.startsWith('/deluge/plugin/')) {
    const filename = path.basename(req.url);
    res.writeHead(200, { 'content-type': 'text/javascript' });
    res.end(await readFile(path.join(pluginData, filename)));
    return;
  }
  if (pluginData && req.url === '/deluge/') {
    const scripts = ['-style', '-plugin', ''].map(suffix =>
      `<script defer src="/deluge/plugin/deluge-deck-${version}${suffix}.js"></script>`).join('');
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><html><head><meta charset="UTF-8">${scripts}</head><body><div id="mainPanel">Legacy Deluge shell</div></body></html>`);
    return;
  }
  if (req.url === '/api/session') return json(res, { mode: 'demo', authenticated: true, connected: true });
  if (req.url === '/api/torrents') return json(res, feed());
  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const { method, params } = JSON.parse(Buffer.concat(chunks).toString());
    if (method === 'auth.check_session' || method === 'web.connected') return json(res, { result: true });
    if (method === 'web.update_ui') return json(res, { result: feed() });
    calls.push({ method, params });
    if (heldAction) await new Promise(resolve => { releaseAction = resolve; });
    if (failNext) {
      failNext = false;
      return json(res, { error: { message: 'Daemon refused the action.' } });
    }
    const state = method.includes('pause') ? 'Paused' : 'Downloading';
    const ids = method.endsWith('_session') ? Object.keys(torrents) : params[0];
    for (const id of ids) torrents[id].state = state;
    // Deluge's pause/resume methods return null on success.
    return json(res, { result: null });
  }
  const assetPath = req.url.startsWith('/assets/') ? req.url.slice(1) : 'index.html';
  let content = await readFile(path.join(root, 'dist', assetPath));
  if (req.url.startsWith('/deluge/') && assetPath === 'index.html') {
    content = content.toString().replace('<head>', '<head><script>window.__DELUGE_DECK_PLUGIN__=true;</script>');
  }
  res.writeHead(200, { 'content-type': assetPath.endsWith('.js') ? 'text/javascript' : assetPath.endsWith('.css') ? 'text/css' : 'text/html' });
  res.end(content);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  for (const [mode, pathname] of [['companion', '/'], ['hosted', '/deluge/']]) {
    reset();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}${pathname}`);
    await page.getByRole('checkbox', { name: `Select ${names[0]}`, exact: true }).waitFor();
    const contextMenusBlocked = await page.evaluate(() =>
      ['.app-shell', '.sidebar', '.workspace', '.search-wrap input', 'tbody tr'].every(selector => {
        const target = document.querySelector(selector);
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
        target.dispatchEvent(event);
        return event.defaultPrevented;
      }));
    assert.equal(contextMenusBlocked, true, `${mode}: dashboard context menus are suppressed`);
    const select = index => page.getByRole('checkbox', { name: `Select ${names[index]}`, exact: true }).check();
    const waitForState = (index, state) => page.waitForFunction(({ name, state }) =>
      [...document.querySelectorAll('tbody tr')].find(row => row.textContent.includes(name))?.querySelector('.state-badge')?.textContent.trim() === state,
    { name: names[index], state });

    await select(0);
    await select(2);
    heldAction = true;
    await page.getByRole('button', { name: 'Pause selected torrents', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.bulk-bar')?.getAttribute('aria-busy') === 'true');
    assert.equal(await page.getByRole('button', { name: 'Resume selected torrents', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.bulk-bar button').evaluateAll(buttons => buttons.every(button => button.disabled)), true);
    while (!releaseAction) await new Promise(resolve => setTimeout(resolve, 10));
    heldAction = false;
    releaseAction();
    releaseAction = null;
    await waitForState(0, 'Paused');
    assert.deepEqual(calls, [{ method: 'core.pause_torrents', params: [['0', '2']] }]);
    assert.equal(torrents['1'].state, 'Seeding');

    await select(0);
    await select(2);
    await page.getByRole('button', { name: 'Resume selected torrents', exact: true }).click();
    await waitForState(0, 'Downloading');
    await waitForState(2, 'Downloading');
    assert.deepEqual(calls.at(-1), { method: 'core.resume_torrents', params: [['0', '2']] });
    assert.equal(torrents['1'].state, 'Seeding');

    await select(0);
    await page.locator('.bulk-bar').getByRole('button', { name: 'Pause', exact: true }).click();
    await waitForState(0, 'Paused');
    await select(0);
    await page.locator('.bulk-bar').getByRole('button', { name: 'Resume', exact: true }).click();
    await waitForState(0, 'Downloading');

    await select(0);
    failNext = true;
    await page.getByRole('button', { name: 'Pause selected torrents', exact: true }).click();
    await page.getByText('Daemon refused the action.', { exact: false }).waitFor();
    assert.equal(torrents['0'].state, 'Downloading');
    assert.equal(await page.getByRole('checkbox', { name: `Select ${names[0]}`, exact: true }).isChecked(), true);
    await page.getByRole('checkbox', { name: `Select ${names[0]}`, exact: true }).uncheck();
    await page.getByRole('button', { name: 'Dismiss notice', exact: true }).click();

    failNext = true;
    await page.getByRole('button', { name: 'Pause entire session', exact: true }).click();
    await page.getByText('Daemon refused the action.', { exact: false }).waitFor();
    await page.waitForFunction(() => document.querySelector('.session-quick-actions button')?.disabled === false);
    assert.equal(await page.locator('.form-error').isVisible(), true);
    assert.equal(await page.locator('.global-popover').count(), 0);
    assert.deepEqual(calls.at(-1), { method: 'core.pause_session', params: [] });

    await page.getByRole('button', { name: 'Pause entire session', exact: true }).click();
    await waitForState(0, 'Paused');
    await page.getByRole('button', { name: 'Resume entire session', exact: true }).click();
    await waitForState(0, 'Downloading');
    assert.deepEqual(calls.slice(-2).map(call => call.method), ['core.resume_session', 'core.resume_torrents']);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Verified ${mode}: selected pause/resume, bulk controls, in-flight buttons, visible errors, session controls, and right-click suppression.`);
  }
} finally {
  releaseAction?.();
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
