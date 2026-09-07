import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateAndConnectHosted, connectHostedDaemon, createRequestGate, formatBytes, normalizeTorrentFiles, serializeRpcRequest } from './hosted-contracts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('hosted bridge narrowly suppresses an ExtJS login window and leaves an existing Preferences window alone', async () => {
  const bridge = await readFile(path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js'), 'utf8');
  const delayedLoginFixture = '<div class="root"><div id="stock-mask" class="ext-el-mask"></div><div id="stock-login" class="x-window"><div class="login-form">Password</div></div><div id="preferences-mask" class="ext-el-mask"></div><div id="preferences" class="x-window"><div class="preferences-form">Preferences</div></div></div>';
  assert.match(bridge, /data-deluge-deck-legacy/);
  assert.match(bridge, /data-deluge-deck-stock-login/);
  assert.match(bridge, /MutationObserver/);
  assert.match(delayedLoginFixture, /stock-login[\s\S]*login-form/);
  assert.match(delayedLoginFixture, /preferences-mask[\s\S]*preferences-form/);
  assert.match(bridge, /hasLoginMarker/);
  assert.match(bridge, /loginWindowFor/);
  assert.match(bridge, /isLegacyShellNode/);
  assert.match(bridge, /hasNativeWindowMarker/);
  assert.match(bridge, /const showNativePreferences = \(\) =>/);
  assert.match(bridge, /preferences\.setSize\?\.\(width, height\)/);
  assert.match(bridge, /preferences\.center\?\.\(\)/);
  assert.match(bridge, /preferences\.doLayout\?\.\(\)/);
  assert.match(bridge, /ensureNativePreferencesControls\(preferences, element\)/);
  assert.match(bridge, /data-action="apply"/);
  assert.match(bridge, /preferences\.onApply\?\.\(\)/);
  assert.match(bridge, /preferences\.onOk\?\.\(\)/);
  assert.match(bridge, /nativeWindowMarker/);
  assert.match(bridge, /\.x-window,\[class\*="x-window" i\],\.x-panel/);
  assert.match(bridge, /const nativeWindow = node\.matches\?\.\(windowSelector\) && hasNativeWindowMarker\(node\)/);
  assert.match(bridge, /const containingNativeWindow = nativeWindow \? node : node\.closest\?\.\(windowSelector\)/);
  assert.match(bridge, /containingNativeWindow\.dataset\.delugeDeckNativeWindow = 'true'/);
  assert.match(bridge, /delete containingNativeWindow\.dataset\.delugeDeckLegacy/);
  assert.match(bridge, /if \(node\.parentElement === body && !infrastructure && !nativeWindow && node\.id !== window\.__DELUGE_DECK_ROOT_ID__\) node\.dataset\.delugeDeckLegacy/);
  assert.match(bridge, /record\.addedNodes\.forEach\(markLegacyNode\)/);
  assert.doesNotMatch(bridge, /Array\.from\(body\.children\)\.forEach\(\(node\) => \{\s*if \(node\.id !==/);
  assert.match(bridge, /\.ext-el-mask/);
  assert.match(bridge, /isAssociatedLoginMask/);
  assert.match(bridge, /mask\.nextElementSibling === stockLoginWindow \|\| mask\.previousElementSibling === stockLoginWindow/);
  assert.match(bridge, /if \(isAssociatedLoginMask\(mask\)\) mask\.dataset\.delugeDeckStockLogin/);
  assert.doesNotMatch(bridge, /querySelectorAll\('\.ext-el-mask'\)\.forEach\(\(mask\) => \{ mask\.dataset/);
  assert.doesNotMatch(bridge, /\.x-mask/);
  assert.doesNotMatch(bridge, /body > \*/);
  assert.match(bridge, /deluge-deck-root/);
  assert.doesNotMatch(bridge, /document\.addEventListener\(['"]drop/);
  assert.doesNotMatch(bridge, /window\.fetch\s*=/);
});

test('hosted bridge suppresses Deluge stock connection manager in favor of Deck controls', async () => {
  const bridge = await readFile(path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js'), 'utf8');
  assert.match(bridge, /data-deluge-deck-stock-connection/);
  assert.match(bridge, /hasStockConnectionMarker/);
  assert.match(bridge, /window\.deluge\?\.connectionManager/);
  assert.match(bridge, /manager\.show = function suppressDeckStockConnectionManager/);
  assert.match(bridge, /manager\.isVisible\?\.\(\)\) manager\.hide/);
});

test('compiled app waits for hosted bootstrap when script completion order is reversed', async () => {
  const [ui, webui, bridge] = await Promise.all([
    readFile(path.join(root, 'src/main.jsx'), 'utf8'),
    readFile(path.join(root, 'plugin/deluge_deck/webui.py'), 'utf8'),
    readFile(path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js'), 'utf8'),
  ]);
  assert.match(ui, /const pluginMode = \(\) => Boolean\(window\.__DELUGE_DECK_PLUGIN__\)/);
  assert.match(ui, /let mounted = false/);
  assert.match(ui, /const resolveMountRoot = \(\) =>/);
  assert.match(ui, /window\.addEventListener\('deluge-deck-bootstrap-ready', mount, \{ once: true \}\)/);
  assert.match(ui, /if \(!root\) \{[\s\S]*deluge-deck-bootstrap-ready[\s\S]*return;/);
  assert.match(ui, /if \(mounted\) return;/);
  assert.match(bridge, /window\.__DELUGE_DECK_BOOTSTRAP_READY__ = true/);
  assert.match(bridge, /window\.dispatchEvent\(new Event\('deluge-deck-bootstrap-ready'\)\)/);
  assert.match(webui, /resource\(f'deluge-deck-\{__version__\}-style\.js'\),[\s\S]*resource\(f'deluge-deck-\{__version__\}-plugin\.js'\),[\s\S]*resource\(f'deluge-deck-\{__version__\}\.js'\)/);
});

test('hosted first paint is gated before the stock Deluge shell can render', async () => {
  const [css, builder, bridge, ui] = await Promise.all([
    readFile(path.join(root, 'src/styles.css'), 'utf8'),
    readFile(path.join(root, 'scripts/build-plugin.mjs'), 'utf8'),
    readFile(path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js'), 'utf8'),
    readFile(path.join(root, 'src/main.jsx'), 'utf8'),
  ]);
  assert.match(builder, /classList\.add\('deluge-deck-loading'\)[\s\S]*appendChild\(style\)/);
  assert.match(css, /html\.deluge-deck-loading body>[^\{]*#deluge-deck-root[^\{]*\{display:none!important\}/);
  assert.match(css, /html\.deluge-deck-loading body:before/);
  assert.match(css, /html\.deluge-deck-hosted #deluge-deck-root\{position:fixed!important;inset:0!important/);
  assert.match(css, /data-deluge-deck-legacy="true"\][^\{]*\{display:none!important\}/);
  assert.match(bridge, /classList\.add\('deluge-deck-loading'\)/);
  assert.match(bridge, /deck-boot-splash/);
  assert.match(bridge, /#deluge-deck-root \{ position:fixed !important; inset:0 !important/);
  assert.match(bridge, /node\.dataset\.delugeDeckLegacy = 'true'/);
  const appStart = ui.indexOf('function App()');
  const mountStart = ui.indexOf('const mount =');
  const appBlock = ui.slice(appStart, mountStart);
  const mountBlock = ui.slice(mountStart);
  assert.match(appBlock, /useEffect\(\(\) => \{\s*if \(!pluginMode\(\)\) return;\s*document\.documentElement\.classList\.add\('deluge-deck-ready'\);\s*document\.documentElement\.classList\.remove\('deluge-deck-loading'\)/);
  assert.doesNotMatch(mountBlock, /requestAnimationFrame/);
});

test('hosted requests are base-aware and a dashboard drop only opens a review modal', async () => {
  const source = await readFile(path.join(root, 'src/main.jsx'), 'utf8');
  assert.match(source, /new URL\(resource, new URL\('\.', document\.baseURI\)\)/);
  assert.match(source, /setAddFiles\(files\)/);
  const dropStart = source.indexOf('const drop =');
  const dropBlock = source.slice(dropStart, source.indexOf('if (!connected) return', dropStart));
  assert.notEqual(dropBlock.length, 0);
  assert.doesNotMatch(dropBlock, /api\.upload|web\.add_torrents|core\.add_torrent/);
  assert.match(source, /Nothing is added until you confirm/);
  assert.match(source, /preferences\.show\(\)/);
  assert.match(source, /authenticateAndConnectHosted\(rpc, password\)/);
});

test('a hosted login discovers and connects an available Deluge host before dashboard entry', async () => {
  const calls = [];
  const call = async (method, params = []) => {
    calls.push([method, params]);
    if (method === 'auth.login') { assert.deepEqual(params, ['secret']); return true; }
    if (method === 'web.connected') return calls.filter(([name]) => name === 'web.connected').length > 1;
    // Deluge 2.1 tuples contain username in slot 3, not a host status.
    if (method === 'web.get_hosts') return [['offline', '127.0.0.1', 58846, 'alice'], ['online', '127.0.0.1', 58846, 'bob'], ['connected', '127.0.0.1', 58846, 'carol']];
    if (method === 'web.get_host_status') return params[0] === 'offline' ? ['offline', 'Offline'] : params[0] === 'online' ? { status: 'Online' } : ['connected', 'Connected'];
    if (method === 'web.connect') { assert.deepEqual(params, ['connected']); return true; }
    throw new Error(`unexpected ${method}`);
  };
  assert.equal(await authenticateAndConnectHosted(call, 'secret'), true);
  assert.deepEqual(calls.map(([method]) => method), ['auth.login', 'web.connected', 'web.get_hosts', 'web.get_host_status', 'web.get_host_status', 'web.get_host_status', 'web.connect', 'web.connected']);
  await assert.rejects(() => connectHostedDaemon(async (method) => method === 'web.connected' ? false : []), /No available Deluge daemon hosts/);
});

test('normalizes Deluge 2.1 nested files and invalidates obsolete detail requests', () => {
  const rows = normalizeTorrentFiles({ type: 'dir', path: 'release', contents: [{ type: 'file', path: 'readme.txt', size: 12, progress: 100 }, { type: 'dir', path: 'video', contents: [{ type: 'file', path: 'episode.mkv', size: 42, progress: 25 }] }] });
  assert.deepEqual(rows.map((row) => row.path), ['release/readme.txt', 'release/video/episode.mkv']);
  const gate = createRequestGate(); const first = gate.begin(); const second = gate.begin();
  assert.equal(gate.isCurrent(first), false); assert.equal(gate.isCurrent(second), true); gate.cancel(); assert.equal(gate.isCurrent(second), false);
});

test('formats Deluge byte counts without shifting MB values into GB', () => {
  assert.equal(formatBytes(619), '619 B');
  assert.equal(formatBytes(1331), '1.3 KB');
  assert.equal(formatBytes(648753971), '618.7 MB');
  assert.equal(formatBytes(624531866), '595.6 MB');
  assert.equal(formatBytes(664576984064), '618.9 GB');
});

test('blank download paths are omitted while explicit paths remain in all add options', () => {
  const blank = JSON.parse(serializeRpcRequest({ method: 'web.add_torrents', params: [[{ options: { download_location: '   ', add_paused: true } }]] }));
  assert.deepEqual(blank.params[0][0].options, { add_paused: true });
  const urlBlank = JSON.parse(serializeRpcRequest({ method: 'core.add_torrent_url', params: ['https://example.test/file.torrent', { download_location: '', add_paused: false }] }));
  assert.deepEqual(urlBlank.params[1], { add_paused: false });
  const explicit = JSON.parse(serializeRpcRequest({ method: 'core.add_torrent_magnet', params: ['magnet:?x', { download_location: 'D:\\Downloads', sequential_download: true }] }));
  assert.equal(explicit.params[1].download_location, 'D:\\Downloads');
});
