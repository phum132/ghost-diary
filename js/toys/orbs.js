// Ghost orbs: dust very close to a phone lens, lit by a flash that sits right next to the lens.
// Blur size uses the thin-lens circle of confusion; brightness is a rough backscatter guess.
import { frame, slider, segmented, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const CAM = { f: 0.00425, N: 1.8, sensor: 0.0056, focus: 2 }; // typical phone main camera, focused at 2 m

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  let seed = 7;
  const dust = slider(f.controls, { label: 'ฝุ่นหรือละอองในอากาศ', min: 0, max: 100, value: 40, unit: '%', onInput: () => draw() });
  const off = slider(f.controls, { label: 'ระยะแฟลชห่างจากเลนส์', min: 5, max: 80, value: 10, unit: 'mm', onInput: () => draw() });
  const flash = segmented(f.controls, 'แฟลช', [['on', '⚡ เปิด'], ['off', 'ปิด']], 'on', () => draw());
  const what = segmented(f.more, 'ละอองเป็นอะไร', [['dust', 'ฝุ่น'], ['rain', 'ละอองฝน'], ['bug', 'แมลงเล็กๆ']], 'dust', () => draw());
  f.controls.append(el('button', { class: 'btn small', type: 'button', onclick: () => { seed++; draw(); } }, '📸 ถ่ายใหม่'));
  f.moreBox.open = !o.compact;
  f.formula.append(math('<mi>c</mi><mo>=</mo><mfrac><mrow><mi>A</mi><mo>·</mo><mi>f</mi><mo>·</mo><mo>|</mo><mi>z</mi><mo>−</mo><msub><mi>z</mi><mi>f</mi></msub><mo>|</mo></mrow><mrow><mi>z</mi><mo>(</mo><msub><mi>z</mi><mi>f</mi></msub><mo>−</mo><mi>f</mi><mo>)</mo></mrow></mfrac>'),
    el('div', { class: 'faint' }, 'c = ขนาดวงเบลอบนเซนเซอร์ · A = ความกว้างรูรับแสง · f = ทางยาวโฟกัส · z = ระยะฝุ่น · z_f = ระยะที่กล้องโฟกัส'));
  f.explain.append(
    el('p', {}, 'รูป "ลูกแก้ววิญญาณ" ที่ลอยเต็มห้องมักถ่ายด้วยแฟลชในที่มืด ฝุ่นที่ลอยห่างเลนส์ไม่กี่เซนติเมตรโดนแฟลชเต็มๆ แล้วสะท้อนแสงกลับเข้าเลนส์ แต่มันอยู่ใกล้เกินกว่ากล้องจะโฟกัส จุดเล็กๆ เลยกลายเป็นวงกลมใหญ่ โปร่งแสง ขอบชัด'),
    el('p', {}, 'มือถือวางแฟลชไว้ชิดเลนส์มาก แสงที่สะท้อนจากฝุ่นใกล้ๆ จึงย้อนเข้ากล้องพอดี กล้องรุ่นเก่าที่แฟลชอยู่สูงเหนือเลนส์แทบไม่มีลูกแก้วเลย ลองเลื่อนระยะแฟลชดู'),
    el('p', {}, 'ลวดลายในลูกแก้วที่บางคนเห็นเป็นหน้าคน มาจากรูปทรงของรูรับแสงและรอยบนเลนส์ ผสมกับสมองที่ชอบหาหน้าในทุกอย่าง (ลองเครื่องมือ "หน้าในกำแพง")'),
    el('p', { class: 'caveat' }, 'ความสว่างของฝุ่นในแบบจำลองนี้เป็นค่าประมาณ ส่วนขนาดวงเบลอใช้สูตรเลนส์จริงของกล้องมือถือทั่วไป'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { dust.set(40); off.set(10); flash.set('on'); what.set('dust'); seed = 7; draw(); });
  let count = 0, biggest = 0;
  wirePin(f, o, () => `แฟลชห่างเลนส์ ${off.get()} mm, ฝุ่น ${dust.get()}% → เกิดลูกแก้ว ${count} ลูก (ใหญ่สุดกว้าง ${biggest}% ของภาพ)`);

  function room(g, w, h, lit) {
    g.fillStyle = lit ? '#2b2420' : '#0b0909'; g.fillRect(0, 0, w, h);
    const vx = w / 2, vy = h * 0.45, bw = w * 0.22, bh = h * 0.3;
    g.strokeStyle = lit ? 'rgba(255,230,200,.18)' : 'rgba(255,255,255,.05)'; g.lineWidth = 1;
    [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(vx + (x ? bw : -bw) / 2, vy + (y ? bh : -bh) / 2); g.stroke(); });
    g.fillStyle = lit ? '#1a1412' : '#060505'; g.fillRect(vx - bw / 2, vy - bh / 2, bw, bh);
    g.fillStyle = lit ? '#3a2c24' : '#100c0b'; g.fillRect(vx - bw * 0.18, vy - bh * 0.32, bw * 0.36, bh * 0.82);
    if (lit) { const r = g.createRadialGradient(vx, vy, 0, vx, vy, w * 0.7); r.addColorStop(0, 'rgba(255,240,220,.18)'); r.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }
  }

  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const lit = flash.get() === 'on';
    room(g, w, h, lit);
    const r = rng(seed * 97 + 1);
    const n = Math.round(dust.get() * 1.6);
    const s = off.get() / 1000;
    const A = CAM.f / CAM.N;
    const tint = { dust: [255, 246, 230], rain: [220, 236, 255], bug: [255, 228, 190] }[what.get()];
    const orbs = [];
    for (let i = 0; i < n; i++) {
      const z = 0.01 * Math.pow(300, r()); // 1 cm – 3 m, more of them close to the lens
      const x = r(), y = r();
      if (!lit) continue;
      const B = Math.pow(0.3 / z, 2) * Math.exp(-Math.pow((s / z) / 0.15, 2)) * (what.get() === 'rain' ? 1.6 : 1);
      if (B < 0.12) continue;
      const coc = A * CAM.f * Math.abs(z - CAM.focus) / (z * (CAM.focus - CAM.f));
      const d = Math.max(3, coc / CAM.sensor * w);
      orbs.push({ x: x * w, y: y * h, d, a: Math.min(0.75, B * 0.35), z, k: r() });
    }
    orbs.sort((p, q) => q.z - p.z);
    g.globalCompositeOperation = 'screen';
    for (const p of orbs) {
      const rr = p.d / 2;
      const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      const [R, G, Bc] = tint;
      grd.addColorStop(0, `rgba(${R},${G},${Bc},${p.a * 0.35})`);
      grd.addColorStop(0.7, `rgba(${R},${G},${Bc},${p.a * 0.5})`);
      grd.addColorStop(0.93, `rgba(${R},${G},${Bc},${p.a})`);
      grd.addColorStop(1, `rgba(${R},${G},${Bc},0)`);
      g.fillStyle = grd; g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI * 2); g.fill();
      if (rr > 14) { // faint lens texture inside big orbs
        g.strokeStyle = `rgba(255,255,255,${p.a * 0.25})`; g.lineWidth = 1;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(p.x + (p.k - 0.5) * rr * 0.6, p.y + (k - 1) * rr * 0.25, rr * (0.2 + k * 0.12), 0, Math.PI * 2); g.stroke(); }
      }
    }
    g.globalCompositeOperation = 'source-over';
    count = orbs.length;
    biggest = Math.round(orbs.reduce((m, p) => Math.max(m, p.d), 0) / w * 100);
    f.overlay.replaceChildren(el('span', { class: 'badge' }, lit ? `⚡ แฟลชห่างเลนส์ ${off.get()} mm` : 'ไม่มีแฟลช'), el('span', { class: 'badge' }, `ลูกแก้ว ${count}`));
    f.result.replaceChildren(
      lit ? el('span', {}, 'ภาพนี้มี ', el('b', {}, count), ' ลูก ใหญ่สุดกว้าง ', el('b', {}, `${biggest}%`), ' ของภาพ') : el('span', {}, 'ปิดแฟลชแล้ว ', el('b', {}, 'ลูกแก้วหายหมด'), ' ทั้งที่ฝุ่นยังลอยอยู่เท่าเดิม'),
      el('br'), el('span', { class: 'faint' }, 'ฝุ่นที่อยู่ใกล้เลนส์ไม่กี่เซนติเมตร = วงใหญ่ที่สุด · แฟลชยิ่งชิดเลนส์ ยิ่งเห็นเยอะ'));
    say(lit ? `เกิดลูกแก้ว ${count} ลูก` : 'ปิดแฟลช ไม่มีลูกแก้ว');
  }
  return { unmount: () => c.stop() };
}
