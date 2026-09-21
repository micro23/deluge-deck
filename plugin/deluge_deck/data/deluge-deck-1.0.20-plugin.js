// Pre-React duties only. The initial ExtJS shell is marked before React's
// mount turn; later additions are limited to a LoginWindow with a login marker
// and its ExtJS mask, never generic native dialogs such as Preferences.
window.__DELUGE_DECK_PLUGIN__ = true;
window.__DELUGE_DECK_ROOT_ID__ = 'deluge-deck-root';
window.__DELUGE_DECK_OVERLAY_ROOT_ID__ = 'deluge-deck-viewport-overlay';
document.documentElement.classList.add('deluge-deck-hosted');
// Deluge can load its three plugin resources in a different order after a
// hard browser reload.  Never re-enable the first-paint gate after React has
// already made Deck ready: body-level dialogs would then be hidden while the
// main root remained visible.
if (!document.documentElement.classList.contains('deluge-deck-ready'))
  document.documentElement.classList.add('deluge-deck-loading');
const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
viewport.name = 'viewport';
viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
if (!viewport.parentNode) document.head.appendChild(viewport);
const earlyStyle = document.createElement('style');
earlyStyle.dataset.delugeDeck = 'preauth';
earlyStyle.textContent = 'html.deluge-deck-hosted [data-deluge-deck-legacy="true"],html.deluge-deck-hosted [data-deluge-deck-stock-login="true"],html.deluge-deck-hosted [data-deluge-deck-stock-connection="true"] { display:none !important; } html.deluge-deck-hosted #deluge-deck-root { position:fixed !important; inset:0 !important; width:100vw !important; height:100vh !important; overflow:auto !important; }';
(document.head || document.documentElement).appendChild(earlyStyle);

