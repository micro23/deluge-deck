import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const pluginRoot = path.join(root, 'plugin');
const dataDir = path.join(pluginRoot, 'deluge_deck', 'data');
const builtAssets = path.join(root, 'dist', 'assets');
mkdirSync(dataDir, { recursive: true });
// A Deluge egg only needs the assets for the release it contains. Removing
// prior versioned copies prevents a stale bundle from being mistaken for the
// active build when inspecting or reinstalling the plugin.
for (const file of readdirSync(dataDir)) {
  if (/^deluge-deck-\d+\.\d+\.\d+(?:-(?:style|plugin))?\.(?:js|css)$/.test(file))
    rmSync(path.join(dataDir, file), { force: true });
}
for (const file of ['deluge-deck.js', 'deluge-deck-style.js', 'deluge-deck.css'])
  rmSync(path.join(dataDir, file), { force: true });
const findAsset = (suffix) => {
  const file = readdirSync(builtAssets).find((candidate) => candidate.endsWith(suffix));
  if (!file) throw new Error(`Could not find the Vite ${suffix} asset. Run npm run build first.`);
  return path.join(builtAssets, file);
};
const cssAsset = findAsset('.css');
// Hosted Deluge injects the stylesheet as a <style> tag. Relative image URLs
// would resolve against the host page rather than this plugin, so fold local
// theme artwork into the final stylesheet. This keeps the seasonal frames
// self-contained in the egg and equally reliable in hosted and standalone UI.
const css = readFileSync(cssAsset, 'utf8');
const embeddedCss = css.replace(/url\((['"]?)([^)'"?#]+\.(?:png|jpe?g|webp|svg))\1\)/g, (match, quote, assetPath) => {
  const asset = path.join(builtAssets, path.basename(assetPath));
  if (!readdirSync(builtAssets).includes(path.basename(assetPath))) return match;
  const extension = path.extname(asset).toLowerCase();
  const mime = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : extension === '.svg' ? 'image/svg+xml' : 'image/jpeg';
  return `url("data:${mime};base64,${readFileSync(asset).toString('base64')}")`;
});
// Deluge Web and browsers can cache plugin resources by filename. Publish only
// versioned names: WebUI references these exact resources, and omitting the
// old compatibility copies prevents the embedded artwork stylesheet from
// being duplicated inside the egg.
copyFileSync(findAsset('.js'), path.join(dataDir, `deluge-deck-${version}.js`));
writeFileSync(path.join(dataDir, `deluge-deck-${version}.css`), embeddedCss);
// Deluge 2.2's WebUI plugin manager registers JavaScript resources but does
// not register the WebPluginBase.stylesheets attribute. Inject the compiled
// CSS from a tiny JS resource so hosted plugin mode is styled as well.
writeFileSync(
  path.join(dataDir, `deluge-deck-${version}-style.js`),
  `(() => { if (!document.documentElement.classList.contains('deluge-deck-ready')) document.documentElement.classList.add('deluge-deck-loading'); const style = document.createElement('style'); style.dataset.delugeDeck = 'true'; style.textContent = ${JSON.stringify(embeddedCss)}; document.head.appendChild(style); })();\n`,
);
copyFileSync(path.join(dataDir, 'deluge-deck-plugin.js'), path.join(dataDir, `deluge-deck-${version}-plugin.js`));
rmSync(path.join(pluginRoot, 'build'), { recursive: true, force: true });
rmSync(path.join(pluginRoot, 'dist'), { recursive: true, force: true });
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(python, ['setup.py', 'bdist_egg'], { cwd: pluginRoot, stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const eggs = readdirSync(path.join(pluginRoot, 'dist')).filter((file) => /^DelugeDeck-.*\.egg$/.test(file));
if (eggs.length !== 1 || !eggs[0].startsWith(`DelugeDeck-${version}-`)) throw new Error(`Expected exactly one DelugeDeck-${version} egg; found: ${eggs.join(', ') || 'none'}`);
const egg = path.join(pluginRoot, 'dist', eggs[0]);
const inspect = spawnSync(python, ['-c', "import os, zipfile; z=zipfile.ZipFile(os.environ['EGG']); n=set(z.namelist()); required={'deluge_deck/core.py','deluge_deck/gtk3ui.py','deluge_deck/webui.py','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'-style.js','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'-plugin.js','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'.js','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'.css'}; missing=required-n; assert not missing, missing; assert not any(x in n for x in ('deluge_deck/data/deluge-deck-style.js','deluge_deck/data/deluge-deck.css')); meta=[x for x in n if x.endswith('EGG-INFO/PKG-INFO')][0]; info=z.read(meta).decode(); assert 'Version: '+os.environ['VERSION'] in info; entries=z.read([x for x in n if x.endswith('EGG-INFO/entry_points.txt')][0]).decode(); assert 'deluge.plugin.core' in entries and 'deluge.plugin.gtk3ui' in entries and 'deluge.plugin.web' in entries"], { env: { ...process.env, EGG: egg, VERSION: version }, stdio: 'inherit' });
if (inspect.error) throw inspect.error;
if (inspect.status !== 0) process.exit(inspect.status || 1);
console.log(`\nPlugin ready: ${egg}`);
