// Bayes: "I saw a ghost" — how likely is a ghost really there? Icon array of 1,000 houses.
import { frame, slider, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';
import { getBoard } from '../core/board-store.js';

// false-alarm boosters: chance that a house with NO ghost still produces a "sighting" because of …
const CAUSES = [
  ['co', 'ก๊าซ CO จากเครื่องทำน้ำอุ่น', 0.15],
  ['sleep', 'นอนน้อย / ผีอำ', 0.08],
  ['infrasound', 'พัดลมทำให้ทางเดินสั่นพ้อง', 0.05],
  ['pareidolia', 'คราบบนผนังที่ดูเหมือนหน้า', 0.04],
];

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  const fmtP = (v) => { const p = 10 ** v * 100; return p < 0.01 ? p.toExponential(1) + '%' : p < 1 ? p.toFixed(2) + '%' : p.toFixed(1) + '%'; };
  const prior = slider(f.controls, { label: 'ความเชื่อตั้งต้น: บ้านหนึ่งหลังมีผีจริง', min: -6, max: -1, step: 0.1, value: -3, fmt: fmtP, onInput: draw });
  const hit = slider(f.controls, { label: 'ถ้ามีผีจริง โอกาสที่คนในบ้านจะเห็น', min: 0, max: 100, value: 80, unit: '%', onInput: draw });
  const base = slider(f.controls, { label: 'ถ้าไม่มีผี โอกาสที่จะ "เห็น" อยู่ดี', min: 0, max: 50, step: 0.5, value: 2, unit: '%', onInput: draw });
  const pinned = new Set(getBoard().cards.map((c) => c.tag));
  const checks = CAUSES.map(([id, label]) => {
    const cb = el('input', { type: 'checkbox', id: `bc-${id}`, checked: pinned.has(id) });
    cb.addEventListener('change', draw);
    f.more.append(el('label', { for: `bc-${id}`, style: { display: 'flex', gap: '8px', alignItems: 'center', minHeight: '40px' } }, cb, label, pinned.has(id) ? el('span', { class: 'chip' }, 'จากกระดานของคุณ') : ''));
    return cb;
  });
  f.moreBox.querySelector('summary').textContent = 'สิ่งที่ทำให้ "เห็น" ได้ทั้งที่ไม่มีผี';
  f.moreBox.open = true;

  f.formula.append(math('<mi>P</mi><mo>(</mo><mtext>ผี</mtext><mo>|</mo><mtext>เห็น</mtext><mo>)</mo><mo>=</mo><mfrac><mrow><mi>P</mi><mo>(</mo><mtext>เห็น</mtext><mo>|</mo><mtext>ผี</mtext><mo>)</mo><mo>·</mo><mi>P</mi><mo>(</mo><mtext>ผี</mtext><mo>)</mo></mrow><mrow><mi>P</mi><mo>(</mo><mtext>เห็น</mtext><mo>)</mo></mrow></mfrac>'));
  f.explain.append(
    el('p', {}, 'สมมติบ้าน 1,000 หลัง ถ้าผีหายากมาก บ้านที่มีผีจริงอาจมีแค่หลังเดียว แต่บ้านที่ไม่มีผีมีถึง 999 หลัง ถ้าแค่ 2% ของบ้านพวกนั้นมีอะไรหลอกตาให้ "เห็น" ก็เท่ากับ ~20 หลัง ซึ่งมากกว่าบ้านที่มีผีจริงเกือบ 20 เท่า'),
    el('p', {}, 'นี่คือเหตุผลที่ "เห็นผี" ไม่เท่ากับ "มีผี" ต้องดูทั้งความเชื่อตั้งต้นและสิ่งที่ทำให้หลอกตาได้'),
    el('p', { class: 'caveat' }, 'ตัวเลขทุกตัวเป็นสมมติฐานที่คุณตั้งเอง เครื่องมือนี้ไม่ได้บอกว่าผีมีหรือไม่มี มันแค่ช่วยให้คิดเป็นระบบ'));

  const c = fitCanvas(f.canvas, () => draw());
  const calc = () => {
    const p = 10 ** prior.get(), h = hit.get() / 100;
    let notFa = 1 - base.get() / 100;
    checks.forEach((cb, i) => { if (cb.checked) notFa *= 1 - CAUSES[i][2]; });
    const fa = 1 - notFa;
    const post = p * h / (p * h + (1 - p) * fa || 1);
    return { p, h, fa, post };
  };
  f.resetBtn.addEventListener('click', () => { prior.set(-3); hit.set(80); base.set(2); checks.forEach((cb) => (cb.checked = false)); draw(); });
  wirePin(f, o, () => { const { post, fa } = calc(); return `P(ผี|เห็น) = ${(post * 100).toFixed(2)}% (หลอกตา ${(fa * 100).toFixed(1)}%)`; });

  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const { p, h: hh, fa, post } = calc();
    g.clearRect(0, 0, w, h);
    const N = 1000;
    const cols = w > h ? 40 : 25, rows = N / cols;
    const cell = Math.min((w - 20) / cols, (h - 40) / rows);
    const ox = (w - cell * cols) / 2, oy = 10;
    const ghosts = p * N, seeTrue = ghosts * hh, seeFalse = (N - ghosts) * fa;
    const nG = Math.round(ghosts), nT = Math.round(seeTrue), nF = Math.round(seeFalse);
    for (let i = 0; i < N; i++) {
      const x = ox + (i % cols) * cell, y = oy + Math.floor(i / cols) * cell, s = cell - 2;
      if (i < nT) { g.fillStyle = '#ffd866'; g.fillRect(x, y, s, s); }
      else if (i < nG) { g.strokeStyle = '#ffd866'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); }
      else if (i < nG + nF) { g.strokeStyle = '#9dffc7'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, s - 2, s - 2); }
      else { g.fillStyle = 'rgba(243,233,226,.12)'; g.fillRect(x, y, s, s); }
    }
    const ly = oy + rows * cell + 18;
    g.font = '12px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'left';
    const legend = [['#ffd866', 'fill', 'มีผี และเห็น'], ['#9dffc7', 'stroke', 'ไม่มีผี แต่เห็น'], ['rgba(243,233,226,.3)', 'fill', 'ไม่เห็น']];
    let lx = ox;
    for (const [col, kind, t] of legend) {
      if (kind === 'fill') { g.fillStyle = col; g.fillRect(lx, ly - 9, 10, 10); } else { g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(lx + 1, ly - 8, 8, 8); }
      g.fillStyle = '#bfaba4'; g.fillText(t, lx + 14, ly); lx += g.measureText(t).width + 34;
    }
    const nf = (v) => (v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString('th-TH'));
    f.result.replaceChildren('จากบ้าน 1,000 หลัง: เห็นเพราะผีจริง ~', el('b', {}, nf(seeTrue)), ' หลัง · เห็นทั้งที่ไม่มีผี ~', el('b', {}, nf(seeFalse)), ' หลัง', el('br'),
      'ถ้ามีคนบอกว่า "เห็นผี" โอกาสที่มีผีจริง = ', el('b', {}, `${(post * 100).toFixed(post < 0.01 ? 3 : 1)}%`));
    say(`โอกาสที่มีผีจริงเมื่อมีคนเห็น ${(post * 100).toFixed(2)} เปอร์เซ็นต์`);
  }
  draw();
  return { unmount: () => c.stop() };
}
