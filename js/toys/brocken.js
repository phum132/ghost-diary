// Brocken spectre: your own shadow on a fog bank, with a "glory" ring around the head.
// Glory size uses the rough diffraction estimate sin θ ≈ 1.22 λ / d (the full answer is Mie theory).
import { frame, slider, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const WAVES = [[0.45, '#7a5cff'], [0.5, '#3fa9ff'], [0.55, '#5dff9a'], [0.58, '#ffe25d'], [0.62, '#ff9a3d'], [0.68, '#ff3b2f']]; // µm, inner violet → outer red

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const st = { arms: false };
  const sun = slider(f.controls, { label: 'มุมดวงอาทิตย์ (ข้างหลังเรา)', min: 0, max: 20, value: 5, unit: '°', onInput: () => draw() });
  const dist = slider(f.controls, { label: 'ระยะถึงกำแพงหมอก', min: 10, max: 200, value: 60, unit: 'm', onInput: () => draw() });
  const drop = slider(f.controls, { label: 'ขนาดหยดน้ำในหมอก', min: 5, max: 40, value: 15, unit: 'µm', onInput: () => draw() });
  const arms = el('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false' }, '🙌 ยกแขน');
  arms.addEventListener('click', () => { st.arms = !st.arms; arms.setAttribute('aria-pressed', String(st.arms)); draw(); });
  f.controls.append(arms);
  f.formula.append(math('<mi>sin</mi><mi>θ</mi><mo>≈</mo><mfrac><mrow><mn>1.22</mn><mi>λ</mi></mrow><mi>d</mi></mfrac>'), el('div', { class: 'faint' }, 'λ = ความยาวคลื่นแสง (แดง ~0.65 µm) · d = ขนาดหยดน้ำ'));
  f.explain.append(
    el('p', {}, 'เมื่อพระอาทิตย์อยู่ข้างหลังเราในมุมต่ำ เงาของเราจะพุ่งไปตกบนกำแพงหมอกข้างหน้า เงานั้นไม่ได้ตกบนผิวเดียวแต่ทอดลึกเข้าไปในหมอก สมองเลยกะระยะผิดและรู้สึกว่ามันเป็นร่างยักษ์ที่ยืนอยู่ไกลๆ'),
    el('p', {}, 'วงรุ้งรอบหัวเรียกว่า glory เกิดจากแสงที่สะท้อนย้อนกลับมาจากหยดน้ำเล็กๆ จุดกลางวงคือจุดตรงข้ามดวงอาทิตย์พอดี คือหัวของเงาเรา คนที่ยืนข้างๆ จึงเห็นวงรอบหัวเงาของเขาเอง ไม่ใช่ของเรา'),
    el('p', { class: 'caveat' }, 'สูตรในกล่องเป็นค่าประมาณเพื่อให้เห็นแนวโน้ม (หยดเล็ก = วงใหญ่) ทฤษฎีจริงซับซ้อนกว่านี้มาก'));
  const c = fitCanvas(f.canvas, () => draw());
  const theta = (lam) => Math.asin(Math.min(1, 1.22 * lam / drop.get())) * 180 / Math.PI;
  f.resetBtn.addEventListener('click', () => { sun.set(5); dist.set(60); drop.set(15); st.arms = false; arms.setAttribute('aria-pressed', 'false'); draw(); });
  wirePin(f, o, () => `ดวงอาทิตย์ ${sun.get()}°, หมอกห่าง ${dist.get()} m, หยดน้ำ ${drop.get()} µm → วงรุ้งสีแดงกว้าง ~${theta(0.65).toFixed(1)}°`);
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    // view from the ridge looking into the fog, sun behind us
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#2a2f3a'); sky.addColorStop(0.5, '#cfd3d6'); sky.addColorStop(1, '#e7e6e1');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // fog texture
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.ellipse((i * 137) % w, h * (0.35 + ((i * 53) % 50) / 100), w * 0.2, h * 0.06, 0, 0, Math.PI * 2); g.fill(); }
    // antisolar point: below the horizon by the sun's elevation
    const fovDeg = 60, pxPerDeg = w / fovDeg;
    const ax = w / 2, ay = h * 0.42 + sun.get() * pxPerDeg;
    // shadow: perspective makes it look huge; nearer fog => bigger, sharper
    const scale = Math.max(0.6, 2.4 - dist.get() / 120) * pxPerDeg * 6;
    const sharp = Math.max(0.15, 1 - dist.get() / 220);
    g.save(); g.translate(ax, ay); g.fillStyle = `rgba(40,40,48,${0.25 + 0.5 * sharp})`;
    g.beginPath(); g.ellipse(0, 0, scale * 0.12, scale * 0.15, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-scale * 0.2, scale * 0.18); g.lineTo(scale * 0.2, scale * 0.18); g.lineTo(scale * 0.5, h); g.lineTo(-scale * 0.5, h); g.fill();
    g.lineWidth = scale * 0.08; g.lineCap = 'round'; g.strokeStyle = g.fillStyle;
    if (st.arms) { g.beginPath(); g.moveTo(-scale * 0.18, scale * 0.24); g.lineTo(-scale * 0.42, -scale * 0.2); g.moveTo(scale * 0.18, scale * 0.24); g.lineTo(scale * 0.42, -scale * 0.2); g.stroke(); }
    else { g.beginPath(); g.moveTo(-scale * 0.2, scale * 0.24); g.lineTo(-scale * 0.28, scale * 0.8); g.moveTo(scale * 0.2, scale * 0.24); g.lineTo(scale * 0.28, scale * 0.8); g.stroke(); }
    g.restore();
    // glory rings centred on the head (antisolar point)
    g.globalCompositeOperation = 'screen';
    for (const [lam, col] of WAVES) {
      const r = theta(lam) * pxPerDeg * 2.2;
      g.strokeStyle = col; g.globalAlpha = 0.55; g.lineWidth = Math.max(2, r * 0.18);
      g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // ridge + observer from behind
    g.fillStyle = '#1a1512'; g.beginPath(); g.moveTo(0, h * 0.92); g.quadraticCurveTo(w / 2, h * 0.86, w, h * 0.94); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    f.result.replaceChildren('วงรุ้งสีแดงกว้างราว ', el('b', {}, `${theta(0.65).toFixed(1)}°`), ' · เงาดูสูง ', el('b', {}, `~${Math.round(scale / pxPerDeg * 1.7)}`), ' เท่าตัวจริงในความรู้สึก', el('br'),
      el('span', { class: 'faint' }, 'หยดน้ำเล็กลง → วงรุ้งใหญ่ขึ้น · หมอกใกล้ → เงาชัดขึ้น'));
    say(`วงรุ้งกว้าง ${theta(0.65).toFixed(1)} องศา ${st.arms ? 'เงายกแขนตามเรา' : ''}`);
  }
  return { unmount: () => c.stop() };
}
