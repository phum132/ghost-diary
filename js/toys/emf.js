// "Ghost meter": an EMF meter walked around a room only finds wires and appliances.
import { frame, slider, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const MU0 = 4e-7 * Math.PI;
const LEDS = [0.2, 1, 3, 10, 30]; // µT thresholds for the five lights (roughly like toy "ghost" meters)
const LCOL = ['#5dff9a', '#c6ff5d', '#ffe25d', '#ff9a3d', '#ff3b2f'];

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  const I = slider(f.controls, { label: 'กระแสไฟในสายที่ซ่อนในผนัง', min: 0, max: 16, step: 0.5, value: 5, unit: 'A', onInput: () => draw() });
  const fridge = slider(f.controls, { label: 'ตู้เย็นเก่า (มอเตอร์)', min: 0, max: 100, value: 60, unit: '%', onInput: () => draw() });
  const reveal = el('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false', onclick: () => { show = !show; reveal.setAttribute('aria-pressed', String(show)); draw(); } }, '🔦 เปิดดูในผนัง');
  f.controls.append(reveal);
  let show = false;
  const p = { x: 0.5, y: 0.55 };
  f.formula.append(math('<mi>B</mi><mo>=</mo><mfrac><mrow><msub><mi>μ</mi><mn>0</mn></msub><mi>I</mi></mrow><mrow><mn>2</mn><mi>π</mi><mi>r</mi></mrow></mfrac>'),
    el('div', { class: 'faint' }, 'สนามแม่เหล็กรอบสายไฟเส้นตรง ลดลงตามระยะห่าง r · ของเครื่องใช้ไฟฟ้าลดเร็วกว่านั้นมาก (ประมาณ 1/r³)'));
  f.explain.append(
    el('p', {}, 'ลากเครื่องวัด (หรือใช้ปุ่มลูกศรบนภาพ) ไปรอบห้อง ไฟจะกระพริบขึ้นเมื่อเข้าใกล้สายไฟในผนัง ปลั๊ก หรือตู้เย็น นี่คือสิ่งที่รายการล่าผีเรียกว่า "ผีมาแล้ว"'),
    el('p', {}, 'เครื่องวัด EMF วัดสนามแม่เหล็กไฟฟ้าจากไฟบ้าน มันตอบสนองต่อกระแสไฟเท่านั้น ไม่มีงานวิจัยไหนยืนยันว่าผีปล่อยสนามแม่เหล็กออกมา'),
    el('p', {}, 'มีนักวิจัยบางคนเสนอกลับด้านว่าสนามแม่เหล็กแรงๆ อาจทำให้คนรู้สึกแปลกๆ เอง เช่นการทดลอง "หมวกพระเจ้า" ของ Persinger แต่ทีมของ Granqvist (2005) ทำการทดลองซ้ำแบบที่ทั้งคนทดลองและคนถูกทดลองไม่รู้ว่าเปิดเครื่องหรือเปล่า แล้วไม่พบผลนั้น'),
    el('p', { class: 'caveat' }, 'ค่าเกณฑ์ไฟห้าดวงประมาณจากเครื่องวัดแบบของเล่นทั่วไป ตู้เย็นใช้สูตรแม่เหล็กขั้วคู่แบบง่าย'));
  const c = fitCanvas(f.canvas, () => draw());
  // room layout in metres: 5 x 3.75
  const W = 5, Hm = 3.75;
  const wire = { y: 0.25 };                    // runs along the top wall, 25 cm inside it
  const socket = { x: 0.6, y: 0.0 };           // wire drops to a socket
  const fr = { x: 4.4, y: 3.2 };
  function field(mx, my) {
    const r1 = Math.max(0.05, Math.abs(my - wire.y));
    const b1 = (MU0 * I.get() / (2 * Math.PI * r1)) * 1e6 * 0.25; // live + neutral side by side mostly cancel; leave 25%
    const r2 = Math.max(0.05, Math.hypot(mx - socket.x, my - (socket.y + 0.25), 0.05)) ;
    const b2 = I.get() > 0 ? 0.6 / Math.pow(r2, 2) * (I.get() / 5) : 0;
    const r3 = Math.max(0.15, Math.hypot(mx - fr.x, my - fr.y));
    const b3 = fridge.get() / 100 * 4 / Math.pow(r3, 3);
    return b1 + b2 + b3;
  }
  const level = (b) => LEDS.filter((t) => b >= t).length;
  let best = 0;
  f.resetBtn.addEventListener('click', () => { I.set(5); fridge.set(60); p.x = 0.5; p.y = 0.55; best = 0; show = false; reveal.setAttribute('aria-pressed', 'false'); draw(); });
  wirePin(f, o, () => { const b = field(p.x * W, p.y * Hm); return `เครื่องวัดตรงจุดนี้ ${b.toFixed(2)} µT (ไฟ ${level(b)}/5) · ค่าสูงสุดที่เจอ ${best.toFixed(1)} µT ใกล้สายไฟหรือตู้เย็น`; });

  const move = (e) => { const r = f.canvas.getBoundingClientRect(); p.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); p.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); draw(); };
  f.canvas.addEventListener('pointerdown', (e) => { f.canvas.setPointerCapture(e.pointerId); move(e); });
  f.canvas.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'mouse') move(e); });
  f.canvas.tabIndex = 0;
  f.canvas.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-0.03, 0], ArrowRight: [0.03, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key];
    if (!d) return; e.preventDefault(); p.x = Math.min(1, Math.max(0, p.x + d[0])); p.y = Math.min(1, Math.max(0, p.y + d[1])); draw();
  });

  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const sx = w / W, sy = h / Hm;
    g.fillStyle = '#16100e'; g.fillRect(0, 0, w, h);
    // heat map of the field (faint)
    const cell = Math.max(10, w / 40);
    for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
      const b = field((x + cell / 2) / sx, (y + cell / 2) / sy), L = level(b);
      if (L) { g.fillStyle = LCOL[L - 1]; g.globalAlpha = show ? 0.22 : 0.05; g.fillRect(x, y, cell, cell); }
    }
    g.globalAlpha = 1;
    g.strokeStyle = '#6b5a52'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    // furniture
    g.fillStyle = '#2b201c'; g.fillRect(1.6 * sx, 1.4 * sy, 1.6 * sx, 0.9 * sy); // bed
    g.fillStyle = '#3a2e29'; g.fillRect((fr.x - 0.35) * sx, (fr.y - 0.35) * sy, 0.7 * sx, 0.6 * sy);
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'center';
    g.fillText('ตู้เย็น', fr.x * sx, fr.y * sy + 4); g.fillText('เตียง', 2.4 * sx, 1.9 * sy);
    g.fillStyle = '#d6c7bd'; g.fillRect(socket.x * sx - 8, 8, 16, 10); g.fillText('ปลั๊ก', socket.x * sx, 32);
    if (show) { g.strokeStyle = '#ffd866'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(0, wire.y * sy); g.lineTo(w, wire.y * sy); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffd866'; g.fillText('สายไฟในผนัง', w * 0.75, wire.y * sy - 6); }
    // meter
    const b = field(p.x * W, p.y * Hm), L = level(b); best = Math.max(best, b);
    const mx = p.x * w, my = p.y * h;
    g.fillStyle = '#111'; g.strokeStyle = '#ff3b2f'; g.lineWidth = 2;
    g.beginPath(); g.roundRect ? g.roundRect(mx - 34, my - 16, 68, 32, 6) : g.rect(mx - 34, my - 16, 68, 32); g.fill(); g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = i < L ? LCOL[i] : '#333'; g.beginPath(); g.arc(mx - 24 + i * 12, my, 4.5, 0, Math.PI * 2); g.fill(); }
    f.overlay.replaceChildren(el('span', { class: 'badge' }, `${b.toFixed(2)} µT`), el('span', { class: 'badge' }, `ไฟ ${L}/5`));
    f.result.replaceChildren('ตรงนี้วัดได้ ', el('b', {}, `${b.toFixed(2)} µT`), ` (ไฟติด ${L} ดวง)`, el('br'),
      el('span', { class: 'faint' }, L >= 3 ? 'เครื่องร้องลั่น! ลองกด "เปิดดูในผนัง" ว่าอยู่ใกล้อะไร' : 'ลากเครื่องวัดเข้าใกล้ผนังด้านบนหรือตู้เย็นดู'));
    say(`วัดได้ ${b.toFixed(1)} ไมโครเทสลา ไฟติด ${L} ดวง`);
  }
  return { unmount: () => c.stop() };
}
