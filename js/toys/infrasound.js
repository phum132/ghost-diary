// Corridor resonance: f_n = n·v / 2L. Visuals move slowly on purpose — never at the real 19 Hz.
import { frame, slider, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';
import { audioCtx } from '../core/sfx.js';

// v: speed of sound in air at ~20 °C. Q: how sharp the resonance peak is (illustrative).
const CONFIG = { v: 343, Q: 8, step: 0.75 };

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const st = { L: 9, f: 19 };
  const say = narrator(f);
  const Ls = slider(f.controls, { label: 'ความยาวทางเดิน L', min: 2, max: 30, step: 0.25, value: st.L, unit: 'm', fmt: (v) => v.toFixed(2), onInput: (v) => { st.L = v; update(); } });
  const Fs = slider(f.controls, { label: 'ความถี่พัดลม f', min: 1, max: 40, step: 0.1, value: st.f, unit: 'Hz', fmt: (v) => v.toFixed(1), onInput: (v) => { st.f = v; update(); } });

  // beat demo: speakers can't play 19 Hz, so let people hear a "throb" at Δ Hz instead
  const dS = slider(f.more, { label: 'ความต่างของสองเสียง Δ (ได้ยินเป็นจังหวะ "หึ่ง-หึ่ง")', min: 0, max: 25, step: 0.5, value: 4, unit: 'Hz' });
  const beatBtn = el('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false' }, '🔊 ฟังเสียง beat (10 วินาที)');
  f.more.append(beatBtn, el('p', { class: 'faint', style: { margin: 0, fontSize: '.85rem' } }, 'ลำโพงทั่วไปเล่น 19 Hz จริงไม่ได้ เลยใช้เสียง 220 Hz สองเสียงที่ต่างกันนิดเดียว หูจะได้ยินเป็นจังหวะดังเบาเท่ากับ Δ ครั้งต่อวินาที'));
  let beat = null;
  beatBtn.addEventListener('click', () => {
    if (beat) { beat(); return; }
    const ctx = audioCtx(); if (!ctx) return;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);
    g.connect(ctx.destination);
    const a = ctx.createOscillator(), b = ctx.createOscillator();
    a.frequency.value = 220; b.frequency.value = 220 + dS.get();
    a.connect(g); b.connect(g); a.start(); b.start();
    const upd = () => { b.frequency.value = 220 + dS.get(); };
    dS.input.addEventListener('input', upd);
    const t = setTimeout(() => beat?.(), 10000);
    beatBtn.setAttribute('aria-pressed', 'true'); beatBtn.textContent = '■ หยุดเสียง';
    beat = () => {
      clearTimeout(t); dS.input.removeEventListener('input', upd);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => { a.stop(); b.stop(); }, 350);
      beat = null; beatBtn.setAttribute('aria-pressed', 'false'); beatBtn.textContent = '🔊 ฟังเสียง beat (10 วินาที)';
    };
  });

  f.formula.append(math('<mi>f</mi><mo>=</mo><mfrac><mrow><mi>n</mi><mo>·</mo><mi>v</mi></mrow><mrow><mn>2</mn><mi>L</mi></mrow></mfrac><mspace width="1em"/><mi>λ</mi><mo>=</mo><mfrac><mi>v</mi><mi>f</mi></mfrac>'),
    el('div', { class: 'faint' }, 'v ≈ 343 m/s (เสียงในอากาศ 20 °C) · n = 1, 2, 3 …'));
  f.explain.append(
    el('p', {}, 'ทางเดินที่ปิดหัวท้ายทำตัวเหมือนท่อดนตรี ถ้าพัดลมสั่นอากาศด้วยความถี่ที่ "พอดี" กับความยาวทางเดิน คลื่นที่สะท้อนไปมาจะเสริมกันจนแรงขึ้นมาก เรียกว่าการสั่นพ้อง (resonance)'),
    el('p', {}, 'ในปี 1998 วิศวกรชื่อ Vic Tandy ทำงานในห้องแล็บที่คนลือว่ามีผี เขารู้สึกกลัวและเห็นเงาเทาๆ ที่หางตา จนพบว่าพัดลมตัวใหม่ทำให้ห้องสั่นที่ราว 19 Hz พอปิดพัดลม "ผี" ก็หายไป'),
    el('p', { class: 'caveat' }, '⚠ ยังถกเถียงกันอยู่: ผลของ infrasound ต่อความรู้สึกกลัวมีงานวิจัยที่ทั้งเจอและไม่เจอผล ส่วนเรื่อง "ลูกตาสั่นพ้องที่ราว 18–19 Hz" ยังไม่มีหลักฐานแน่น'));

  let lastT = 0;
  const c = fitCanvas(f.canvas, () => draw(lastT));
  const nearest = () => {
    const f1 = CONFIG.v / (2 * st.L);
    const n = Math.max(1, Math.round(st.f / f1));
    const fn = n * f1;
    const r = st.f / fn;
    const A = 1 / Math.sqrt((1 - r * r) ** 2 + (r / CONFIG.Q) ** 2);
    return { f1, n, fn, A: Math.min(A, CONFIG.Q) };
  };
  function update() {
    const { n, fn, A } = nearest();
    const lam = CONFIG.v / st.f;
    const pct = Math.round(A / CONFIG.Q * 100);
    f.result.replaceChildren(
      'ความยาวคลื่น λ = ', el('b', {}, `${lam.toFixed(2)} m`), ' · โหมดที่ใกล้ที่สุด n = ', el('b', {}, n), ' ที่ ', el('b', {}, `${fn.toFixed(1)} Hz`), el('br'),
      'ความแรงของการสั่นพ้อง ', el('b', {}, `${pct}%`), pct > 70 ? ' — ทางเดินนี้ "ฮัม" แรงมาก' : pct > 30 ? ' — เริ่มสั่นพ้อง' : ' — แทบไม่สั่นพ้อง');
    say(`ทางเดิน ${st.L.toFixed(1)} เมตร พัดลม ${st.f.toFixed(1)} เฮิรตซ์ ความแรงการสั่นพ้อง ${pct} เปอร์เซ็นต์`);
    if (still()) draw(0);
  }
  f.resetBtn.addEventListener('click', () => { Ls.set(9); Fs.set(19); });
  wirePin(f, o, () => { const { A } = nearest(); return `L=${st.L.toFixed(2)} m, f=${st.f.toFixed(1)} Hz, λ=${(CONFIG.v / st.f).toFixed(2)} m → สั่นพ้อง ${Math.round(A / CONFIG.Q * 100)}%`; });

  function draw(t) {
    lastT = t;
    const { g, size } = c; const { w, h } = size();
    if (!w) return;
    const { n, A } = nearest();
    const k = A / CONFIG.Q;
    g.clearRect(0, 0, w, h);
    // corridor top view
    const x0 = w * 0.08, x1 = w * 0.92, yc = h * 0.42, hw = h * 0.18;
    g.fillStyle = '#120708'; g.fillRect(x0, yc - hw, x1 - x0, hw * 2);
    g.strokeStyle = 'rgba(255,59,47,.5)'; g.lineWidth = 2; g.strokeRect(x0, yc - hw, x1 - x0, hw * 2);
    // standing pressure wave (animated at a slow, safe 0.5 Hz)
    const phase = Math.cos(t * Math.PI);
    g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = x0 + (x1 - x0) * i / 200;
      const y = yc - Math.cos(n * Math.PI * i / 200) * phase * hw * 0.9 * (0.12 + 0.88 * k);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = '#ff3b2f'; g.lineWidth = 3; g.shadowColor = '#ff3b2f'; g.shadowBlur = 12 * k; g.stroke(); g.shadowBlur = 0;
    // fan at the far end
    g.save(); g.translate(x1 - 12, yc); g.rotate(still() ? 0 : t * 3);
    g.fillStyle = '#f3e9e2'; for (let b = 0; b < 4; b++) { g.rotate(Math.PI / 2); g.beginPath(); g.ellipse(0, -9, 4, 9, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // labels
    g.fillStyle = '#bfaba4'; g.font = '12px "IBM Plex Mono", monospace';
    g.fillText('บันได', x0 - 2, yc + hw + 18); g.fillText('พัดลม', x1 - 34, yc + hw + 18);
    g.fillText(`L = ${st.L.toFixed(2)} m (≈ ${Math.round(st.L / CONFIG.step)} ก้าว)`, (x0 + x1) / 2 - 70, yc - hw - 10);
    // resonance meter
    const my = h * 0.8;
    g.fillStyle = 'rgba(243,233,226,.15)'; g.fillRect(x0, my, x1 - x0, 10);
    g.fillStyle = k > 0.7 ? '#ff3b2f' : '#ff9a7a'; g.fillRect(x0, my, (x1 - x0) * k, 10);
    g.fillStyle = '#f3e9e2'; g.fillText('ความแรงการสั่นพ้อง', x0, my - 6);
    // peripheral "presence": a soft blur at the edge when resonance is strong
    if (k > 0.5) {
      const a = (k - 0.5) * 0.9 * (still() ? 1 : 0.7 + 0.3 * Math.sin(t * 0.8));
      const grd = g.createRadialGradient(w * 0.04, yc, 2, w * 0.04, yc, h * 0.4);
      grd.addColorStop(0, `rgba(200,190,185,${a * 0.45})`); grd.addColorStop(1, 'rgba(200,190,185,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w * 0.3, h);
    }
  }
  update();
  const stop = still() ? (draw(0), () => {}) : loop(f.root, (dt, t) => draw(t));
  return { unmount: () => { stop(); beat?.(); c.stop(); } };
}
