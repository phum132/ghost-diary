// localStorage wrapper — every access can throw (private mode, blocked storage)
const P = 'slur.v1.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(P + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function save(key, value) {
  try { localStorage.setItem(P + key, JSON.stringify(value)); return true; } catch { return false; }
}

export function sload(key, fallback) {
  try {
    const raw = sessionStorage.getItem(P + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function ssave(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(P + key);
    else sessionStorage.setItem(P + key, JSON.stringify(value));
  } catch { /* ignore */ }
}

const DEFAULT_PREFS = { sound: false, reduce: false, typed: false, fs: 1 };
export function prefs() { return { ...DEFAULT_PREFS, ...load('prefs', {}) }; }
export function setPref(k, v) { const p = prefs(); p[k] = v; save('prefs', p); return p; }

// read tracking + per-entry mode
export function markRead(id) { const r = load('read', {}); if (!r[id]) { r[id] = Date.now(); save('read', r); } }
export function isRead(id) { return !!load('read', {})[id]; }
export function savedKey(id) { return load('unlocked', {})[id] || null; }
export function saveKey(id, key) { const u = load('unlocked', {}); u[id] = key; save('unlocked', u); }
