import { pluginMode, hostedUrl } from './api.js';

let manifestPromise;
let manifestData;
let galleryRows = [];
let galleryPromise;
const packs = new Map();
const pending = new Map();
const manifestUrl = () => window.__DELUGE_DECK_THEME_MANIFEST_URL__ || (pluginMode() ? hostedUrl('deluge-deck-resources/manifest.json') : new URL('/deck-themes.json', location.href).href);
const read = async url => {
  const response = await fetch(url, { credentials: 'same-origin', cache: url.endsWith('manifest.json') || url.endsWith('deck-themes.json') ? 'no-cache' : 'default', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Theme resources could not be loaded. Please try again.');
  return response.json();
};
const manifest = () => manifestPromise ||= read(manifestUrl()).then(data => {
  if (data?.version !== 1 || !Array.isArray(data.shared) || !data.themes) throw new Error('Theme resources are incompatible. Reload the page.');
  manifestData = data;
  return data;
}).catch(error => { manifestPromise = undefined; throw error; });
const validateRows = rows => {
  if (!Array.isArray(rows) || rows.some(row => !Array.isArray(row) || !Number.isInteger(row[0]) || typeof row[1] !== 'string')) throw new Error('Theme resources are invalid.');
  return rows;
};
export async function prepareTheme(theme) {
  if (packs.has(theme)) return;
  if (pending.has(theme)) return pending.get(theme);
  const request = (async () => {
    const data = await manifest();
    if (!Object.hasOwn(data.themes, theme)) throw new Error('This theme is unavailable.');
    packs.set(theme, validateRows(await read(new URL(data.themes[theme], manifestUrl()).href)));
  })().finally(() => pending.delete(theme));
  pending.set(theme, request); return request;
}
export function activateTheme(theme) {
  const data = manifestData;
  if (!data) throw new Error('Theme manifest has not finished loading.');
  if (!packs.has(theme)) throw new Error('Theme has not finished loading.');
  const rows = [...validateRows(data.shared), ...packs.get(theme), ...galleryRows].sort((a, b) => a[0] - b[0]);
  const assets = new URL('assets/', manifestUrl()).href;
  const css = rows.map(row => row[1]).join('').replaceAll('__DECK_ASSET__/', assets);
  let style = document.querySelector('style[data-deluge-deck="true"]');
  if (!style) { style = document.createElement('style'); style.dataset.delugeDeck = 'true'; document.head.appendChild(style); }
  style.textContent = css;
  style.dataset.theme = theme;
  document.documentElement.dataset.theme = theme;
}
export function loadThemeGallery() {
  return galleryPromise ||= (async () => {
    const data = await manifest();
    galleryRows = validateRows(await read(new URL(data.gallery, manifestUrl()).href));
    const theme = document.documentElement.dataset.theme;
    if (packs.has(theme)) await activateTheme(theme);
  })().catch(error => { galleryPromise = undefined; throw error; });
}
