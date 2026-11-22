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

export function normalizeTorrentFiles(payload) {
  const rows = [];
  const join = (prefix, part = '') => {
    if (!prefix) return part;
    if (!part || part === prefix || part.startsWith(`${prefix}/`)) return part || prefix;
    return `${prefix}/${part}`;
  };
  const visit = (node, prefix = '') => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach((item) => visit(item, prefix)); return; }
    if (typeof node !== 'object') return;
    const rawPath = String(node.path || node.name || node.filename || '');
    const path = join(prefix, rawPath);
    if (node.contents != null) {
      const children = Array.isArray(node.contents) ? node.contents : Object.values(node.contents);
      children.forEach((child) => visit(child, path));
      return;
    }
    if (path) rows.push({ ...node, path });
  };
  visit(payload);
  return rows;
}

export function formatBytes(value = 0) {
  let size = Number(value) || 0;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function createRequestGate() {
  let generation = 0;
  return {
    begin: () => ++generation,
    cancel: () => { generation += 1; },
    isCurrent: (token) => token === generation,
  };
}

export function daemonHostStatus(response, hostId) {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    if (response.connected === true) return 'Connected';
    return daemonHostStatus(response.status ?? response.state ?? response.connection_status, hostId);
  }
  const value = Array.isArray(response) ? (response[0] === hostId ? response[1] : response[0]) : response;
  const status = String(value || '').toLowerCase();
  if (status === 'connected') return 'Connected';
  if (status === 'online' || status === 'available') return 'Online';
  return 'Offline';
}

export function addedHostId(result) {
  const id = Array.isArray(result) ? result[0] === true && result[1] : result;
  if (typeof id !== 'string' || !id)
    throw new Error(Array.isArray(result) && typeof result[1] === 'string' ? result[1] : 'Deluge could not add this host.');
  return id;
}

export async function readRpcResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) {
    const reason = payload?.error;
    const message = reason?.message || (typeof reason === 'string' && reason);
    const sessionExpired = reason?.code === 1 || message === 'Not authenticated';
    const unauthorized = response.status === 401 || sessionExpired;
    const error = new Error(message || (unauthorized ? 'Your Deluge session expired. Sign in again.' : `Deluge returned HTTP ${response.status}.`));
    if (unauthorized) error.status = 401;
    if (sessionExpired) error.sessionExpired = true;
    throw error;
  }
  if (!payload || !Object.hasOwn(payload, 'result'))
    throw new Error('Deluge returned an invalid RPC response.');
  return payload.result;
}

export async function connectHostedDaemon(call) {
  if (await call('web.connected')) return true;
  const hosts = await call('web.get_hosts');
  const candidates = [];
  for (const host of Array.isArray(hosts) ? hosts : []) {
    if (!Array.isArray(host) || !host[0]) continue;
    const kind = daemonHostStatus(await call('web.get_host_status', [host[0]]).catch(() => null), host[0]);
    if (kind !== 'Offline') candidates.push({ host, kind });
  }
  const host = (candidates.find((candidate) => candidate.kind === 'Connected') || candidates[0])?.host;
  if (!host) throw new Error('No available Deluge daemon hosts are configured in this WebUI.');
  await call('web.connect', [host[0]]);
  if (!await call('web.connected')) throw new Error('Deluge Web could not connect to the selected daemon host.');
  return true;
}

export async function authenticateAndConnectHosted(call, password) {
  if (!await call('auth.login', [password])) throw new Error('Deluge rejected that password.');
  return connectHostedDaemon(call).catch(() => false);
}

export async function endWebSession(call) {
  try {
    if (await call('auth.delete_session') !== true)
      throw new Error('Deluge did not confirm the end of your Web session.');
  } catch (error) {
    // An expired Deluge session is signed out. A proxy's HTTP 401 alone cannot
    // confirm whether the request reached Deluge.
    if (error.sessionExpired) return;
    if (error.status === 401) throw new Error('The Web endpoint denied the sign-out request (HTTP 401).');
    throw error;
  }
}

export function serializeRpcRequest(request) {
  return JSON.stringify(request, (key, value) => key === 'download_location' && typeof value === 'string' && !value.trim() ? undefined : value);
}
