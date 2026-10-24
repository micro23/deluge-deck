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
