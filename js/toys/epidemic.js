// "Haa long": an SIR epidemic model of a waterborne outbreak, with deaths and a clean-water campaign.
import { frame, slider, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const DAYS = 100, GAMMA = 1 / 4;

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const N = slider(f.controls, { label: 'คนในเมือง', min: 10, max: 300, step: 10, value: 100, unit: 'พันคน', onInput: () => draw() });
  const R0 = slider(f.controls, { label: 'คนป่วยหนึ่งคนแพร่ต่อได้กี่คน (R₀)', min: 0.8, max: 5, step: 0.1, value: 2.5, unit: 'คน', onInput: () => draw() });
  const cfr = slider(f.controls, { label: 'คนป่วยที่เสียชีวิต (ไม่มีการรักษา)', min: 1, max: 50, value: 30, unit: '%', onInput: () => draw() });
  const clean = slider(f.more, { label: 'คนที่หันมาต้มน้ำ/ใช้น้ำสะอาด', min: 0, max: 90, value: 0, unit: '%', onInput: () => draw() });
  const day = slider(f.more, { label: 'เริ่มรณรงค์วันที่', min: 0, max: 60, value: 10, unit: '', onInput: () => draw() });
  f.moreBox.open = !o.compact;
  f.formula.append(math('<mfrac><mrow><mi>d</mi><mi>S</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mo>−</mo><mi>β</mi><mfrac><mrow><mi>S</mi><mi>I</mi></mrow><mi>N</mi></mfrac>'), math('<mfrac><mrow><mi>d</mi><mi>I</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mi>β</mi><mfrac><mrow><mi>S</mi><mi>I</mi></mrow><mi>N</mi></mfrac><mo>−</mo><mi>γ</mi><mi>I</mi>'),
    el('div', { class: 'faint' }, 'S = คนที่ยังไม่ติด · I = คนที่ป่วยอยู่ · β = R₀·γ·(1 − สัดส่วนน้ำสะอาด) · γ = 1/4 ต่อวัน (ป่วยและแพร่เชื้อราว 4 วัน)'));
  f.explain.append(
    el('p', {}, 'แบบจำลอง SIR แบ่งคนเป็นสามกลุ่ม คือยังไม่ติด กำลังป่วย และหายหรือเสียชีวิตแล้ว ตอนแรกคนป่วยน้อยจนไม่มีใครสังเกต แต่ถ้าคนป่วยหนึ่งคนแพร่ให้คนอื่นได้มากกว่า 1 คน จำนวนจะเพิ่มเป็นทวีคูณ แล้ววันหนึ่งก็ระเบิดออกมาพร้อมกันทั้งเมือง'),
    el('p', {}, 'คนบางกอกปี 2363 เห็นแต่คนตายวันละมากๆ ในเวลาไม่กี่สัปดาห์ แล้วโรคก็หายไปเอง เลยเชื่อว่าผีห่าลงมากินคนแล้วกลับไป ความจริงคือโรคซาลงเมื่อคนที่ยังไม่ติดเหลือน้อยลง (กราฟสีเขียวลดลง) ไม่ใช่เพราะผีอิ่ม'),
    el('p', {}, 'ลองเปิด "ตั้งค่าเพิ่ม" แล้วให้คนหันมาต้มน้ำตั้งแต่วันแรกๆ จะเห็นยอดตายลดลงมาก เพราะเชื้ออหิวาต์ไปกับน้ำ ในปี 1854 หมอ John Snow ที่ลอนดอนหยุดการระบาดได้ด้วยการถอดด้ามปั๊มบ่อน้ำสาธารณะที่ปนเปื้อน'),
    el('p', { class: 'caveat' }, 'แบบจำลองนี้ง่ายมาก ไม่นับคนที่ติดเชื้อแต่ไม่มีอาการ ซึ่งในอหิวาตกโรคมีจำนวนมาก ตัวเลขจึงใช้ดูแนวโน้ม ไม่ใช่ตัวเลขจริงของปี 2363'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { N.set(100); R0.set(2.5); cfr.set(30); clean.set(0); day.set(10); });
  let res = null;
  wirePin(f, o, () => !res ? "" : `เมือง ${N.get()} พันคน, R₀ ${R0.get()}, ตาย ${cfr.get()}% ของคนป่วย, ต้มน้ำ ${clean.get()}% ตั้งแต่วันที่ ${day.get()} → เสียชีวิต ${res.deaths.toLocaleString('th-TH')} คน สูงสุดวันละ ${res.peakD.toLocaleString('th-TH')} คน (วันที่ ${res.peakDay})`);
  function run() {
    const n = N.get() * 1000; let S = n - 10, I = 10, D = 0, Rr = 0;
    const out = [];
    for (let d = 0; d < DAYS; d++) {
      let newI = 0, newD = 0;
      const beta = R0.get() * GAMMA * (d >= day.get() ? 1 - clean.get() / 100 : 1);
      for (let k = 0; k < 10; k++) { const h = 0.1, inf = beta * S * I / n * h, rem = GAMMA * I * h; S -= inf; I += inf - rem; newI += inf; newD += rem * cfr.get() / 100; Rr += rem * (1 - cfr.get() / 100); D += rem * cfr.get() / 100; }
      out.push({ S, I, D, newI, newD });
    }
    let peakD = 0, peakDay = 0; out.forEach((x, i) => { if (x.newD > peakD) { peakD = x.newD; peakDay = i + 1; } });
    return { out, deaths: Math.round(D), peakD: Math.round(peakD), peakDay, n };
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    res = run();
    const { out, n } = res;
    g.fillStyle = '#0d0809'; g.fillRect(0, 0, w, h);
    const x0 = 40, x1 = w - 12, y0 = 18, y1 = h - 34, X = (d) => x0 + d / DAYS * (x1 - x0);
    // population lines
    const Y = (v) => y1 - v / n * (y1 - y0);
    g.strokeStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(x0, y0 + k / 4 * (y1 - y0)); g.lineTo(x1, y0 + k / 4 * (y1 - y0)); g.stroke(); }
    // daily deaths bars (own scale)
    const md = Math.max(1, ...out.map((x) => x.newD));
    g.fillStyle = 'rgba(255,59,47,.55)';
    out.forEach((x, i) => { const bh = x.newD / md * (y1 - y0) * 0.6; g.fillRect(X(i), y1 - bh, Math.max(1, (x1 - x0) / DAYS - 1), bh); });
    const line = (key, col) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); out.forEach((x, i) => (i ? g.lineTo(X(i + 1), Y(x[key])) : g.moveTo(X(1), Y(x[key])))); g.stroke(); };
    line('S', '#5dff9a'); line('I', '#ffd866'); line('D', '#d8c2ff');
    if (clean.get() > 0) { g.strokeStyle = 'rgba(93,169,255,.7)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(day.get()), y0); g.lineTo(X(day.get()), y1); g.stroke(); g.setLineDash([]); }
    g.fillStyle = '#8a7671'; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    for (let d = 0; d <= DAYS; d += 20) g.fillText(`วัน ${d}`, X(d), h - 16);
    g.textAlign = 'left'; g.font = '12px "IBM Plex Sans Thai", sans-serif';
    [['ยังไม่ติด', '#5dff9a'], ['ป่วยอยู่', '#ffd866'], ['ตายสะสม', '#d8c2ff'], ['ตายต่อวัน (แท่ง)', '#ff6a3d']].forEach(([t, col], i) => { g.fillStyle = col; g.fillText(t, x0 + 8 + i * Math.min(120, (x1 - x0) / 4), y0 + 12); });
    f.overlay.replaceChildren();
    f.result.replaceChildren('เสียชีวิตทั้งหมด ', el('b', {}, res.deaths.toLocaleString('th-TH')), ' คน (', el('b', {}, `${(res.deaths / n * 100).toFixed(1)}%`), ' ของเมือง) · หนักสุดวันที่ ', el('b', {}, res.peakDay), ' ตายวันละ ', el('b', {}, res.peakD.toLocaleString('th-TH')), ' คน', el('br'),
      el('span', { class: 'faint' }, R0.get() * (1 - clean.get() / 100) < 1 ? 'คนป่วยแพร่ต่อได้ไม่ถึง 1 คน โรคค่อยๆ หยุดไปเอง' : 'โรคระเบิดแล้วซาลงเองเมื่อคนที่ยังไม่ติดเหลือน้อย'));
    say(`เสียชีวิต ${res.deaths} คน`);
  }
  return { unmount: () => c.stop() };
}
