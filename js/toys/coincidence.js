// Birthday paradox + "law of truly large numbers"
import { frame, slider, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const CONFIG = { thaiPopulation: 66_000_000 }; // ประชากรไทยราว 66 ล้านคน (ทะเบียนราษฎร์ ปี 2567 โดยประมาณ)
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const pShared = (n) => { let q = 1; for (let k = 0; k < n; k++) q *= (365 - k) / 365; return 1 - q; };

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  let room = [];
  let sims = null;
  const N = slider(f.controls, { label: 'จำนวนคนในห้อง N', min: 2, max: 120, value: 23, unit: 'คน', onInput: () => { sims = null; roll(); } });
  const rollBtn = el('button', { class: 'btn small', type: 'button', onclick: () => roll() }, '🎲 สุ่มห้องใหม่');
  const simBtn = el('button', { class: 'btn small', type: 'button', onclick: () => simulate() }, 'สุ่ม 1,000 ห้อง');
  f.controls.append(el('div', { class: 'row' }, rollBtn, simBtn));

  // part B: dreams that "come true"
  const B = el('div', { class: 'result' });
  const pop = slider(f.more, { label: 'จำนวนคนที่ฝันคืนนี้', min: 1, max: 66, value: CONFIG.thaiPopulation / 1e6, unit: 'ล้านคน' });
  const rec = slider(f.more, { label: 'สัดส่วนคนที่ตื่นมาจำฝันได้', min: 1, max: 80, value: 30, unit: '%' });
  const pp = slider(f.more, { label: 'โอกาสที่ฝันหนึ่งเรื่องจะ "ตรง" กับเหตุการณ์วันรุ่งขึ้นโดยบังเอิญ', min: -7, max: -2, step: 0.1, value: -5, fmt: (v) => `1 ใน ${Math.round(10 ** -v).toLocaleString('th-TH')}` });
  f.more.append(B);
  const partB = () => {
    const E = pop.get() * 1e6 * rec.get() / 100 * 10 ** pp.get();
    B.replaceChildren('คืนนี้จะมีคนราว ', el('b', {}, Math.round(E).toLocaleString('th-TH')), ' คน ที่ "ฝันแล้วเป็นจริง" โดยบังเอิญล้วนๆ และคนพวกนี้จะจำได้แม่น');
  };
  [pop, rec, pp].forEach((s) => s.input.addEventListener('input', partB));
  f.moreBox.open = !o.compact;
  partB();

  f.formula.append(math('<mi>P</mi><mo>(</mo><mtext>มีวันเกิดชนกัน</mtext><mo>)</mo><mo>=</mo><mn>1</mn><mo>−</mo><munderover><mo>∏</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mrow><mi>N</mi><mo>−</mo><mn>1</mn></mrow></munderover><mfrac><mrow><mn>365</mn><mo>−</mo><mi>k</mi></mrow><mn>365</mn></mfrac>'),
    math('<mi>E</mi><mo>=</mo><mi>N</mi><mo>·</mo><mi>r</mi><mo>·</mo><mi>p</mi>'));
  f.explain.append(
    el('p', {}, 'เราไม่ได้ถามว่า "จะมีคนเกิดวันเดียวกับเรา" แต่ถามว่า "มีคู่ไหนก็ได้ที่เกิดวันเดียวกัน" ซึ่งจำนวนคู่โตเร็วมาก: 23 คนมีถึง 253 คู่ เลยมีโอกาสชนกันราว 50.7%'),
    el('p', {}, 'นักสถิติ Diaconis กับ Mosteller (1989) เรียกปรากฏการณ์นี้ว่า "กฎของจำนวนที่ใหญ่มากๆ": เมื่อมีคนมากพอ เรื่องที่โอกาสน้อยแค่ไหนก็ต้องเกิดกับใครสักคน'),
    el('p', { class: 'caveat' }, 'สมมติว่าทุกวันในปีมีคนเกิดเท่าๆ กัน และไม่นับ 29 ก.พ. ของจริงจะชนกันง่ายกว่านี้อีกนิด'));
  f.resetBtn.addEventListener('click', () => { N.set(23); });
  wirePin(f, o, () => `N=${N.get()} คน → P(วันเกิดชน) = ${(pShared(N.get()) * 100).toFixed(1)}%` + (sims ? `, สุ่มจริง ${sims.hit}/1000 ห้อง` : ''));

  const c = fitCanvas(f.canvas, () => draw());
  function roll() {
    room = Array.from({ length: N.get() }, () => Math.floor(Math.random() * 365));
    draw();
  }
  function simulate() {
    let hit = 0;
    for (let r = 0; r < 1000; r++) {
      const seen = new Uint8Array(365); let dup = false;
      for (let i = 0; i < N.get(); i++) { const d = Math.floor(Math.random() * 365); if (seen[d]) { dup = true; break; } seen[d] = 1; }
      hit += dup;
    }
    sims = { hit };
    draw();
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.clearRect(0, 0, w, h);
    const cx = w * 0.3, cy = h * 0.5, R = Math.min(w * 0.26, h * 0.4);
    // year wheel
    g.strokeStyle = 'rgba(255,59,47,.25)'; g.lineWidth = 1;
    for (let m = 0; m < 12; m++) {
      const a = m / 12 * Math.PI * 2 - Math.PI / 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); g.lineTo(cx + Math.cos(a) * R * 1.04, cy + Math.sin(a) * R * 1.04); g.stroke();
      const am = a + Math.PI / 12;
      g.fillStyle = '#8a7671'; g.font = '11px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'center';
      g.fillText(MONTHS[m], cx + Math.cos(am) * R * 1.16, cy + Math.sin(am) * R * 1.16 + 4);
    }
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    const pos = (d) => { const a = d / 365 * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; };
    const count = {};
    room.forEach((d) => (count[d] = (count[d] || 0) + 1));
    let pairs = 0;
    for (const [d, k] of Object.entries(count)) {
      if (k > 1) {
        pairs += k * (k - 1) / 2;
        const [x, y] = pos(+d);
        g.strokeStyle = '#ffd866'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
      }
    }
    room.forEach((d, i) => {
      const [x, y] = pos(d);
      const r = R * (1 - 0.06 * (room.slice(0, i).filter((z) => z === d).length));
      const a = d / 365 * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = count[d] > 1 ? '#ffd866' : '#ff3b2f';
      g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = '#f3e9e2'; g.font = '600 13px "Chakra Petch", sans-serif'; g.textAlign = 'center';
    g.fillText(pairs ? `ชนกัน ${pairs} คู่!` : 'ยังไม่มีใครชน', cx, cy + 5);
    // P(N) curve
    const gx = w * 0.62, gy = h * 0.14, gw = w * 0.34, gh = h * 0.62;
    g.strokeStyle = 'rgba(243,233,226,.25)'; g.strokeRect(gx, gy, gw, gh);
    g.beginPath();
    for (let n = 1; n <= 120; n++) { const x = gx + n / 120 * gw, y = gy + gh - pShared(n) * gh; n === 1 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.strokeStyle = '#ff3b2f'; g.lineWidth = 2; g.stroke();
    const n = N.get(), p = pShared(n);
    const mx = gx + n / 120 * gw, my = gy + gh - p * gh;
    g.strokeStyle = 'rgba(255,216,102,.6)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(mx, gy + gh); g.lineTo(mx, my); g.lineTo(gx, my); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ffd866'; g.beginPath(); g.arc(mx, my, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#bfaba4'; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'left';
    g.fillText('100%', gx - 2, gy - 4); g.fillText('N →', gx + gw - 24, gy + gh + 14); g.fillText('0', gx, gy + gh + 14);
    f.result.replaceChildren('ห้องที่มี ', el('b', {}, n), ' คน มีโอกาสที่วันเกิดจะชนกันอย่างน้อยหนึ่งคู่ ', el('b', {}, `${(p * 100).toFixed(1)}%`),
      sims ? el('span', {}, el('br'), 'สุ่มจริง 1,000 ห้อง ชนกัน ', el('b', {}, sims.hit), ' ห้อง') : '');
    say(`${n} คน โอกาสวันเกิดชนกัน ${(p * 100).toFixed(1)} เปอร์เซ็นต์ ห้องนี้ชนกัน ${pairs} คู่`);
  }
  roll();
  return { unmount: () => c.stop() };
}
