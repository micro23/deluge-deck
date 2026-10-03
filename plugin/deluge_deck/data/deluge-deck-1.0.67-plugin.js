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
earlyStyle.textContent = 'html.deluge-deck-hosted #mainPanel,html.deluge-deck-hosted [data-deluge-deck-legacy="true"],html.deluge-deck-hosted [data-deluge-deck-stock-login="true"],html.deluge-deck-hosted [data-deluge-deck-stock-login-shadow="true"],html.deluge-deck-hosted [data-deluge-deck-stock-connection="true"],html.deluge-deck-hosted .x-window:has(.x-deluge-connect-window-icon),html.deluge-deck-hosted [class*="x-deluge-connect-window" i],html.deluge-deck-hosted [id*="connection-manager" i],html.deluge-deck-hosted [id*="connectionmanager" i] { display:none !important; visibility:hidden !important; } html.deluge-deck-hosted #deluge-deck-root { position:fixed !important; inset:0 !important; width:100vw !important; height:100vh !important; overflow:auto !important; }';
(document.head || document.documentElement).appendChild(earlyStyle);

const windowSelector = '.x-window,[role="dialog"]';
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
  return /connection\s*manager|connectionmanager|x-deluge-connect-window-icon/i.test(marker)
    || /\bstatus\b[\s\S]{0,160}\bhost\b[\s\S]{0,160}\bversion\b/i.test(marker)
    || Boolean(node.querySelector?.('.x-deluge-connect-window-icon'));
};
const deckOverlaySelector = () => `#${window.__DELUGE_DECK_OVERLAY_ROOT_ID__}`;
const isDeckOverlayNode = (node) => node?.closest?.(deckOverlaySelector());
const hideStockConnectionElement = (element) => {
  if (!(element instanceof Element) || isDeckOverlayNode(element)) return;
  element.dataset.delugeDeckStockConnection = 'true';
  element.hidden = true;
  element.style.setProperty('display', 'none', 'important');
  element.style.setProperty('visibility', 'hidden', 'important');
};
const loginWindowFor = (node) => {
  if (!(node instanceof Element)) return null;
  const candidates = [node, ...node.querySelectorAll?.(windowSelector) || []];
  return candidates.find((candidate) => !hasNativeWindowMarker(candidate) && hasLoginMarker(candidate) && candidate.matches?.(windowSelector))
    || (hasLoginMarker(node) ? node.closest?.(windowSelector) : null);
};
const isLegacyShellNode = (node) => {
  if (!(node instanceof Element) || node.id === window.__DELUGE_DECK_ROOT_ID__ || node.id === window.__DELUGE_DECK_OVERLAY_ROOT_ID__) return false;
  if (node.id === 'mainPanel') return true;
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
  return mask.nextElementSibling === stockLoginWindow || mask.previousElementSibling === stockLoginWindow
    || (mask.nextElementSibling?.matches('.x-shadow') && mask.nextElementSibling.nextElementSibling === stockLoginWindow);
};
const hideAssociatedLoginMasks = () => {
  document.querySelectorAll('.ext-el-mask').forEach((mask) => {
    if (isAssociatedLoginMask(mask)) {
      mask.dataset.delugeDeckStockLogin = 'true';
      const shadow = mask.nextElementSibling;
      if (shadow?.matches('.x-shadow') && shadow.nextElementSibling === stockLoginWindow)
        shadow.dataset.delugeDeckStockLoginShadow = 'true';
    }
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
// Deluge may replace the manager object while its UI is being initialized, so
// track patched instances rather than treating the first one as permanent.
const patchedStockConnectionManagers = new WeakSet();
const disableStockConnectionManager = () => {
  const manager = window.deluge?.connectionManager;
  if (!manager) return false;
  const element = manager.getEl?.()?.dom || manager.el?.dom;
  if (element) hideStockConnectionElement(element);
  if (!patchedStockConnectionManagers.has(manager) && typeof manager.show === 'function') {
    manager.show = function suppressDeckStockConnectionManager() {
      const currentElement = this.getEl?.()?.dom || this.el?.dom;
      if (currentElement) hideStockConnectionElement(currentElement);
      if (this.rendered && this.hidden !== true) this.hide?.();
      return this;
    };
    patchedStockConnectionManagers.add(manager);
  }
  if (manager.isVisible?.() || (manager.rendered && manager.hidden !== true)) manager.hide?.();
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
    hideStockConnectionElement(candidate);
  });
  // The Connection Manager title can be absent during its first render, but
  // its icon class is stable. Walk back to the Ext.Window instead of waiting
  // for title text that may only appear on a later layout pass.
  const connectionIcon = node.matches?.('.x-deluge-connect-window-icon')
    ? node
    : node.querySelector?.('.x-deluge-connect-window-icon');
  const connectionWindow = connectionIcon?.closest?.(windowSelector);
  if (connectionWindow && !isDeckOverlayNode(connectionWindow)) hideStockConnectionElement(connectionWindow);
  node.querySelectorAll?.('[class*="x-deluge-connect-window" i],[id*="connection-manager" i],[id*="connectionmanager" i]').forEach((marker) => {
    const windowElement = marker.closest?.(windowSelector) || marker;
    if (!isDeckOverlayNode(windowElement)) hideStockConnectionElement(windowElement);
  });
  disableStockConnectionManager();
};
let hostedAutoConnect = null;
const hostedRpc = (method, params = []) => fetch('json', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ method, params, id: Date.now() }),
}).then((response) => response.json()).then((payload) => {
  if (payload?.error) throw new Error(payload.error.message || 'Deluge Web request failed.');
  return payload?.result;
});
const autoConnectHostedDaemon = () => {
  if (hostedAutoConnect) return hostedAutoConnect;
  hostedAutoConnect = (async () => {
    if (!(await hostedRpc('auth.check_session').catch(() => false))) return false;
    if (await hostedRpc('web.connected').catch(() => false)) return true;
    const hosts = await hostedRpc('web.get_hosts').catch(() => []);
    for (const host of Array.isArray(hosts) ? hosts : []) {
      if (!Array.isArray(host) || !host[0]) continue;
      const status = await hostedRpc('web.get_host_status', [host[0]]).catch(() => null);
      const text = JSON.stringify(status || '').toLowerCase();
      if (!/online|available|connected/.test(text)) continue;
      disableStockConnectionManager();
      suppressStockConnectionWindow(document.body);
      await hostedRpc('web.connect', [host[0]]).catch(() => undefined);
      disableStockConnectionManager();
      suppressStockConnectionWindow(document.body);
      return await hostedRpc('web.connected').catch(() => false);
    }
    return false;
  })().finally(() => { hostedAutoConnect = null; });
  return hostedAutoConnect;
};
const scanStockConnectionWindows = () => {
  document.querySelectorAll(windowSelector).forEach((node) => {
    if (!isDeckOverlayNode(node)
      && hasStockConnectionMarker(node)) {
      hideStockConnectionElement(node);
      autoConnectHostedDaemon();
    }
  });
  disableStockConnectionManager();
};
const layoutNativePreferences = (preferences) => {
  const element = preferences.getEl?.()?.dom;
  const navigation = preferences.items?.get?.(0);
  const width = preferences.getWidth?.() || window.innerWidth;
  if (width < 600 && preferences.body && navigation && preferences.configPanel) {
    element?.classList.add('deck-preferences-compact');
    const bodyWidth = preferences.body.getWidth(true);
    const bodyHeight = preferences.body.getHeight(true);
    navigation.setPosition?.(0, 0);
    navigation.setSize?.(bodyWidth, 54);
    preferences.list?.setSize?.(bodyWidth, 52);
    preferences.configPanel.setPosition?.(0, 60);
    preferences.configPanel.setSize?.(bodyWidth, Math.max(80, bodyHeight - 60));
    preferences.configPanel.doLayout?.();
  } else {
    element?.classList.remove('deck-preferences-compact');
    if (navigation?.body) preferences.list?.setSize?.(navigation.body.getWidth(true), navigation.body.getHeight(true));
  }
};
const fittedPreferences = new WeakSet();
const showNativePreferences = () => {
  const preferences = window.deluge?.preferences;
  if (typeof preferences?.show !== 'function') return false;
  if (!fittedPreferences.has(preferences)) {
    preferences.on?.('afterlayout', () => layoutNativePreferences(preferences));
    fittedPreferences.add(preferences);
  }
  const fitAndReveal = () => {
    const element = preferences.getEl?.()?.dom;
    if (element) {
      element.dataset.delugeDeckNativeWindow = 'true';
      element.hidden = false;
      element.classList.add('deck-preferences-window');
      delete element.dataset.delugeDeckLegacy;
      delete element.dataset.delugeDeckStockLogin;
      element.style.removeProperty('display');
      element.style.removeProperty('visibility');

    }
    const width = Math.min(800, Math.max(240, window.innerWidth - 24));
    const height = Math.min(720, Math.max(200, window.innerHeight - 24));
    // Let Ext measure the same dimensions CSS paints, including nested plugin layouts.
    const navigation = preferences.items?.get?.(0);
    navigation?.setWidth?.(width < 600 ? 112 : 156);
    navigation?.getEl?.()?.addClass?.('deck-preferences-nav');
    preferences.configPanel?.getEl?.()?.setStyle?.('overflow', 'auto');
    Object.values(preferences.pages || {}).forEach((page) => {
      // A class on the page itself avoids treating nested plugin regions as navigation.
      if (page.rendered) page.getEl?.()?.addClass?.('deck-preferences-page');
      else if (!page.cls?.split(' ').includes('deck-preferences-page')) page.addClass?.('deck-preferences-page');
    });
    preferences.setSize?.(width, height);
    preferences.center?.();
    preferences.doLayout?.();
    layoutNativePreferences(preferences);
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
let nativeResizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(nativeResizeFrame);
  nativeResizeFrame = requestAnimationFrame(() => {
    if (window.deluge?.preferences?.isVisible?.()) showNativePreferences();
  });
});
// ExtJS's native Preferences window does not consistently wire dismissal on
// touch layouts. Keep both Escape and clicks outside the panel reliable.
const closeNativePreferences = (event) => {
  const preferences = window.deluge?.preferences;
  const element = preferences?.getEl?.()?.dom;
  if (!element || element.hidden || element.style.display === 'none' || element.dataset.delugeDeckNativeWindow !== 'true') return;
  // ExtJS appends combo menus and child windows to body. They still belong to
  // this settings interaction and must not trigger outside-click dismissal.
  if (event.type === 'pointerdown' && (element.contains(event.target)
    || event.target.closest?.('.x-combo-list,.x-menu,.x-window'))) return;
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
    const nativeWindow = node.matches?.(windowSelector) && !hasLoginMarker(node) && !hasStockConnectionMarker(node);
    const containingNativeWindow = nativeWindow ? node : node.closest?.(windowSelector);
    if (containingNativeWindow && !hasLoginMarker(containingNativeWindow) && !hasStockConnectionMarker(containingNativeWindow)) {
      containingNativeWindow.dataset.delugeDeckNativeWindow = 'true';
      delete containingNativeWindow.dataset.delugeDeckLegacy;
    }
    if (node.parentElement === body && !infrastructure && !nativeWindow && isLegacyShellNode(node) && node.id !== window.__DELUGE_DECK_ROOT_ID__ && node.id !== window.__DELUGE_DECK_OVERLAY_ROOT_ID__) node.dataset.delugeDeckLegacy = 'true';
  };
  Array.from(body.children).forEach(markLegacyNode);
  // The bridge may initialize just before Deluge assigns connectionManager,
  // and Deluge may replace that object during a cold login. Keep reconciling
  // for the page lifetime so every new instance is patched before (or quickly
  // after) an automatic checkConnected()/disconnect(true) tries to show it.
  disableStockConnectionManager();
  window.setInterval(disableStockConnectionManager, 250);
  window.setInterval(scanStockConnectionWindows, 250);
  let root = document.getElementById(window.__DELUGE_DECK_ROOT_ID__);
  if (!root) {
    root = document.createElement('div');
    root.id = window.__DELUGE_DECK_ROOT_ID__;
    root.innerHTML = '<div class="deck-boot-splash" role="status" aria-label="Loading Deluge">Deluge</div>';
    body.appendChild(root);
  }
  // Preserve body-level Ext menus and child windows; only the known stock
  // shell, login and connection manager are suppressed.
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(markLegacyNode))).observe(body, { childList: true, subtree: true });
  window.__DELUGE_DECK_BOOTSTRAP_READY__ = true;
  window.dispatchEvent(new Event('deluge-deck-bootstrap-ready'));
  return root;
};
// Deluge injects plugin scripts after body creation in normal hosted use, so
// this synchronous call hides the pre-existing shell before its next paint.
if (document.body) ensureRoot(); else document.addEventListener('DOMContentLoaded', ensureRoot, { once: true });
