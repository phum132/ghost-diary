// Footsteps upstairs: the echo of your own steps bouncing down an empty stairwell.
import { frame, slider, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';
import { audioCtx } from '../core/sfx.js';

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  const H = slider(f.controls, { label: 'ความสูงช่องบันไดเหนือหัว', min: 3, max: 150, value: 40, unit: 'm', onInput: () => draw() });
  const T = slider(f.controls, { label: 'อุณหภูมิอากาศ', min: 0, max: 40, value: 28, unit: '°C', onInput: () => draw() });
  const step = slider(f.controls, { label: 'จังหวะก้าวเดิน', min: 0.35, max: 1, step: 0.05, value: 0.55, unit: 'วินาที/ก้าว', onInput: () => draw() });
  const play = el('button', { class: 'btn small', type: 'button', onclick: () => listen() }, '🔊 ฟังเสียงฝีเท้า');
  f.controls.append(play);
  const absorb = slider(f.more, { label: 'ผนังดูดเสียง (คอนกรีตเปลือย = ต่ำ)', min: 0, max: 90, value: 10, unit: '%', onInput: () => draw() });
  f.moreBox.open = !o.compact;
  f.formula.append(math('<mi>t</mi><mo>=</mo><mfrac><mrow><mn>2</mn><mi>H</mi></mrow><mi>c</mi></mfrac>'), math('<mi>c</mi><mo>≈</mo><mn>331.3</mn><mo>+</mo><mn>0.606</mn><mi>T</mi>'),
    el('div', { class: 'faint' }, 't = เวลาที่เสียงสะท้อนกลับมา · H = ความสูงถึงเพดานช่องบันได · c = ความเร็วเสียง (m/s) · T = อุณหภูมิ °C'));
  f.explain.append(
    el('p', {}, 'เสียงฝีเท้าของเราวิ่งขึ้นไปตามช่องบันได ชนเพดานคอนกรีตแล้วย้อนกลับลงมา ถ้าเสียงสะท้อนกลับมาเร็วกว่าราว 50 มิลลิวินาที หูจะรวมเป็นเสียงเดียวกับเสียงจริง (แค่รู้สึกว่าก้อง) แต่ถ้าช้ากว่านั้น หูจะแยกเป็น "อีกก้าวหนึ่ง" ที่ดังมาจากข้างบน'),
    el('p', {}, 'ยิ่งเสียงสะท้อนมาตกกลางระหว่างก้าวของเราพอดี ยิ่งฟังเหมือนมีคนเดินตามอยู่ชั้นบน และเมื่อเราหยุดเดิน มันก็หยุดด้วย เพราะมันคือเสียงของเราเอง'),
    el('p', {}, 'ตึกร้างที่ไม่มีเฟอร์นิเจอร์ ไม่มีผ้าม่าน มีแต่ผนังคอนกรีต สะท้อนเสียงได้ดีที่สุด เรื่องเสียงเดินชั้นบนจึงมาจากตึกร้างบ่อยมาก (อ่านเรื่องตึกร้างสาทรในคลังผีทั่วโลก)'),
    el('p', { class: 'caveat' }, 'ช่องบันไดจริงมีเสียงสะท้อนหลายทางปนกัน แบบจำลองนี้ใช้แค่ทางหลักทางเดียว'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { H.set(40); T.set(28); step.set(0.55); absorb.set(10); draw(); });
  const calc = () => { const cs = 331.3 + 0.606 * T.get(); const t = 2 * H.get() / cs; return { cs, t, phase: (t % step.get()) / step.get() }; };
  wirePin(f, o, () => { const { t } = calc(); return `ช่องบันไดสูง ${H.get()} m → เสียงสะท้อนกลับมาหลัง ${(t * 1000).toFixed(0)} ms ${t < 0.05 ? '(รวมเป็นเสียงก้อง)' : '(แยกเป็นเสียงฝีเท้าอีกคน)'}`; });

  function listen() {
    const ctx = audioCtx(); if (!ctx) return;
    const { t } = calc();
    const now = ctx.currentTime + 0.05;
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    const delay = ctx.createDelay(2); delay.delayTime.value = Math.min(1.9, t);
    const echoG = ctx.createGain(); echoG.gain.value = 0.55 * (1 - absorb.get() / 100) * Math.max(0.25, 1 - H.get() / 300);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
    const src = ctx.createGain(); src.connect(out); src.connect(delay); delay.connect(lp).connect(echoG).connect(out);
    for (let i = 0; i < 6; i++) {
      const at = now + i * step.get();
      const len = 0.06, b = ctx.createBuffer(1, Math.round(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.exp(-k / (ctx.sampleRate * 0.012));
      const s = ctx.createBufferSource(); s.buffer = b;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
      s.connect(bp).connect(src); s.start(at);
    }
    setTimeout(() => out.disconnect(), (6 * step.get() + t + 1) * 1000);
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const { cs, t, phase } = calc();
    g.fillStyle = '#0c0708'; g.fillRect(0, 0, w, h);
    // stairwell cross-section (left)
    const sx = w * 0.06, sw = w * 0.34, top = h * 0.06, bot = h * 0.66;
    g.strokeStyle = 'rgba(255,177,153,.5)'; g.lineWidth = 2; g.strokeRect(sx, top, sw, bot - top);
    const floors = Math.max(1, Math.round(H.get() / 3));
    g.strokeStyle = 'rgba(255,177,153,.18)'; g.lineWidth = 1;
    const shown = Math.min(floors, 30);
    for (let i = 1; i < shown; i++) { const y = bot - (bot - top) * i / shown; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + sw * (i % 2 ? 0.6 : 1), y); g.moveTo(sx + sw * (i % 2 ? 0.6 : 0), y); g.lineTo(sx + sw * (i % 2 ? 1 : 0.4), y + (bot - top) / shown); g.stroke(); }
    g.fillStyle = '#ffd866'; g.beginPath(); g.arc(sx + sw * 0.3, bot - 10, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,59,47,.8)'; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(sx + sw * 0.32, bot - 16); g.lineTo(sx + sw * 0.5, top + 4); g.lineTo(sx + sw * 0.7, bot - 16); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'center';
    g.fillText(`${floors} ชั้น · ${H.get()} m`, sx + sw / 2, top - 2 > 10 ? top + 14 : 14);
    // timeline (right)
    const tx = w * 0.46, tw = w * 0.5, ty1 = h * 0.24, ty2 = h * 0.44, span = 6 * step.get() + Math.min(2, t);
    const X = (s) => tx + s / span * tw;
    g.fillStyle = '#bfaba4'; g.textAlign = 'left';
    g.fillText('ฝีเท้าเรา', tx, ty1 - 14); g.fillText('เสียงที่ได้ยินจากข้างบน', tx, ty2 - 14);
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(tx, ty1); g.lineTo(tx + tw, ty1); g.moveTo(tx, ty2); g.lineTo(tx + tw, ty2); g.stroke();
    for (let i = 0; i < 6; i++) {
      g.fillStyle = '#ffd866'; g.fillRect(X(i * step.get()) - 2, ty1 - 10, 4, 20);
      const e = i * step.get() + t; if (e <= span) { g.fillStyle = `rgba(255,59,47,${0.9 * (1 - absorb.get() / 100) + 0.1})`; g.fillRect(X(e) - 2, ty2 - 8, 4, 16); }
    }
    // verdict bar
    const fused = t < 0.05;
    g.fillStyle = fused ? 'rgba(157,255,199,.15)' : 'rgba(255,59,47,.15)'; g.fillRect(tx, h * 0.56, tw, h * 0.1);
    g.fillStyle = fused ? '#9dffc7' : '#ff6a3d'; g.font = '600 14px "Chakra Petch", sans-serif';
    g.fillText(fused ? 'หูรวมเป็นเสียงก้องเดียว' : (phase > 0.25 && phase < 0.75 ? 'เหมือนมีคนเดินสลับจังหวะกับเรา!' : 'เหมือนมีคนเดินตามหลังติดๆ'), tx + 10, h * 0.62);
    f.overlay.replaceChildren(el('span', { class: 'badge' }, `เสียงเดินทาง ${cs.toFixed(0)} m/s`), el('span', { class: 'badge' }, `สะท้อนกลับ ${(t * 1000).toFixed(0)} ms`));
    f.result.replaceChildren('เสียงสะท้อนกลับมาหลัง ', el('b', {}, `${(t * 1000).toFixed(0)} ms`), fused ? ' ซึ่งเร็วจนหูรวมเป็นเสียงเดียว' : ' หูแยกเป็นเสียงฝีเท้าอีกคนบนชั้นบน', el('br'),
      el('span', { class: 'faint' }, 'เกิน 50 ms หูจะแยกเป็นเสียงที่สอง · ช่องบันไดยิ่งสูง เสียงตามยิ่งช้า'));
    say(`เสียงสะท้อน ${(t * 1000).toFixed(0)} มิลลิวินาที`);
  }
  return { unmount: () => c.stop() };
}
