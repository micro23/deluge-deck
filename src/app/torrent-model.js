const queueRank = torrent => Number(torrent.queue) >= 0 ? Number(torrent.queue) : Number.MAX_SAFE_INTEGER;

// Preserve unchanged snapshots so polling does not invalidate sorting, filters,
// and table measurements in an idle library. Compare every returned field;
// unknown/nested fields remain conservative and invalidate the snapshot.
export function mapTorrents(data, previous = []) {
  const byHash = new Map(previous.map(torrent => [torrent.hash, torrent]));
  const next = Object.entries(data?.torrents || {}).map(([hash, torrent]) => {
    const old = byHash.get(hash);
    const keys = Object.keys(torrent);
    if (old && Object.keys(old).length === keys.length + 1 &&
        keys.every(key => key !== 'hash' && Object.is(old[key], torrent[key]))) return old;
    return { ...torrent, hash };
  });
  if (next.length === previous.length && next.every(torrent => byHash.get(torrent.hash) === torrent)) return previous;
  return next.sort((left, right) => queueRank(left) - queueRank(right));
}