const windowSelector = '.x-window,[class*="x-window" i],[role="dialog"]';
const nativeWindowMarker = /pref(erence)?|plugin|bandwidth|daemon/i;
const markerText = (node) => `${node?.id || ''} ${node?.className || ''} ${node?.getAttribute?.('aria-label') || ''}`;
const hasNativeWindowMarker = (node) => {
  if (!(node instanceof Element)) return false;
  return nativeWindowMarker.test(markerText(node))
    || nativeWindowMarker.test((node.textContent || '').slice(0, 500))
    || Boolean(node.querySelector?.('[id*="preference" i],[class*="preference" i],[id*="plugin" i],[class*="plugin" i]'));
};
const hasLoginMarker = (node) => {
  if (!(node instanceof Element) || hasNativeWindowMarker(node)) return false;
  const marker = markerText(node).toLowerCase();
  return /(^|[-_ ])login([-_ ]|$)|login-win|loginwindow/.test(marker)
    || Boolean(node.querySelector?.('[id*="login" i],[class*="login" i]'));
};
const hasStockConnectionMarker = (node) => {
  if (!(node instanceof Element)) return false;
  const marker = `${markerText(node)} ${(node.textContent || '').slice(0, 220)}`;
  return /connection\s*manager|connectionmanager|x-deluge-connect-window-icon/i.test(marker);
};
const loginWindowFor = (node) => {
  if (!(node instanceof Element)) return null;
  const candidates = [node, ...node.querySelectorAll?.(windowSelector) || []];
  return candidates.find((candidate) => !hasNativeWindowMarker(candidate) && hasLoginMarker(candidate) && candidate.matches?.(windowSelector))
    || (hasLoginMarker(node) ? node.closest?.(windowSelector) : null);
};
const isLegacyShellNode = (node) => {
  if (!(node instanceof Element) || node.id === window.__DELUGE_DECK_ROOT_ID__ || node.id === window.__DELUGE_DECK_OVERLAY_ROOT_ID__) return false;
  // Do not hide an existing ExtJS window/panel while Deck is enabled live.
  if (node.matches?.('.x-window,[class*="x-window" i],.x-panel,[class*="x-panel" i]') || hasNativeWindowMarker(node)) return false;
  return node.id === 'main-viewport' || node.id === 'deluge-web' || node.classList.contains('x-viewport')
    || node.classList.contains('x-border-layout-ct') || Boolean(node.querySelector?.('#main-viewport,.x-viewport,.x-border-layout-ct'));
};
let stockLoginWindow = null;
const isAssociatedLoginMask = (mask) => {
  if (!stockLoginWindow || !(mask instanceof Element)) return false;
  if (stockLoginWindow.contains(mask)) return true;
  const loginId = stockLoginWindow.id;
  const relation = `${markerText(mask)} ${mask.dataset.owner || ''} ${mask.dataset.ownerid || ''} ${mask.getAttribute('aria-controls') || ''}`;
  if (loginId && relation.includes(loginId)) return true;
  const parent = stockLoginWindow.parentElement;
  if (!parent || mask.parentElement !== parent) return false;
  return mask.nextElementSibling === stockLoginWindow || mask.previousElementSibling === stockLoginWindow;
};
const hideAssociatedLoginMasks = () => {
  document.querySelectorAll('.ext-el-mask').forEach((mask) => {
    if (isAssociatedLoginMask(mask)) mask.dataset.delugeDeckStockLogin = 'true';
  });
};
const suppressStockLogin = (node) => {
  if (!(node instanceof Element)) return;
  const loginWindow = loginWindowFor(node);
  if (loginWindow) { stockLoginWindow = loginWindow; loginWindow.dataset.delugeDeckStockLogin = 'true'; }
  hideAssociatedLoginMasks();
};
// Deck owns daemon selection in hosted mode. Deluge's stock UI can race the
// post-login auto-connect request and show its Connection Manager over Deck.
let stockConnectionManagerPatched = false;
const disableStockConnectionManager = () => {
  const manager = window.deluge?.connectionManager;
  if (!manager) return false;
  const element = manager.getEl?.()?.dom;
  if (element) element.dataset.delugeDeckStockConnection = 'true';
  if (!stockConnectionManagerPatched && typeof manager.show === 'function') {
    manager.show = function suppressDeckStockConnectionManager() {
      this.hide?.();
      return this;
    };
    stockConnectionManagerPatched = true;
  }
  if (manager.isVisible?.()) manager.hide?.();
  return true;
};
const suppressStockConnectionWindow = (node) => {
  if (!(node instanceof Element)) return;
  const candidates = [node, ...node.querySelectorAll?.(windowSelector) || []];
  // Deck's own React dialog is also announced as a dialog and contains the
  // words "Connection manager".  It lives in the dedicated overlay root, so
  // never classify it as the legacy ExtJS connection window.
  candidates.filter((candidate) =>
    candidate.matches?.(windowSelector)
    && !candidate.closest?.(`#${window.__DELUGE_DECK_OVERLAY_ROOT_ID__}`)
    && hasStockConnectionMarker(candidate)
  ).forEach((candidate) => {
    candidate.dataset.delugeDeckStockConnection = 'true';
  });
  disableStockConnectionManager();
};
const ensureNativePreferencesControls = (preferences, element) => {
  if (!element || element.querySelector('.deck-native-preferences-controls')) return;
  const controls = document.createElement('div');
  controls.className = 'deck-native-preferences-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Preferences actions');
  controls.innerHTML = '<button type="button" class="deck-native-preferences-close" data-action="close" aria-label="Close Preferences">×</button><div class="deck-native-preferences-actions"><button type="button" data-action="close">Close</button><button type="button" data-action="apply">Apply</button><button type="button" data-action="ok">OK</button></div>';
  const invokeNative = (action) => {
    const handler = preferences?.[`on${action[0].toUpperCase()}${action.slice(1)}`];
    if (typeof handler === 'function') handler.call(preferences);
    else if (action === 'apply') preferences.onApply?.();
    else if (action === 'ok') preferences.onOk?.();
    else if (typeof preferences?.[action] === 'function') preferences[action]();
    // ExtJS versions differ: some expose methods, others only wire the
    // footer buttons. Trigger the native button when no API is available.
    if (typeof handler !== 'function' && typeof preferences?.[action] !== 'function') {
      const nativeButton = [...element.querySelectorAll('button')].find((button) => !controls.contains(button) && button.textContent.trim().toLowerCase() === action);
      nativeButton?.click();
    }
    if (action === 'close') {
      // Keep the close affordance reliable even when an older ExtJS build has
      // a no-op hide/close implementation (or delays its visibility update).
      element.hidden = true;
      element.style.setProperty('display', 'none', 'important');
    }
  };
  const close = () => invokeNative('close');
  controls.querySelectorAll('[data-action="close"]').forEach((button) => button.addEventListener('click', close));
  controls.querySelector('[data-action="apply"]')?.addEventListener('click', () => invokeNative('apply'));
  controls.querySelector('[data-action="ok"]')?.addEventListener('click', () => invokeNative('ok'));
  element.appendChild(controls);
};
const showNativePreferences = () => {
  const preferences = window.deluge?.preferences;
  if (typeof preferences?.show !== 'function') return false;
  const fitAndReveal = () => {
    const element = preferences.getEl?.()?.dom;
    if (element) {
      element.dataset.delugeDeckNativeWindow = 'true';
      delete element.dataset.delugeDeckLegacy;
      delete element.dataset.delugeDeckStockLogin;
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');
      ensureNativePreferencesControls(preferences, element);
    }
    const width = Math.min(760, Math.max(320, window.innerWidth - 32));
    const height = Math.min(700, Math.max(360, window.innerHeight - 32));
    preferences.setSize?.(width, height);
    preferences.center?.();
    preferences.doLayout?.();
  };
  if (!preferences.rendered && typeof preferences.on === 'function') {
    preferences.on('afterrender', fitAndReveal, null, { single: true });
  }
  preferences.show();
  fitAndReveal();
  requestAnimationFrame(fitAndReveal);
  return true;
};
window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__ = showNativePreferences;
// ExtJS's native Preferences window does not consistently wire dismissal on
// touch layouts. Keep both Escape and clicks outside the panel reliable.
const closeNativePreferences = (event) => {
  const preferences = window.deluge?.preferences;
  const element = preferences?.getEl?.()?.dom;
  if (!element || element.hidden || element.style.display === 'none' || element.dataset.delugeDeckNativeWindow !== 'true') return;
  if (event.type === 'pointerdown' && element.contains(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  if (typeof preferences.hide === 'function') preferences.hide();
  else if (typeof preferences.close === 'function') preferences.close();
  if (element) {
    element.hidden = true;
    element.style.setProperty('display', 'none', 'important');
  }
};
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNativePreferences(event); }, true);
document.addEventListener('pointerdown', closeNativePreferences, true);
const ensureRoot = () => {
  const body = document.body;
  if (!body) return null;
  const markLegacyNode = (node) => {
    if (!(node instanceof Element)) return;
    // React owns everything inside this layer.  Its dialogs intentionally use
    // accessible dialog semantics and words such as "daemon", so legacy
    // ExtJS detection must never annotate or style them.
    if (node.closest?.(`#${window.__DELUGE_DECK_OVERLAY_ROOT_ID__}`)) return;
    suppressStockLogin(node);
    suppressStockConnectionWindow(node);
    const infrastructure = ['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName);
    const nativeWindow = node.matches?.(windowSelector) && hasNativeWindowMarker(node);
    const containingNativeWindow = nativeWindow ? node : node.closest?.(windowSelector);
    if (containingNativeWindow && hasNativeWindowMarker(containingNativeWindow)) {
      containingNativeWindow.dataset.delugeDeckNativeWindow = 'true';
      delete containingNativeWindow.dataset.delugeDeckLegacy;
    }
    if (node.parentElement === body && !infrastructure && !nativeWindow && node.id !== window.__DELUGE_DECK_ROOT_ID__ && node.id !== window.__DELUGE_DECK_OVERLAY_ROOT_ID__) node.dataset.delugeDeckLegacy = 'true';
  };
  Array.from(body.children).forEach(markLegacyNode);
  // The bridge may initialize just before Deluge assigns connectionManager.
  if (!disableStockConnectionManager()) {
    const patchManager = window.setInterval(() => {
      // Deluge can finish constructing connectionManager well after the
      // plugin resources load on a cold/private session. Keep the guard alive
      // until the manager exists so its automatic first-load show() cannot
      // race past the bridge and cover Deck.
      if (disableStockConnectionManager()) window.clearInterval(patchManager);
    }, 100);
  }
  let root = document.getElementById(window.__DELUGE_DECK_ROOT_ID__);
  if (!root) {
    root = document.createElement('div');
    root.id = window.__DELUGE_DECK_ROOT_ID__;
    root.innerHTML = '<div class="deck-boot-splash" role="status" aria-label="Loading Deluge">Deluge</div>';
    body.appendChild(root);
  }
  // Observe delayed generic Ext.Window only when it contains a login marker.
  // A native Preferences Ext.Window has no marker and is left alone.
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(markLegacyNode))).observe(body, { childList: true, subtree: true });
  window.__DELUGE_DECK_BOOTSTRAP_READY__ = true;
  window.dispatchEvent(new Event('deluge-deck-bootstrap-ready'));
  return root;
};
// Deluge injects plugin scripts after body creation in normal hosted use, so
// this synchronous call hides the pre-existing shell before its next paint.
if (document.body) ensureRoot(); else document.addEventListener('DOMContentLoaded', ensureRoot, { once: true });
