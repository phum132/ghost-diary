// Negative afterimage: stare at a coloured figure, then look at a plain wall and a "ghost" in the opposite colour appears.
import { frame, slider, segmented, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

const COLORS = { red: [230, 40, 40], green: [30, 200, 80], yellow: [240, 220, 30], blue: [40, 90, 240] };
const NAMES = { red: 'แดง', green: 'เขียว', yellow: 'เหลือง', blue: 'น้ำเงิน' };
const OPP = { red: 'ฟ้าอมเขียว', green: 'ชมพูม่วง', yellow: 'น้ำเงินม่วง', blue: 'เหลืองส้ม' };

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  let phase = 'ready', left = 0, timer = 0, showSim = false;
  const secs = slider(f.controls, { label: 'เวลาจ้อง', min: 5, max: 40, value: 20, unit: 'วินาที' });
  const col = segmented(f.controls, 'สีของร่าง', Object.keys(COLORS).map((k) => [k, NAMES[k]]), 'red', () => { stop(); draw(); });
  const startBtn = el('button', { class: 'btn small', type: 'button', onclick: () => start() }, '👁 เริ่มจ้อง');
  const simBtn = el('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false', onclick: () => { showSim = !showSim; simBtn.setAttribute('aria-pressed', String(showSim)); draw(); } }, 'ดูภาพจำลองสิ่งที่ตาเห็น');
  f.controls.append(el('div', { class: 'row' }, startBtn, simBtn));
  f.formula.append(math('<mtext>สีผี</mtext><mo>≈</mo><mo>(</mo><mn>255</mn><mo>−</mo><mi>R</mi><mo>,</mo><mn>255</mn><mo>−</mo><mi>G</mi><mo>,</mo><mn>255</mn><mo>−</mo><mi>B</mi><mo>)</mo>'),
    el('div', { class: 'faint' }, 'ตาเหนื่อยกับสีไหน พอหันไปมองพื้นขาว สีตรงข้ามจะเด่นขึ้นมาแทน'));
  f.explain.append(
    el('p', {}, 'จ้องจุดตรงกลางนิ่งๆ อย่ากลอกตา พอหน้าจอเปลี่ยนเป็นผนังสีเทาให้จ้องจุดเดิมต่อ จะเห็น "ร่าง" สีตรงข้ามลอยอยู่ แล้วค่อยๆ จางหายไปเองในไม่กี่วินาที'),
    el('p', {}, 'เซลล์รับสีในตามีสามแบบ (แดง เขียว น้ำเงิน) ถ้าจ้องสีแดงนานๆ เซลล์รับสีแดงตรงจุดนั้นจะล้าชั่วคราว พอมองผนังสีเทาซึ่งมีทุกสีเท่ากัน เซลล์เขียวกับน้ำเงินที่ยังสดอยู่จึงชนะ สมองเลยเห็นร่างสีฟ้าอมเขียวในตำแหน่งเดิม'),
    el('p', {}, 'นี่คือเหตุผลที่บางคนเห็น "เงาคนสีจางๆ" หลังจากมองหลอดไฟหรือหน้าต่างสว่างแล้วหันไปมองผนังมืด และเงานั้นจะ "ตาม" สายตาไปทุกที่ที่หันไป เพราะมันอยู่ในตาเราเอง'),
    el('p', { class: 'caveat' }, 'ปลอดภัย ไม่มีแสงกะพริบ ถ้ารู้สึกตาล้าให้พักสายตา'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { stop(); secs.set(20); col.set('red'); showSim = false; simBtn.setAttribute('aria-pressed', 'false'); draw(); });
  wirePin(f, o, () => `จ้องร่างสี${NAMES[col.get()]} ${secs.get()} วินาที → เห็นผีสี${OPP[col.get()]} บนผนังเทา`);

  function stop() { clearInterval(timer); timer = 0; phase = 'ready'; startBtn.textContent = '👁 เริ่มจ้อง'; }
  function start() {
    if (timer) { stop(); draw(); return; }
    phase = 'stare'; left = secs.get(); startBtn.textContent = '■ หยุด'; draw();
    timer = setInterval(() => {
      left -= 1;
      if (phase === 'stare' && left <= 0) { phase = 'wall'; left = 12; say('มองจุดเดิมต่อ'); }
      else if (phase === 'wall' && left <= 0) { stop(); phase = 'done'; }
      draw();
    }, 1000);
  }
  function figure(g, w, h, rgb, alpha) {
    g.fillStyle = `rgba(${rgb.join(',')},${alpha})`;
    const cx = w / 2, cy = h * 0.5, s = Math.min(w, h) * 0.42;
    g.beginPath(); g.ellipse(cx, cy - s * 0.55, s * 0.17, s * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx - s * 0.2, cy - s * 0.35); g.quadraticCurveTo(cx - s * 0.42, cy + s * 0.2, cx - s * 0.38, cy + s * 0.75);
    g.lineTo(cx + s * 0.38, cy + s * 0.75); g.quadraticCurveTo(cx + s * 0.42, cy + s * 0.2, cx + s * 0.2, cy - s * 0.35); g.closePath(); g.fill();
    // long hair
    g.beginPath(); g.moveTo(cx - s * 0.2, cy - s * 0.62); g.quadraticCurveTo(cx - s * 0.3, cy - s * 0.1, cx - s * 0.24, cy + s * 0.1); g.lineTo(cx + s * 0.24, cy + s * 0.1); g.quadraticCurveTo(cx + s * 0.3, cy - s * 0.1, cx + s * 0.2, cy - s * 0.62); g.fill();
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const rgb = COLORS[col.get()];
    const opp = rgb.map((v) => 255 - v);
    if (phase === 'stare') {
      g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h);
      figure(g, w, h, rgb, 1);
    } else {
      g.fillStyle = '#9a9894'; g.fillRect(0, 0, w, h);
      if (showSim && phase !== 'stare') figure(g, w, h, opp, phase === 'wall' ? Math.max(0.05, left / 12 * 0.35) : 0.3);
      if (phase === 'ready') { g.fillStyle = '#2a2826'; g.font = `500 ${Math.max(14, w / 32)}px "IBM Plex Sans Thai", sans-serif`; g.textAlign = 'center'; g.fillText('กด "เริ่มจ้อง" แล้วมองจุดกลางนิ่งๆ', w / 2, h * 0.12); }
    }
    g.fillStyle = '#000'; g.beginPath(); g.arc(w / 2, h * 0.5, 4, 0, Math.PI * 2); g.fill();
    f.overlay.replaceChildren(el('span', { class: 'badge' }, phase === 'stare' ? `จ้องจุดดำ… ${left}` : phase === 'wall' ? `ผนังเทา · มองจุดเดิม ${left}` : 'พร้อม'));
    f.result.replaceChildren(phase === 'stare' ? el('span', {}, 'อย่ากลอกตา เหลืออีก ', el('b', {}, left), ' วินาที')
      : el('span', {}, 'จ้องร่างสี', NAMES[col.get()], ' แล้วมองผนัง จะเห็นผีสี ', el('b', {}, OPP[col.get()]), el('br'), el('span', { class: 'faint' }, 'จ้องนานขึ้น = ภาพติดตาชัดและอยู่นานขึ้น')));
  }
  return { unmount: () => { clearInterval(timer); c.stop(); } };
}
