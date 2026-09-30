import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, themeAccentPairs, themePalettes } from './theme-contrast.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = async () => {
  const [main, api, themes] = await Promise.all([
    readFile(path.join(root, 'src/main.jsx'), 'utf8'),
    readFile(path.join(root, 'src/app/api.js'), 'utf8'),
    readFile(path.join(root, 'src/app/themes.js'), 'utf8'),
  ]);
  return `${main}\n${api}\n${themes}`;
};
const themeStyles = async () => (await Promise.all([
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/themes/terminal.css'), 'utf8'),
])).join('\n');

test('remove choices are in-app and pass Deluge the selected remove_data boolean', async () => {
  const ui = await source();
  assert.match(ui, /function RemoveModal/);
  assert.match(ui, /Remove torrent only/);
  assert.match(ui, /Keep downloaded data on disk/);
  assert.match(ui, /Remove torrent and data/);
  assert.match(ui, /remove\(false\)/);
  assert.match(ui, /remove\(true\)/);
  assert.match(ui, /core\.remove_torrents', \[initialFiles\.targets, removeData\]/);
  assert.match(ui, /setAddFiles\(\{ kind: 'remove', targets: target \}\)/);
  assert.match(ui, /setError\(reason\.message \|\| 'Deluge could not remove/);
  assert.doesNotMatch(ui, /window\.(alert|confirm)\s*\(/);
});

test('themes have persistent palette declarations and a desktop/mobile menu', async () => {
  const [ui, css] = await Promise.all([source(), themeStyles()]);
  for (const name of ['ocean', 'forest', 'sunset', 'christmas', 'halloween', 'valentine', 'st-patricks', 'independence', 'new-year', 'terminal']) {
    assert.match(ui, new RegExp(`'${name}'`));
    assert.match(css, new RegExp(`data-theme=\\"${name}\\"`));
  }
  assert.match(ui, /localStorage\.setItem\('deck-theme', theme\)/);
  assert.match(ui, /function ThemeMenu/);
  assert.match(ui, /Choose color theme; current theme/);
  assert.doesNotMatch(ui, /className="theme-label"/);
  assert.doesNotMatch(ui, /<ChevronDown size=\{13\}/);
  assert.match(css, /@media \(max-width:760px\).*theme-popover/s);
  assert.match(css, /data-theme="light".*--text:#071f2d/s);
  assert.match(ui, /function Topbar\([^)]*onPreferences/);
  assert.match(ui, /mobile-preferences/);
  assert.match(ui, /aria-label="Open Deluge Preferences"/);
  assert.match(ui, /<Topbar[\s\S]*onPreferences=\{openPreferences\}/);
  assert.match(css, /\.mobile-preferences\{display:grid!important\}/);
  assert.match(css, /\.icon-button,.row-menu,.add-tabs button,.nav-item,.theme-popover button,.avatar,.context-menu button,.drawer-tabs button,.clear-search,.remove-choice,.hash-button,.file-chips button,.search-note button,.view-controls button\{min-height:44px;min-width:44px\}/);
});

test('themes use distinct seasonal artwork and menus keep one aligned action rail', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  for (const asset of [
    'christmas-night-observatory.jpg',
    'halloween-midnight-conservatory.jpg',
    'valentine-art-deco-salon.jpg',
    'st-patricks-botanical-conservatory.jpg',
    'independence-coastal-observatory.jpg',
    'new-year-rooftop-observatory.jpg',
  ]) assert.match(css, new RegExp(asset.replace('.', '\\.'), 's'));
  assert.match(css, /\.preferences-content\s*\{[\s\S]*grid-template-columns:1fr!important/);
  assert.doesNotMatch(css, /data-deluge-deck-native-window/); // native skin has one owner
});

test('Deluge Preferences is in-app first and browser popup APIs are absent from action paths', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /function PreferencesModal/);
  assert.match(ui, /function DeckPreferences/);
  assert.match(ui, /const openPreferences = \(\) => setAddFiles\(\{ kind: 'preferences' \}\)/);
  assert.match(ui, /Open native Deluge Preferences/);
  assert.match(ui, /const openNative = \(\) =>/);
  assert.match(ui, /__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__/);
  assert.match(ui, /else preferences\.show\(\)/);
  const preferencesBlock = ui.slice(ui.indexOf('function PreferencesModal'), ui.indexOf('function DeckPreferences'));
  assert.doesNotMatch(preferencesBlock, /theme-grid|THEMES\.map/);
  assert.match(preferencesBlock, /<kbd>T<\/kbd> cycles themes/);
  assert.match(ui, /import '.\/native-deluge.css'/);
  assert.doesNotMatch(ui, /const openPreferences[^\n]*preferences\.show/);
  assert.doesNotMatch(ui, /window\.(alert|confirm|prompt)\s*\(/);
  const modalRouter = ui.slice(ui.indexOf('function AddModal'), ui.indexOf('function AddTorrentModal'));
  assert.match(modalRouter, /return\s*\(?\s*<AddTorrentModal/);
  assert.doesNotMatch(modalRouter, /use(State|Effect|Ref)\(/);
});

test('preferences expose modern Deluge download location controls', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /core\.get_config/);
  assert.match(ui, /downloadLocation/);
  assert.match(ui, /completedPath/);
  assert.match(ui, /moveCompleted/);
  assert.match(ui, /Save paths/);
  assert.match(css, /\.path-preference/);
  assert.match(server, /download_location/);
});

test('preferences expose modern network listen controls', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /networkPort/);
  assert.match(ui, /randomPort/);
  assert.match(ui, /listen_ports/);
  assert.match(ui, /Save network/);
  assert.match(css, /\.network-preference/);
  assert.match(server, /listen_ports/);
});

test('preferences expose modern proxy controls', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /proxyEnabled/);
  assert.match(ui, /proxyHost/);
  assert.match(ui, /proxyPort/);
  assert.match(ui, /proxyType/);
  assert.match(ui, /Save proxy/);
  assert.match(css, /\.proxy-preference/);
  assert.match(server, /proxy: \{/);
});

test('preferences expose modern disk cache controls', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /cacheSize/);
  assert.match(ui, /cacheExpiry/);
  assert.match(ui, /Save cache/);
  assert.match(css, /\.cache-preference/);
  assert.match(server, /cache_size/);
  assert.match(server, /cache_expiry/);
});

test('preferences expose modern plugin status', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /web\.get_plugins/);
  assert.match(ui, /plugins\.enabled\.length/);
  assert.match(ui, /plugin-chip/);
  assert.match(css, /\.plugin-preference/);
});

