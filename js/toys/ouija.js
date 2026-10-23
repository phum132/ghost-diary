// Ideomotor effect: many tiny, unconscious pushes toward an *expected* answer add up.
// Glass moves only when |ΣF| beats static friction μs·m·g — so it seems to "jump by itself".
import { frame, slider, fitCanvas, loop, still, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const CONFIG = { mu: 0.35, kNoise: 0.9, expected: ['ฝ', 'น', '3', '1', '2'] };
const LETTERS = 'กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'.split('');
const DIGITS = '0123456789'.split('');

export function mount(host, o) {
  const f = frame(host, o);
  f.canvas.style.aspectRatio = '1 / 1';
  const say = narrator(f);
  const st = { x: 0, y: 0, vx: 0, vy: 0, dwell: 0, target: 0, spelled: [], blind: false, rot: 0, user: null, last: '' };
  const players = slider(f.controls, { label: 'จำนวนผู้เล่น', min: 1, max: 5, value: 3, unit: 'คน' });
  const belief = slider(f.controls, { label: 'ความเชื่อร่วม (ทุกคนรู้ชื่อ "ฝน" อยู่แล้ว)', min: 0, max: 100, value: 70, unit: '%' });
  const blind = el('input', { type: 'checkbox', id: 'oj-blind' });
  f.controls.append(el('label', { for: 'oj-blind', style: { display: 'flex', gap: '8px', alignItems: 'center', minHeight: '44px' } }, blind, 'ปิดตาผู้เล่น + แอบหมุนกระดาน'));
  blind.addEventListener('change', () => { st.blind = blind.checked; st.rot = blind.checked ? Math.PI * (0.35 + Math.random() * 0.5) : 0; restart(); });
  f.controls.append(el('p', { class: 'faint', style: { margin: 0, fontSize: '.9rem' } }, 'กดค้างที่แก้วแล้วขยับเบาๆ เพื่อร่วมเล่นเป็นอีกหนึ่งนิ้ว'));
  f.formula.append(math('<mrow><mo>|</mo><munder><mo>∑</mo><mi>i</mi></munder><msub><mi>F</mi><mi>i</mi></msub><mo>|</mo><mo>&gt;</mo><msub><mi>μ</mi><mi>s</mi></msub><mi>m</mi><mi>g</mi></mrow>'),
    el('div', { class: 'faint' }, 'Fᵢ = k·(ตัวอักษรที่คนที่ i คาดไว้ − ตำแหน่งแก้ว) + แรงสั่นที่ไม่รู้ตัว'));
  f.explain.append(
    el('p', {}, 'กล้ามเนื้อขยับตามความคิดได้เองโดยเราไม่รู้ตัว เรียกว่า ideomotor effect (ตั้งชื่อโดย William Carpenter ปี 1852) ปีต่อมา Michael Faraday พิสูจน์ว่าโต๊ะที่ "หมุนเอง" ในพิธีเรียกวิญญาณ เกิดจากมือของคนที่นั่งรอบโต๊ะดันเองโดยไม่รู้ตัว'),
    el('p', {}, 'ทุกคนแรงนิดเดียวจนรู้สึกว่าไม่ได้ดัน แต่เมื่อแรงชี้ไปทางเดียวกัน (เพราะทุกคนรู้คำตอบที่ "ควร" ออกมา) ผลรวมจะชนะแรงเสียดทาน แก้วจึงพุ่งไปเหมือนมีอะไรลาก'),
    el('p', { class: 'caveat' }, 'ลองเปิด "ปิดตา + หมุนกระดาน": ผู้เล่นยังดันไปยังตำแหน่งที่จำไว้ แก้วจึงสะกดคำมั่วๆ ออกมาแทน'));
  const c = fitCanvas(f.canvas, () => draw(0));
  const layout = () => {
    const pts = [];
    LETTERS.forEach((l, i) => pts.push({ l, a: i / LETTERS.length * Math.PI * 2 - Math.PI / 2, r: 0.86 }));
    DIGITS.forEach((l, i) => pts.push({ l, a: i / DIGITS.length * Math.PI * 2 - Math.PI / 2, r: 0.58 }));
    pts.push({ l: 'ใช่', a: Math.PI * 1.25, r: 0.3 }, { l: 'ไม่', a: Math.PI * 1.75, r: 0.3 });
    return pts;
  };
  const PTS = layout();
  const pos = (p, rot) => [Math.cos(p.a + rot) * p.r, Math.sin(p.a + rot) * p.r];
  function restart() { st.x = st.y = st.vx = st.vy = 0; st.spelled = []; st.target = 0; st.dwell = 0; st.last = ''; draw(0); }
  f.canvas.addEventListener('pointerdown', (e) => { st.user = { x: e.clientX, y: e.clientY }; f.canvas.setPointerCapture(e.pointerId); });
  f.canvas.addEventListener('pointermove', (e) => { if (st.user) { st.user.dx = (e.clientX - st.user.x) * 0.002; st.user.dy = (e.clientY - st.user.y) * 0.002; } });
  f.canvas.addEventListener('pointerup', () => { st.user = null; });
  f.resetBtn.addEventListener('click', () => { blind.checked = false; st.blind = false; st.rot = 0; players.set(3); belief.set(70); restart(); });
  wirePin(f, o, () => `${players.get()} คน, ความเชื่อร่วม ${belief.get()}%${st.blind ? ', ปิดตา+หมุนกระดาน' : ''} → แก้วสะกด "${st.spelled.join('')}"`);

  function step(dt) {
    const want = CONFIG.expected[st.target % CONFIG.expected.length];
    const p = PTS.find((q) => q.l === want);
    const [tx, ty] = pos(p, 0); // players aim where they *remember* the letter (board may have been rotated)
    const b = belief.get() / 100;
    let fx = 0, fy = 0;
    for (let i = 0; i < players.get(); i++) {
      fx += (tx - st.x) * 0.9 * b + (Math.random() - 0.5) * CONFIG.kNoise * (1.2 - b);
      fy += (ty - st.y) * 0.9 * b + (Math.random() - 0.5) * CONFIG.kNoise * (1.2 - b);
    }
    if (st.user) { fx += (st.user.dx || 0) * 30; fy += (st.user.dy || 0) * 30; }
    const F = Math.hypot(fx, fy), fric = CONFIG.mu * 2.2;
    if (F > fric || Math.hypot(st.vx, st.vy) > 0.02) {
      st.vx += (fx - (F ? fx / F * fric * 0.6 : 0)) * dt * 0.6; st.vy += (fy - (F ? fy / F * fric * 0.6 : 0)) * dt * 0.6;
    }
    st.vx *= 0.9; st.vy *= 0.9;
    st.x += st.vx * dt * 3; st.y += st.vy * dt * 3;
    const r = Math.hypot(st.x, st.y); if (r > 0.92) { st.x *= 0.92 / r; st.y *= 0.92 / r; }
    // which printed letter is the glass on? (printed positions include the secret rotation)
    let best = null, bd = 0.07;
    for (const q of PTS) { const [qx, qy] = pos(q, st.rot); const d = Math.hypot(qx - st.x, qy - st.y); if (d < bd) { bd = d; best = q; } }
    if (best && Math.hypot(st.vx, st.vy) < 0.05) {
      st.dwell += dt;
      if (st.dwell > 0.8 && st.last !== best.l) { st.spelled.push(best.l); st.last = best.l; st.target++; st.dwell = 0; say(`แก้วหยุดที่ ${best.l}`); if (st.spelled.length > 12) st.spelled.shift(); }
    } else st.dwell = 0;
    F_ = { fx, fy, F, fric };
  }
  let F_ = { fx: 0, fy: 0, F: 0, fric: 1 };
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.45;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(cx, cy, R * 1.05, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1a14'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const q of PTS) { const [x, y] = pos(q, st.rot); g.font = `${q.r > 0.8 ? 13 : 14}px "Itim", sans-serif`; g.fillText(q.l, cx + x * R, cy + y * R); }
    // force arrows (analysis)
    g.strokeStyle = '#ffd866'; g.lineWidth = 3;
    const gx = cx + st.x * R, gy = cy + st.y * R;
    g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + F_.fx * 18, gy + F_.fy * 18); g.stroke();
    g.strokeStyle = 'rgba(200,89,90,.6)'; g.lineWidth = 1; g.beginPath(); g.arc(gx, gy, F_.fric * 18, 0, Math.PI * 2); g.stroke();
    // glass
    g.fillStyle = 'rgba(200,230,255,.35)'; g.strokeStyle = 'rgba(40,60,90,.8)'; g.lineWidth = 2;
    g.beginPath(); g.arc(gx, gy, R * 0.075, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(243,233,226,.9)';
    for (let i = 0; i < players.get(); i++) { const a = i / players.get() * Math.PI * 2; g.beginPath(); g.arc(gx + Math.cos(a) * R * 0.05, gy + Math.sin(a) * R * 0.05, 4, 0, Math.PI * 2); g.fill(); }
    f.result.replaceChildren('แก้วสะกด: ', el('b', {}, st.spelled.join(' ') || '…'), el('br'),
      el('span', { class: 'faint' }, `แรงรวม ${F_.F.toFixed(2)} ${F_.F > F_.fric ? '> แรงเสียดทาน → แก้วเลื่อน' : '< แรงเสียดทาน → แก้วนิ่ง'}`));
  }
  restart();
  const stop = still()
    ? (() => { for (let i = 0; i < 400; i++) step(0.03); draw(); return () => {}; })()
    : loop(f.root, (dt) => { step(dt); draw(); });
  return { unmount: () => { stop(); c.stop(); } };
}
