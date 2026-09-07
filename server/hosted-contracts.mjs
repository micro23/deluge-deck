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

function hostStatusKind(response, hostId) {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    if (response.connected === true) return 'connected';
    return hostStatusKind(response.status ?? response.state ?? response.connection_status, hostId);
  }
  const value = Array.isArray(response) ? (response[0] === hostId ? response[1] : response[1] ?? response[0]) : response;
  const status = String(value || '').toLowerCase();
  if (status === 'connected') return 'connected';
  if (/online|available|connected/.test(status)) return 'online';
  return 'offline';
}

export async function connectHostedDaemon(call) {
  if (await call('web.connected')) return true;
  const hosts = await call('web.get_hosts');
  const candidates = [];
  for (const host of Array.isArray(hosts) ? hosts : []) {
    if (!Array.isArray(host) || !host[0]) continue;
    const kind = hostStatusKind(await call('web.get_host_status', [host[0]]), host[0]);
    if (kind !== 'offline') candidates.push({ host, kind });
  }
  const host = (candidates.find((candidate) => candidate.kind === 'connected') || candidates[0])?.host;
  if (!host) throw new Error('No available Deluge daemon hosts are configured in this WebUI.');
  await call('web.connect', [host[0]]);
  if (!await call('web.connected')) throw new Error('Deluge Web could not connect to the selected daemon host.');
  return true;
}

export async function authenticateAndConnectHosted(call, password) {
  if (!await call('auth.login', [password])) throw new Error('Deluge rejected that password.');
  return connectHostedDaemon(call);
}

export function serializeRpcRequest(request) {
  return JSON.stringify(request, (key, value) => key === 'download_location' && typeof value === 'string' && !value.trim() ? undefined : value);
}