test('completion celebrations are optional and reduced-motion aware', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /deck-celebrations/);
  assert.match(ui, /const \[celebrateCompletions, setCelebrateCompletions\] = useState/);
  assert.match(ui, /if \(key === 'celebrateCompletions'\) \{\s*setCelebrateCompletions\(Boolean\(value\)\);\s*localStorage\.setItem\('deck-celebrations', String\(value\)\)/);
  assert.match(ui, /prefers-reduced-motion: reduce/);
  assert.match(ui, /completed! 🎉/);
  assert.match(ui, /celebration-preference/);
  assert.match(css, /\.celebration-toast/);
});

test('torrent rows can open details from the keyboard', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /role="button"\s+aria-label=\{`Open details for/);
  assert.match(ui, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(css, /tbody tr\[role="button"\]:focus-visible/);
});

test('torrent row keyboard opening ignores nested controls', async () => {
  const ui = await source();
  assert.match(ui, /if \(event\.target !== event\.currentTarget\) return/);
});

test('torrent table announces sort changes accessibly', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /sortLabel/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /Sorted by \{sortLabel\}/);
  assert.match(css, /\.sort-announcement/);
});

test('torrent table exposes current sort direction to assistive technology', async () => {
  const ui = await source();
  assert.match(ui, /const sortValue = \(key\) =>\s+sort\.key === key/);
  assert.match(ui, /aria-sort=\{sortValue\('name'\)\}/);
  assert.match(ui, /aria-sort=\{sortValue\('queue'\)\}/);
  assert.match(ui, /sort\.direction === 1 \? 'ascending' : 'descending'/);
});

test('theme menu supports arrow, Home, and End keyboard navigation', async () => {
  const ui = await source();
  const theme = ui.slice(ui.indexOf('function ThemeMenu'), ui.indexOf('function SearchField'));
  assert.match(theme, /const navigateMenu = \(event\)/);
  assert.match(theme, /ArrowDown/);
  assert.match(theme, /ArrowUp/);
  assert.match(theme, /event\.key === 'Home'/);
  assert.match(theme, /event\.key === 'End'/);
  assert.match(theme, /role="menuitemradio"/);
});

test('preferences restore focus to the opener when dismissed', async () => {
  const ui = await source();
  assert.match(ui, /function useRestoreFocus/);
  assert.match(ui, /previous\.current = document\.activeElement/);
  assert.match(ui, /previous\.current\.focus\(\)/);
  assert.match(ui, /useRestoreFocus\(\)/);
});

test('detail drawer tabs support arrow navigation and tab panels', async () => {
  const ui = await source();
  assert.match(ui, /event\.key === 'ArrowRight' \|\| event\.key === 'ArrowLeft'/);
  assert.match(ui, /aria-controls=\{`drawer-panel-\$\{name\}`\}/);
  assert.match(ui, /role="tabpanel"\s+aria-labelledby="drawer-tab-overview"/);
  assert.match(ui, /role="tabpanel"\s+aria-labelledby="drawer-tab-files"/);
});

test('refresh adapts to activity and pauses while the tab is hidden', async () => {
  const ui = await source();
  assert.match(ui, /document\.hidden/);
  assert.match(ui, /visibilitychange/);
  assert.match(ui, /\? refreshMs : Math\.max\(refreshMs \* 2, 5000\)/);
  assert.match(ui, /const poller = createPoller/);
  assert.match(ui, /poller\.stop\(\)/);
  assert.doesNotMatch(ui, /\[connected, refreshMs, torrents\]/);
});

test('expired sessions return to login with a reauthentication message', async () => {
  const ui = await source();
  assert.match(ui, /session expired\|not authenticated\|unauthorized\|authentication/);
  assert.match(ui, /setConnected\(false\)/);
  assert.match(ui, /sessionMessage=\{sessionData\?\.sessionMessage\}/);
  assert.match(ui, /Your session expired\. Sign in again to continue\./);
});

test('command palette provides keyboard-first quick actions', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /function CommandPalette/);
  assert.match(ui, /metaKey \|\| event\.ctrlKey.*'k'/);
  assert.match(ui, /Add torrent/);
  assert.match(ui, /Open Preferences/);
  assert.match(ui, /aria-label="Command palette"/);
  assert.match(css, /\.command-palette/);
});

test('torrent actions announce successful completion', async () => {
  const ui = await source();
  assert.match(ui, /const labels = \{\s+pause/);
  assert.match(ui, /setCopied\(\s*`\$\{labels\[action\]/);
  assert.match(ui, /className="action-toast"\s+role="status"\s+aria-live="polite"/);
});

