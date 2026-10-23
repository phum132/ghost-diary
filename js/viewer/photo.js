// Full-screen evidence photo viewer: zoom/pan + forensic filters on a canvas
import { el } from '../core/ui.js';
import { url } from '../core/content.js';
import { pin } from '../core/board-store.js';

const FILTERS = [
  ['orig', 'ต้นฉบับ'], ['shadow', 'ดึงเงา'], ['invert', 'กลับสี'], ['edges', 'ขอบภาพ'], ['r', 'R'], ['g', 'G'], ['b', 'B'],
];

let dlg, state;

function build() {
  const cv = el('canvas', { role: 'img', 'aria-label': 'รูปหลักฐาน' });
  const zoomInd = el('span', { class: 'zoom-ind' }, '1.0×');
  const stage = el('div', { class: 'stage', tabindex: '0', 'aria-label': 'พื้นที่ดูรูป ใช้ + − เพื่อซูม ลูกศรเพื่อเลื่อน 0 เพื่อรีเซ็ต' }, cv, zoomInd);
  const name = el('span', { class: 'name' });
  const pinBtn = el('button', { class: 'btn small', type: 'button' }, '📌 ปักหมุด');
  const close = el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'ปิด' }, '✕');
  const filters = el('div', { class: 'filters', role: 'group', 'aria-label': 'ฟิลเตอร์ตรวจรูป' },
    ...FILTERS.map(([k, t]) => el('button', { type: 'button', 'data-f': k, 'aria-pressed': k === 'orig' ? 'true' : 'false' }, t)));
  const mk = (label, min, max, val) => {
    const input = el('input', { type: 'range', min, max, value: val });
    const out = el('output', {}, String(val));
    return { label: el('label', {}, label, input, out), input, out };
  };
  const br = mk('ความสว่าง', -100, 100, 0), ct = mk('ความคมชัด', -100, 100, 0);
  const meta = el('dl');
  const info = el('details', {}, el('summary', {}, 'ข้อมูลไฟล์'), meta, el('p', { class: 'credit faint' }));
  dlg = el('dialog', { class: 'pv', 'aria-label': 'ดูรูปหลักฐาน' },
    el('div', { class: 'pv-top' }, name, pinBtn, close),
    stage,
    el('div', { class: 'pv-bottom' }, filters, el('div', { class: 'sliders' }, br.label, ct.label), info));
  document.body.append(dlg);

  const s = state = { cv, stage, zoomInd, name, pinBtn, meta, info, br, ct, filter: 'orig', scale: 1, tx: 0, ty: 0, src: null, out: null };
  close.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { s.opener?.focus(); });
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    s.filter = b.dataset.f;
    filters.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    process();
  });
  for (const r of [br, ct]) r.input.addEventListener('input', () => { r.out.textContent = r.input.value; process(); });

  // pan / pinch / wheel / double tap
  const pts = new Map();
  let last = null, pinch = null, lastTap = 0;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, e);
    if (pts.size === 1) {
      last = { x: e.clientX, y: e.clientY };
      const now = performance.now();
      if (now - lastTap < 300) zoomAt(s.scale > 1.5 ? 1 : 3, e.clientX, e.clientY, true);
      lastTap = now;
    }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale: s.scale }; }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, e);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      zoomAt(pinch.scale * d / pinch.d, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, true);
    } else if (last) {
      s.tx += e.clientX - last.x; s.ty += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; draw();
    }
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) last = null; };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(s.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY, true); }, { passive: false });
  stage.addEventListener('keydown', (e) => {
    const r = stage.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (e.key === '+' || e.key === '=') zoomAt(s.scale * 1.25, cx, cy, true);
    else if (e.key === '-') zoomAt(s.scale / 1.25, cx, cy, true);
    else if (e.key === '0') { s.scale = 1; s.tx = s.ty = 0; draw(); }
    else if (e.key.startsWith('Arrow')) {
      const d = 40; s.tx += e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0; s.ty += e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0; draw();
    } else return;
    e.preventDefault();
  });
  new ResizeObserver(() => draw()).observe(stage);
}

function zoomAt(ns, cx, cy, abs) {
  const s = state;
  ns = Math.max(1, Math.min(6, ns));
  const r = s.stage.getBoundingClientRect();
  const px = cx - r.left - r.width / 2, py = cy - r.top - r.height / 2;
  s.tx = px - (px - s.tx) * ns / s.scale; s.ty = py - (py - s.ty) * ns / s.scale;
  s.scale = ns;
  if (abs) draw();
}

