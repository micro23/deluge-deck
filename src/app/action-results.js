// Deluge can acknowledge a request without applying read-only settings, and
// remove_torrents reports per-torrent failures in its result, not RPC errors.
export function torrentOptionConfig(status) {
  return {
    auto_managed: Boolean(status.is_auto_managed),
    sequential_download: Boolean(status.sequential_download),
    prioritize_first_last_pieces: Boolean(status.prioritize_first_last),
  };
}

export async function saveDaemonConfig(rpc, changes) {
  await rpc('core.set_config', [changes]);
  const saved = await rpc('core.get_config');
  const matches = (expected, actual) => expected && typeof expected === 'object'
    ? actual && Object.keys(expected).every(key => matches(expected[key], actual[key]))
    : expected === actual;
  const missing = Object.keys(changes).filter(key => !matches(changes[key], saved?.[key]));
  if (missing.length) throw new Error(`Deluge did not apply: ${missing.join(', ')}. Check the server's read-only settings.`);
  return saved;
}

export function assertRemovalResult(result) {
  if (Array.isArray(result) && result.length) {
    throw new Error(result.map(item => Array.isArray(item) ? item[1] : String(item)).join('; '));
  }
  if (result === false) throw new Error('Deluge could not remove the selected torrents.');
}

export function assertTorrentAdded(result) {
  if (typeof result !== 'string' || !result.trim())
    throw new Error('Deluge did not add this torrent. It may already be in the session, or its metadata could not be read.');
}

// web.add_torrents returns one [success, torrent ID or error] pair per upload.
export function torrentBatchResult(result, names) {
  const added = [];
  const failed = [];
  const valid = Array.isArray(result) && result.length === names.length;
  names.forEach((name, index) => {
    const item = valid ? result[index] : null;
    if (Array.isArray(item) && item[0] === true && typeof item[1] === 'string' && item[1].trim()) {
      added.push(name);
    } else {
      const detail = item?.[0] === false && typeof item[1] === 'string' ? item[1] : '';
      failed.push({ name, reason: detail || 'Deluge did not confirm the add. Check for an existing torrent or invalid metadata.' });
    }
  });
  return { added, failed };
}