test('preferences trap keyboard focus inside the dialog', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /function useFocusTrap/);
  assert.match(ui, /event\.key !== 'Tab'/);
  assert.match(ui, /event\.shiftKey && document\.activeElement === first/);
  assert.match(ui, /className="preferences-modal"/);
  assert.match(css, /\.preferences-backdrop \{[\s\S]*display:grid!important;[\s\S]*place-items:center;[\s\S]*overflow:hidden!important/);
  assert.match(css, /\.preferences-modal \{[\s\S]*display:flex!important;[\s\S]*height:min\(800px,calc\(100dvh - 32px\)\)!important;[\s\S]*overflow:hidden!important/);
  assert.match(css, /\.preferences-content \{[\s\S]*overflow-y:auto!important;[\s\S]*scrollbar-gutter:stable/);
  assert.match(ui, /createPortal\(<DeckPreferences onClose=\{onClose\} \/>, preferencesOverlayHost\)/);
  assert.match(css, /#deluge-deck-viewport-overlay \.preferences-backdrop/);
});

test('preferences checkboxes have a consistent field and an explicit checked mark', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\.preferences-modal \.path-check input\[type="checkbox"\] \{[\s\S]*width:18px!important[\s\S]*height:18px!important[\s\S]*background-color:var\(--surface-3\)!important/);
  assert.match(css, /\.preferences-modal \.path-check input\[type="checkbox"\]:checked \{[\s\S]*background-color:var\(--cyan\)!important/);

});

test('detail drawer is a focus-trapped dialog with focus restoration and outside dismissal', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /function DetailDrawer/);
  assert.match(ui, /useRestoreFocus\(\)/);
  assert.match(ui, /useFocusTrap\(drawerRef\)/);
  assert.match(ui, /className="detail-drawer"\s+aria-label="Torrent details"\s+role="dialog"\s+aria-modal="true"/);
  assert.match(ui, /className="detail-backdrop"\s+onMouseDown=\{onClose\}/);
  assert.match(css, /\.detail-backdrop\{position:fixed/);
});

test('remove dialog traps focus and restores it after dismissal', async () => {
  const ui = await source();
  const removeBlock = ui.slice(ui.indexOf('function RemoveModal'), ui.indexOf('function MoveStorageModal'));
  assert.match(removeBlock, /useRestoreFocus\(\)/);
  assert.match(removeBlock, /useFocusTrap\(modalRef\)/);
  assert.match(removeBlock, /ref=\{modalRef\}/);
  assert.match(removeBlock, /role="dialog"\s+aria-modal="true"/);
});

test('removing torrents returns focus to a remaining torrent row', async () => {
  const ui = await source();
  assert.match(ui, /const removalFocusPending = useRef\(false\)/);
  assert.match(ui, /removalFocusPending\.current = true/);
  assert.match(ui, /requestAnimationFrame\(\(\) =>\s*document\.querySelector\('tbody tr\[role="button"\]'\)\?\.focus\(\),?\s*\)/);
});

test('add torrent review traps focus and restores it after dismissal', async () => {
  const ui = await source();
  const addBlock = ui.slice(ui.indexOf('function AddTorrentModal'), ui.indexOf('function App'));
  assert.match(addBlock, /useRestoreFocus\(\)/);
  assert.match(addBlock, /useFocusTrap\(modalRef\)/);
  assert.match(addBlock, /ref=\{modalRef\}/);
  assert.match(addBlock, /role="dialog"\s+aria-modal="true"/);
});

test('command palette traps focus and restores it after dismissal', async () => {
  const ui = await source();
  const palette = ui.slice(ui.indexOf('function CommandPalette'), ui.indexOf('function swarmCount'));
  assert.match(palette, /useRestoreFocus\(\)/);
  assert.match(palette, /useFocusTrap\(paletteRef\)/);
  assert.match(palette, /ref=\{paletteRef\}/);
  assert.match(palette, /role="dialog"\s+aria-modal="true"\s+aria-label="Command palette"/);
});

test('connection manager traps focus and restores it after dismissal', async () => {
  const ui = await source();
  const manager = ui.slice(ui.indexOf('function ConnectionManagerModal'), ui.indexOf('function AccountMenu'));
  assert.match(manager, /useRestoreFocus\(\)/);
  assert.match(manager, /useFocusTrap\(modalRef\)/);
  assert.match(manager, /ref=\{modalRef\}/);
  assert.match(manager, /role="dialog"\s+aria-modal="true"\s+aria-labelledby="connections-title"/);
});

test('connection manager provides an in-app add host form', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /web\.add_host/);
  assert.match(ui, /Add host/);
  assert.match(ui, /Host\s*<input/);
  assert.match(ui, /Password\s*<input\s+type="password"/);
  assert.match(css, /\.host-add-form/);
  assert.match(server, /'web\.add_host'/);
});

test('connection manager provides confirmed host removal', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /web\.remove_host/);
  assert.match(ui, /Remove this host\?/);
  assert.match(ui, /Remove host \$\{host\.host\}/);
  assert.match(ui, /className="host-remove-confirm"/);
  assert.match(css, /\.host-remove-confirm/);
  assert.match(server, /'web\.remove_host'/);
});

test('move storage dialog traps focus and restores it after dismissal', async () => {
  const ui = await source();
  const move = ui.slice(ui.indexOf('function MoveStorageModal'), ui.indexOf('function RenameTorrentModal'));
  assert.match(move, /useRestoreFocus\(\)/);
  assert.match(move, /useFocusTrap\(modalRef\)/);
  assert.match(move, /ref=\{modalRef\}/);
  assert.match(move, /role="dialog"\s+aria-modal="true"\s+aria-labelledby="move-storage-title"/);
});

test('rename dialog traps focus and restores it after dismissal', async () => {
  const ui = await source();
  const rename = ui.slice(ui.indexOf('function RenameTorrentModal'), ui.indexOf('function useRestoreFocus'));
  assert.match(rename, /useRestoreFocus\(\)/);
  assert.match(rename, /useFocusTrap\(modalRef\)/);
  assert.match(rename, /ref=\{modalRef\}/);
  assert.match(rename, /role="dialog"\s+aria-modal="true"\s+aria-labelledby="rename-torrent-title"/);
});

test('native skin preserves Ext geometry and plugin toolbars', async () => {
  const css = await readFile(path.join(root, 'src/native-deluge.css'), 'utf8');
  assert.match(css, /box-sizing:content-box/);
  assert.doesNotMatch(css, /grid-template-columns/);
  assert.doesNotMatch(css, /display:none/);
  assert.doesNotMatch(css, /width:100%!important/);
  assert.match(css, /\.x-combo-list,\.x-menu/);
});

