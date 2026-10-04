import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.join(root, 'plugin', 'deluge_deck', 'data');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const port = Number(process.env.PORT || 8130);
let authenticated = false;

const fixture = `<!doctype html><html><head><meta charset="UTF-8"><title>Hosted DelugeDeck layout fixture</title></head><body><div id="main-viewport" class="x-viewport" style="height:100vh;background:#fff">Legacy Deluge viewport</div><script src="/deluge-deck-${version}-style.js"></script><script src="/deluge-deck-${version}-plugin.js"></script><script src="/deluge-deck-${version}.js"></script></body></html>`;
// Classic preferences are displayed after the style loader has finished booting.
const classicFixture = `<!doctype html><html class="deluge-deck-hosted deluge-deck-ready"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Classic Preferences fixture</title><link rel="stylesheet" href="/deluge-deck-${version}.css"><script src="/deluge-deck-${version}-style.js"></script><style>body{min-height:100vh;margin:0;background:radial-gradient(circle at 70% 0%,var(--surface-3),var(--bg) 55%)}.classic-columns{height:438px}.classic-nav{float:left;width:120px;height:100%}.classic-form-panel{height:100%;margin-left:126px;overflow:hidden}.classic-form-panel .x-panel-body{height:100%}.x-window-footer table{margin-left:auto}.x-panel-btns td{padding-left:7px}</style></head><body><div class="x-window" data-deluge-deck-native-window="true"><div class="x-window-tl"><div class="x-window-tr"><div class="x-window-tc"><div class="x-window-header"><span class="x-window-header-text x-deluge-preferences">Preferences</span><div class="x-tool x-tool-close" aria-label="Close"></div></div></div></div></div><div class="x-window-bwrap"><div class="x-window-ml"><div class="x-window-mr"><div class="x-window-mc"><div class="x-window-body"><div class="classic-columns x-border-layout-ct"><div class="classic-nav x-panel x-border-panel"><div class="x-panel-body"><div class="x-list-wrap"><div class="x-list-body">${['Downloads','Network','Encryption','Bandwidth','Interface','Other','Daemon','Queue','Proxy','Cache','Plugins','AutoAdd','ItConfig','Extractor Plus'].map((label, index) => `<dl class="${index === 0 ? 'x-list-selected' : ''}"><dt><em><span>${label}</span></em></dt></dl>`).join('')}</div></div></div></div><div class="classic-form-panel x-panel x-border-panel"><div class="x-panel-body"><form class="x-form"><fieldset class="x-fieldset"><legend class="x-fieldset-header">Folders</legend><div class="x-form-item"><label class="x-form-item-label">Download to:</label><input class="x-form-text" value="D:\\Torrents" style="width:280px"></div><div class="x-form-item"><label class="x-form-item-label">Move completed to:</label><div class="x-toggle-field"><table><tr><td><input class="x-form-checkbox" type="checkbox" checked></td><td><input class="x-form-text" value="D:\\Completed" style="width:240px"></td></tr></table></div></div><div class="x-form-item"><label class="x-form-item-label">Copy of .torrent files to:</label><div class="x-toggle-field"><table><tr><td><input class="x-form-checkbox" type="checkbox"></td><td><input class="x-form-text x-item-disabled" disabled style="width:240px"></td></tr></table></div></div></fieldset><fieldset class="x-fieldset"><legend class="x-fieldset-header">Options</legend>${['Prioritize first and last pieces of torrent','Sequential download','Add torrents in Paused state','Pre-allocate disk space'].map((label, index) => `<div class="x-form-item"><div class="x-form-check-wrap"><input class="x-form-checkbox" type="checkbox" ${index < 2 ? 'checked' : ''}><label class="x-form-cb-label">${label}</label></div></div>`).join('')}</fieldset></form></div></div></div></div></div></div><div class="x-window-footer"><div class="x-panel-btns"><table><tr>${['Close','Apply','OK'].map(label => `<td><table class="x-btn"><tr><td><button>${label}</button></td></tr></table></td>`).join('')}</tr></table></div></div></div></div></body></html>`;
const spinner = (value) => `<div class="x-form-field-wrap"><input class="x-form-text" value="${value}" style="width:56px"><img class="x-form-trigger x-form-spinner-trigger"></div>`;
const networkForm = `<fieldset class="x-fieldset"><legend class="x-fieldset-header">Incoming Interface</legend><input class="x-form-text" style="width:200px"></fieldset><fieldset class="x-fieldset"><legend class="x-fieldset-header">Incoming Port</legend><div class="x-form-item"><div class="x-form-check-wrap"><input class="x-form-checkbox" type="checkbox" checked><label class="x-form-cb-label">Use Random Port</label></div></div>${spinner('50001')}</fieldset><fieldset class="x-fieldset"><legend class="x-fieldset-header">Outgoing Interface</legend><input class="x-form-text" style="width:200px"></fieldset><fieldset class="x-fieldset"><legend class="x-fieldset-header">Outgoing Ports</legend><div class="x-form-item"><div class="x-form-check-wrap"><input class="x-form-checkbox" type="checkbox" checked><label class="x-form-cb-label">Use Random Ports</label></div></div><table><tr><td><label class="x-form-item-label">From:</label></td><td>${spinner('0')}</td><td style="padding-left:14px!important"><label class="x-form-item-label">To:</label></td><td>${spinner('0')}</td></tr></table></fieldset><fieldset class="x-fieldset"><legend class="x-fieldset-header">Network Extras</legend><table>${[['UPnP','NAT-PMP'],['LSD','DHT']].map(row => `<tr>${row.map(label => `<td style="width:150px!important"><div class="x-form-check-wrap"><input class="x-form-checkbox" type="checkbox" checked><label class="x-form-cb-label">${label}</label></div></td>`).join('')}</tr>`).join('')}</table></fieldset>`;
const bandwidthRows = ['Maximum Connections:','Maximum Upload Slots:','Maximum Download Speed (KiB/s):','Maximum Upload Speed (KiB/s):','Maximum Half-Open Connections:','Maximum Connection Attempts per Second:'];
const bandwidthForm = `<fieldset class="x-fieldset"><legend class="x-fieldset-header">Global Bandwidth Usage</legend>${bandwidthRows.map((label,index) => `<div class="x-form-item"><label class="x-form-item-label" style="display:inline-block;width:210px">${label}</label><span style="display:inline-block">${spinner(index > 3 ? '20' : '-1')}</span></div>`).join('')}<div class="x-form-check-wrap"><input class="x-form-checkbox" type="checkbox" checked><label class="x-form-cb-label">Ignore limits on local network</label></div><div class="x-form-check-wrap"><input class="x-form-checkbox" type="checkbox" checked><label class="x-form-cb-label">Rate limit IP overhead</label></div></fieldset><fieldset class="x-fieldset"><legend class="x-fieldset-header">Per Torrent Bandwidth Usage</legend>${bandwidthRows.slice(0,4).map(label => `<div class="x-form-item"><label class="x-form-item-label" style="display:inline-block;width:210px">${label}</label><span style="display:inline-block">${spinner('-1')}</span></div>`).join('')}</fieldset>`;
const classicPanelFixture = (panel) => {
  if (panel === 'Downloads') return classicFixture;
  const content = panel === 'Network' ? networkForm : bandwidthForm;
  return classicFixture
    .replace('class="x-list-selected"', 'class=""')
    .replace(`<dl class=""><dt><em><span>${panel}</span>`, `<dl class="x-list-selected"><dt><em><span>${panel}</span>`)
    .replace(/<form class="x-form">[\s\S]*<\/form>/, `<form class="x-form">${content}</form>`);
};
const update = {
  torrents: {
    fixture: { name: 'Hosted layout fixture', state: 'Seeding', progress: 100, total_size: 648753971, total_done: 648753971, total_uploaded: 14575206, download_payload_rate: 0, upload_payload_rate: 0, eta: 0, ratio: 0.02, num_seeds: 1, total_seeds: 1, num_peers: 0, total_peers: 0, queue: 1, tracker_host: 'fixture.local', save_path: 'D:\\Torrents' },
  },
  stats: { download_rate: 0, upload_rate: 0, num_connections: 1, dht_nodes: 0 },
  filters: {},
};

