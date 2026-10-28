// A door that closes by itself: a hinge line that is slightly off vertical, plus a draft from an open window.
import { frame, slider, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const M = 20, Wd = 0.8, Hd = 2, RHO = 1.2, I = M * Wd * Wd / 3;

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  const tilt = slider(f.controls, { label: 'วงกบหรือบานพับเอียง', min: 0, max: 3, step: 0.1, value: 1, unit: '°', onInput: () => open() });
  const wind = slider(f.controls, { label: 'ลมพัดเข้าหน้าต่าง', min: 0, max: 6, step: 0.1, value: 0, unit: 'm/s', onInput: () => open() });
  const fric = slider(f.controls, { label: 'บานพับฝืด', min: 0, max: 6, step: 0.1, value: 1, unit: 'N·m', onInput: () => open() });
  f.controls.append(el('button', { class: 'btn small', type: 'button', onclick: () => open() }, '🚪 เปิดประตูค้างไว้แล้วถอยออกมา'));
  f.formula.append(math('<msub><mi>τ</mi><mtext>เอียง</mtext></msub><mo>=</mo><mi>m</mi><mi>g</mi><mfrac><mi>w</mi><mn>2</mn></mfrac><mi>sin</mi><mi>α</mi><mi>sin</mi><mi>φ</mi>'), math('<msub><mi>τ</mi><mtext>ลม</mtext></msub><mo>≈</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mi>ρ</mi><msup><mi>v</mi><mn>2</mn></msup><mi>A</mi><mfrac><mi>w</mi><mn>4</mn></mfrac><mi>sin</mi><mi>φ</mi>'),
    el('div', { class: 'faint' }, 'α = มุมเอียงของแนวบานพับ · φ = มุมที่ประตูเปิด · ρ = ความหนาแน่นอากาศ · v = ความเร็วลม · ประตูขยับเมื่อแรงรวมชนะแรงฝืด'));
  f.explain.append(
    el('p', {}, 'บ้านเก่าที่ทรุดตัว วงกบประตูมักเอียงไปนิดเดียว 1 องศาก็พอ ประตูที่หนัก 20 กิโลกรัมจะอยากแกว่งไปหาจุดที่ต่ำที่สุดเหมือนลูกตุ้ม ถ้าจุดต่ำสุดคือตอนปิด ประตูจะค่อยๆ ปิดเอง ถ้าเอียงอีกทาง มันจะค่อยๆ เปิดเอง'),
    el('p', {}, 'ลมที่พัดเข้าหน้าต่างทำให้ความดันอากาศสองฝั่งประตูต่างกัน แค่ลมเบาๆ 3 เมตรต่อวินาทีก็ดันประตูทั้งบานได้ พอปิดสนิท ลมจะหยุดไหล ห้องเลยเงียบสนิทหลังเสียงปัง'),
    el('p', {}, 'ประตูจะยังไม่ขยับถ้าบานพับฝืดพอ แต่พอมีอะไรสะกิดนิดเดียว เช่นรถวิ่งผ่าน หรือความชื้นเปลี่ยนจนไม้หด มันก็เริ่มเคลื่อน คนในห้องจึงไม่เห็นสาเหตุเลย'),
    el('p', { class: 'caveat' }, 'ค่าแรงลมเป็นค่าประมาณแบบหยาบ ประตูจริงมีลูกบิดและสลักที่ทำให้ผลต่างไป'));
  const c = fitCanvas(f.canvas, () => draw());
  let phi = Math.PI / 2, om = 0, t = 0, slam = null, stuck = false;
  function open() { phi = Math.PI / 2; om = 0; t = 0; slam = null; stuck = false; report(); }
  f.resetBtn.addEventListener('click', () => { tilt.set(1); wind.set(0); fric.set(1); open(); });
  const torque = (p) => -(M * 9.81 * Wd / 2 * Math.sin(tilt.get() * Math.PI / 180) + 0.5 * RHO * wind.get() ** 2 * Wd * Hd * Wd / 4) * Math.sin(p);
  wirePin(f, o, () => `เอียง ${tilt.get()}°, ลม ${wind.get()} m/s, ฝืด ${fric.get()} N·m → ${slam ? `ประตูปิดเองใน ${slam.t.toFixed(1)} วินาที` : stuck ? 'ประตูไม่ขยับ' : 'ประตูกำลังเคลื่อน'}`);
  function sim(dt) {
    if (slam || stuck) return;
    const n = 10, h = dt / n;
    for (let i = 0; i < n; i++) {
      const tq = torque(phi);
      if (om === 0 && Math.abs(tq) <= fric.get()) { stuck = true; report(); return; }
      const dir = om !== 0 ? Math.sign(om) : Math.sign(tq), prev = om;
      om += (tq - dir * fric.get() * 0.6 - 0.8 * om) / I * h;
      if (prev !== 0 && Math.sign(om) !== Math.sign(prev)) om = 0;
      phi = Math.min(Math.PI / 2, phi + om * h); t += h;
      if (phi <= 0) { slam = { t, v: Math.abs(om) * Wd }; phi = 0; om = 0; report(); return; }
    }
  }
  function report() {
    const tq = Math.abs(torque(phi || Math.PI / 2));
    f.result.replaceChildren(slam ? el('span', {}, 'ปัง! ประตูปิดเองหลัง ', el('b', {}, `${slam.t.toFixed(1)} วินาที`), ` ขอบประตูกระแทกด้วยความเร็ว ${slam.v.toFixed(1)} m/s`)
      : stuck ? el('span', {}, 'แรงที่ดันประตู ', el('b', {}, `${tq.toFixed(2)} N·m`), ` ยังแพ้แรงฝืด ประตูเลยค้างอยู่ที่ ${(phi * 180 / Math.PI).toFixed(0)}°`)
        : el('span', {}, 'ประตูเริ่มเคลื่อน… แรงดัน ', el('b', {}, `${tq.toFixed(2)} N·m`)),
      el('br'), el('span', { class: 'faint' }, 'ลองเอียงแค่ 1° แล้วลดความฝืด หรือเปิดลมเบาๆ'));
    if (slam) say(`ประตูปิดเองหลัง ${slam.t.toFixed(1)} วินาที`); else if (stuck) say('ประตูไม่ขยับ');
  }
  const stopLoop = loop(f.canvas, (dt) => { sim(still() ? 0.05 : dt); draw(); });
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.fillStyle = '#100a09'; g.fillRect(0, 0, w, h);
    const wallY = h * 0.6, hx = w * 0.3, dl = w * 0.32;
    g.fillStyle = '#4a3a33'; g.fillRect(0, wallY - 6, hx, 12); g.fillRect(hx + dl + 6, wallY - 6, w - hx - dl - 6, 12);
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'left';
    g.fillText('ห้องนอน (มองจากเพดาน)', 10, 20); g.fillText('ทางเดิน', 10, h - 12);
    // window + wind
    g.fillStyle = '#6e8aa0'; g.fillRect(w * 0.7, 6, w * 0.22, 8);
    if (wind.get() > 0 && !slam) { g.strokeStyle = 'rgba(157,255,199,.5)'; g.lineWidth = 2; const k = (performance.now() / 600) % 1; for (let i = 0; i < 3; i++) { const y = 24 + ((k + i / 3) % 1) * (wallY - 50); g.beginPath(); g.moveTo(w * 0.78, y); g.lineTo(w * 0.62, y + 20); g.stroke(); } }
    // door swing arc
    g.strokeStyle = 'rgba(255,177,153,.18)'; g.setLineDash([4, 6]); g.beginPath(); g.arc(hx, wallY, dl, -Math.PI / 2, 0); g.stroke(); g.setLineDash([]);
    const ex = hx + Math.cos(-phi) * dl, ey = wallY + Math.sin(-phi) * dl;
    g.strokeStyle = slam ? '#ff3b2f' : '#c9a27a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, wallY); g.lineTo(ex, ey); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#ffd866'; g.beginPath(); g.arc(hx, wallY, 5, 0, Math.PI * 2); g.fill();
    if (slam) { g.fillStyle = '#ff3b2f'; g.font = '800 28px "Kanit", sans-serif'; g.textAlign = 'center'; g.fillText('ปัง!', hx + dl / 2, wallY - 22); }
    f.overlay.replaceChildren(el('span', { class: 'badge' }, `เปิด ${(phi * 180 / Math.PI).toFixed(0)}°`), el('span', { class: 'badge' }, `${t.toFixed(1)} s`));
  }
  report();
  return { unmount: () => { stopLoop(); c.stop(); } };
}