test('global shortcuts are modal-aware, busy-aware, and ignore interactive controls', async () => {
  const ui = await source();
  assert.match(ui, /const deckModalState = \{ locked: false \}/);
  assert.match(ui, /input,textarea,select,button,a,\[contenteditable="true"\]/);
  assert.match(ui, /const panelOpen = Boolean\(addFiles \|\| detail \|\| menuTorrent\)/);
  assert.match(ui, /if \(event\.key === 'Escape'\) \{[\s\S]*setAddFiles\(null\);[\s\S]*setDetail\(null\);[\s\S]*setMenuTorrent\(null\)/);
  assert.match(ui, /function ThemeMenu[\s\S]*closeOnEscape[\s\S]*event\.key === 'Escape'/);
  assert.match(ui, /onClick=\{\(\) => \{\s*setDetail\(menuTorrent\);\s*setMenuTorrent\(null\);\s*\}\}/);
  assert.match(ui, /useEffect\(\(\) => \{\s*const locked = busy \|\| Boolean\(error\);\s*deckModalState\.locked = locked/);
  const shortcutBlock = ui.slice(ui.indexOf('const keys ='), ui.indexOf('const act ='));
  assert.match(shortcutBlock, /event\.key === 'Escape'[\s\S]*active\?\.matches[\s\S]*panelOpen\s*\)\s*return;[\s\S]*event\.key === '\/'/);
  assert.match(shortcutBlock, /event\.key\.toLowerCase\(\) === 't'[\s\S]*setTheme\(\(current\)[\s\S]*THEMES\.findIndex/);
  assert.match(shortcutBlock, /event\.key\.toLowerCase\(\) === 't'\s*&&\s*!event\.metaKey\s*&&\s*!event\.ctrlKey\s*&&\s*!event\.altKey\s*&&\s*!event\.repeat\s*\) \{/);
});

test('mobile torrent checkboxes stay compact', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /@media \(max-width:760px\)[^\n]*\.table-shell input\[type=checkbox\]\{width:18px;height:18px/);
  assert.doesNotMatch(css, /\.table-shell input\[type=checkbox\]\{width:44px;height:44px/);
});

test('portrait layout uses compact controls and a horizontally scrollable torrent table', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /\.topbar-heading,\.mobile-stats\{display:none!important\}/);
  assert.match(css, /\.global-controls \.session-quick-actions\{display:none\}/);
  assert.match(css, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),select,textarea\{font-size:16px!important\}/);
  assert.match(css, /\.table-shell\{overflow-x:auto!important;overflow-y:hidden!important/);
  assert.match(css, /min-width:780px!important;table-layout:auto!important/);
  assert.match(css, /th:nth-child\(2\),\.table-shell td:nth-child\(2\)\{position:sticky/);
  assert.match(css, /\.table-shell th:last-child,\.table-shell td:last-child\{position:sticky;right:0/);
});

test('every theme meets AAA text contrast and accessible component contrast', async () => {
  const css = await themeStyles();
  assert.match(css, /\.add-button \{[^}]*color:var\(--accent-fg\)/);
  assert.match(css, /\.primary-button \{[^}]*color:var\(--accent-fg\)/);
  assert.match(css, /\.avatar \{[^}]*color:var\(--accent-fg\)[^}]*background:var\(--cyan\)/);
  const pairs = themeAccentPairs(css);
  assert.equal(pairs.length, 12);
  for (const { theme, cyan, foreground } of pairs) {
    assert.ok(cyan && foreground, `${theme} declares cyan and accent foreground`);
    assert.ok(contrastRatio(cyan, foreground) >= 7, `${theme} primary control contrast is at least 7:1`);
  }

  const palettes = themePalettes(css);
  for (const palette of palettes) {
    const surfaces = [palette.bg, palette.surface, palette.surface2, palette.surface3];
    for (const [role, color] of Object.entries({ text: palette.text, muted: palette.muted, muted2: palette.muted2, cyan: palette.cyan, violet: palette.violet, amber: palette.amber, green: palette.green, danger: palette.danger })) {
      assert.ok(color, `${palette.theme} declares ${role}`);
      const minimum = Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));
      assert.ok(minimum >= 7, `${palette.theme} ${role} remains at least 7:1 on every theme surface (received ${minimum.toFixed(2)}:1)`);
    }
    assert.ok(contrastRatio(palette.lineStrong, palette.surface3) >= 3, `${palette.theme} strong control boundaries remain at least 3:1`);
  }
});

