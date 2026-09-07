const baseUrl = String(process.env.DELUGE_URL || 'http://127.0.0.1:8112').replace(/\/$/, '');
const password = process.env.DELUGE_PASSWORD;
if (!password) {
  console.error('Set DELUGE_PASSWORD for this one-shot check; it is never written to disk.');
  process.exit(2);
}
let id = 1;
let cookie = '';
async function rpc(method, params = []) {
  const response = await fetch(new URL('json', `${baseUrl}/`), { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ method, params, id: id++ }) });
  const setCookie = response.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((item) => item.split(';')[0]).join('; ');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `HTTP ${response.status}`);
  return payload.result;
}
try {
  const login = await rpc('auth.login', [password]);
  if (!login) throw new Error('Deluge rejected the password.');
  const authenticated = await rpc('auth.check_session');
  const connected = await rpc('web.connected');
  const ui = connected ? await rpc('web.update_ui', [['name', 'state', 'progress', 'total_size'], {}]) : null;
  console.log(JSON.stringify({ ok: true, baseUrl, authenticated, connected, torrentCount: Object.keys(ui?.torrents || {}).length }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, baseUrl, error: error.message }, null, 2));
  process.exit(1);
}
