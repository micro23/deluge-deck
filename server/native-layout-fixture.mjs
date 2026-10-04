// Render Deluge's actual ExtJS components with inert RPC responses. No daemon
// connection or settings writes are made by this visual regression fixture.
import http from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function createNativeLayoutFixture(webRoot, pluginRoot) {
  await readFile(path.join(webRoot, 'js/deluge-all-debug.js'));
  const css = (await readdir(path.join(root, 'dist/assets'))).find(file => file.endsWith('.css'));
  const html = `<!doctype html><html class="deluge-deck-hosted" data-theme="ocean"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${['css/ext-all-notheme.css', 'themes/css/xtheme-gray.css', 'css/ext-extensions.css', 'css/deluge.css'].map(file => `<link rel="stylesheet" href="/web/${file}">`).join('')}
<link rel="stylesheet" href="/deck.css">
<script>window._=s=>s; window.deluge={config:{base:'/',session_timeout:3600},version:'fixture'};</script>
${['extjs/ext-base.js', 'extjs/ext-all-debug.js', 'extjs/ext-extensions-debug.js', 'deluge-all-debug.js'].map(file => `<script src="/web/js/${file}"></script>`).join('')}
${pluginRoot ? '<script src="/plugins/autoadd.js"></script><script src="/plugins/autoadd_options.js"></script>' : ''}
<script>
window.fixtureWrites=[];
deluge.ui.initialize=function(){
  const rpc=new Proxy({}, {get:(_,method)=>(...args)=>{
    if (/^set_|^add$|^enable_|^disable_/.test(method)) window.fixtureWrites.push([method,args.slice(0,-1)]);
    const values={get_config:{download_location:'D:/Torrents',listen_ports:[50001,50001],outgoing_ports:[0,0]},get_available_plugins:['AutoAdd','Label','Scheduler'],get_enabled_plugins:[],get_languages:[],get_watchdirs:{},get_auth_user:'localclient',is_admin_level:false,get_plugin_info:{author:'Deluge Team',version:'1.0',details:'Plugin settings and installation.'}};
    const o=args.at(-1); if(o?.success)o.success.call(o.scope,values[method] ?? {});
  }});
  deluge.client={core:rpc,web:rpc,webutils:rpc,autoadd:rpc};
  deluge.preferences=new Deluge.preferences.PreferencesWindow();
  if (Deluge.ux?.preferences?.AutoAddPage) deluge.preferences.addPage(new Deluge.ux.preferences.AutoAddPage());
  document.documentElement.classList.remove('deluge-deck-loading');
  document.documentElement.classList.add('deluge-deck-ready');
  window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__();
};
</script></head><body><script src="/bridge.js"></script></body></html>`;
  return http.createServer(async (req, res) => {
    try {
      if (req.url === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(html); }
      let file;
      if (req.url === '/deck.css') file = path.join(root, 'dist/assets', css);
      if (req.url === '/bridge.js') file = path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js');
      for (const [prefix, directory] of [['/web/', webRoot], ['/plugins/', pluginRoot]]) {
        if (directory && req.url.startsWith(prefix)) {
          const candidate = path.resolve(directory, decodeURIComponent(req.url.slice(prefix.length)));
          if (candidate.startsWith(path.resolve(directory) + path.sep)) file = candidate;
        }
      }
      if (!file) { res.writeHead(404); return res.end(); }
      res.setHeader('content-type', file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.gif') ? 'image/gif' : 'image/png');
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
}
