// Fata Morgana: trace light rays through a warm-air layer over a cold sea and see a ship lifted, stretched or flipped.
// Ray equation in a frame that follows the Earth's curve: d²z/dx² = 1/R + dn/dz (small angles).
import { frame, slider, segmented, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const R = 6.371e6, SHIP = 30, BASE = -2e-8, SIG = 3;

function spans(z) { // horizontal pieces of a sailing ship at height z (metres, relative to ship centre)
  if (z < 0 || z > SHIP) return [];
  if (z < 6) { const hw = 30 * (0.8 + 0.2 * z / 6); return [[-hw, hw]]; }
  const out = [];
  if (z < 9) out.push([-12, 10]);
  for (const m of [-14, 12]) {
    out.push([m - 0.6, m + 0.6]);
    if (z > 11 && z < 27) { const k = 1 - Math.abs(z - 19) / 9; out.push([m - 9 * k, m + 9 * k]); }
  }
  return out;
}

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const PRESET = { normal: [25, 0, 12], flip: [25, 30, 12], float: [45, 30, 12] };
  segmented(f.controls, 'ฉากสำเร็จรูป', [['normal', 'อากาศปกติ'], ['flip', 'เรือซ้อนกลับหัว'], ['float', 'เรือลอยฟ้า']], 'flip', (k) => { const [d, i, z] = PRESET[k]; D.set(d); inv.set(i); zi.set(z); });
  const D = slider(f.controls, { label: 'เรืออยู่ห่างออกไป', min: 5, max: 60, value: 25, unit: 'km', onInput: () => draw() });
  const inv = slider(f.controls, { label: 'ชั้นอากาศอุ่นเหนือทะเลเย็น', min: 0, max: 60, value: 30, unit: '%', onInput: () => draw() });
  const zi = slider(f.controls, { label: 'ความสูงของชั้นอากาศอุ่น', min: 3, max: 40, value: 12, unit: 'm', onInput: () => draw() });
  const h0 = slider(f.more, { label: 'ตาเราสูงจากน้ำทะเล', min: 1, max: 40, value: 4, unit: 'm', onInput: () => draw() });
  f.moreBox.open = !o.compact;
  const dndz = (z) => BASE - inv.get() / 100 * 1.2e-6 * Math.exp(-(((z - zi.get()) / SIG) ** 2));
  f.formula.append(math('<mfrac><mrow><msup><mi>d</mi><mn>2</mn></msup><mi>z</mi></mrow><mrow><mi>d</mi><msup><mi>x</mi><mn>2</mn></msup></mrow></mfrac><mo>=</mo><mfrac><mn>1</mn><mi>R</mi></mfrac><mo>+</mo><mfrac><mrow><mi>d</mi><mi>n</mi></mrow><mrow><mi>d</mi><mi>z</mi></mrow></mfrac>'),
    el('div', { class: 'faint' }, 'z = ความสูงของแสง · x = ระยะทาง · R = รัศมีโลก · n = ดัชนีหักเหของอากาศ (อากาศอุ่นเหนืออากาศเย็นทำให้ n ลดลงเร็ว แสงจึงโค้งลง)'));
  f.explain.append(
    el('p', {}, 'ปกติเรือที่อยู่ไกลเกินเส้นขอบฟ้าจะจมหายไปหลังความโค้งของโลก แต่เมื่ออากาศอุ่นลอยอยู่เหนืออากาศเย็นที่ติดผิวทะเล แสงที่วิ่งผ่านจะโค้งลงตามผิวโลก แสงจากเรือที่ควรมองไม่เห็นจึงโค้งข้ามขอบฟ้ามาเข้าตาเรา'),
    el('p', {}, 'แสงหลายเส้นจากจุดเดียวกันบนเรืออาจเข้าตาเราจากหลายมุม เราจึงเห็นเรือซ้อนกันหลายชั้น บางชั้นกลับหัว บางชั้นยืดสูงเหมือนเสากระโดงยักษ์ และมีช่องท้องฟ้าคั่นใต้ท้องเรือ เรือเลยดูเหมือนลอยอยู่กลางอากาศ'),
    el('p', {}, 'ภาพด้านล่างคือเส้นทางแสงจริงที่คำนวณได้ (ขยายแนวตั้งให้เห็นชัด) เส้นสีส้มคือแสงที่ไปถึงเรือ ส่วนภาพด้านบนคือสิ่งที่ตาเราเห็นผ่านกล้องส่องทางไกล ลองเลื่อนความแรงของชั้นอากาศอุ่นจาก 0 ขึ้นไปช้าๆ'),
    el('p', { class: 'caveat' }, 'ใช้สูตรแสงมุมเล็กและชั้นอากาศอุ่นแบบเรียบง่ายชั้นเดียว ของจริงมีหลายชั้นและเปลี่ยนตลอดเวลา ภาพจึงไหวไปมา'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { D.set(25); inv.set(30); zi.set(12); h0.set(4); });
  let verdict = '';
  wirePin(f, o, () => `เรือห่าง ${D.get()} km, ชั้นอากาศอุ่น ${inv.get()}% ที่ ${zi.get()} m → ${verdict}`);

  function trace(a, path) {
    const L = D.get() * 1000, dx = 100;
    let z = h0.get(), p = a;
    if (path) path.push([0, z]);
    for (let x = 0; x < L; x += dx) {
      p += (1 / R + dndz(z)) * dx; z += p * dx;
      if (path && (x / dx) % 4 === 0) path.push([x + dx, z]);
      if (z < 0) return { end: 'sea', x: x + dx };
      if (z > 400) return { end: 'sky', x: x + dx };
    }
    if (path) path.push([L, z]);
    return { end: z <= SHIP ? 'ship' : 'sky', z };
  }

  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const vh = Math.round(h * 0.56), sideY = vh + 6, sh = h - sideY - 4;
    const dip = Math.sqrt(2 * h0.get() / R), span = 4.5e-3, aMax = -dip + span * 0.55, aMin = aMax - span;
    const pxPerRad = vh / span, cx = w / 2;
    // ---- what the eye sees ----
    const sky = g.createLinearGradient(0, 0, 0, vh); sky.addColorStop(0, '#2d3a4f'); sky.addColorStop(1, '#c9b9a4');
    g.fillStyle = sky; g.fillRect(0, 0, w, vh);
    const rows = []; let shipRows = 0;
    for (let y = 0; y < vh; y++) {
      const a = aMax - (y + 0.5) / pxPerRad, r = trace(a);
      rows.push(r);
      if (r.end === 'sea') { g.fillStyle = y % 3 ? '#2a4a5c' : '#2f5366'; g.fillRect(0, y, w, 1); }
      else if (r.end === 'ship') {
        shipRows++;
        g.fillStyle = '#1a1210';
        for (const [x0, x1] of spans(r.z)) { const X0 = cx + x0 / (D.get() * 1000) * pxPerRad, X1 = cx + x1 / (D.get() * 1000) * pxPerRad; g.fillRect(X0, y, Math.max(1, X1 - X0), 1); }
      }
    }
    // classify the image
    let inverted = false, floating = false, seenShip = false, gap = false;
    for (let y = 1; y < rows.length; y++) {
      const a = rows[y - 1], b = rows[y];
      if (a.end === 'ship' && b.end === 'ship' && b.z > a.z + 0.05) inverted = true;
      if (b.end === 'ship') { seenShip = true; if (gap) floating = true; }
      if (seenShip && b.end === 'sky') gap = true;
      if (b.end === 'sea') break;
    }
    // floating = sky between a ship image and the sea below it
    floating = false; seenShip = false; gap = false;
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      if (r.end === 'ship') { seenShip = true; gap = false; }
      else if (r.end === 'sky' && seenShip) gap = true;
      else if (r.end === 'sea') { if (seenShip && gap) floating = true; break; }
    }
    const visPct = Math.round(Math.min(1, shipRows / (SHIP / (D.get() * 1000) * pxPerRad)) * 100);
    verdict = !shipRows ? 'เรือหายไปหลังขอบฟ้า' : inverted && floating ? 'เห็นเรือกลับหัวลอยอยู่กลางอากาศ' : inverted ? 'เห็นเรือซ้อนกลับหัว' : floating ? 'เห็นเรือลอยเหนือน้ำ' : visPct > 110 ? 'เห็นเรือยืดสูงผิดปกติ' : visPct < 70 ? 'เห็นแค่ส่วนบนของเรือ ท้องเรือจมหลังขอบฟ้า' : 'เห็นเรือตามปกติ';
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, vh - 2);
    // ---- side view of the rays ----
    g.fillStyle = '#0c0809'; g.fillRect(0, sideY, w, sh);
    const zTop = Math.max(60, zi.get() * 2.2), X = (x) => 10 + x / (D.get() * 1000) * (w - 30), Z = (z) => sideY + sh - 8 - z / zTop * (sh - 16);
    g.fillStyle = `rgba(255,154,61,${0.08 + inv.get() / 60 * 0.22})`; g.fillRect(0, Z(zi.get() + SIG), w, Z(zi.get() - SIG) - Z(zi.get() + SIG));
    g.fillStyle = '#21404f'; g.fillRect(0, Z(0), w, sideY + sh - Z(0));
    for (let k = 0; k <= 22; k++) {
      const a = aMax - k / 22 * span, path = [], r = trace(a, path);
      g.strokeStyle = r.end === 'ship' ? 'rgba(255,154,61,.9)' : r.end === 'sea' ? 'rgba(93,169,255,.35)' : 'rgba(200,200,200,.25)'; g.lineWidth = r.end === 'ship' ? 1.6 : 1;
      g.beginPath(); path.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(Math.max(-2, Math.min(zTop * 1.2, z)))) : g.moveTo(X(x), Z(z)))); g.stroke();
    }
    g.fillStyle = '#ffd866'; g.beginPath(); g.arc(X(0), Z(h0.get()), 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1210'; g.fillRect(X(D.get() * 1000) - 3, Z(SHIP), 6, Z(0) - Z(SHIP));
    g.fillStyle = '#bfaba4'; g.font = '11px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'left';
    g.fillText('ตาเรา', X(0) + 6, Z(h0.get()) - 4); g.textAlign = 'right'; g.fillText('เรือ', X(D.get() * 1000) - 6, Z(SHIP) + 10);
    g.textAlign = 'left'; g.fillText(`ชั้นอากาศอุ่น ${zi.get()} m`, 14, Z(zi.get() + SIG) - 3);
    f.overlay.replaceChildren(el('span', { class: 'badge' }, 'มองผ่านกล้องส่องทางไกล'), el('span', { class: 'badge' }, verdict));
    f.result.replaceChildren(el('b', {}, verdict), el('br'), el('span', { class: 'faint' }, inv.get() < 10 ? 'ไม่มีชั้นอากาศอุ่น เรือที่ไกลเกินขอบฟ้าจะจมหายไป' : 'แสงโค้งตามชั้นอากาศอุ่น ภาพเรือจึงถูกยก ยืด หรือพลิกกลับหัว'));
    say(verdict);
  }
  return { unmount: () => c.stop() };
}
