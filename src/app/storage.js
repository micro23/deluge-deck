// Storage can be unavailable in privacy mode or full. Preferences must not
// prevent login or crash the dashboard; keep a session-only fallback.
const fallback = new Map();
export const storage = {
  getItem(key) {
    if (fallback.has(key)) return fallback.get(key);
    try { return globalThis.localStorage.getItem(key) ?? fallback.get(key) ?? null; }
    catch { return fallback.get(key) ?? null; }
  },
  setItem(key, value) {
    fallback.set(key, String(value));
    try { globalThis.localStorage.setItem(key, String(value)); } catch { /* session-only */ }
  },
};
