import test from 'node:test';
import assert from 'node:assert/strict';
import { saveDaemonConfig, assertRemovalResult, torrentOptionConfig } from '../src/app/action-results.js';

test('torrent status names map to Deluge writable option names', () => {
  assert.deepEqual(torrentOptionConfig({is_auto_managed:false,sequential_download:true,prioritize_first_last:true}), {
    auto_managed:false,sequential_download:true,prioritize_first_last_pieces:true,
  });
});

test('settings success requires readback from the connected daemon', async () => {
  let config = { download_location: '/downloads', listen_ports: [6881, 6881], proxy: { type: 0, username: 'existing' } };
  const calls = [];
  const rpc = async (method, params) => {
    calls.push([method, params]);
    if (method === 'core.set_config') { config = { ...config, ...params[0] }; return null; }
    return config;
  };
  const change = { listen_ports: [50123, 50123], proxy: { type: 3, username: 'existing' } };
  assert.deepEqual(await saveDaemonConfig(rpc, change), { download_location: '/downloads', ...change });
  assert.deepEqual(calls.map(([method]) => method), ['core.set_config', 'core.get_config']);
  await assert.rejects(saveDaemonConfig(async () => config, { listen_ports: [60000, 60000] }), /did not apply: listen_ports/);
  await assert.rejects(saveDaemonConfig(async () => { throw new Error('Disconnected'); }, change), /Disconnected/);
});

test('partial removal failures remain errors even when the RPC itself succeeds', () => {
  assert.doesNotThrow(() => assertRemovalResult([]));
  assert.doesNotThrow(() => assertRemovalResult(null));
  assert.throws(() => assertRemovalResult([['missing-hash', 'Torrent not found']]), /Torrent not found/);
  assert.throws(() => assertRemovalResult(false), /could not remove/);
});
