import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectHostedDaemon, readRpcResponse } from './hosted-contracts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = PACKAGE.version;
const PORT = Number(process.env.PORT || 8118);
const HOST = process.env.HOST || '127.0.0.1';
const DEMO = process.env.DELUGE_DEMO === '1';
const MAX_BODY = 64 * 1024 * 1024;
const UI_KEYS = [
  'queue', 'name', 'state', 'progress', 'total_size', 'total_done', 'total_uploaded',
  'download_payload_rate', 'upload_payload_rate', 'eta', 'ratio', 'num_seeds',
  'total_seeds', 'num_peers', 'total_peers', 'num_pieces', 'piece_length', 'tracker_host', 'tracker_status', 'save_path', 'download_location',
  'time_added', 'completed_time', 'active_time', 'seeding_time', 'num_files', 'message',
  'is_auto_managed', 'sequential_download', 'prioritize_first_last', 'max_download_speed', 'max_upload_speed', 'distributed_copies',
];
const ALLOWED_METHODS = new Set([
  'auth.login', 'auth.check_session', 'auth.delete_session', 'web.connected', 'web.connect', 'web.disconnect',
  'web.update_ui', 'web.get_torrent_status', 'web.get_torrent_files', 'web.get_torrent_info',
  'web.add_torrents', 'web.download_torrent_from_url', 'core.add_torrent_magnet', 'core.add_torrent_url',
  'core.pause_torrents', 'core.resume_torrents', 'core.remove_torrents', 'core.force_recheck',
  'core.force_reannounce', 'core.queue_top', 'core.queue_up', 'core.queue_down', 'core.queue_bottom',
  'core.set_torrent_options', 'core.move_storage', 'core.set_torrent_file_priorities', 'core.rename_files', 'core.rename_folder',
  'core.pause_session', 'core.resume_session', 'core.get_session_status', 'core.get_config',
  'core.set_config', 'core.get_free_space', 'system.listMethods', 'web.get_hosts', 'web.get_host_status', 'web.add_host', 'web.remove_host', 'web.get_plugins',
]);

const json = (value) => JSON.stringify(value);
function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : json(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(payload);
}
function error(res, status, message, detail) { send(res, status, { error: message, ...(detail ? { detail } : {}) }); }
async function bodyBuffer(req, limit = MAX_BODY) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error('Request is too large.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function bodyJson(req) {
  const raw = await bodyBuffer(req, 1024 * 1024);
  if (!raw.length) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}
function normalizeUrl(value) {
  const candidate = String(value || '').trim();
  const parsed = new URL(candidate || 'http://127.0.0.1:8112');
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Deluge URL must use http or https.');
  return parsed.toString().replace(/\/$/, '');
}
function delugeEndpoint(baseUrl, resource) {
  // A companion can target a reverse-proxy subpath such as /deluge.  Appending
  // with URL semantics retains that base path rather than silently using /json.
  return new URL(resource, `${baseUrl}/`).toString();
}
function safeOrigin(req) {
  try {
    const authority = new URL(`http://${req.headers.host || ''}`);
    // Loopback listeners must reject DNS rebinding hosts even without Origin.
    const loopback = ['127.0.0.1', 'localhost', '[::1]', '::1'];
    if (loopback.includes(HOST) && !loopback.includes(authority.hostname)) return false;
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    if (!req.headers.origin) return true;
    const origin = new URL(req.headers.origin);
    return ['http:', 'https:'].includes(origin.protocol) && origin.host === authority.host;
  } catch { return false; }
}

