// Small DOM helpers: element builder, toasts, live region, seeded random
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}

export function svg(tag, attrs = {}, ...children) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

let live;
export function announce(msg) {
  if (!live) {
    live = el('div', { class: 'sr-only', 'aria-live': 'polite', role: 'status' });
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => { live.textContent = msg; }, 50);
}

let toastBox;
export function toast(msg, action, ms = 4000) {
  if (!toastBox) { toastBox = el('div', { class: 'toasts' }); document.body.append(toastBox); }
  const t = el('div', { class: 'toast', role: 'status' }, el('span', { text: msg }));
  if (action) {
    t.append(el('button', { type: 'button', text: action.label, onclick: () => { action.run(); t.remove(); } }));
  }
  toastBox.append(t);
  setTimeout(() => t.remove(), ms);
  return t;
}

// mulberry32 seeded random — same id gives the same "random" tilt every visit
export function rng(seed) {
  let a = typeof seed === 'string' ? [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703) : seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const reduceMotion = () =>
  document.documentElement.classList.contains('reduce-motion') ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor(s % 86400 / 3600)).padStart(2, '0');
  const mm = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (d ? `${d} วัน ` : '') + `${hh}:${mm}:${ss}`;
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export function fmtThaiDate(d) {
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// pause work when an element is off screen or the tab is hidden
export function whenVisible(node, onChange) {
  let inView = false;
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; onChange(inView && !document.hidden); });
  io.observe(node);
  const vis = () => onChange(inView && !document.hidden);
  document.addEventListener('visibilitychange', vis);
  return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); };
}
