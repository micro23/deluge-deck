import {
  authenticateAndConnectHosted,
  serializeRpcRequest,
  readRpcResponse,
} from '../../server/hosted-contracts.mjs';

export const UI_KEYS = [
  'queue', 'name', 'state', 'progress', 'total_size', 'total_done',
  'total_uploaded', 'download_payload_rate', 'upload_payload_rate', 'eta',
  'ratio', 'num_seeds', 'total_seeds', 'num_peers', 'total_peers',
  'num_pieces', 'piece_length', 'tracker_host', 'tracker_status', 'save_path',
  'download_location', 'time_added', 'completed_time', 'active_time',
  'seeding_time', 'num_files', 'message',
  'is_auto_managed', 'sequential_download', 'prioritize_first_last',
  'max_download_speed', 'max_upload_speed', 'distributed_copies',
];

// Bootstrap and the compiled app are injected as separate Deluge Web scripts.
// Keep this dynamic so an early app evaluation adopts hosted mode once
// bootstrap has installed its globals rather than becoming permanently
// standalone.
export const pluginMode = () => Boolean(window.__DELUGE_DECK_PLUGIN__);
export const hostedUrl = (resource) =>
  new URL(resource, new URL('.', document.baseURI)).toString();
export const endpoint = (resource) => (pluginMode() ? hostedUrl(resource) : resource);
export const assetUrl = (resource) => {
  if (!resource || typeof resource !== 'string') return resource;
  if (resource.startsWith('data:') || resource.startsWith('http://') || resource.startsWith('https://')) return resource;
  if (pluginMode()) {
    const filename = resource.split('/').pop();
    return hostedUrl(`deluge-deck-resources/assets/${filename}`);
  }
  return resource;
};
const request = (url, options = {}) => fetch(url, { signal: AbortSignal.timeout(60000), ...options });

export async function rpc(method, params = []) {
  const response = await request(endpoint(pluginMode() ? 'json' : '/api/rpc'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: serializeRpcRequest({ method, params, id: Date.now() }),
  });
  return readRpcResponse(response);
}

export const api = {
  session: async () => {
    if (!pluginMode())
      return request('/api/session').then((response) => {
        if (!response.ok) throw new Error('Unable to check your Deluge session.');
        return response.json();
      });
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
  torrents: async () => {
    const data = await (pluginMode()
      ? rpc('web.update_ui', [UI_KEYS, {}]).then((result) => ({
          ...result,
          fetchedAt: Date.now(),
        }))
      : request('/api/torrents').then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error(payload?.error?.message || payload?.error || (response.status === 401 ? 'Session expired' : 'Unable to reach Deluge.'));
          return payload;
        }));
    if (!data || typeof data.torrents !== 'object' || !data.torrents || Array.isArray(data.torrents))
      throw new Error(data?.connected === false ? 'Deluge daemon is disconnected. Open the connection manager to reconnect.' : 'Deluge returned an invalid torrent feed.');
    return data;
  },
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
    const response = await request('/api/session/connect', {
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
      : request('/api/session/disconnect', { method: 'POST' }),
  upload: async (files) => {
    const form = new FormData();
    files.forEach((file) => form.append('file', file));
    const response = await request(
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