class DelugeClient {
  constructor() { this.baseUrl = normalizeUrl(process.env.DELUGE_URL || 'http://127.0.0.1:8112'); this.cookie = ''; this.connected = false; this.host = null; this.methods = []; this.requestId = 1; }
  async rpc(method, params = []) {
    if (!ALLOWED_METHODS.has(method) && !method.startsWith('label.')) throw new Error(`RPC method is not enabled: ${method}`);
    const response = await fetch(delugeEndpoint(this.baseUrl, 'json'), { method: 'POST', headers: { 'content-type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) }, body: json({ method, params, id: this.requestId++ }), signal: AbortSignal.timeout(30000), redirect: 'error' });
    const setCookie = response.headers.getSetCookie?.() || [];
    if (setCookie.length) this.cookie = setCookie.map((item) => item.split(';')[0]).join('; ');
    return readRpcResponse(response);
  }
  async login(password, hostId) {
    if (!password) throw new Error('Enter your Deluge Web password.');
    const ok = await this.rpc('auth.login', [password]).catch((e) => { throw new Error(`Could not reach Deluge Web: ${e.message}`); });
    if (!ok) throw new Error('Deluge rejected that password.');
    if (hostId) {
      if (await this.rpc('web.connected')) await this.rpc('web.disconnect');
      const hosts = await this.rpc('web.get_hosts');
      const host = hosts?.find((item) => item[0] === hostId);
      if (!host) throw new Error('The selected Deluge daemon host is not configured.');
      await this.rpc('web.connect', [hostId]);
      if (!await this.rpc('web.connected')) throw new Error('Deluge Web could not connect to the selected daemon host.');
      this.host = { id: host[0], host: host[1], port: host[2], status: 'Connected' };
    } else {
      await connectHostedDaemon((method, params) => this.rpc(method, params));
    }
    this.connected = true;
    this.methods = await this.rpc('system.listMethods', []).catch(() => []);
    return this.session();
  }
  async session() {
    if (!this.cookie) return { mode: 'live', authenticated: false, connected: false, delugeUrl: this.baseUrl };
    const authenticated = await this.rpc('auth.check_session', []).catch(() => false);
    const connected = authenticated ? await this.rpc('web.connected', []).catch(() => false) : false;
    this.connected = connected; return { mode: 'live', authenticated, connected, delugeUrl: this.baseUrl, host: this.host, methods: this.methods };
  }
  async upload(req) {
    const raw = await bodyBuffer(req);
    const response = await fetch(delugeEndpoint(this.baseUrl, 'upload'), { method: 'POST', headers: { 'content-type': req.headers['content-type'] || 'multipart/form-data', ...(this.cookie ? { cookie: this.cookie } : {}) }, body: raw, signal: AbortSignal.timeout(30000), redirect: 'error' });
    const text = await response.text();
    if (!response.ok) throw new Error(`Deluge upload failed with HTTP ${response.status}.`);
    try { return JSON.parse(text); } catch { throw new Error('Deluge upload returned an invalid response.'); }
  }
}

const demoTorrents = new Map([
  ['a7f1c22d8e4b6a1098aa11f232d9e04d5801b8a1', { name: 'The Last Signal (2024) · 1080p WEB-DL', state: 'Downloading', progress: 68.4, total_size: 4850000000, total_done: 3317400000, total_uploaded: 1680000000, download_payload_rate: 18400000, upload_payload_rate: 2100000, eta: 824, ratio: 0.51, num_seeds: 42, total_seeds: 86, num_peers: 12, total_peers: 38, num_pieces: 1157, piece_length: 4194304, active_time: 6824, seeding_time: 0, queue: 1, tracker_host: 'tracker.cinemaclub.org', tracker_status: 'Announcing', save_path: 'D:\\Media\\Movies', time_added: 1718112000, label: 'Movies', message: '' }],
  ['b3e1f2c9a0d441e2bd8c32a1234567890abcde12', { name: 'Ambient Worlds — Focus Vol. 03', state: 'Seeding', progress: 100, total_size: 2180000000, total_done: 2180000000, total_uploaded: 8440000000, download_payload_rate: 0, upload_payload_rate: 420000, eta: 0, ratio: 3.87, num_seeds: 0, total_seeds: 24, num_peers: 3, total_peers: 18, num_pieces: 1040, piece_length: 2097152, active_time: 186420, seeding_time: 142800, queue: 2, tracker_host: 'tracker.opentrackr.org', tracker_status: 'OK', save_path: 'D:\\Media\\Audio', time_added: 1717940200, completed_time: 1718093200, label: 'Audio', message: '' }],
  ['d1c4a2f7e8894b70a6f4a8e2cf1200aa99887766', { name: 'Open Source Design Systems 2025', state: 'Paused', progress: 24.1, total_size: 952000000, total_done: 229000000, total_uploaded: 0, download_payload_rate: 0, upload_payload_rate: 0, eta: 0, ratio: 0, num_seeds: 15, total_seeds: 31, num_peers: 0, total_peers: 14, num_pieces: 908, piece_length: 1048576, active_time: 2380, seeding_time: 0, queue: 3, tracker_host: 'academictorrents.com', tracker_status: 'Error', save_path: 'D:\\Media\\Reference', time_added: 1717700400, label: 'Learning', message: '' }],
  ['e8c2a33d91b84714ac2a99e7f5b05c0a11aa8822', { name: 'Sundown Circuit — Live at Primavera', state: 'Queued', progress: 0, total_size: 7360000000, total_done: 0, total_uploaded: 0, download_payload_rate: 0, upload_payload_rate: 0, eta: 0, ratio: 0, num_seeds: 4, total_seeds: 12, num_peers: 0, total_peers: 8, num_pieces: 1755, piece_length: 4194304, active_time: 0, seeding_time: 0, queue: 4, tracker_host: 'tracker.example.net', tracker_status: 'Queued', save_path: 'D:\\Media\\Music', time_added: 1718129000, label: 'Music', message: '' }],
]);
const demoConfig = { max_download_speed: 25000, max_upload_speed: 5000, max_connections_global: 200, download_location: 'D:\\Torrents', move_completed: false, move_completed_path: 'D:\\Completed', listen_ports: [6881, 6881], random_port: false, proxy: { hostname: '', port: 8080, type: 0, username: '', password: '', proxy_hostnames: true, proxy_peer_connections: true, proxy_tracker_connections: true, force_proxy: false, anonymous_mode: false }, cache_size: 512, cache_expiry: 60 };
let demoDaemonConnected = true;
let demoSessionPaused = false;
const demoFilePriorities = new Map();
function demoUpdate() { return { connected: demoDaemonConnected, torrents: Object.fromEntries(demoTorrents), stats: { download_rate: demoSessionPaused ? 0 : 18400000, upload_rate: demoSessionPaused ? 0 : 2520000, max_download: demoConfig.max_download_speed, max_upload: demoConfig.max_upload_speed, num_connections: demoDaemonConnected ? 17 : 0, max_num_connections: demoConfig.max_connections_global, dht_nodes: demoDaemonConnected ? 684 : 0, free_space: 428_600_000_000, has_incoming_connections: demoDaemonConnected, external_ip: '203.0.113.42' }, filters: { state: ['Downloading', 'Seeding', 'Paused', 'Queued'] }, fetchedAt: Date.now() }; }
function moveDemoQueue(ids, direction) {
  const selected = new Set(ids);
  const ordered = [...demoTorrents.entries()].sort((left, right) => Number(left[1].queue) - Number(right[1].queue));
  const chosen = ordered.filter(([id]) => selected.has(id));
  const remaining = ordered.filter(([id]) => !selected.has(id));
  if (direction === 'top') ordered.splice(0, ordered.length, ...chosen, ...remaining);
  if (direction === 'bottom') ordered.splice(0, ordered.length, ...remaining, ...chosen);
  if (direction === 'up') for (let index = 1; index < ordered.length; index += 1) { if (selected.has(ordered[index][0]) && !selected.has(ordered[index - 1][0])) [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]]; }
  if (direction === 'down') for (let index = ordered.length - 2; index >= 0; index -= 1) { if (selected.has(ordered[index][0]) && !selected.has(ordered[index + 1][0])) [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]]; }
  ordered.forEach(([, torrent], index) => { torrent.queue = index; });
}
function demoRpc(method, params) {
  const ids = params?.[0] || [];
  if (method === 'web.update_ui') return demoUpdate();
  if (method === 'web.connected') return demoDaemonConnected;
  if (method === 'web.disconnect') { demoDaemonConnected = false; return true; }
  if (method === 'web.connect') { demoDaemonConnected = true; return true; }
  if (method === 'web.get_hosts') return [['demo-local', '127.0.0.1', 58846, demoDaemonConnected ? 'Connected' : 'Offline'], ['demo-archive', '192.168.1.24', 58846, 'Online']];
  if (method === 'web.add_host') return [true, `demo-${String(params[0] || 'host')}-${Number(params[1] || 58846)}`];
  if (method === 'web.remove_host') return true;
  if (method === 'web.get_host_status') return [params[0], params[0] === 'demo-local' && demoDaemonConnected ? 'Connected' : 'Online', '2.1.1'];
  if (method === 'web.get_plugins') return { enabled_plugins: ['Label', 'Scheduler', 'WebUi'], available_plugins: ['AutoAdd', 'Blocklist', 'Extractor', 'Label', 'Notifications', 'Scheduler', 'WebUi'] };
  if (method === 'core.get_config') return { ...demoConfig };
  if (method === 'core.set_config') { Object.assign(demoConfig, params[0] || {}); return true; }
  if (method === 'core.get_free_space') return 428_600_000_000;
  if (method === 'core.pause_session') { demoSessionPaused = true; demoTorrents.forEach((torrent) => { if (['Downloading', 'Seeding'].includes(torrent.state)) torrent.state = 'Paused'; }); return true; }
  if (method === 'core.resume_session') { demoSessionPaused = false; demoTorrents.forEach((torrent) => { if (torrent.state === 'Paused') torrent.state = 'Downloading'; }); return true; }
  if (method === 'core.get_session_status') return { payload_download_rate: demoSessionPaused ? 0 : 18400000, payload_upload_rate: demoSessionPaused ? 0 : 2520000 };
  if (method === 'core.force_reannounce') { ids.forEach((id) => { if (demoTorrents.has(id)) demoTorrents.get(id).tracker_status = 'Announcing'; }); return true; }
  if (method === 'web.get_torrent_status') { const torrent = demoTorrents.get(params[0]); return torrent ? { ...torrent, magnet_uri: `magnet:?xt=urn:btih:${params[0]}&dn=${encodeURIComponent(torrent.name)}` } : {}; }
  if (method === 'web.get_torrent_files') { const priorities = demoFilePriorities.get(params[0]) || [4, 4]; return [{ path: 'Sample folder/readme.txt', size: 1200000, progress: 100, availability: 1, priority: priorities[0], index: 0 }, { path: 'Sample folder/video.mkv', size: 4800000000, progress: 68, availability: 0.84, priority: priorities[1], index: 1 }]; }
  if (method === 'core.set_torrent_file_priorities') { demoFilePriorities.set(params[0], Array.isArray(params[1]) ? params[1].map((value) => Number(value) || 0) : []); return true; }
  if (method === 'core.pause_torrents') ids.forEach((id) => { if (demoTorrents.has(id)) demoTorrents.get(id).state = 'Paused'; });
  if (method === 'core.resume_torrents') ids.forEach((id) => { if (demoTorrents.has(id)) demoTorrents.get(id).state = 'Downloading'; });
  if (method.startsWith('core.queue_')) { moveDemoQueue(ids, method.slice('core.queue_'.length)); return true; }
  if (method === 'core.move_storage') { ids.forEach((id) => { if (demoTorrents.has(id)) demoTorrents.get(id).save_path = String(params[1] || ''); }); return true; }
  if (method === 'core.rename_files') { const renamed = params[1]?.[0]?.[1]; if (demoTorrents.has(params[0]) && renamed) demoTorrents.get(params[0]).name = String(renamed).split('/').pop(); return true; }
  if (method === 'core.rename_folder') { if (demoTorrents.has(params[0]) && params[2]) demoTorrents.get(params[0]).name = String(params[2]).split('/').pop(); return true; }
  if (method === 'core.remove_torrents') ids.forEach((id) => demoTorrents.delete(id));
  if (method === 'core.add_torrent_magnet') { const id = `demo-${Date.now()}`; demoTorrents.set(id, { name: String(params[0]).slice(0, 52), state: 'Downloading', progress: 0, total_size: 0, total_done: 0, total_uploaded: 0, download_payload_rate: 0, upload_payload_rate: 0, eta: 0, ratio: 0, num_seeds: 0, total_seeds: 0, num_peers: 0, total_peers: 0, queue: demoTorrents.size + 1, tracker_host: 'magnet', save_path: 'D:\\Media', time_added: Math.floor(Date.now() / 1000), label: '', message: '' }); return id; }
  return true;
}
let client = DEMO ? null : new DelugeClient();
let demoSession = DEMO;

async function route(req, res) {
  if (!safeOrigin(req)) return error(res, 403, 'Origin not allowed.');
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const pathname = parsed.pathname;
    if (req.method === 'GET' && pathname === '/api/health') return send(res, 200, { ok: true, mode: DEMO ? 'demo' : 'live', version: VERSION });
    if (req.method === 'GET' && pathname === '/api/session') return send(res, 200, DEMO ? { mode: 'demo', authenticated: demoSession, connected: demoSession && demoDaemonConnected, delugeUrl: 'demo://local', host: { id: 'demo-local', host: 'Demo daemon', port: 58846 }, methods: [] } : await client.session());
    if (req.method === 'POST' && pathname === '/api/session/connect') {
      if (DEMO) { demoSession = true; demoDaemonConnected = true; return send(res, 200, { mode: 'demo', authenticated: true, connected: true, delugeUrl: 'demo://local', host: { id: 'demo-local', host: 'Demo daemon', port: 58846 } }); }
      const input = await bodyJson(req);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return error(res, 400, 'Connection settings must be an object.');
      // Authenticate a fresh client so a changed endpoint never receives the old cookie.
      const candidate = new DelugeClient();
      candidate.baseUrl = normalizeUrl(input.url || client.baseUrl);
      const session = await candidate.login(input.password, input.hostId);
      client = candidate;
      return send(res, 200, session);
    }
    if (req.method === 'POST' && pathname === '/api/session/disconnect') {
      if (!DEMO) { await client.rpc('auth.delete_session', []).catch(() => {}); client.cookie = ''; client.connected = false; } else demoSession = false;
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && pathname === '/api/torrents') {
      if (DEMO) return send(res, 200, demoUpdate());
      const result = await client.rpc('web.update_ui', [UI_KEYS, {}]); return send(res, 200, { ...result, fetchedAt: Date.now() });
    }
    if (req.method === 'POST' && pathname === '/api/rpc') {
      const input = await bodyJson(req); if (!input || typeof input.method !== 'string' || !input.method || !Array.isArray(input.params)) return error(res, 400, 'RPC method and params are required.');
      if (!ALLOWED_METHODS.has(input.method) && !input.method.startsWith('label.')) return error(res, 400, `RPC method is not enabled: ${input.method}`);
      if (DEMO) return send(res, 200, { result: demoRpc(input.method, input.params) });
      return send(res, 200, { result: await client.rpc(input.method, input.params) });
    }
    if (req.method === 'POST' && pathname === '/api/upload') {
      if (DEMO) return send(res, 200, { success: true, files: ['C:\\Temp\\demo-upload.torrent'] });
      const session = await client.session(); if (!session.authenticated) return error(res, 401, 'Your Deluge session expired. Sign in again.');
      return send(res, 200, await client.upload(req));
    }
    if (pathname.startsWith('/api/')) return error(res, 404, 'API route not found.');
    if (req.method !== 'GET') return error(res, 405, 'Method not allowed.');
    return serveStatic(pathname, res);
  } catch (e) { return error(res, e.status || (e.message?.includes('too large') ? 413 : 500), e.message || 'Unexpected server error.'); }
}
async function serveStatic(pathname, res) {
  const candidate = path.resolve(ROOT, 'dist', pathname === '/' ? 'index.html' : pathname.slice(1));
  if (!candidate.startsWith(path.resolve(ROOT, 'dist') + path.sep)) return error(res, 403, 'Invalid path.');
  try {
    const info = await stat(candidate);
    if (!info.isFile()) throw new Error('not file');
    const content = await readFile(candidate);
    const ext = path.extname(candidate);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' });
    res.end(content);
  } catch {
    if (pathname !== '/' && !path.extname(pathname) && !pathname.startsWith('/assets/')) return serveStatic('/', res);
    error(res, 404, pathname === '/' ? 'Build the frontend first with npm run build.' : 'File not found.');
  }
}

const server = http.createServer((req, res) => route(req, res));
export { DelugeClient, safeOrigin, server };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) server.listen(PORT, HOST, () => console.log(`Deluge listening at http://${HOST}:${PORT}${DEMO ? ' (demo mode)' : ''}`));
