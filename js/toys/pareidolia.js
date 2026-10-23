// Pareidolia: random plaster walls, you vs. a naive "two eyes + mouth" detector
import { frame, slider, fitCanvas, wirePin, narrator } from './kit.js';
import { el, rng } from '../core/ui.js';

const S = 192; // wall texture resolution

function valueNoise(rand) {
  const grid = (n) => { const a = new Float32Array((n + 1) * (n + 1)); for (let i = 0; i < a.length; i++) a[i] = rand(); return a; };
  const octs = [[6, 0.5], [12, 0.25], [24, 0.15], [48, 0.1]].map(([n, a]) => ({ n, a, g: grid(n) }));
  const img = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (const o of octs) {
      const fx = x / S * o.n, fy = y / S * o.n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (i, j) => o.g[j * (o.n + 1) + i];
      v += o.a * ((at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy);
    }
    img[y * S + x] = v;
  }
  // a few rust drips (the kind that turn into "tears")
  for (let d = 0; d < 7; d++) {
    const x0 = Math.floor(rand() * S), y0 = Math.floor(rand() * S * 0.6), len = 20 + rand() * 60;
    for (let k = 0; k < len; k++) for (let w = -1; w <= 1; w++) { const x = x0 + w + Math.round(Math.sin(k / 9) * 2), y = y0 + k; if (x >= 0 && x < S && y < S) img[y * S + x] -= 0.08 * (1 - k / len); }
  }
  return img;
}

// dark blobs -> look for two at the same height + one centred below them
function detect(img, paranoia) {
  const N = 48, f = S / N;
  const small = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) s += img[(y * f + j) * S + x * f + i]; small[y * N + x] = s / (f * f); }
  const sorted = [...small].sort((a, b) => a - b);
  const thr = sorted[Math.floor(N * N * (0.04 + paranoia * 0.12))];
  const seen = new Uint8Array(N * N), blobs = [];
  for (let i = 0; i < N * N; i++) {
    if (seen[i] || small[i] > thr) continue;
    const st = [i]; seen[i] = 1; let sx = 0, sy = 0, n = 0;
    while (st.length) {
      const k = st.pop(); const x = k % N, y = (k - x) / N; sx += x; sy += y; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * N + nx; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[nk] && small[nk] <= thr) { seen[nk] = 1; st.push(nk); } }
    }
    if (n >= 1 && n < 60) blobs.push({ x: sx / n * f + f / 2, y: sy / n * f + f / 2 });
  }
  const tol = 0.2 + paranoia * 0.35;
  const faces = [];
  for (let a = 0; a < blobs.length; a++) for (let b = 0; b < blobs.length; b++) {
    const A = blobs[a], B = blobs[b];
    const dx = B.x - A.x; if (dx < 14 || dx > 70) continue;
    if (Math.abs(B.y - A.y) > dx * tol) continue;
    for (const M of blobs) {
      if (M === A || M === B) continue;
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      const dy = M.y - my;
      if (dy > dx * (0.6 - tol * 0.5) && dy < dx * (1.4 + tol) && Math.abs(M.x - mx) < dx * tol) { faces.push([A, B, M]); break; }
    }
    if (faces.length > 30) break;
  }
  return faces;
}