test('Halloween is a strict black, neutral, and orange palette without purple', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  const block = css.match(/:root\[data-theme="halloween"\]\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(block, /--bg:#000000/);
  for (const [color] of block.matchAll(/#[a-f\d]{6}/gi)) {
    const [red, green, blue] = color.match(/[a-f\d]{2}/gi).map((part) => Number.parseInt(part, 16));
    assert.ok(red >= blue && green >= blue, `Halloween color ${color} stays neutral or in the orange family`);
  }
  assert.match(css, /\.theme-swatch\.halloween \{ background:linear-gradient\(135deg,#ff9d2e,#000000\); \}/);
});

test('theme stage and floating background emoji decorations stay removed', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.doesNotMatch(ui, /function ThemeAtmosphere/);
  assert.doesNotMatch(ui, /className="theme-atmosphere"/);
  assert.doesNotMatch(ui, /function ThemeStage/);
  assert.doesNotMatch(ui, /className="theme-stage"/);
  assert.doesNotMatch(ui, /className="signal-graphic"/);
  assert.match(ui, /className="stat-spark" aria-hidden="true"/);
  assert.doesNotMatch(css, /\.theme-atmosphere/);
  assert.doesNotMatch(css, /\.theme-stage/);
  assert.doesNotMatch(css, /\.signal-graphic/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)[\s\S]*\.stat-spark i/);
});

test('top bar exposes complete global daemon operations and account controls', async () => {
  const [ui, css, server] = await Promise.all([
    source(),
    readFile(path.join(root, 'src/styles.css'), 'utf8'),
    readFile(path.join(root, 'server/index.mjs'), 'utf8'),
  ]);
  assert.match(ui, /function GlobalControls/);
  assert.match(ui, /core\.pause_session/);
  assert.match(ui, /core\.resume_session/);
  assert.match(ui, /const resumeAll = \(\) =>/);
  assert.match(ui, /torrents\.map\(\(torrent\) => torrent\.hash\)/);
  assert.match(ui, /\['core\.resume_torrents', \[hashes\]\]/);
  assert.match(ui, /className="session-quick-actions"/);
  assert.match(ui, /Pause all/);
  assert.match(ui, /Resume all/);
  assert.match(ui, /max_download_speed/);
  assert.match(ui, /max_upload_speed/);
  assert.match(ui, /max_connections_global/);
  assert.match(ui, /stats\.free_space/);
  assert.match(ui, /stats\.max_num_connections/);
  assert.match(ui, /function ConnectionManagerModal/);
  assert.match(ui, /web\.get_hosts/);
  assert.match(ui, /web\.get_host_status/);
  assert.match(ui, /web\.disconnect/);
  assert.match(ui, /web\.connect/);
  assert.doesNotMatch(ui, /function PluginStatusModal/);
  assert.doesNotMatch(ui, /Plugin status/);
  assert.match(ui, /function AccountMenu/);
  assert.match(ui, /Open account menu/);
  assert.match(ui, /End Web session/);
  assert.match(server, /'web\.get_plugins'/);
  assert.match(server, /'web\.disconnect'/);
  assert.match(css, /\.global-popover/);
  assert.match(css, /\.session-quick-actions/);
  assert.match(css, /\.bulk-bar \{[^}]*left:calc\(50vw \+ 125px\)/);
  assert.match(css, /\.sidebar-collapsed \.bulk-bar \{ left:calc\(50vw \+ 60px\)/);
  assert.match(css, /\.manager-modal/);
  assert.match(css, /\.account-popover/);
});

test('floating pill shows the external IP reported by Deluge', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /className="external-ip"/);
  assert.match(ui, /stats\?\.external_ip/);
  assert.match(ui, /torrents=\{torrents\}\s+stats=\{stats\}/);
  assert.match(css, /\.external-ip\{position:fixed/);
  assert.match(css, /right:20px;bottom:20px/);
});

test('torrent details show connected and total seed and peer counts', async () => {
  const ui = await source();
  assert.match(ui, /Detail\s+label="Seeds"\s+value=\{swarmCount\(torrent\.num_seeds, torrent\.total_seeds\)\}/);
  assert.match(ui, /Detail\s+label="Peers"\s+value=\{swarmCount\(torrent\.num_peers, torrent\.total_peers\)\}/);
  assert.match(ui, /connected · \$\{Number\(total\) \|\| 0\} total/);
});

test('torrent details show total uploaded data', async () => {
  const ui = await source();
  assert.match(ui, /label="Uploaded"\s+value=\{formatBytes\(torrent\.total_uploaded\)\}/);
});

test('torrent details request and show piece count and piece size', async () => {
  const [ui, server] = await Promise.all([source(), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /'num_pieces',\s+'piece_length'/);
  assert.match(server, /'num_pieces',\s+'piece_length'/);
  assert.match(ui, /Detail\s+label="Pieces"\s+value=\{pieceCount\(torrent\.num_pieces\)\}/);
  assert.match(ui, /Detail\s+label="Piece size"\s+value=\{pieceSize\(torrent\.piece_length\)\}/);
});

test('torrent details show active and seeding time as readable durations', async () => {
  const ui = await source();
  assert.match(ui, /Detail\s+label="Active time"\s+value=\{elapsedTime\(torrent\.active_time\)\}/);
  assert.match(ui, /Detail\s+label="Seeding time"\s+value=\{elapsedTime\(torrent\.seeding_time\)\}/);
  assert.match(ui, /if \(days\) return `\$\{days\}d \$\{hours\}h`/);
  assert.match(ui, /if \(hours\) return `\$\{hours\}h \$\{minutes\}m`/);
});

test('torrent details show localized added and completed dates', async () => {
  const ui = await source();
  assert.match(ui, /Detail label="Added" value=\{torrentDate\(torrent\.time_added\)\}/);
  assert.match(ui, /Detail\s+label="Completed"\s+value=\{torrentDate\(torrent\.completed_time, 'Not completed'\)\}/);
  assert.match(ui, /new Intl\.DateTimeFormat\(undefined, \{\s*dateStyle: 'medium',\s*timeStyle: 'short',?\s*\}\)/);
});

test('torrent details show tracker health and download path', async () => {
  const ui = await source();
  assert.match(ui, /<Detail\s+label="Tracker"\s+value=\{`\$\{torrent\.tracker_status/);
  assert.match(ui, /<Detail\s+label="Download path"\s+value=\{torrent\.save_path/);
});

test('torrent details expose editable transfer behavior options', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /core\.set_torrent_options/);
  assert.match(ui, /Auto-managed queue/);
  assert.match(ui, /Sequential download/);
  assert.match(ui, /Prioritize first and last pieces/);
  assert.match(ui, /Save options/);
  assert.match(css, /\.torrent-options/);
  assert.match(server, /core\.set_torrent_options/);
  assert.match(server, /sequential_download/);
});

test('torrent row menu exposes all four queue movement controls', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  for (const [action, method] of [['queueTop', 'core.queue_top'], ['queueUp', 'core.queue_up'], ['queueDown', 'core.queue_down'], ['queueBottom', 'core.queue_bottom']]) {
    assert.match(ui, new RegExp(`${action}: '${method.replace('.', '\\.')}'`));
    assert.match(ui, new RegExp(`act\\('${action}', \\[menuTorrent\\.hash\\]\\)`));
  }
  assert.match(ui, /aria-label="Move torrent in queue"/);
  assert.match(ui, />\s*Top\s*<\/button>.*>\s*Up\s*<\/button>.*>\s*Down\s*<\/button>.*>\s*Bottom\s*<\/button>/s);
  assert.match(css, /\.queue-action-grid/);
});

test('torrent row menu opens an in-app move storage dialog', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /function MoveStorageModal/);
  assert.match(ui, /setAddFiles\(\{ kind: 'move', torrent: menuTorrent \}\)/);
  assert.match(ui, /initialFiles\?\.kind === 'move'/);
  assert.match(ui, /rpc\('core\.move_storage', \[\[torrent\.hash\], path\]\)/);
  assert.match(ui, /Destination folder/);
  assert.match(ui, /Move storage…/);
  assert.match(ui, /aria-label="Close move storage"/);
  assert.match(css, /\.move-storage-body/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function MoveStorageModal'), ui.indexOf('function PreferencesModal')), /window\.(prompt|confirm|alert)/);
});

test('torrent row menu renames native top-level files or folders', async () => {
  const [ui, server] = await Promise.all([source(), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /function RenameTorrentModal/);
  assert.match(ui, /setAddFiles\(\{ kind: 'rename', torrent: menuTorrent \}\)/);
  assert.match(ui, /initialFiles\?\.kind === 'rename'/);
  assert.match(ui, /rpc\('core\.rename_folder', \[torrent\.hash, target\.path, nextName\]\)/);
  assert.match(ui, /rpc\('core\.rename_files', \[\s*torrent\.hash,\s*\[\[target\.index,/);
  assert.match(ui, /Use a name only, without folder separators/);
  assert.match(ui, /aria-label="Close rename torrent"/);
  assert.match(server, /'core\.rename_files', 'core\.rename_folder'/);
});

test('torrent row menu copies a magnet link with insecure-http fallback', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /Copy magnet link/);
  assert.match(ui, /rpc\('web\.get_torrent_status', \[\s*torrent\.hash,\s*\['magnet_uri'\],?\s*\]\)/);
  assert.match(ui, /status\?\.magnet_uri \|\| fallbackMagnet\(torrent\)/);
  assert.match(ui, /navigator\.clipboard\?\.writeText/);
  assert.match(ui, /document\.execCommand\?\.\('copy'\)/);
  assert.match(ui, /className="action-toast"\s+role="status"\s+aria-live="polite"/);
  assert.match(css, /\.action-toast/);
});

test('torrent detail files expose skip and download priority toggles', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const setFileWanted = async/);
  assert.match(ui, /rpc\('core\.set_torrent_file_priorities', \[torrent\.hash, priorities\]\)/);
  assert.match(ui, /aria-pressed=\{Number\(entry\.file\.priority\) !== 0\}/);
  assert.match(ui, /Number\(entry\.file\.priority\) === 0\s*\? 'Download file'\s*: 'Skip file'/);
  assert.match(ui, /Skipped/);
  assert.match(ui, /file-action-error/);
  assert.match(css, /\.file-wanted-toggle/);
});

test('torrent detail files expose low normal and high priority choices', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const setFilePriority = async/);
  assert.match(ui, /value="1">Low/);
  assert.match(ui, /value="4">Normal/);
  assert.match(ui, /value="7">High/);
  assert.match(ui, /className="file-priority"/);
  assert.match(css, /\.file-priority/);
});

test('torrent detail files support multi-select with clear selection', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const \[selectedFiles, setSelectedFiles\] = useState\(new Set\(\)\)/);
  assert.match(ui, /const toggleFileSelection = \(position\)/);
  assert.match(ui, /const setSelectedPriority = async/);
  assert.match(ui, /Priority for selected files/);
  assert.match(ui, /selectedFiles\.has\(index\)/);
  assert.match(ui, /selectedFiles\.has\(entry\.index\)/);
  assert.match(ui, /Clear selection/);
  assert.match(css, /\.files-selection-bar/);
  assert.match(css, /\.file-select/);
});

test('torrent detail files expose a folder skip and download action', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const setFolderPriority = async/);
  assert.match(ui, /core\.set_torrent_file_priorities/);
  assert.match(ui, /folder-priority-button/);
  assert.doesNotMatch(ui, /'Sample folder'/);
  assert.match(css, /\.folder-actions/);
});

test('torrent detail files expose an action for each discovered folder', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /seenFolders = new Set/);
  assert.match(ui, /depth: folderParts\.length/);
  assert.match(ui, /paddingLeft: `\$\{10 \+ \(entry\.depth \|\| 1\) \* 16\}/);
  assert.match(ui, /setFolderPriority\(\s*entry\.folder/);
  assert.match(ui, /folder-priority-button/);
  assert.match(ui, /folderFiles\(entry\.folder\)/);
  assert.match(css, /\.folder-priority-button/);
});

test('torrent detail files and folders support inline rename controls', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /function InlineRename/);
  assert.match(ui, /Rename file \$\{entry\.file\.path\}/);
  assert.match(ui, /Rename folder \$\{entry\.folder\}/);
  assert.match(ui, /rpc\('core\.rename_files'/);
  assert.match(ui, /rpc\('core\.rename_folder'/);
  assert.match(css, /\.inline-rename/);
  assert.match(server, /'core\.rename_files', 'core\.rename_folder'/);
});

test('torrent detail files show completion and availability', async () => {
  const [ui, server] = await Promise.all([source(), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /% complete/);
  assert.match(ui, /Availability/);
  assert.match(ui, /entry\.file\.progress/);
  assert.match(ui, /entry\.file\.availability/);
  assert.match(server, /availability: 0\.84/);
});

test('add torrent review supports selecting individual torrent files', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /selectedAddFiles/);
  assert.match(ui, /Select at least one torrent file to add/);
  assert.match(ui, /files\.filter\(\(file\) =>\s*selectedAddFiles\.has\(file\.name\),?\s*\)/);
  assert.match(ui, /Select .* for adding/);
  assert.match(css, /\.add-file-chip/);
});

test('add torrent review supports per-file priorities', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /addFilePriorities/);
  assert.match(ui, /file_priorities/);
  assert.match(ui, /uploaded\.map\(\(file, index\)/);
  assert.match(ui, /className="add-file-priority"/);
  assert.match(ui, /value="1">Low/);
  assert.match(ui, /value="7">High/);
  assert.match(css, /\.add-file-priority/);
});

test('add torrent review keeps large torrent and payload lists independently scrollable', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/dashboard-polish.css'), 'utf8')]);
  assert.match(ui, /className="add-review-grid"/);
  assert.match(ui, /className="torrent-review-list"/);
  assert.match(ui, /className="payload-file-list"/);
  assert.match(ui, /Select all/);
  assert.match(ui, /Select none/);
  assert.match(css, /\.add-files-panel\s*\{[\s\S]*min-height:0/);
  assert.match(css, /\.torrent-review-list,[\s\S]*\.payload-file-list\s*\{[\s\S]*overflow:auto/);
  assert.match(css, /\.add-modal\s*\{[\s\S]*max-height:min\(900px,calc\(100dvh - 32px\)\)/);
});

test('add torrent review supports full and compact storage allocation', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const \[allocation, setAllocation\] = useState\('full'\)/);
  assert.match(ui, /compact_allocation: allocation === 'compact'/);
  assert.match(ui, /Full allocation/);
  assert.match(ui, /Compact allocation/);
  assert.match(css, /\.allocation-label/);
});

test('add torrent review warns about duplicate torrent names', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /existingNames/);
  assert.match(ui, /duplicateNames/);
  assert.match(ui, /Duplicate torrent name/);
  assert.match(ui, /className="duplicate-warning"/);
  assert.match(css, /\.duplicate-warning/);
});

test('add torrent review validates free space before upload', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /core\.get_free_space/);
  assert.match(ui, /requiredBytes/);
  assert.match(ui, /Not enough free space/);
  assert.match(ui, /free-space-status/);
  assert.match(css, /\.free-space-status/);
  assert.match(server, /'core\.get_free_space'/);
});

