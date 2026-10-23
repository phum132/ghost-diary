// Carbon monoxide in a closed room — a deliberately simple two-box model. Not medical advice.
//   dC/dt = S/V − λ·C            (room concentration, ppm)
//   dH/dt = k·C − H/τ            (COHb % in blood)
// k·τ is tuned so ~100 ppm for many hours settles near 16% COHb, in line with commonly cited tables.
import { frame, slider, segmented, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const CONFIG = {
  sources: { // S in ppm·m³ per minute, V in m³ (illustrative values)
    heater: { label: 'เครื่องทำน้ำอุ่นแก๊ส (ท่อไอเสียร้าว)', S: 40, V: 40 },
    stove: { label: 'เตาถ่านปิ้งย่างในห้อง', S: 300, V: 40 },
    car: { label: 'รถติดเครื่องในโรงรถ', S: 2500, V: 60 },
  },
  ventClosed: 0.5, ventOpen: 6, // air changes per hour
  tau: 5.3 / Math.LN2,          // h — COHb half-life on room air ≈ 4–5 h
  ktau: 0.16,                    // % COHb per ppm at steady state
};
const LADDER = [
  [0, 'ปกติ หรือแค่ปวดหัวเบาๆ'], [10, 'ปวดหัว เหนื่อยง่าย'], [20, 'ปวดหัวตุบๆ เวียนหัว คลื่นไส้ ตัดสินใจแย่ลง'],
  [30, 'สับสน มองเห็นผิดปกติ อาจเห็นภาพหลอน'], [40, 'เป็นลม หมดสติ'], [50, 'ชัก โคม่า อันตรายถึงชีวิต'],
];

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const st = { src: 'heater', t: 0, C: 0, H: 0.5, playing: false };
  const src = segmented(f.controls, 'แหล่งก๊าซ', Object.entries(CONFIG.sources).map(([k, v]) => [k, v.label]), 'heater', (v) => { st.src = v; restart(); });
  const vent = slider(f.controls, { label: 'การระบายอากาศ (เปิดหน้าต่าง)', min: 0, max: 100, value: 0, unit: '%', onInput: () => { if (!st.playing) restart(); } });
  const hours = slider(f.controls, { label: 'อยู่ในห้องนาน', min: 0, max: 8, step: 0.25, value: 8, unit: 'ชม.', onInput: () => { if (!st.playing) restart(); } });
  const playBtn = el('button', { class: 'btn small', type: 'button' }, '▶ เล่นเร่งเวลา (1 ชม. = 4 วินาที)');
  f.controls.append(playBtn);
  f.controls.prepend(el('div', { class: 'safety', role: 'note' }, '⚠ ถ้าบ้าน "มีผี" แล้วทุกคนปวดหัว และอาการดีขึ้นเมื่อออกไปข้างนอก ให้ออกไปที่โล่งทันทีแล้วโทร 1669 ติดเครื่องวัด CO ถ้าบ้านใช้แก๊สหรือถ่าน'));

  f.formula.append(math('<mfrac><mrow><mi>d</mi><mi>C</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mfrac><mi>S</mi><mi>V</mi></mfrac><mo>−</mo><mi>λ</mi><mi>C</mi>'),
    math('<mfrac><mrow><mi>d</mi><mtext>COHb</mtext></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mi>k</mi><mi>C</mi><mo>−</mo><mfrac><mtext>COHb</mtext><mi>τ</mi></mfrac>'),
    el('div', { class: 'faint' }, 'S = ก๊าซที่ปล่อยออกมา · V = ปริมาตรห้อง · λ = อัตราเปลี่ยนอากาศต่อชั่วโมง · τ ≈ 7.6 ชม.'));
  f.explain.append(
    el('p', {}, 'คาร์บอนมอนอกไซด์ (CO) ไม่มีสี ไม่มีกลิ่น เกิดจากการเผาไหม้ที่ไม่สมบูรณ์ เช่น เปลวไฟแก๊สที่เป็นสีเหลืองแทนที่จะเป็นสีฟ้า ฮีโมโกลบินในเลือดจับ CO ได้แน่นกว่าออกซิเจนราว 200–250 เท่า ร่างกายจึงค่อยๆ ขาดออกซิเจนโดยไม่รู้ตัว'),
    el('p', {}, 'อาการช่วงแรกคล้ายนอนไม่พอ: ปวดหัว เวียนหัว คลื่นไส้ ถ้าหนักขึ้นจะสับสนและเห็นภาพหลอน มีบันทึกทางการแพทย์ตั้งแต่ปี 1921 ของครอบครัวหนึ่งที่เห็น "ผี" ในบ้าน จนพบว่าเตาในบ้านรั่ว'),
    el('p', { class: 'caveat' }, '⚠ โมเดลนี้ทำให้ง่ายเพื่อการเรียนรู้ ไม่ใช่การวินิจฉัยทางการแพทย์ ตัวเลขจริงขึ้นกับร่างกายและการหายใจของแต่ละคน'));

  const c = fitCanvas(f.canvas, () => draw());
  const lambda = () => CONFIG.ventClosed + (CONFIG.ventOpen - CONFIG.ventClosed) * vent.get() / 100;
  function stepModel(dtH) {
    const s = CONFIG.sources[st.src];
    const k = CONFIG.ktau / CONFIG.tau;
    const n = Math.max(1, Math.ceil(dtH * 60));
    for (let i = 0; i < n; i++) {
      const h = dtH / n;
      st.C += (s.S * 60 / s.V - lambda() * st.C) * h;
      st.H += (k * st.C - st.H / CONFIG.tau) * h;
    }
    st.t += dtH;
  }
  function restart() { st.t = 0; st.C = 0; st.H = 0.5; if (!st.playing) stepModel(hours.get()); draw(); }
  let stopLoop = null;
  playBtn.addEventListener('click', () => {
    if (st.playing) { st.playing = false; stopLoop?.(); playBtn.textContent = '▶ เล่นเร่งเวลา (1 ชม. = 4 วินาที)'; return; }
    st.playing = true; st.t = 0; st.C = 0; st.H = 0.5; playBtn.textContent = '❚❚ หยุด';
    stopLoop = loop(f.root, (dt) => {
      if (st.t >= hours.get()) { st.playing = false; stopLoop(); playBtn.textContent = '▶ เล่นเร่งเวลา (1 ชม. = 4 วินาที)'; draw(); return; }
      stepModel(dt / 4); draw();
    });
  });
  f.resetBtn.addEventListener('click', () => { st.playing = false; stopLoop?.(); src.set('heater'); vent.set(0); hours.set(8); });
  wirePin(f, o, () => `${CONFIG.sources[st.src].label}, เปิดหน้าต่าง ${vent.get()}%, ${st.t.toFixed(1)} ชม. → CO ${Math.round(st.C)} ppm, COHb ${st.H.toFixed(1)}%`);

  function symptom(hv) { let s = LADDER[0][1]; for (const [th, t] of LADDER) if (hv >= th) s = t; return s; }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.clearRect(0, 0, w, h);
    // cross-section of a shophouse room
    const x0 = w * 0.06, y0 = h * 0.12, rw = w * 0.56, rh = h * 0.7;
    g.fillStyle = '#140909'; g.fillRect(x0, y0, rw, rh);
    const fog = Math.min(0.75, st.C / 400);
    const grd = g.createLinearGradient(0, y0, 0, y0 + rh);
    grd.addColorStop(0, `rgba(150,170,150,${fog})`); grd.addColorStop(1, `rgba(150,170,150,${fog * 0.4})`);
    g.fillStyle = grd; g.fillRect(x0, y0, rw, rh);
    g.strokeStyle = 'rgba(255,59,47,.5)'; g.lineWidth = 2; g.strokeRect(x0, y0, rw, rh);
    // window (opens with ventilation)
    const op = vent.get() / 100;
    g.fillStyle = '#0b1622'; g.fillRect(x0 + rw - 6, y0 + rh * 0.2, 6, rh * 0.3);
    g.strokeStyle = '#9db3cf'; g.beginPath(); g.moveTo(x0 + rw, y0 + rh * 0.2); g.lineTo(x0 + rw + 30 * op, y0 + rh * 0.24); g.stroke();
    // source icon
    g.fillStyle = '#f3e9e2'; g.font = '13px "IBM Plex Sans Thai", sans-serif';
    const lbl = { heater: '🔥 เครื่องทำน้ำอุ่น', stove: '🔥 เตาถ่าน', car: '🚗 รถ' }[st.src];
    g.fillText(lbl, x0 + 10, y0 + rh - 12);
    // person (fades as COHb rises)
    const px = x0 + rw * 0.62, py = y0 + rh * 0.55;
    g.fillStyle = `rgba(243,233,226,${Math.max(0.25, 1 - st.H / 60)})`;
    g.beginPath(); g.arc(px, py - 26, 9, 0, Math.PI * 2); g.fill(); g.fillRect(px - 7, py - 16, 14, 34);
    // shadow in the mirror at high COHb
    if (st.H >= 20) {
      g.fillStyle = `rgba(20,10,10,${Math.min(0.85, (st.H - 20) / 25)})`;
      g.beginPath(); g.ellipse(x0 + rw * 0.25, y0 + rh * 0.38, 12, 34, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(157,179,207,.6)'; g.strokeRect(x0 + rw * 0.17, y0 + rh * 0.18, rw * 0.16, rh * 0.42);
    }
    // gauges
    const gx = w * 0.68, gw = w * 0.28;
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Mono", monospace';
    g.fillText(`เวลา ${st.t.toFixed(1)} ชม.`, gx, y0 + 4);
    g.fillText(`CO ในห้อง`, gx, y0 + 34);
    g.fillStyle = '#ffd866'; g.font = '600 26px "IBM Plex Mono", monospace'; g.fillText(`${Math.round(st.C)} ppm`, gx, y0 + 64);
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Mono", monospace'; g.fillText('CO ในเลือด (COHb)', gx, y0 + 98);
    const by = y0 + 108, bh = 14;
    g.fillStyle = 'rgba(243,233,226,.12)'; g.fillRect(gx, by, gw, bh);
    g.fillStyle = st.H >= 30 ? '#ff3b2f' : st.H >= 10 ? '#ff9a7a' : '#9dffc7';
    g.fillRect(gx, by, gw * Math.min(1, st.H / 60), bh);
    for (const [th] of LADDER) { const x = gx + gw * th / 60; g.fillStyle = '#f3e9e2'; g.fillRect(x, by + bh, 1, 6); g.fillText(String(th), x - 4, by + bh + 18); }
    g.fillStyle = '#f3e9e2'; g.font = '600 18px "IBM Plex Mono", monospace'; g.fillText(`${st.H.toFixed(1)}%`, gx, by + 48);
    f.result.replaceChildren('หลัง ', el('b', {}, `${st.t.toFixed(1)} ชม.`), ' CO ในห้อง ', el('b', {}, `${Math.round(st.C)} ppm`), ' · COHb ', el('b', {}, `${st.H.toFixed(1)}%`), el('br'), 'อาการโดยประมาณ: ', symptom(st.H));
    say(`CO ${Math.round(st.C)} ppm COHb ${st.H.toFixed(1)} เปอร์เซ็นต์ อาการ ${symptom(st.H)}`);
  }
  restart();
  return { unmount: () => { stopLoop?.(); c.stop(); } };
}