export function mount(host, o) {
  const f = frame(host, o);
  f.canvas.style.aspectRatio = '1 / 1';
  const say = narrator(f);
  let seed = 7, img, taps = [], faces = [], showComp = false;
  const par = slider(f.controls, { label: 'ความระแวง (ยิ่งกลัว ยิ่งเห็นหน้า)', min: 0, max: 100, value: 30, unit: '%', onInput: () => { if (showComp) faces = detect(img, par.get() / 100); draw(); } });
  const newBtn = el('button', { class: 'btn small', type: 'button' }, '🧱 กำแพงใหม่');
  const compBtn = el('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false' }, '🤖 ให้คอมพิวเตอร์หาบ้าง');
  f.controls.append(el('p', { class: 'dim', style: { margin: 0 } }, 'แตะตรงที่คุณเห็น "หน้า" (ได้สูงสุด 10 จุด)'), el('div', { class: 'row' }, newBtn, compBtn));
  f.formula.append(el('div', {}, 'เชื่อว่ามีหน้าเมื่อ  P(มี) × ราคาของการพลาด  >  P(ไม่มี) × ราคาของการตื่นตูม'),
    el('table', { class: 'mini' }, el('tr', {}, el('th'), el('th', {}, 'มีหน้าจริง'), el('th', {}, 'ไม่มี')),
      el('tr', {}, el('th', {}, 'เห็น'), el('td', {}, 'ถูก'), el('td', {}, 'ตื่นตูม')),
      el('tr', {}, el('th', {}, 'ไม่เห็น'), el('td', {}, 'พลาด'), el('td', {}, 'ถูก'))));
  f.explain.append(
    el('p', {}, 'สมองมีบริเวณที่ไวต่อ "หน้า" มาก (fusiform face area) แค่มีจุดสองจุดกับขีดหนึ่งขีดในตำแหน่งที่ใช่ สมองก็ตอบสนองเหมือนเห็นหน้าคนภายในเสี้ยววินาที'),
    el('p', {}, 'สำหรับบรรพบุรุษเรา การคิดว่าพุ่มไม้มีคนซ่อนอยู่แล้วผิด เสียแค่ความตกใจ แต่การมองไม่เห็นคนที่ซ่อนอยู่จริงอาจเสียชีวิต สมองจึงเลือก "ตื่นตูมไว้ก่อน" ยิ่งเรากลัว เกณฑ์ก็ยิ่งต่ำลง'),
    el('p', { class: 'caveat' }, 'ตัวหาหน้าในเครื่องมือนี้ง่ายมาก ตั้งใจให้เห็นว่ากฎ "ตา-ตา-ปาก" แค่นั้นก็เจอหน้าในทุกกำแพงแล้ว'));
  const c = fitCanvas(f.canvas, () => draw());
  const tex = document.createElement('canvas'); tex.width = tex.height = S;
  function newWall() {
    img = valueNoise(rng(seed++));
    let mn = Infinity, mx = -Infinity; for (const v of img) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    const d = tex.getContext('2d').createImageData(S, S);
    for (let i = 0; i < S * S; i++) { const v = (img[i] - mn) / (mx - mn); d.data[i * 4] = 70 + v * 150; d.data[i * 4 + 1] = 62 + v * 140; d.data[i * 4 + 2] = 55 + v * 125; d.data[i * 4 + 3] = 255; }
    tex.getContext('2d').putImageData(d, 0, 0);
    taps = []; faces = showComp ? detect(img, par.get() / 100) : [];
    draw();
  }
  newBtn.addEventListener('click', newWall);
  compBtn.addEventListener('click', () => { showComp = !showComp; compBtn.setAttribute('aria-pressed', String(showComp)); faces = showComp ? detect(img, par.get() / 100) : []; draw(); });
  f.canvas.addEventListener('pointerdown', (e) => {
    const r = f.canvas.getBoundingClientRect();
    if (taps.length < 10) taps.push({ x: (e.clientX - r.left) / r.width * S, y: (e.clientY - r.top) / r.height * S });
    draw();
  });
  f.resetBtn.addEventListener('click', () => { taps = []; showComp = false; compBtn.setAttribute('aria-pressed', 'false'); faces = []; par.set(30); draw(); });
  wirePin(f, o, () => `คุณเห็น ${taps.length} หน้า${showComp ? `, คอมพิวเตอร์เจอ ${faces.length} หน้า (ความระแวง ${par.get()}%)` : ''}`);
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const k = w / S;
    g.imageSmoothingEnabled = true; g.drawImage(tex, 0, 0, w, h);
    g.strokeStyle = '#ff3b2f'; g.lineWidth = 2;
    taps.forEach((t) => { g.beginPath(); g.arc(t.x * k, t.y * k, 18, 0, Math.PI * 2); g.stroke(); });
    g.strokeStyle = '#ffd866'; g.lineWidth = 1.5;
    faces.forEach(([a, b, m]) => { g.beginPath(); g.moveTo(a.x * k, a.y * k); g.lineTo(b.x * k, b.y * k); g.lineTo(m.x * k, m.y * k); g.closePath(); g.stroke(); });
    f.result.replaceChildren('คุณเห็น ', el('b', {}, taps.length), ' หน้า', showComp ? el('span', {}, ' · คอมพิวเตอร์เจอ ', el('b', {}, faces.length), ' หน้า') : '');
    say(`กำแพงหมายเลข ${seed} คุณเห็น ${taps.length} หน้า${showComp ? ` คอมพิวเตอร์เจอ ${faces.length}` : ''}`);
  }
  newWall();
  return { unmount: () => c.stop() };
}