function process() {
  const s = state;
  if (!s.src) return;
  const { width: w, height: h } = s.src;
  const d = new ImageData(new Uint8ClampedArray(s.src.data), w, h);
  const p = d.data;
  const b = +s.br.input.value * 1.28, c = +s.ct.input.value;
  const cf = (259 * (c + 255)) / (255 * (259 - c));
  const f = s.filter;
  if (f === 'edges') {
    const g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = p[i * 4] * 0.299 + p[i * 4 + 1] * 0.587 + p[i * 4 + 2] * 0.114;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
      const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
      const v = Math.min(255, Math.hypot(gx, gy));
      p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v;
    }
  }
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i], g = p[i + 1], bl = p[i + 2];
    if (f === 'shadow') { r = r * 255 / 24; g = g * 255 / 24; bl = bl * 255 / 24; } // stretch the darkest 0–24 to full range
    else if (f === 'invert') { r = 255 - r; g = 255 - g; bl = 255 - bl; }
    else if (f === 'r') { g = bl = r; } else if (f === 'g') { r = bl = g; } else if (f === 'b') { r = g = bl; }
    p[i] = cf * (r + b - 128) + 128; p[i + 1] = cf * (g + b - 128) + 128; p[i + 2] = cf * (bl + b - 128) + 128;
  }
  if (!s.out) s.out = document.createElement('canvas');
  s.out.width = w; s.out.height = h;
  s.out.getContext('2d').putImageData(d, 0, 0);
  s.cv.setAttribute('aria-label', `รูปหลักฐาน ฟิลเตอร์: ${FILTERS.find((x) => x[0] === f)[1]}`);
  draw();
}

function draw() {
  const s = state;
  if (!s || !s.out) return;
  const r = s.stage.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio, 2);
  s.cv.width = Math.round(r.width * dpr); s.cv.height = Math.round(r.height * dpr);
  const g = s.cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, r.width, r.height);
  const fit = Math.min(r.width / s.out.width, r.height / s.out.height);
  const k = fit * s.scale;
  // keep the picture from being dragged completely off screen
  const maxX = Math.max(0, (s.out.width * k - r.width) / 2), maxY = Math.max(0, (s.out.height * k - r.height) / 2);
  s.tx = Math.max(-maxX, Math.min(maxX, s.tx)); s.ty = Math.max(-maxY, Math.min(maxY, s.ty));
  g.imageSmoothingEnabled = s.scale < 2.5;
  g.drawImage(s.out, r.width / 2 + s.tx - s.out.width * k / 2, r.height / 2 + s.ty - s.out.height * k / 2, s.out.width * k, s.out.height * k);
  s.zoomInd.textContent = s.scale.toFixed(1) + '×';
}

export function openPhoto(id, ev, opener, entryDay) {
  if (!dlg) build();
  const s = state;
  s.opener = opener; s.scale = 1; s.tx = s.ty = 0; s.filter = 'orig'; s.src = null;
  s.br.input.value = s.ct.input.value = 0; s.br.out.textContent = s.ct.out.textContent = '0';
  dlg.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === 'orig')));
  s.name.textContent = ev.meta?.file || id;
  const labels = { file: 'ไฟล์', time: 'ถ่ายเมื่อ', device: 'เครื่อง', gps: 'พิกัด', note: 'โน้ต' };
  s.meta.replaceChildren(...Object.entries(ev.meta || {}).flatMap(([k, v]) => [el('dt', {}, labels[k] || k), el('dd', {}, v)]));
  s.info.querySelector('.credit').replaceChildren('ภาพต้นฉบับ: ', ev.credit, ' · ', el('a', { href: ev.source, target: '_blank', rel: 'noopener' }, ev.license));
  s.pinBtn.onclick = () => pin({ kind: 'photo', ref: id, entry: ev.entry, day: entryDay, title: ev.caption, thumb: ev.thumb });
  dlg.showModal();
  s.stage.focus();
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    s.src = g.getImageData(0, 0, c.width, c.height);
    process();
  };
  img.onerror = () => {
    const g = s.cv.getContext('2d'); g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('รูปนี้โหลดไม่ได้ ลองปิดแล้วเปิดใหม่', 20, 40);
  };
  img.src = url(ev.file);
}