const json = (res, body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(fixture); return; }
  if (req.method === 'GET' && req.url === '/classic') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(classicFixture); return; }
  if (req.method === 'GET' && req.url === '/classic-network') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(classicPanelFixture('Network')); return; }
  if (req.method === 'GET' && req.url === '/classic-bandwidth') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(classicPanelFixture('Bandwidth')); return; }
  if (req.method === 'POST' && req.url === '/reset') { authenticated = false; json(res, { ok: true }); return; }
  if (req.method === 'POST' && req.url === '/json') {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const { method } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (method === 'auth.check_session' || method === 'web.connected') return json(res, { result: authenticated });
    if (method === 'auth.login') { authenticated = true; return json(res, { result: true }); }
    if (method === 'web.update_ui') return json(res, { result: update });
    if (method === 'web.get_torrent_files') return json(res, { result: [{ type: 'file', path: 'Lioness.2023.S03E05.1080p.x265-ELiTE.mkv', size: 624531866, progress: 100 }, { type: 'file', path: 'Lioness.2023.S03E05.1080p.x265-ELiTE.nfo', size: 1331, progress: 100 }] });
    if (method === 'auth.delete_session') { authenticated = false; return json(res, { result: true }); }
    return json(res, { result: true });
  }
  if (req.url.startsWith('/deluge-deck-resources/')) {
    const candidate = path.resolve(data, 'resources', req.url.slice('/deluge-deck-resources/'.length));
    if (!candidate.startsWith(path.resolve(data, 'resources') + path.sep)) { res.writeHead(403); return res.end(); }
    try {
      const content = await readFile(candidate);
      const ext = path.extname(candidate);
      res.setHeader('content-type', ({ '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' })[ext] || 'application/octet-stream');
      return res.end(content);
    } catch { res.writeHead(404); return res.end(); }
  }
  const asset = path.basename(req.url || '');
  if (![`deluge-deck-${version}-style.js`, `deluge-deck-${version}-plugin.js`, `deluge-deck-${version}.js`, `deluge-deck-${version}.css`].includes(asset)) { res.writeHead(404); res.end(); return; }
  try {
    const content = await readFile(path.join(data, asset));
    res.writeHead(200, { 'content-type': asset.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(content);
  }
  catch { res.writeHead(404); res.end('Build the plugin first with npm run build:plugin.'); }
});

server.listen(port, '127.0.0.1', () => console.log(`Hosted layout fixture listening at http://127.0.0.1:${port}`));
