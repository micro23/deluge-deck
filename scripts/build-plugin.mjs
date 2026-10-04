import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const pluginRoot = path.join(root, 'plugin');
const dataDir = path.join(pluginRoot, 'deluge_deck', 'data');
for (const name of ['LICENSE-Inter.txt', 'LICENSE-JetBrainsMono.txt']) {
  mkdirSync(dataDir, { recursive: true });
  copyFileSync(path.join(root, 'src/assets/fonts/darkhand', name), path.join(dataDir, name));
}
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
const builtAssetNames = readdirSync(builtAssets);
const builtAssetSet = new Set(builtAssetNames);
const findAsset = (suffix) => {
  const file = builtAssetNames.find((candidate) => candidate.endsWith(suffix));
  if (!file) throw new Error(`Could not find the Vite ${suffix} asset. Run npm run build first.`);
  return path.join(builtAssets, file);
};
const cssAsset = findAsset('.css');
// Theme resources are registered as a static directory, not executable startup
// scripts. Keep artwork and fonts as individual cached files in the egg.
const resources = path.join(dataDir, 'resources');
rmSync(resources, { recursive: true, force: true });
mkdirSync(resources, { recursive: true });
copyFileSync(path.join(root, 'dist', 'deck-themes.json'), path.join(resources, 'manifest.json'));
cpSync(path.join(root, 'dist', 'themes'), path.join(resources, 'themes'), { recursive: true });
mkdirSync(path.join(resources, 'assets'), { recursive: true });
for (const name of builtAssetNames) {
  if (!name.endsWith('.js') && !name.endsWith('.css')) copyFileSync(path.join(builtAssets, name), path.join(resources, 'assets', name));
}
copyFileSync(findAsset('.js'), path.join(dataDir, `deluge-deck-${version}.js`));
// Retain the optional CSS filename for older hosts without duplicating rules.
writeFileSync(path.join(dataDir, `deluge-deck-${version}.css`), '/* Shared styles and on-demand themes are supplied by the versioned style loader. */\n');
const css = readFileSync(cssAsset, 'utf8');
// Deluge can execute a registered resource again after Deck has mounted.
// Keep the assembled theme stylesheet; a second shared-only sheet would
// override its layout rules and visibly revert Terminal to the generic UI.
writeFileSync(
  path.join(dataDir, `deluge-deck-${version}-style.js`),
  `(() => { if (!document.documentElement.classList.contains('deluge-deck-ready')) document.documentElement.classList.add('deluge-deck-loading'); window.__DELUGE_DECK_THEME_MANIFEST_URL__ = new URL('deluge-deck-resources/manifest.json', document.baseURI).href; if (document.querySelector('style[data-deluge-deck="true"]')) return; const style = document.createElement('style'); style.dataset.delugeDeck = 'true'; style.textContent = ${JSON.stringify(css)}.replaceAll('/assets/', new URL('deluge-deck-resources/assets/', document.baseURI).href); document.head.appendChild(style); })();\n`,
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
const inspect = spawnSync(python, ['-c', "import os, zipfile; z=zipfile.ZipFile(os.environ['EGG']); n=set(z.namelist()); required={'deluge_deck/core.py','deluge_deck/gtk3ui.py','deluge_deck/webui.py','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'-style.js','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'-plugin.js','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'.js','deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'.css'}; missing=required-n; assert not missing, missing; assert z.testzip() is None; [compile(z.read(name), name, 'exec') for name in n if name.endswith('.py')]; css_name='deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'.css'; style_name='deluge_deck/data/deluge-deck-'+os.environ['VERSION']+'-style.js'; assert z.getinfo(css_name).file_size < 500, 'Optional CSS duplicates the style payload'; assert 'deluge_deck/data/resources/manifest.json' in n; assert any(x.startswith('deluge_deck/data/resources/themes/') for x in n); assert any(x.startswith('deluge_deck/data/resources/assets/') for x in n); assert not any(x in n for x in ('deluge_deck/data/deluge-deck-style.js','deluge_deck/data/deluge-deck.css')); meta=[x for x in n if x.endswith('EGG-INFO/PKG-INFO')][0]; info=z.read(meta).decode(); assert 'Version: '+os.environ['VERSION'] in info; entries=z.read([x for x in n if x.endswith('EGG-INFO/entry_points.txt')][0]).decode(); assert 'deluge.plugin.core' in entries and 'deluge.plugin.gtk3ui' in entries and 'deluge.plugin.web' in entries"], { env: { ...process.env, EGG: egg, VERSION: version }, stdio: 'inherit' });
if (inspect.error) throw inspect.error;
if (inspect.status !== 0) process.exit(inspect.status || 1);
const checksum = createHash('sha256').update(readFileSync(egg)).digest('hex');
writeFileSync(`${egg}.sha256`, `${checksum}  ${eggs[0]}\n`);
console.log(`\nPlugin ready: ${egg}`);
