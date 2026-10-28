// Cold that drives people "mad": wind chill and a rough core-temperature model (hypothermia stages).
import { frame, slider, segmented, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const CLOTH = { none: 0.06, light: 0.035, full: 0.009 };
const HOURS = 10;

export const wct = (T, V) => (V < 4.8 ? T : 13.12 + 0.6215 * T - 11.37 * V ** 0.16 + 0.3965 * T * V ** 0.16);

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const T = slider(f.controls, { label: 'อุณหภูมิอากาศ', min: -45, max: 10, value: -15, unit: '°C', onInput: () => draw() });
  const V = slider(f.controls, { label: 'ความเร็วลม', min: 0, max: 100, value: 30, unit: 'km/h', onInput: () => draw() });
  const cloth = segmented(f.controls, 'สิ่งที่ใส่อยู่', [['none', 'ถุงเท้ากับเสื้อบาง'], ['light', 'เสื้อกันหนาวตัวเดียว'], ['full', 'ชุดกันหนาวครบ']], 'light', () => draw());
  f.controls.append(el('button', { class: 'btn small', type: 'button', onclick: () => { T.set(-30); V.set(50); cloth.set('none'); } }, '🏔 คืนที่ช่องเขาดียัตลอฟ (โดยประมาณ)'));
  f.formula.append(math('<mi>W</mi><mo>=</mo><mn>13.12</mn><mo>+</mo><mn>0.6215</mn><mi>T</mi>'), math('<mo>−</mo><mn>11.37</mn><msup><mi>V</mi><mn>0.16</mn></msup><mo>+</mo><mn>0.3965</mn><mi>T</mi><msup><mi>V</mi><mn>0.16</mn></msup>'),
    el('div', { class: 'faint' }, 'ดัชนีความหนาวจากลม (ใช้ในแคนาดาและสหรัฐฯ) · T = อุณหภูมิอากาศ °C · V = ลม km/h'));
  f.explain.append(
    el('p', {}, 'ลมพัดเอาไอร้อนที่ห่อตัวเราออกไปตลอดเวลา อากาศลบ 30 องศาที่มีลมแรง จึงรู้สึกหนาวเหมือนลบ 50 องศาในวันลมสงบ ผิวที่โดนลมอาจเกิดเนื้อเยื่อตายจากความเย็นได้ในไม่กี่นาที'),
    el('p', {}, 'เมื่ออุณหภูมิในร่างกายลดจาก 37 ลงต่ำกว่า 35 องศา สมองเริ่มทำงานผิดปกติ คนจะสับสน ตัดสินใจแปลกๆ ต่ำกว่า 32 องศาร่างกายหยุดสั่น หลายคนรู้สึกร้อนวูบจนถอดเสื้อผ้าออก (paradoxical undressing) และบางคนคลานเข้าไปซุกในที่แคบ (terminal burrowing) ก่อนหมดสติ'),
    el('p', {}, 'คนที่พบศพในสภาพแบบนี้โดยไม่รู้เรื่องภาวะตัวเย็นเกิน มักคิดว่ามีอะไรน่ากลัวไล่ล่าพวกเขาจนต้องหนีออกมาโดยไม่ใส่เสื้อผ้า เรื่องของช่องเขาดียัตลอฟคือตัวอย่างที่ดังที่สุด'),
    el('p', { class: 'caveat' }, 'สูตรความหนาวจากลมเป็นสูตรจริง ส่วนกราฟอุณหภูมิร่างกายเป็นแบบจำลองหยาบมาก ใช้ดูแนวโน้มเท่านั้น ร่างกายแต่ละคน ความเปียก และอาหาร ทำให้ผลต่างกันมาก'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { T.set(-15); V.set(30); cloth.set('light'); });
  let res = null;
  wirePin(f, o, () => res ? `อากาศ ${T.get()}°C ลม ${V.get()} km/h → รู้สึกเหมือน ${res.w.toFixed(0)}°C · ${res.t35 != null ? `อุณหภูมิกายต่ำกว่า 35° ในราว ${res.t35.toFixed(1)} ชั่วโมง` : 'ร่างกายยังรักษาอุณหภูมิได้ใน 10 ชั่วโมง'}` : '');
  function run() {
    const w = wct(T.get(), V.get()), U = CLOTH[cloth.get()];
    let tc = 37; const pts = [[0, tc]]; let t35 = null, t32 = null, t28 = null;
    for (let i = 1; i <= HOURS * 60; i++) {
      const hrs = i / 60;
      const M = tc > 32 ? 3 * Math.exp(-hrs / 4) + 0.8 : 0.6; // shivering fades with fatigue and stops below 32 °C
      tc += (-(tc - w) * U + M) / 60;
      tc = Math.min(37, tc);
      if (t35 == null && tc < 35) t35 = hrs; if (t32 == null && tc < 32) t32 = hrs; if (t28 == null && tc < 28) t28 = hrs;
      if (i % 5 === 0) pts.push([hrs, tc]);
    }
    return { w, pts, t35, t32, t28 };
  }
  const frost = (w) => (w <= -48 ? '2–5 นาที' : w <= -40 ? '5–10 นาที' : w <= -28 ? '10–30 นาที' : null);
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    res = run();
    g.fillStyle = '#0b0a10'; g.fillRect(0, 0, w, h);
    const x0 = 46, x1 = w - 14, y0 = 14, y1 = h - 30, lo = 22, hi = 38;
    const X = (t) => x0 + t / HOURS * (x1 - x0), Y = (v) => y1 - (v - lo) / (hi - lo) * (y1 - y0);
    [[35, 38, 'rgba(93,255,154,.07)', 'ปกติ / หนาวสั่น'], [32, 35, 'rgba(255,226,93,.09)', 'ตัวเย็นเกินระดับอ่อน: สั่น สับสน'], [28, 32, 'rgba(255,154,61,.11)', 'ระดับปานกลาง: หยุดสั่น อาจถอดเสื้อผ้า'], [22, 28, 'rgba(255,59,47,.13)', 'รุนแรง: หมดสติ']].forEach(([a, b, col, label]) => {
      g.fillStyle = col; g.fillRect(x0, Y(b), x1 - x0, Y(a) - Y(b));
      g.fillStyle = '#8a7671'; g.font = '11px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'right'; g.fillText(label, x1 - 6, Y(b) + 14);
    });
    g.textAlign = 'right'; g.font = '11px "IBM Plex Mono", monospace';
    for (const v of [37, 35, 32, 28, 24]) { g.fillStyle = '#8a7671'; g.fillText(`${v}°`, x0 - 6, Y(v) + 4); }
    g.textAlign = 'center'; for (let t = 0; t <= HOURS; t += 2) g.fillText(`${t} ชม.`, X(t), h - 10);
    g.strokeStyle = '#ff6a3d'; g.lineWidth = 2.5; g.beginPath(); res.pts.forEach(([t, v], i) => (i ? g.lineTo(X(t), Y(Math.max(lo, v))) : g.moveTo(X(t), Y(v)))); g.stroke();
    f.overlay.replaceChildren(el('span', { class: 'badge' }, `รู้สึกเหมือน ${res.w.toFixed(0)}°C`));
    const fr = frost(res.w);
    f.result.replaceChildren('ลมทำให้รู้สึกเหมือน ', el('b', {}, `${res.w.toFixed(0)}°C`), fr ? el('span', {}, ' · ผิวที่โดนลมเสี่ยงเนื้อเยื่อตายใน ', el('b', {}, fr)) : '', el('br'),
      res.t35 != null ? el('span', {}, 'ร่างกายต่ำกว่า 35° ในราว ', el('b', {}, `${res.t35.toFixed(1)} ชม.`), res.t32 != null ? el('span', {}, ' และต่ำกว่า 32° (ช่วงที่คนเริ่มถอดเสื้อผ้า) ในราว ', el('b', {}, `${res.t32.toFixed(1)} ชม.`)) : '')
        : el('span', { class: 'faint' }, 'ร่างกายยังรักษาอุณหภูมิไว้ได้ตลอด 10 ชั่วโมงในแบบจำลองนี้'));
    say(`รู้สึกเหมือน ${res.w.toFixed(0)} องศา`);
  }
  return { unmount: () => c.stop() };
}
