// Will-o'-the-wisp: marsh gas bubbles, a few ignite (phosphine is spontaneously flammable) and drift.
// Flicker stays slow (≤1 Hz) and low-contrast.
import { frame, slider, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el, rng } from '../core/ui.js';

const CONFIG = { q10: 2 }; // decomposition roughly doubles every +10 °C (illustrative)

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const temp = slider(f.controls, { label: 'อุณหภูมิ', min: 15, max: 40, value: 30, unit: '°C' });
  const rot = slider(f.controls, { label: 'ซากพืชเน่าใต้น้ำ', min: 0, max: 100, value: 60, unit: '%' });
  const wind = slider(f.controls, { label: 'ลม', min: 0, max: 5, step: 0.1, value: 1, unit: 'm/s' });
  const labels = el('input', { type: 'checkbox', id: 'wisp-lbl' });
  f.controls.append(el('label', { for: 'wisp-lbl', style: { display: 'flex', gap: '8px', alignItems: 'center', minHeight: '44px' } }, labels, 'แสดงชื่อแก๊สแต่ละฟอง'),
    el('p', { class: 'faint', style: { margin: 0, fontSize: '.9rem' } }, 'ลากคนถือไฟฉายเข้าไปใกล้แสง แล้วดูว่าเกิดอะไรขึ้น'));
  f.formula.append(math('<mtext>อัตราการเน่า</mtext><mo>∝</mo><msup><mn>2</mn><mfrac><mrow><mi>T</mi><mo>−</mo><mn>20</mn></mrow><mn>10</mn></mfrac></msup>'),
    math('<mn>2</mn><msub><mtext>PH</mtext><mn>3</mn></msub><mo>+</mo><mn>4</mn><msub><mtext>O</mtext><mn>2</mn></msub><mo>→</mo><msub><mtext>P</mtext><mn>2</mn></msub><msub><mtext>O</mtext><mn>5</mn></msub><mo>+</mo><mn>3</mn><msub><mtext>H</mtext><mn>2</mn></msub><mtext>O</mtext>'));
  f.explain.append(
    el('p', {}, 'ใต้หนองน้ำมีซากพืชเน่าที่ไม่ได้รับออกซิเจน จุลินทรีย์จะย่อยแล้วปล่อยแก๊สออกมาเป็นฟอง ส่วนใหญ่คือมีเทน (CH₄) ซึ่งติดไฟเองไม่ได้ แต่ถ้ามีฟอสฟีน (PH₃) กับไดฟอสเฟน (P₂H₄) ปนมานิดเดียว มันติดไฟเองเมื่อเจออากาศ แล้วจุดมีเทนให้ลุกต่อเป็นแสงจางๆ'),
    el('p', {}, 'แสงลอยไปตามลมและเบามาก พอเราเดินเข้าไป อากาศที่เราดันไปข้างหน้าก็พาแสงลอยหนี เหมือนมันรู้ตัว คนไทยเรียกว่า "ผีกระสือ" ฝรั่งเรียก will-o\'-the-wisp หรือ ignis fatuus (ไฟหลอก)'),
    el('p', { class: 'caveat' }, '⚠ ยังเป็นสมมติฐาน: นักวิทยาศาสตร์ยังสร้างแสงแบบนี้ในห้องแล็บให้เหมือนที่คนเห็นได้ไม่ครบ บางรายงานอาจเป็นหิ่งห้อย นกเค้าแมวที่ขนสะท้อนแสง หรือแสงจากที่อื่น'));

  let lastT = 0;
  const c = fitCanvas(f.canvas, () => draw(lastT));
  const R = rng('wisp');
  const bubbles = [], lights = [];
  const walker = { x: 0.12, drag: false };
  f.canvas.addEventListener('pointerdown', (e) => { walker.drag = true; f.canvas.setPointerCapture(e.pointerId); move(e); });
  f.canvas.addEventListener('pointermove', (e) => walker.drag && move(e));
  f.canvas.addEventListener('pointerup', () => { walker.drag = false; });
  f.canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') walker.x = Math.min(0.95, walker.x + 0.03); if (e.key === 'ArrowLeft') walker.x = Math.max(0.02, walker.x - 0.03); });
  f.canvas.tabIndex = 0;
  function move(e) { const r = f.canvas.getBoundingClientRect(); walker.x = Math.max(0.02, Math.min(0.95, (e.clientX - r.left) / r.width)); }
  const rate = () => 0.9 * CONFIG.q10 ** ((temp.get() - 20) / 10) * (0.1 + rot.get() / 100);
  f.resetBtn.addEventListener('click', () => { temp.set(30); rot.set(60); wind.set(1); bubbles.length = lights.length = 0; walker.x = 0.12; });
  wirePin(f, o, () => `${temp.get()} °C, ซากพืช ${rot.get()}%, ลม ${wind.get()} m/s → ฟองแก๊ส ~${rate().toFixed(1)} ฟอง/วินาที, แสงลอยตอนนี้ ${lights.length} ดวง`);
  let lastSay = 0;
  function step(dt, t) {
    if (R() < rate() * dt) {
      const r = R();
      bubbles.push({ x: 0.3 + R() * 0.6, y: 0.86, gas: r < 0.16 ? 'PH₃' : r < 0.22 ? 'P₂H₄' : 'CH₄', vy: 0.04 + R() * 0.03 });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]; b.y -= b.vy * dt;
      if (b.y < 0.78) {
        bubbles.splice(i, 1);
        if (b.gas !== 'CH₄' || (lights.length && R() < 0.15)) lights.push({ x: b.x, y: 0.74, life: 2 + R() * 4, age: 0, gas: b.gas, ph: R() * 6 });
      }
    }
    for (let i = lights.length - 1; i >= 0; i--) {
      const L = lights[i]; L.age += dt;
      L.x += (wind.get() * 0.012 + (L.x - walker.x) * (Math.abs(L.x - walker.x) < 0.15 ? 0.6 : 0)) * dt;
      L.y -= 0.01 * dt + Math.sin(t * 0.7 + L.ph) * 0.004 * dt;
      if (L.age > L.life || L.x > 1.05 || L.x < -0.05) lights.splice(i, 1);
    }
    if (t - lastSay > 3) { lastSay = t; say(`มีแสงลอยอยู่ ${lights.length} ดวง`); }
    f.result.replaceChildren('ฟองแก๊สผุดขึ้น ~', el('b', {}, rate().toFixed(1)), ' ฟอง/วินาที · แสงลอยตอนนี้ ', el('b', {}, lights.length), ' ดวง');
  }
  function draw(t) {
    lastT = t;
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.fillStyle = '#05070b'; g.fillRect(0, 0, w, h);
    // far tree line + reeds (parallax-ish layers)
    g.fillStyle = '#0b1210'; g.beginPath(); g.moveTo(0, h * 0.58);
    for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.5 + 0.05 * Math.sin(x * 0.03) + 0.03 * Math.sin(x * 0.11)));
    g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#081013'; g.fillRect(0, h * 0.76, w, h * 0.24); // water
    g.strokeStyle = '#13201c'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = (i * 97) % w; g.beginPath(); g.moveTo(x, h * 0.8); g.quadraticCurveTo(x + 4, h * 0.7, x + 2 + Math.sin(t * 0.5 + i) * 2, h * 0.64); g.stroke(); }
    // bubbles
    g.fillStyle = 'rgba(180,200,210,.5)';
    for (const b of bubbles) { g.beginPath(); g.arc(b.x * w, b.y * h, 2, 0, Math.PI * 2); g.fill(); if (labels.checked) { g.fillStyle = '#9db3cf'; g.font = '10px "IBM Plex Mono"'; g.fillText(b.gas, b.x * w + 4, b.y * h); g.fillStyle = 'rgba(180,200,210,.5)'; } }
    // lights: soft, slow flicker
    for (const L of lights) {
      const k = Math.sin(Math.min(1, L.age / 0.8) * Math.PI / 2) * Math.max(0, 1 - Math.max(0, L.age - L.life + 1)) * (0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 0.6 + L.ph));
      const grd = g.createRadialGradient(L.x * w, L.y * h, 0, L.x * w, L.y * h, 26);
      grd.addColorStop(0, `rgba(170,255,220,${0.75 * k})`); grd.addColorStop(0.4, `rgba(90,220,200,${0.3 * k})`); grd.addColorStop(1, 'rgba(60,160,180,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(L.x * w, L.y * h, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(90,220,200,${0.15 * k})`; g.fillRect(L.x * w - 10, h * 0.78, 20, 2); // reflection
      if (labels.checked) { g.fillStyle = '#9dffc7'; g.font = '10px "IBM Plex Mono"'; g.fillText(L.gas, L.x * w + 10, L.y * h - 10); }
    }
    // walker with torch
    const wx = walker.x * w, wy = h * 0.74;
    g.fillStyle = 'rgba(255,214,150,.12)'; g.beginPath(); g.moveTo(wx + 6, wy - 22); g.lineTo(wx + 120, wy - 50); g.lineTo(wx + 120, wy + 10); g.fill();
    g.fillStyle = '#d9cfc8'; g.beginPath(); g.arc(wx, wy - 34, 6, 0, Math.PI * 2); g.fill(); g.fillRect(wx - 4, wy - 28, 8, 26);
    g.fillStyle = '#8a7671'; g.font = '11px "IBM Plex Sans Thai"'; g.fillText('ลากฉัน', wx - 14, wy + 14);
  }
  const stop = still()
    ? (() => { for (let i = 0; i < 300; i++) step(0.05, i * 0.05); draw(0); return () => {}; })()
    : loop(f.root, (dt, t) => { step(dt, t); draw(t); });
  return { unmount: () => { stop(); c.stop(); } };
}
