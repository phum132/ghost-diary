// Loads content/*.json and works out which diary pages are open
import { sload, ssave, savedKey, isRead } from './store.js';
import { sha256hex } from './crypto.js';

export const ROOT = new URL('../../', import.meta.url);
export const url = (p) => new URL(p, ROOT).href;

async function fetchOk(p, as) {
  const r = await fetch(url(p), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return as === 'text' ? r.text() : r.json();
}
export const getJSON = (p) => fetchOk(p, 'json');
export const getText = (p) => fetchOk(p, 'text');

const memo = {};
export const config = () => (memo.config ??= getJSON('content/config.json'));
export const evidence = () => (memo.ev ??= getJSON('content/evidence.json'));
export const entries = () => (memo.idx ??= getJSON('content/entries/index.json').then((l) => l.sort((a, b) => a.day - b.day)));

// ---- preview mode (owner only): ?preview=<key>&date=YYYY-MM-DD ----
export async function initPreview() {
  const q = new URLSearchParams(location.search);
  const key = q.get('preview');
  if (key != null) {
    const cfg = await config();
    if (key === 'off') ssave('preview', null);
    else if (cfg.previewKeySha256 && (await sha256hex(key)) === cfg.previewKeySha256) {
      ssave('preview', { date: q.get('date') || null });
    }
    // strip the key from the address bar so it doesn't end up in shared links
    q.delete('preview'); q.delete('date');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  }
  return sload('preview', null);
}
export const preview = () => sload('preview', null);
export function exitPreview() { ssave('preview', null); location.reload(); }

export function now() {
  const p = preview();
  if (!p) return new Date();
  if (!p.date) return new Date(8.64e15); // preview without a date = everything open
  const [y, m, d] = p.date.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59);
}

// day <= freeDays is always open; after that one page per day at unlockHour from startDate
export function unlockAt(day, cfg) {
  if (day <= (cfg.freeDays || 0)) return new Date(0);
  const [y, m, d] = cfg.startDate.split('-').map(Number);
  return new Date(y, m - 1, d + (day - (cfg.freeDays || 0) - 1), cfg.unlockHour ?? 20, 0, 0);
}

// states: open | password | soon (next to open) | future
export async function states() {
  const [cfg, list] = await Promise.all([config(), entries()]);
  const t = now().getTime();
  let soonGiven = false;
  return list.map((e) => {
    const at = unlockAt(e.day, cfg);
    let state;
    if (at.getTime() <= t) state = e.unlock === 'password' && !savedKey(e.id) ? 'password' : 'open';
    else if (!soonGiven) { state = 'soon'; soonGiven = true; }
    else state = 'future';
    return { ...e, at, state, read: isRead(e.id) };
  });
}
