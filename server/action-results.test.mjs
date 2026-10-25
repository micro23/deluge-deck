import test from 'node:test';
import assert from 'node:assert/strict';
import { saveDaemonConfig, assertRemovalResult, torrentOptionConfig, assertTorrentAdded, torrentBatchResult } from '../src/app/action-results.js';

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

test('magnet and URL adds require a torrent ID, not merely a successful RPC', () => {
  assert.doesNotThrow(() => assertTorrentAdded('torrent-id'));
  for (const result of [null, false, true, '', ' ', [], {}])
    assert.throws(() => assertTorrentAdded(result), /did not add this torrent/);
});

test('batch adds distinguish confirmed torrents from failed or duplicate adds', () => {
  const result = torrentBatchResult([[true, 'torrent-id'], [false, 'Invalid metadata'], [true, null]], ['good.torrent', 'bad.torrent', 'duplicate.torrent']);
  assert.deepEqual(result.added, ['good.torrent']);
  assert.deepEqual(result.failed.map(item => item.name), ['bad.torrent', 'duplicate.torrent']);
  assert.equal(result.failed[0].reason, 'Invalid metadata');
  assert.match(result.failed[1].reason, /did not confirm/);
});

test('malformed batch results never silently drop an unconfirmed upload', () => {
  for (const result of [null, true, [], [[true, 'one']], [[false, {}], [true, '']]]) {
    const checked = torrentBatchResult(result, ['first.torrent', 'second.torrent']);
    assert.equal(checked.added.length, 0);
    assert.equal(checked.failed.length, 2);
  }
});
