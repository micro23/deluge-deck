import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTorrents } from '../src/app/torrent-model.js';

test('identical polling feeds preserve snapshots even when hash enumeration changes', () => {
  const torrents = { a: { queue: 0, state: 'Paused', name: 'A' }, b: { queue: 1, state: 'Seeding', name: 'B' } };
  const first = mapTorrents({ torrents });
  const next = mapTorrents({ torrents: { b: { ...torrents.b }, a: { ...torrents.a } } }, first);
  assert.equal(next, first);
});

test('changed, added, removed and reordered torrents invalidate only the affected snapshots', () => {
  const first = mapTorrents({ torrents: { a: { queue: 0, progress: 10 }, b: { queue: 1, progress: 100 } } });
  const changed = mapTorrents({ torrents: { a: { queue: 0, progress: 11 }, b: { queue: 1, progress: 100 } } }, first);
  assert.notEqual(changed, first);
  assert.notEqual(changed[0], first[0]);
  assert.equal(changed[1], first[1]);
  const reordered = mapTorrents({ torrents: { a: { queue: 2, progress: 11 }, b: { queue: 1, progress: 100 } } }, changed);
  assert.deepEqual(reordered.map(row => row.hash), ['b', 'a']);
  const removed = mapTorrents({ torrents: { b: { queue: 1, progress: 100 } } }, reordered);
  assert.equal(removed[0], first[1]);
  const added = mapTorrents({ torrents: { b: { queue: 1, progress: 100 }, c: { queue: -1, progress: 0 } } }, removed);
  assert.deepEqual(added.map(row => row.hash), ['b', 'c']);
  assert.deepEqual(mapTorrents({ torrents: {} }, added), []);
});

test('removed fields and new nested values invalidate snapshots; the feed key supplies the hash', () => {
  const first = mapTorrents({ torrents: { a: { queue: 0, extra: 'old', hash: 'incorrect' } } });
  assert.equal(first[0].hash, 'a');
  const removed = mapTorrents({ torrents: { a: { queue: 0 } } }, first);
  assert.equal('extra' in removed[0], false);
  const nested = mapTorrents({ torrents: { a: { queue: 0, extra: ['new'] } } }, removed);
  assert.notEqual(mapTorrents({ torrents: { a: { queue: 0, extra: ['new'] } } }, nested), nested);
});
