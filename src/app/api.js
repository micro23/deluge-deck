import {
  authenticateAndConnectHosted,
  serializeRpcRequest,
} from '../../server/hosted-contracts.mjs';

export const UI_KEYS = [
  'queue', 'name', 'state', 'progress', 'total_size', 'total_done',
  'total_uploaded', 'download_payload_rate', 'upload_payload_rate', 'eta',
  'ratio', 'num_seeds', 'total_seeds', 'num_peers', 'total_peers',
  'num_pieces', 'piece_length', 'tracker_host', 'tracker_status', 'save_path',
  'download_location', 'time_added', 'completed_time', 'active_time',
  'seeding_time', 'num_files', 'message',
];

// Bootstrap and the compiled app are injected as separate Deluge Web scripts.
// Keep this dynamic so an early app evaluation adopts hosted mode once
// bootstrap has installed its globals rather than becoming permanently
// standalone.
export const pluginMode = () => Boolean(window.__DELUGE_DECK_PLUGIN__);
export const hostedUrl = (resource) =>
  new URL(resource, new URL('.', document.baseURI)).toString();
export const endpoint = (resource) => (pluginMode() ? hostedUrl(resource) : resource);

export async function rpc(method, params = []) {
  const response = await fetch(endpoint(pluginMode() ? 'json' : '/api/rpc'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: serializeRpcRequest({ method, params, id: Date.now() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error)
    throw new Error(
      payload.error?.message || payload.error || 'Deluge request failed.',
    );
  return payload.result;
}

export const api = {
  session: async () => {
    if (!pluginMode())
      return fetch('/api/session').then((response) => response.json());
    const authenticated = await rpc('auth.check_session').catch(() => false);
    const connected = authenticated
      ? await rpc('web.connected').catch(() => false)
      : false;
    return {
      mode: 'plugin',
      authenticated,
      connected,
      delugeUrl: window.location.origin,
    };
  },
  torrents: () =>
    pluginMode()
      ? rpc('web.update_ui', [UI_KEYS, {}]).then((result) => ({
          ...result,
          fetchedAt: Date.now(),
        }))
      : fetch('/api/torrents').then((response) => {
          if (!response.ok) throw new Error('Session expired');
          return response.json();
        }),
  connect: async (url, password) => {
    if (pluginMode()) {
      await authenticateAndConnectHosted(rpc, password);
      const result = await api.session();
      if (!result.connected)
        throw new Error(
          'Deluge Web is authenticated but has not connected to a daemon host.',
        );
      return result;
    }
    const response = await fetch('/api/session/connect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, password }),
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated || !result.connected)
      throw new Error(result.error || 'Unable to connect to Deluge.');
    return result;
  },
  disconnect: () =>
    pluginMode()
      ? rpc('auth.delete_session').catch(() => undefined)
      : fetch('/api/session/disconnect', { method: 'POST' }),
  upload: async (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('file', file));
    const response = await fetch(
      endpoint(pluginMode() ? 'upload' : '/api/upload'),
      { method: 'POST', credentials: 'same-origin', body: form },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success || !result.files?.length)
      throw new Error(
        result.error || 'Deluge did not accept those torrent files.',
      );
    return result.files;
  },
};
