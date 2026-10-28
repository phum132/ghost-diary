// A hanging lamp that swings "by itself": tiny periodic pushes at the lamp's natural frequency (resonance).
import { frame, slider, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const G = 9.81;

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const L = slider(f.controls, { label: 'ความยาวสายโคมไฟ', min: 0.2, max: 2.5, step: 0.05, value: 1, unit: 'm', onInput: () => { reset(); info(); } });
  const fd = slider(f.controls, { label: 'จังหวะแรงสั่นจากข้างนอก', min: 0.1, max: 2, step: 0.01, value: 0.8, unit: 'Hz', onInput: () => { reset(); info(); } });
  const amp = slider(f.controls, { label: 'แรงสั่น (รถบรรทุก / คนเดิน / พัดลม)', min: 0, max: 100, value: 30, unit: '%', onInput: () => info() });
  const damp = slider(f.more, { label: 'แรงต้าน (แรงเสียดทานที่ขอเกี่ยว + อากาศ)', min: 1, max: 100, value: 15, unit: '%', onInput: () => info() });
  const tune = el('button', { class: 'btn small', type: 'button', onclick: () => fd.set(+f0().toFixed(2)) }, '🎯 ตั้งให้ตรงจังหวะธรรมชาติ');
  f.controls.append(tune);
  f.moreBox.open = !o.compact;
  const f0 = () => Math.sqrt(G / L.get()) / (2 * Math.PI);
  f.formula.append(math('<msub><mi>f</mi><mn>0</mn></msub><mo>=</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>π</mi></mrow></mfrac><msqrt><mfrac><mi>g</mi><mi>L</mi></mfrac></msqrt>'),
    el('div', { class: 'faint' }, 'f₀ = จังหวะที่โคมอยากแกว่งเอง · g = 9.81 m/s² · L = ความยาวสาย'));
  f.explain.append(
    el('p', {}, 'โคมไฟที่ห้อยด้วยสายมีจังหวะแกว่งของมันเอง ขึ้นกับความยาวสายอย่างเดียว ถ้าอะไรสักอย่างผลักมันเบาๆ ด้วยจังหวะเดียวกันพอดี เช่นตึกสั่นเพราะรถบรรทุก คนเดินชั้นบน หรือพัดลมเพดานที่แกว่งนิดๆ แรงเล็กๆ จะสะสมทีละรอบจนโคมแกว่งกว้างให้เห็น'),
    el('p', {}, 'เหมือนเราไกวชิงช้าให้น้อง ผลักเบาๆ แต่ผลักตรงจังหวะทุกรอบ ชิงช้าก็ไปได้สูง ถ้าผลักผิดจังหวะ ต่อให้ผลักแรงก็ไม่ไปไหน'),
    el('p', {}, 'ลองกดปุ่ม 🎯 แล้วดูกราฟ ความกว้างของการแกว่งจะโตขึ้นเรื่อยๆ ทั้งที่แรงสั่นไม่ได้เพิ่ม คนในห้องไม่รู้สึกถึงแรงสั่นเลย จึงเห็นแค่โคมไฟที่ "แกว่งเอง"'),
    el('p', { class: 'caveat' }, 'แบบจำลองลูกตุ้มที่มีแรงต้านและแรงขับเป็นคลื่นไซน์ ค่าแรงเป็นหน่วยสมมติ'));
  const c = fitCanvas(f.canvas, () => draw());
  let th = 0, om = 0, t = 0, hist = [], maxDeg = 0;
  function reset() { th = 0; om = 0; t = 0; hist = []; maxDeg = 0; }
  f.resetBtn.addEventListener('click', () => { L.set(1); fd.set(0.8); amp.set(30); damp.set(15); reset(); });
  wirePin(f, o, () => `สายยาว ${L.get()} m (f₀ = ${f0().toFixed(2)} Hz), แรงสั่น ${fd.get()} Hz → แกว่งกว้างสุด ${maxDeg.toFixed(1)}°`);
  function stepSim(dt) {
    const n = 8, h = dt / n, w0 = Math.sqrt(G / L.get()), b = damp.get() / 100 * 0.4, A = amp.get() / 100 * 0.02;
    for (let i = 0; i < n; i++) {
      const a = -w0 * w0 * Math.sin(th) - b * om + A * w0 * w0 * Math.cos(2 * Math.PI * fd.get() * t);
      om += a * h; th += om * h; t += h;
    }
    th = Math.max(-1.3, Math.min(1.3, th));
    const deg = Math.abs(th) * 180 / Math.PI; maxDeg = Math.max(maxDeg, deg);
    hist.push(th); if (hist.length > 600) hist.shift();
  }
  function info() {
    const ratio = fd.get() / f0();
    f.result.replaceChildren('โคมอยากแกว่งที่ ', el('b', {}, `${f0().toFixed(2)} Hz`), ' · แรงสั่น ', el('b', {}, `${fd.get().toFixed(2)} Hz`), el('br'),
      el('span', { class: 'faint' }, Math.abs(ratio - 1) < 0.05 ? 'ตรงจังหวะ! แกว่งกว้างขึ้นเรื่อยๆ ทั้งที่แรงเท่าเดิม' : 'ไม่ตรงจังหวะ โคมแค่สั่นนิดๆ ลองกดปุ่ม 🎯'));
    say(Math.abs(ratio - 1) < 0.05 ? 'ตรงจังหวะ โคมแกว่งแรงขึ้น' : 'ไม่ตรงจังหวะ');
  }
  const stopLoop = loop(f.canvas, (dt) => { if (still()) { stepSim(dt); return; } stepSim(dt); draw(); });
  let lastStill = 0;
  const stillTimer = setInterval(() => { if (still() && Date.now() - lastStill > 500) { lastStill = Date.now(); draw(); } }, 500);
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.fillStyle = '#0d0809'; g.fillRect(0, 0, w, h);
    const px = w * 0.24, py = h * 0.06, len = h * (0.25 + 0.55 * L.get() / 2.5);
    g.fillStyle = '#2a201d'; g.fillRect(0, 0, w * 0.5, py);
    const bx = px + Math.sin(th) * len, by = py + Math.cos(th) * len;
    g.strokeStyle = '#8a7671'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.stroke();
    const glow = g.createRadialGradient(bx, by + 10, 2, bx, by + 10, h * 0.5); glow.addColorStop(0, 'rgba(255,216,102,.35)'); glow.addColorStop(1, 'rgba(255,216,102,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w * 0.5, h);
    g.fillStyle = '#5c0a09'; g.beginPath(); g.moveTo(bx - 22, by + 14); g.lineTo(bx + 22, by + 14); g.lineTo(bx + 10, by - 4); g.lineTo(bx - 10, by - 4); g.closePath(); g.fill();
    g.fillStyle = '#ffd866'; g.beginPath(); g.arc(bx, by + 16, 6, 0, Math.PI * 2); g.fill();
    // graph
    const gx = w * 0.54, gw = w * 0.42, gy = h * 0.5, gh = h * 0.38;
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + gw, gy); g.stroke();
    g.strokeStyle = '#ff6a3d'; g.lineWidth = 2; g.beginPath();
    hist.forEach((v, i) => { const x = gx + i / 600 * gw, y = gy - v / 1.3 * gh; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'left';
    g.fillText('มุมแกว่งตามเวลา', gx, gy - gh - 6);
    f.overlay.replaceChildren(el('span', { class: 'badge' }, `แกว่ง ${(Math.abs(th) * 180 / Math.PI).toFixed(1)}°`), el('span', { class: 'badge' }, `สูงสุด ${maxDeg.toFixed(1)}°`));
  }
  info();
  return { unmount: () => { stopLoop(); clearInterval(stillTimer); c.stop(); } };
}