test('add torrent review previews magnet metadata', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /magnetPreview/);
  assert.match(ui, /Info-hash:/);
  assert.match(ui, /Name will be fetched from metadata/);
  assert.match(ui, /className="magnet-preview"/);
  assert.match(css, /\.magnet-preview/);
});

test('torrent table supports sortable columns', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const \[sort, setSort\] = useState/);
  assert.match(ui, /const toggleSort = \(key\)/);
  assert.match(ui, /const sortedTorrents = useMemo/);
  assert.match(ui, /toggleSort\('progress'\)/);
  assert.match(css, /\.sort-button/);
});

test('torrent table headers support horizontal resizing', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/dashboard-polish.css'), 'utf8')]);
  assert.match(ui, /className="column-resize-handle"/);
  assert.match(ui, /name: 360/);
  assert.match(ui, /name: 'Torrent'/);
  assert.doesNotMatch(ui, /key !== 'name' && \(/);
  assert.match(ui, /role="separator"/);
  assert.match(ui, /aria-valuemin=\{MIN_COLUMN_WIDTHS\[key\]\}/);
  assert.match(ui, /\['ArrowLeft', 'ArrowRight', 'Home'\]/);
  assert.match(css, /\.column-resize-handle \{/);
  assert.match(css, /cursor:col-resize/);
});

test('torrent table persists resized column widths', async () => {
  const ui = await source();
  assert.match(ui, /localStorage\.getItem\('deck-column-widths'/);
  assert.match(ui, /localStorage\.setItem\('deck-column-widths', JSON\.stringify\(columnWidths\)\)/);
  assert.match(ui, /const normalizeColumnWidths = \(savedWidths\)/);
  assert.match(ui, /window\.addEventListener\('pointermove', updateManualResize\)/);
  assert.match(ui, /window\.addEventListener\('pointerup', finishManualResize\)/);
  assert.match(ui, /width: `\$\{resolvedColumnWidths\[key\]\}px`/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function TorrentTable')), /new ResizeObserver/);
});

test('torrent table supports column visibility toggles', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /columnVisibility/);
  assert.match(ui, /toggleColumn/);
  assert.match(ui, /aria-label="Column visibility"/);
  assert.match(ui, /aria-label="Choose visible columns"/);
  assert.match(ui, /className=\{tableClass\}/);
  assert.match(ui, /function ColumnChooser/);
  assert.match(ui, /aria-labelledby="column-chooser-title"/);
  assert.match(css, /\.column-chooser-backdrop/);
  assert.match(css, /\.column-chooser-backdrop[^\{]*\{[^}]*pointer-events:auto!important/);
  assert.match(css, /\.column-chooser-modal/);
  assert.match(css, /\.column-menu-trigger/);
  assert.match(css, /hide-state/);
});

test('torrent table persists column visibility preferences', async () => {
  const ui = await source();
  assert.match(ui, /localStorage\.getItem\('deck-column-visibility'/);
  assert.match(ui, /localStorage\.setItem\(\s*'deck-column-visibility',\s*JSON\.stringify\(columnVisibility\),?\s*\)/);
});

test('torrent table keeps every content-sized column resizable and aligned', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/dashboard-polish.css'), 'utf8')]);
  assert.match(ui, /const TABLE_LAYOUT_VERSION = '2026-09-content-aware-columns'/);
  assert.match(ui, /const DEFAULT_COLUMN_VISIBILITY = \{[\s\S]*added: false,[\s\S]*tracker: false,[\s\S]*queue: false/);
  assert.match(ui, /const AUTO_COLUMN_FALLBACKS = \{[\s\S]*progress: 154/);
  assert.match(ui, /classList\.add\('column-measure-table'\)/);
  assert.match(ui, /style=\{\{ width: `\$\{resolvedColumnWidths\[key\]\}px` \}\}/);
  assert.match(ui, /data-column=\{key\}/);
  assert.match(ui, /localStorage\.getItem\('deck-table-layout-version'\)/);
  assert.match(ui, /localStorage\.setItem\('deck-table-layout-version', TABLE_LAYOUT_VERSION\)/);
  assert.match(ui, /'size',[\s\S]*'ratio',[\s\S]*'download'/);
  assert.match(css, /table\.auto-sized-table \{[\s\S]*width:100%;[\s\S]*table-layout:fixed/);
  assert.match(css, /table\.column-measure-table \{[\s\S]*width:max-content!important/);
  assert.match(css, /td\[data-column\][\s\S]*text-align:center/);
});

test('desktop torrent area fills the viewport and scrolls inside the table', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /className="sidebar-command-row"[\s\S]*className="add-button"/);
  assert.match(ui, /className="sidebar-bottom"[\s\S]*aria-label="Preferences"[\s\S]*className="icon-button sidebar-toggle"/);
  assert.match(css, /\.main-content \{ height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; \}/);
  assert.match(css, /\.table-shell \{[\s\S]*flex:1;[\s\S]*overflow:auto!important/);
  assert.match(css, /\.table-shell \.table-tools \{[\s\S]*position:absolute;[\s\S]*height:44px/);
  assert.match(css, /\.table-shell thead th \{[\s\S]*position:sticky;[\s\S]*top:0/);
  assert.match(css, /\.sidebar \{[\s\S]*position:sticky;[\s\S]*height:100dvh;[\s\S]*overflow:hidden/);
  assert.match(css, /\.sidebar-bottom \{[\s\S]*position:sticky;[\s\S]*bottom:0;[\s\S]*flex:none/);
  assert.match(css, /\.sidebar > nav \.nav-item \{[\s\S]*grid-template-columns:20px minmax\(0,1fr\) 20px;[\s\S]*text-align:center/);
  assert.match(css, /\.sidebar>nav \{[\s\S]*overflow-y:auto/);
});

test('desktop dashboard relies on sidebar filters instead of duplicate library controls', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /className="library-mobile-controls"/);
  assert.match(css, /\.library-mobile-controls \{ display:none; \}/);
  assert.match(css, /@media \(min-width:761px\) \{[\s\S]*\.stats-grid \{ margin-bottom:24px; \}/);
});

test('dashboard uses concise command bar copy and zero-valued idle rates', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /const rate = \(value = 0\) => \(value \? `\$\{formatBytes\(value\)\}\/s` : '0'\)/);
  assert.doesNotMatch(ui, /placeholder="Search your library…"/);
  assert.doesNotMatch(ui, /FAST · PRIVATE · IN YOUR CONTROL/);
  assert.match(css, /@media \(min-width:761px\) \{[\s\S]*\.topbar \{ height:64px;[\s\S]*\.workspace > \.search-wrap \{ height:42px; margin-bottom:18px; \}/);
});

test('torrent table exposes seed peer added and tracker columns', async () => {
  const ui = await source();
  assert.match(ui, />\s*Seeds\s*<\/button>/);
  assert.match(ui, />\s*Peers\s*<\/button>/);
  assert.match(ui, />\s*Added\s*<\/button>/);
  assert.match(ui, />\s*Tracker\s*<\/button>/);
  assert.match(ui, /torrent\.tracker_host/);
});

test('torrent table supports tracker favicons, compact swarm counts, and seeding time', async () => {
  const ui = await source();
  assert.match(ui, /const trackerFavicon/);
  assert.match(ui, /TRACKER_FAVICON_CATALOG/);
  assert.match(ui, /torrentleech\.org/);
  assert.match(ui, /funfile\.org/);
  assert.doesNotMatch(ui, /google\.com\/s2\/favicons/);
  assert.match(ui, /icons\.duckduckgo\.com\/ip3/);
  assert.match(ui, /className="tracker-favicon-small tracker-favicon-controlled"/);
  assert.match(ui, /className="tracker-favicon-small tracker-favicon-fallback"/);
  assert.match(ui, /seedingTime: 'Seeding time'/);
  assert.match(ui, /toggleSort\('seeding_time'\)/);
  assert.match(ui, /Number\(torrent\.num_seeds\) \|\| 0} \/ \$\{Number\(torrent\.total_seeds\)/);
  assert.match(ui, /Number\(torrent\.num_peers\) \|\| 0} \/ \$\{Number\(torrent\.total_peers\)/);
});

test('torrent table shows sortable queue positions beside queue actions', async () => {
  const ui = await source();
  assert.match(ui, /toggleSort\('queue'\)/);
  assert.match(ui, /queueRank\(torrent\) === Number\.MAX_SAFE_INTEGER/);
  assert.match(ui, /queueRank\(torrent\) \+ 1/);
});

test('queue position participates in column visibility controls', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /queue: true/);
  assert.match(ui, /queue: 'Queue'/);
  assert.match(css, /hide-queue th:nth-child\(15\)/);
});

test('torrent table shows tracker status with host details', async () => {
  const [ui, css, server] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8'), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /tracker_status/);
  assert.match(ui, /className=\{`tracker-status/);
  assert.match(ui, /className="tracker-host"/);
  assert.match(css, /\.tracker-status/);
  assert.match(server, /tracker_status/);
});

test('torrent table keeps filtering controls out of the main view', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.doesNotMatch(ui, /smartFilter/);
  assert.doesNotMatch(ui, /Smart torrent filter/);
  assert.doesNotMatch(css, /\.smart-filter/);
});

test('mobile torrent actions use a bottom-sheet layout', async () => {
  const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /@media \(max-width:760px\)\{\.context-menu\{top:auto!important/);
  assert.match(css, /bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /mobile-sheet-in/);
  assert.match(css, /\.context-menu button\{padding:10px 11px/);
});

test('torrent actions expose tracker reannounce', async () => {
  const [ui, server] = await Promise.all([source(), readFile(path.join(root, 'server/index.mjs'), 'utf8')]);
  assert.match(ui, /reannounce: 'core\.force_reannounce'/);
  assert.match(ui, />\s*Reannounce\s*<\/button>/);
  assert.match(server, /core\.force_reannounce/);
});

test('dashboard exposes the dream-loop telemetry hierarchy', async () => {
  const [ui, polish] = await Promise.all([
    source(),
    readFile(path.join(root, 'src/dashboard-polish.css'), 'utf8'),
  ]);
  assert.match(ui, /<h1>Deluge<\/h1>/);
  assert.match(ui, /aria-label="Torrent filters"/);
  assert.match(ui, /className="deck-filter-summary"/);
  assert.match(ui, /aria-label="Session status"/);
  assert.match(ui, /className="status-free-space"/);
  assert.match(ui, /Available free space on the Deluge server/);
  assert.match(ui, /formatBytes\(stats\.free_space\)/);
  assert.match(ui, /className="status-free-space"[\s\S]*Live sync/);
  assert.match(ui, /Current payload/);
  assert.match(ui, /telemetryHistory/);
  assert.match(ui, /\}, \[stats, torrents\.length\]\);/);
  assert.match(ui, /countTorrentStates/);
  assert.match(ui, /counts=\{torrentCounts\}/);
  assert.match(ui, /<polyline points=\{points\}/);
  assert.match(polish, /\.stats-grid \.stat-card>\.stat-spark \{ display:block!important/);
  assert.match(polish, /\.deck-status-rail/);
  assert.match(polish, /\.deck-status-rail \.status-free-space/);
  assert.match(polish, /\.external-ip \{ display:none; \}/);
});

test('top bar overlays stay dismissible and inside the viewport', async () => {
  const [ui, css] = await Promise.all([source(), readFile(path.join(root, 'src/styles.css'), 'utf8')]);
  assert.match(ui, /document\.addEventListener\('keydown', dismiss, true\)/);
  assert.match(ui, /open \? 'Close global session controls' : 'Open global session controls'/);
  assert.match(ui, /function useDialogDismiss/);
  assert.match(ui, /useDialogDismiss\(onClose, modalRef\)/);
  assert.match(ui, /function ensureViewportOverlayHost/);
  assert.match(ui, /function useViewportOverlayHost\(\)/);
  assert.match(ui, /document\.getElementById\('deluge-deck-viewport-overlay'\)/);
  assert.match(ui, /document\.body\.appendChild\(overlay\)/);
  assert.match(ui, /createPortal\([\s\S]*ConnectionManagerModal/);
  assert.match(css, /\.global-popover\{position:fixed!important;top:84px!important;right:24px!important;[^}]*transform:none!important;[^}]*max-height:calc\(100dvh - 96px\)[^}]*overflow:auto!important/);
  assert.match(css, /\.global-popover\.portal-popover \{[\s\S]*position:fixed!important;[\s\S]*top:84px!important;[\s\S]*right:24px!important/);
  assert.match(css, /#deluge-deck-viewport-overlay \{[\s\S]*position:fixed!important;[\s\S]*inset:0!important/);
  assert.match(css, /\.global-trigger\[aria-expanded="true"\]:before\{content:"×"/);
});

test('every Deck overlay supports Escape and outside-pointer dismissal', async () => {
  const [ui, bridge] = await Promise.all([source(), readFile(path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js'), 'utf8')]);
  assert.match(ui, /function useDialogDismiss[\s\S]*event\.type === 'pointerdown'[\s\S]*event\.key === 'Escape'/);
  for (const name of ['ConnectionManagerModal', 'DetailDrawer', 'RemoveModal', 'MoveStorageModal', 'RenameTorrentModal', 'PreferencesModal', 'AddTorrentModal']) {
    const start = ui.indexOf(`function ${name}`);
    const end = ui.indexOf('\nfunction ', start + 1);
    assert.match(ui.slice(start, end < 0 ? undefined : end), /useDialogDismiss\(onClose, (modalRef|drawerRef|dialogRef)\)/, `${name} should use shared dismissal`);
  }
  assert.match(ui, /function ThemeMenu[\s\S]*usePopoverDismiss\(open, setOpen, menuRef\)/);
  assert.match(ui, /function ColumnChooser[\s\S]*useDialogDismiss\(onClose, dialogRef\)/);
  assert.match(ui, /closest\('\.context-menu, \.row-menu'\)/);
  const sidebar = ui.slice(ui.indexOf('function Sidebar'), ui.indexOf('const signalPopover'));
  const topbar = ui.slice(ui.indexOf('function Topbar'), ui.indexOf('function Progress'));
  assert.doesNotMatch(sidebar, /document\.addEventListener\('pointerdown'/);
  assert.doesNotMatch(sidebar, /sidebar-top/);
  assert.doesNotMatch(topbar, /navigation-toggle/);
  assert.match(ui, /className="icon-button sidebar-toggle"[\s\S]*onClick=\{\(\) => setCollapsed\(\(value\) => !value\)\}/);
  assert.match(bridge, /document\.addEventListener\('pointerdown', closeNativePreferences, true\)/);
});

test('hosted bridge leaves Deck viewport overlays out of legacy window detection', async () => {
  const bridge = await readFile(path.join(root, 'plugin/deluge_deck/data/deluge-deck-plugin.js'), 'utf8');
  assert.match(bridge, /if \(node\.closest\?\.\(`#\$\{window\.__DELUGE_DECK_OVERLAY_ROOT_ID__\}`\)\) return;/);
  assert.match(bridge, /!candidate\.closest\?\.\(`#\$\{window\.__DELUGE_DECK_OVERLAY_ROOT_ID__\}`\)/);
});
