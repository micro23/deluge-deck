import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeTorrentMetadata } from '../src/app/torrent-metadata.js';
import { proxyFormValues, proxyConfig } from '../src/app/preferences.js';
import { storage } from '../src/app/storage.js';
import { addedHostId, daemonHostStatus, connectHostedDaemon, readRpcResponse } from './hosted-contracts.mjs';

const encode = (value) => {
  if (typeof value === 'number') return `i${value}e`;
  if (typeof value === 'string') return `${Buffer.byteLength(value)}:${value}`;
  if (Array.isArray(value)) return `l${value.map(encode).join('')}e`;
  return `d${Object.entries(value).map(([key, entry]) => encode(key) + encode(entry)).join('')}e`;
};
const decode = (value) => decodeTorrentMetadata(Buffer.from(value));

test('torrent review reads single and multi-file metadata with UTF-8 names and byte lengths', () => {
  assert.deepEqual(decode(encode({ info: { name: 'café.txt', length: 12 } })), [{ index: 0, path: 'café.txt', size: 12 }]);
  assert.deepEqual(decode(encode({ info: { files: [
    { path: ['folder', 'fallback.txt'], 'path.utf-8': ['folder', '日本語.txt'], length: 42 },
    { path: ['empty.txt'], length: 0 },
  ] } })), [{ index: 0, path: 'folder/日本語.txt', size: 42 }, { index: 1, path: 'empty.txt', size: 0 }]);
});

for (const raw of ['', 'd', 'l', 'i12', 'i-0e', 'i01e', 'i9007199254740992e', 'x', '4:ab', '-1:a', '01:a', 'd1:ae', 'di1ei2ee', 'd1:ai1e1:ai2ee', 'letrailing']) {
  test(`torrent parser rejects malformed input ${JSON.stringify(raw)}`, () => assert.throws(() => decode(raw), /invalid|missing/));
}

test('torrent parser bounds nesting, validates payloads, and reports pure v2 explicitly', () => {
  assert.throws(() => decode('l'.repeat(100) + 'e'.repeat(100)), /invalid/);
  for (const info of [{ name: 'bad', length: -1 }, { name: 'bad' }, { files: [] }, { files: [{ length: 2, path: 'bad' }] }])
    assert.throws(() => decode(encode({ info })), /invalid/);
  assert.throws(() => decode(encode({ info: { 'meta version': 2, 'file tree': {} } })), /v2/);
});

test('host responses follow Deluge tuples, distinguish offline statuses, and surface add errors', () => {
  assert.equal(daemonHostStatus(['id', 'Connected', '2.1'], 'id'), 'Connected');
  assert.equal(daemonHostStatus(['Online', '2.1'], 'id'), 'Online');
  assert.equal(daemonHostStatus({ status: 'Available' }, 'id'), 'Online');
  for (const status of ['Disconnected', 'Not connected', ['id', 'Offline', '2.1']])
    assert.equal(daemonHostStatus(status, 'id'), 'Offline');
  assert.equal(addedHostId([true, 'new-id']), 'new-id');
  assert.equal(addedHostId('old-id'), 'old-id');
  assert.throws(() => addedHostId([false, 'Host already exists']), /already exists/);
});

test('daemon discovery skips an unavailable status request and confirms connection', async () => {
  const calls = [];
  const call = async (method, params = []) => {
    calls.push([method, params]);
    if (method === 'web.connected') return calls.filter(([name]) => name === method).length > 1;
    if (method === 'web.get_hosts') return [['bad'], ['good']];
    if (method === 'web.get_host_status') {
      if (params[0] === 'bad') throw new Error('Unreachable host');
      return ['good', 'Online', '2.1'];
    }
    if (method === 'web.connect') assert.deepEqual(params, ['good']);
  };
  assert.equal(await connectHostedDaemon(call), true);
});

test('RPC rejects broken responses but accepts null results and preserves authentication errors', async () => {
  for (const body of ['<html>bad</html>', '{}', 'null'])
    await assert.rejects(() => readRpcResponse(new Response(body)), /invalid RPC/);
  assert.equal(await readRpcResponse(new Response('{"result":null}')), null);
  await assert.rejects(() => readRpcResponse(new Response('{"error":{"message":"Not authenticated"}}')), /Not authenticated/);
  await assert.rejects(() => readRpcResponse(new Response('{}', { status: 401 })), /session expired/);
});

test('proxy settings use numeric Deluge types while preserving credentials and routing flags', () => {
  for (const [type, label] of [[1, 'SOCKS4'], [2, 'SOCKS5'], [3, 'SOCKS5_AUTH'], [4, 'HTTP'], [5, 'HTTP_AUTH'], [6, 'I2P']]) {
    const previous = { type, hostname: 'old', port: 8080, username: 'test', password: 'fixture', force_proxy: true, proxy_peer_connections: false };
    const form = { ...proxyFormValues(previous), proxyHost: ' new ', proxyPort: '9090' };
    assert.equal(form.proxyEnabled, true);
    assert.equal(form.proxyType, label);
    assert.deepEqual(proxyConfig(previous, form), { ...previous, hostname: 'new', port: 9090 });
    assert.equal(proxyConfig(previous, { ...form, proxyEnabled: false }).type, 0);
  }
  assert.equal(proxyFormValues({ type: 0 }).proxyEnabled, false);
  assert.throws(() => proxyConfig(null, {}), /load/);
});

test('storage stays usable when browser access is blocked or writes exceed quota', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Blocked'); } });
    assert.equal(storage.getItem('review-missing'), null);
    storage.setItem('review-setting', 'new');
    assert.equal(storage.getItem('review-setting'), 'new');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'old', setItem() { throw new Error('Quota'); } } });
    storage.setItem('review-quota', 'new');
    assert.equal(storage.getItem('review-quota'), 'new');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
