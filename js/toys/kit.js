// Shared scaffolding for SLUR Lab tools: frame, sliders, canvas loop, pin/reset
import { el, announce, whenVisible, reduceMotion } from '../core/ui.js';
import { pin } from '../core/board-store.js';
import { url } from '../core/content.js';

export function frame(host, o, { wide = false } = {}) {
  const canvas = el('canvas', { class: wide ? 'wide' : '', role: 'img', 'aria-label': o.title });
  const overlay = el('div', { class: 'overlay', 'aria-hidden': 'true' });
  const stage = el('div', { class: 'toy-stage' }, canvas, overlay);
  const controls = el('div', { class: 'controls', style: { display: 'grid', gap: '12px' } });
  const more = el('details', { class: 'more' }, el('summary', {}, 'ตั้งค่าเพิ่ม'), el('div'));
  const result = el('div', { class: 'result', 'aria-live': 'polite' });
  const formula = el('div', { class: 'formula-box' });
  const explain = el('details', { class: 'explain', open: !o.compact }, el('summary', {}, 'มันทำงานยังไง'));
  const pinBtn = el('button', { class: 'btn small', type: 'button' }, '📌 ปักผลนี้');
  const resetBtn = el('button', { class: 'btn small', type: 'button' }, '↺ รีเซ็ต');
  const full = el('a', { class: 'btn small open-full', href: url(`lab.html?tool=${o.name}`) }, 'เปิดเต็มจอ →');
  const panel = el('div', { class: 'toy-panel' }, controls, more, result, el('div', { class: 'toy-actions' }, pinBtn, resetBtn, full), formula, explain);
  const root = el('section', { class: 'toy' + (o.compact ? ' compact' : ''), 'aria-label': `เครื่องมือ: ${o.title}` },
    el('div', { class: 'toy-head' }, el('h3', {}, o.title), el('span', { class: 'topic' }, o.topic)),
    el('div', { class: 'toy-body' }, stage, panel));
  host.append(root);
  return { root, canvas, overlay, stage, controls, more: more.lastChild, moreBox: more, result, formula, explain, pinBtn, resetBtn };
}

// range slider with live output and units; returns { input, get(), set(v) }
export function slider(parent, { label, min, max, step = 1, value, unit = '', fmt, onInput }) {
  const id = 'r' + Math.random().toString(36).slice(2, 8);
  const out = el('output', { for: id });
  const input = el('input', { id, type: 'range', min, max, step, value });
  const show = () => { out.textContent = (fmt ? fmt(+input.value) : input.value) + (unit ? ' ' + unit : ''); input.setAttribute('aria-valuetext', out.textContent); };
  input.addEventListener('input', () => { show(); onInput?.(+input.value); });
  show();
  parent.append(el('div', { class: 'ctl' }, el('label', { class: 'lbl', for: id }, el('span', {}, label), out), input));
  return { input, get: () => +input.value, set: (v) => { input.value = v; show(); onInput?.(+v); } };
}

export function segmented(parent, label, options, value, onChange) {
  const box = el('div', { class: 'seg', role: 'group', 'aria-label': label });
  let cur = value;
  const btns = options.map(([v, t]) => el('button', { type: 'button', 'aria-pressed': String(v === value), onclick: () => set(v) }, t));
  function set(v) { cur = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i][0] === v))); onChange?.(v); }
  box.append(...btns);
  parent.append(el('div', { class: 'ctl' }, el('span', { class: 'lbl' }, label), box));
  return { get: () => cur, set };
}

// HiDPI canvas that follows its CSS size
export function fitCanvas(canvas, draw) {
  let w = 0, h = 0;
  const g = canvas.getContext('2d');
  const resize = (first) => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (first !== true) draw?.(); // the caller's draw may close over the return value, so not on the first sync call
  };
  const ro = new ResizeObserver(() => resize()); ro.observe(canvas);
  resize(true);
  return { g, size: () => ({ w, h }), stop: () => ro.disconnect() };
}

// rAF loop that only runs while visible; still frame when reduced motion
export function loop(node, step) {
  let raf = 0, on = false, last = performance.now();
  const tick = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt, now / 1000); if (on) raf = requestAnimationFrame(tick); };
  const stopWatch = whenVisible(node, (vis) => {
    if (vis && !on) { on = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    if (!vis && on) { on = false; cancelAnimationFrame(raf); }
  });
  return () => { on = false; cancelAnimationFrame(raf); stopWatch(); };
}

export const still = reduceMotion;

export function wirePin(f, o, summary) {
  f.pinBtn.addEventListener('click', () => {
    const s = summary();
    pin({ kind: 'lab', ref: `${o.name}:${Date.now()}`, entry: o.entry || null, day: null, title: o.title, value: s, tool: o.name });
  });
}

// describe results to screen readers, debounced
export function narrator(f) {
  let t;
  return (text) => { clearTimeout(t); t = setTimeout(() => { f.canvas.setAttribute('aria-label', text); announce(text); }, 600); };
}

// little MathML helper: m('mi','f'), etc.
export function math(xml) {
  const d = new DOMParser().parseFromString(`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${xml}</math>`, 'application/xml');
  return document.importNode(d.documentElement, true);
}

export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
