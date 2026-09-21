import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let processHandle;
const base = 'http://127.0.0.1:8127';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

before(async () => {
  processHandle = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, DELUGE_DEMO: '1', PORT: '8127' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('demo server did not start')), 5000);
    processHandle.stdout.on('data', (chunk) => { if (chunk.toString().includes('listening')) { clearTimeout(timer); resolve(); } });
    processHandle.once('error', reject);
  });
});
after(() => processHandle?.kill());

test('health and session are available in demo mode', async () => {
  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.deepEqual(health, { ok: true, mode: 'demo', version: packageJson.version });
  const session = await fetch(`${base}/api/session`).then((response) => response.json());
  assert.equal(session.connected, true);
});

test('torrent feed contains normalized live-style records', async () => {
  const payload = await fetch(`${base}/api/torrents`).then((response) => response.json());
  assert.equal(payload.connected, true);
  assert.equal(Object.keys(payload.torrents).length, 4);
  assert.equal(payload.torrents.a7f1c22d8e4b6a1098aa11f232d9e04d5801b8a1.state, 'Downloading');
  assert.equal(typeof payload.stats.download_rate, 'number');
});

test('rpc mutations reconcile with the next torrent feed', async () => {
  const hash = 'd1c4a2f7e8894b70a6f4a8e2cf1200aa99887766';
  const response = await fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'core.resume_torrents', params: [[hash]] }) });
  assert.equal(response.ok, true);
  const feed = await fetch(`${base}/api/torrents`).then((r) => r.json());
  assert.equal(feed.torrents[hash].state, 'Downloading');
});

test('queue movement RPCs update demo torrent positions', async () => {
  const hash = 'e8c2a33d91b84714ac2a99e7f5b05c0a11aa8822';
  const call = (method) => fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params: [[hash]] }) });
  assert.equal((await call('core.queue_top')).ok, true);
  let feed = await fetch(`${base}/api/torrents`).then((response) => response.json());
  assert.equal(feed.torrents[hash].queue, 0);
  assert.equal((await call('core.queue_down')).ok, true);
  feed = await fetch(`${base}/api/torrents`).then((response) => response.json());
  assert.equal(feed.torrents[hash].queue, 1);
  assert.equal((await call('core.queue_bottom')).ok, true);
  feed = await fetch(`${base}/api/torrents`).then((response) => response.json());
  assert.equal(feed.torrents[hash].queue, 3);
});

test('move storage RPC updates the torrent destination', async () => {
  const hash = 'a7f1c22d8e4b6a1098aa11f232d9e04d5801b8a1';
  const destination = 'D:\\Media\\Archive';
  const response = await fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'core.move_storage', params: [[hash], destination] }) });
  assert.equal(response.ok, true);
  const feed = await fetch(`${base}/api/torrents`).then((result) => result.json());
  assert.equal(feed.torrents[hash].save_path, destination);
});

test('file and folder rename RPCs update demo torrent names', async () => {
  const folderHash = 'b3e1f2c9a0d441e2bd8c32a1234567890abcde12';
  const fileHash = 'd1c4a2f7e8894b70a6f4a8e2cf1200aa99887766';
  const call = (method, params) => fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params }) });
  assert.equal((await call('core.rename_folder', [folderHash, 'Ambient Worlds — Focus Vol. 03', 'Ambient Focus Collection'])).ok, true);
  assert.equal((await call('core.rename_files', [fileHash, [[0, 'Design Systems Handbook.pdf']]])).ok, true);
  const feed = await fetch(`${base}/api/torrents`).then((result) => result.json());
  assert.equal(feed.torrents[folderHash].name, 'Ambient Focus Collection');
  assert.equal(feed.torrents[fileHash].name, 'Design Systems Handbook.pdf');
});

test('file priority RPC toggles a demo file between wanted and skipped', async () => {
  const hash = 'a7f1c22d8e4b6a1098aa11f232d9e04d5801b8a1';
  const call = (method, params) => fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params }) });
  assert.equal((await call('core.set_torrent_file_priorities', [hash, [4, 0]])).ok, true);
  const payload = await (await call('web.get_torrent_files', [hash])).json();
  assert.equal(payload.result[1].priority, 0);
  assert.equal((await call('core.set_torrent_file_priorities', [hash, [4, 4]])).ok, true);
});

test('torrent status provides a copyable magnet URI', async () => {
  const hash = 'a7f1c22d8e4b6a1098aa11f232d9e04d5801b8a1';
  const response = await fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'web.get_torrent_status', params: [hash, ['magnet_uri']] }) });
  assert.equal(response.ok, true);
  const payload = await response.json();
  assert.match(payload.result.magnet_uri, new RegExp(`^magnet:\\?xt=urn:btih:${hash}&dn=`));
});

test('unknown rpc methods are rejected', async () => {
  const response = await fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'core.secret_method', params: [] }) });
  assert.equal(response.status, 400);
});

test('global limits, connection health, hosts, and plugins are live in demo mode', async () => {
  const call = (method, params = []) => fetch(`${base}/api/rpc`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params }) }).then((response) => response.json()).then((payload) => payload.result);
  assert.equal(await call('core.pause_session'), true);
  let feed = await fetch(`${base}/api/torrents`).then((response) => response.json());
  assert.equal(feed.stats.download_rate, 0);
  assert.equal(typeof feed.stats.free_space, 'number');
  assert.equal(feed.stats.has_incoming_connections, true);
  assert.equal(await call('core.set_config', [{ max_download_speed: 2048, max_upload_speed: 512, max_connections_global: 80 }]), true);
  feed = await fetch(`${base}/api/torrents`).then((response) => response.json());
  assert.equal(feed.stats.max_download, 2048);
  assert.equal(feed.stats.max_upload, 512);
  assert.equal(feed.stats.max_num_connections, 80);
  assert.ok((await call('web.get_hosts')).length >= 2);
  const plugins = await call('web.get_plugins');
  assert.ok(plugins.enabled_plugins.includes('Label'));
  assert.ok(plugins.available_plugins.includes('Blocklist'));
  assert.equal(await call('core.resume_session'), true);
});
