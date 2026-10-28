// Crying building: wind over an opening makes the room (Helmholtz) or a dead-end corridor (quarter-wave pipe) resonate.
import { frame, slider, segmented, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';
import { audioCtx } from '../core/sfx.js';

const C = 343;
const lg = (v, a, b) => a * Math.pow(b / a, v / 100); // slider 0–100 → log scale a…b
const nice = (x) => x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2);

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const kind = segmented(f.controls, 'ช่องที่ลมพัดผ่าน', [['room', 'ห้องหรือโพรงที่มีช่องเปิด'], ['hall', 'ทางเดินหรือท่อปลายตัน']], 'room', () => sync());
  const V = slider(f.controls, { label: 'ขนาดห้องหรือโพรง', min: 0, max: 100, step: 0.5, value: 87, fmt: (v) => { const m = lg(v, 0.001, 200); return m < 1 ? (m * 1000).toFixed(m < 0.01 ? 1 : 0) + ' ลิตร' : nice(m) + ' ลบ.ม.'; }, onInput: () => draw() });
  const A = slider(f.controls, { label: 'ขนาดช่องเปิด', min: 0, max: 100, step: 0.5, value: 75, fmt: (v) => { const m = lg(v, 0.0001, 1); return m < 0.01 ? nice(m * 10000) + ' ตร.ซม.' : nice(m) + ' ตร.ม.'; }, onInput: () => draw() });
  const L = slider(f.controls, { label: 'ความยาวทางเดินหรือท่อ', min: 0, max: 100, step: 0.5, value: 80, fmt: (v) => { const m = lg(v, 0.03, 60); return m < 1 ? (m * 100).toFixed(0) + ' cm' : nice(m) + ' m'; }, onInput: () => draw() });
  const wall = slider(f.more, { label: 'ความหนาผนังหรือคอขวด', min: 0.01, max: 0.5, step: 0.01, value: 0.2, unit: 'm', onInput: () => draw() });
  f.moreBox.open = !o.compact;
  const play = el('button', { class: 'btn small', type: 'button', onclick: () => listen() }, '🌬 ฟังเสียงลม');
  f.controls.append(play);
  const ctlOf = (s) => s.input.closest('.ctl');
  function sync() { const room = kind.get() === 'room'; ctlOf(V).hidden = !room; ctlOf(A).hidden = !room; ctlOf(wall).hidden = !room; ctlOf(L).hidden = room; draw(); }
  f.formula.append(math('<mi>f</mi><mo>=</mo><mfrac><mi>c</mi><mrow><mn>2</mn><mi>π</mi></mrow></mfrac><msqrt><mfrac><mi>A</mi><mrow><mi>V</mi><msub><mi>L</mi><mtext>eff</mtext></msub></mrow></mfrac></msqrt>'),
    math('<msub><mi>f</mi><mtext>ทางเดิน</mtext></msub><mo>=</mo><mfrac><mi>c</mi><mrow><mn>4</mn><mi>L</mi></mrow></mfrac>'),
    el('div', { class: 'faint' }, 'บนคือห้องที่มีช่องเปิด (เหมือนเป่าปากขวด) · ล่างคือทางเดินที่ปลายข้างหนึ่งตัน · c = 343 m/s'));
  f.explain.append(
    el('p', {}, 'เวลาเป่าลมผ่านปากขวด เราได้ยินเสียงหวีด เพราะอากาศในคอขวดเด้งเข้าออกเหมือนสปริง โดยมีอากาศในขวดเป็นตัวดัน ห้องที่มีหน้าต่างเปิดอยู่บานเดียวก็คือขวดยักษ์ ส่วนทางเดินยาวที่ปลายตันก็คือขลุ่ยยักษ์'),
    el('p', {}, 'ทั้งห้องทั้งทางเดินขนาดคนเดินได้ สั่นที่ความถี่ต่ำมาก ส่วนใหญ่ต่ำกว่า 20 Hz จนหูไม่ได้ยิน แต่ตัวยังรู้สึกได้ (ลองเครื่องมือ "ทางเดิน 19 เฮิรตซ์") ส่วนโพรงเล็กๆ รูในผนัง ท่อเหล็กนั่งร้าน หรือขวดที่ถูกทิ้งไว้ จะร้องเป็นเสียงหวีดยาวที่หูได้ยินชัด คนเลยได้ยินเป็นเสียงผู้หญิงร้องไห้ในตึกร้าง'),
    el('p', {}, 'ตึกที่ไม่มีกระจกหน้าต่างเลยทั้งตึก มีทั้งห้องหลายขนาดและทางเดินหลายความยาว พอลมเปลี่ยนความแรง ก็ไปปลุกห้องคนละห้อง เสียงจึงขึ้นลงเหมือนคนร้องเป็นจังหวะ'),
    el('p', { class: 'caveat' }, 'สูตรเป็นแบบง่ายสำหรับช่องเปิดเล็กกว่าห้องมากๆ ปุ่มฟังเสียงจะเล่นเสียงลมผ่านตัวกรองที่ความถี่นั้น ถ้าต่ำกว่า 40 Hz จะเล่นแค่เสียงลมหึ่งๆ เพราะลำโพงมือถือเล่นไม่ได้'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { kind.set('room'); V.set(87); A.set(75); L.set(80); wall.set(0.2); });
  const vol = () => lg(V.get(), 0.001, 200), area = () => Math.min(lg(A.get(), 0.0001, 1), vol() ** (2 / 3) * 0.5), len = () => lg(L.get(), 0.03, 60);
  const freq = () => {
    if (kind.get() === 'hall') return C / (4 * len());
    const a = area(), r = Math.sqrt(a / Math.PI), Le = wall.get() + 1.7 * r;
    return C / (2 * Math.PI) * Math.sqrt(a / (vol() * Le));
  };
  const band = (fq) => fq < 20 ? ['อินฟราซาวด์ หูไม่ได้ยิน แต่ตัวรู้สึกได้', '#d8c2ff'] : fq < 250 ? ['เสียงครางต่ำ หึ่งๆ', '#ffb199'] : fq < 2000 ? ['เสียงหวีดเหมือนคนร้องไห้', '#ff6a3d'] : ['เสียงหวีดแหลม', '#ffd866'];
  wirePin(f, o, () => kind.get() === 'hall' ? `ท่อปลายตันยาว ${nice(len())} m → สั่นที่ ${freq().toFixed(1)} Hz (${band(freq())[0]})` : `โพรง ${nice(vol())} ลบ.ม. ช่องเปิด ${nice(area())} ตร.ม. → สั่นที่ ${freq().toFixed(1)} Hz (${band(freq())[0]})`);

  function listen() {
    const ctx = audioCtx(); if (!ctx) return;
    const fq = freq(), dur = 3.5, t0 = ctx.currentTime + 0.05;
    const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.max(40, fq); bp.Q.value = fq >= 40 ? 25 : 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0);
    for (let k = 0; k < 7; k++) g.gain.linearRampToValueAtTime((fq >= 40 ? 3.2 : 0.5) * (0.4 + 0.6 * Math.abs(Math.sin(k * 1.3))), t0 + (k + 1) * dur / 8);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    s.connect(bp).connect(g).connect(ctx.destination); s.start(t0); s.stop(t0 + dur);
  }
  let ph = 0;
  const stopLoop = loop(f.canvas, (dt) => { ph += dt * Math.min(6, Math.max(0.6, freq() / 10)); if (!still()) draw(true); });
  function draw(anim) {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const fq = freq(), [label, col] = band(fq);
    g.fillStyle = '#0c0708'; g.fillRect(0, 0, w, h);
    const by = h * 0.62;
    if (kind.get() === 'room') {
      const s = V.get() / 100, rw = w * (0.18 + 0.32 * s), rh = h * (0.2 + 0.3 * s), rx = w * 0.08, ry = by - rh - 16;
      const gap = Math.max(4, Math.sqrt(area() / Math.max(area(), vol() ** (2 / 3))) * rh * 0.9);
      g.strokeStyle = '#bfaba4'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(rx + rw, ry + rh / 2 - gap / 2); g.lineTo(rx + rw, ry); g.lineTo(rx, ry); g.lineTo(rx, ry + rh); g.lineTo(rx + rw, ry + rh); g.lineTo(rx + rw, ry + rh / 2 + gap / 2); g.stroke();
      const off = Math.sin(ph * 6) * 6;
      g.fillStyle = 'rgba(157,255,199,.5)'; g.fillRect(rx + rw - 4 + off, ry + rh / 2 - gap / 2, 10, gap);
      g.fillStyle = 'rgba(157,255,199,.06)'; g.fillRect(rx + 3, ry + 3, rw - 6, rh - 6);
      for (let i = 0; i < 4; i++) { const y = ry + rh / 2 + (i - 1.5) * 14, x = rx + rw + 20 + ((ph * 40 + i * 30) % 80); g.strokeStyle = 'rgba(255,177,153,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 40, y); g.lineTo(x, y); g.lineTo(x + 7, y - 5); g.stroke(); }
    } else {
      const pl = w * (0.15 + 0.6 * L.get() / 100), x = w * 0.06, y = by - 70;
      g.strokeStyle = '#bfaba4'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x + pl, y); g.lineTo(x, y); g.lineTo(x, y + 44); g.lineTo(x + pl, y + 44); g.stroke();
      g.strokeStyle = 'rgba(157,255,199,.7)'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 60; i++) { const u = i / 60; const a = Math.sin(u * Math.PI / 2) * Math.sin(ph * 6) * 18; g.lineTo(x + (1 - u) * pl, y + 22 + a); }
      g.stroke();
    }
    // frequency ruler 1 Hz – 4 kHz, log scale
    const lx = w * 0.06, lw = w * 0.88, X = (v) => lx + Math.log10(v) / Math.log10(4000) * lw;
    g.fillStyle = 'rgba(216,194,255,.15)'; g.fillRect(lx, by + 26, X(20) - lx, 16);
    g.fillStyle = 'rgba(255,177,153,.12)'; g.fillRect(X(20), by + 26, X(4000) - X(20), 16);
    g.fillStyle = '#8a7671'; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    for (const v of [1, 10, 20, 100, 1000, 4000]) g.fillText(v >= 1000 ? `${v / 1000}k` : v, X(v), by + 58);
    g.fillText('หูคนได้ยินตั้งแต่ 20 Hz', (X(20) + X(4000)) / 2, by + 74);
    const fx = X(Math.min(4000, Math.max(1, fq)));
    g.fillStyle = col; g.beginPath(); g.moveTo(fx, by + 24); g.lineTo(fx - 7, by + 12); g.lineTo(fx + 7, by + 12); g.fill();
    g.font = '600 14px "Chakra Petch", sans-serif'; g.fillText(`${fq.toFixed(1)} Hz`, Math.min(w - 40, Math.max(40, fx)), by + 6);
    if (anim) return;
    f.overlay.replaceChildren(el('span', { class: 'badge' }, `${fq.toFixed(1)} Hz`), el('span', { class: 'badge' }, label));
    f.result.replaceChildren('อากาศสั่นที่ ', el('b', {}, `${fq.toFixed(1)} Hz`), ' = ', label, el('br'),
      el('span', { class: 'faint' }, kind.get() === 'room' ? 'โพรงใหญ่ + ช่องเล็ก = เสียงต่ำ · โพรงเล็ก + ช่องใหญ่ = เสียงสูง' : 'ท่อหรือทางเดินยิ่งยาว เสียงยิ่งต่ำ'));
    say(`ความถี่ ${fq.toFixed(1)} เฮิรตซ์`);
  }
  sync();
  return { unmount: () => { stopLoop(); c.stop(); } };
}
