// Long exposure: someone who stands still for part of the exposure and then walks away turns see-through.
import { frame, slider, segmented, fitCanvas, wirePin, narrator, math } from './kit.js';
import { el } from '../core/ui.js';

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const exp = slider(f.controls, { label: 'เวลาเปิดชัตเตอร์', min: 0, max: 100, value: 87, fmt: (v) => sh(v).toFixed(sh(v) < 1 ? 2 : 1), unit: 'วินาที', onInput: () => draw() });
  const stand = slider(f.controls, { label: 'คนยืนนิ่งก่อนเดินออกไป', min: 0, max: 8, step: 0.1, value: 2, unit: 'วินาที', onInput: () => draw() });
  const speed = slider(f.controls, { label: 'ความเร็วเดิน', min: 0.3, max: 2, step: 0.1, value: 1.2, unit: 'm/s', onInput: () => draw() });
  const mode = segmented(f.more, 'เทคนิค', [['long', 'เปิดชัตเตอร์นาน'], ['double', 'ถ่ายซ้อนสองภาพ (ฟิล์มเก่า)']], 'long', () => draw());
  f.moreBox.open = !o.compact;
  function sh(v) { return 0.01 * Math.pow(1000, v / 100); } // 0.01 s – 10 s on a log scale
  f.formula.append(math('<mtext>ความทึบของคน</mtext><mo>≈</mo><mfrac><msub><mi>t</mi><mtext>อยู่ในภาพ</mtext></msub><msub><mi>t</mi><mtext>ชัตเตอร์</mtext></msub></mfrac>'));
  f.explain.append(
    el('p', {}, 'กล้องเก็บแสงตลอดเวลาที่ชัตเตอร์เปิด ห้องที่อยู่นิ่งได้แสงเต็มทั้งช่วง ส่วนคนที่ยืนอยู่แค่ครึ่งเวลาแล้วเดินออกไป จะติดในภาพแค่ครึ่งเดียว ภาพสุดท้ายเลยเห็นทั้งคนและผนังข้างหลังซ้อนกัน กลายเป็น "ผีโปร่งแสง"'),
    el('p', {}, 'สมัยก่อนกล้องต้องเปิดชัตเตอร์หลายวินาที รูปเก่าจำนวนมากจึงมีเด็กหรือสุนัขที่ขยับตัวจนกลายเป็นเงาจาง ส่วนตอนถ่ายกลางคืนด้วยมือถือ โหมดกลางคืนก็รวมหลายภาพเข้าด้วยกันแบบเดียวกัน'),
    el('p', {}, 'ช่วงปี 1860 ช่างภาพชาวอเมริกัน William Mumler ขาย "ภาพถ่ายวิญญาณ" ที่มีญาติที่ตายไปแล้วลอยอยู่ข้างหลังลูกค้า ภายหลังมีคนพิสูจน์ว่าเป็นการถ่ายซ้อนบนแผ่นกระจกเดียวกัน ลองเลือกเทคนิค "ถ่ายซ้อนสองภาพ" ในตั้งค่าเพิ่ม'),
    el('p', { class: 'caveat' }, 'แบบจำลองนี้ไม่นับแสงที่ตัวคนบังหรือสะท้อน ของจริงความทึบอาจต่างไปเล็กน้อย'));
  const c = fitCanvas(f.canvas, () => draw());
  const buf = document.createElement('canvas'), bg = document.createElement('canvas');
  f.resetBtn.addEventListener('click', () => { exp.set(87); stand.set(2); speed.set(1.2); mode.set('long'); draw(); });
  let opacity = 1;
  wirePin(f, o, () => `ชัตเตอร์ ${sh(exp.get()).toFixed(2)} วินาที, คนยืนนิ่ง ${stand.get()} วินาที → คนทึบ ${Math.round(opacity * 100)}%`);

  function scene(g, w, h) {
    g.fillStyle = '#3b3029'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a211c'; g.fillRect(0, h * 0.78, w, h * 0.22);
    g.fillStyle = '#5c4a3a'; g.fillRect(w * 0.1, h * 0.18, w * 0.16, h * 0.6); // door
    g.fillStyle = '#c9b48a'; g.beginPath(); g.arc(w * 0.235, h * 0.5, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6e8aa0'; g.fillRect(w * 0.62, h * 0.2, w * 0.22, h * 0.26); // window
    g.strokeStyle = '#2a211c'; g.lineWidth = 4; g.strokeRect(w * 0.62, h * 0.2, w * 0.22, h * 0.26);
    g.beginPath(); g.moveTo(w * 0.73, h * 0.2); g.lineTo(w * 0.73, h * 0.46); g.stroke();
    g.fillStyle = '#4a3326'; g.fillRect(w * 0.66, h * 0.6, w * 0.16, h * 0.04); g.fillRect(w * 0.67, h * 0.64, w * 0.015, h * 0.14); g.fillRect(w * 0.795, h * 0.64, w * 0.015, h * 0.14);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,240,210,.03)'; g.fillRect((i * 97) % w, 0, 2, h * 0.78); }
  }
  function person(g, x, w, h) {
    const s = h * 0.62, y = h * 0.78;
    g.fillStyle = '#e8e2d6';
    g.beginPath(); g.ellipse(x, y - s * 0.9, s * 0.07, s * 0.085, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.8); g.lineTo(x + s * 0.1, y - s * 0.8); g.lineTo(x + s * 0.15, y); g.lineTo(x - s * 0.15, y); g.closePath(); g.fill();
    g.fillStyle = '#1b1715'; g.beginPath(); g.moveTo(x - s * 0.075, y - s * 0.95); g.quadraticCurveTo(x, y - s * 1.02, x + s * 0.075, y - s * 0.95); g.lineTo(x + s * 0.08, y - s * 0.62); g.lineTo(x - s * 0.08, y - s * 0.62); g.closePath(); g.fill();
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    for (const b of [buf, bg]) { b.width = Math.max(1, Math.round(w)); b.height = Math.max(1, Math.round(h)); }
    const bgc = bg.getContext('2d'), bc = buf.getContext('2d');
    scene(bgc, w, h);
    const T = sh(exp.get()), x0 = w * 0.45, pxPerM = w / 6;
    if (mode.get() === 'double') {
      // plate 1: the "spirit" sitter, plate 2: the empty room, both exposed onto one plate at half strength
      g.drawImage(bg, 0, 0, w, h);
      bc.drawImage(bg, 0, 0); person(bc, x0, w, h);
      g.globalAlpha = 0.5; g.drawImage(buf, 0, 0, w, h); g.globalAlpha = 1;
      opacity = 0.5;
    } else {
      const N = 48;
      g.clearRect(0, 0, w, h);
      let inside = 0;
      for (let i = 0; i < N; i++) {
        const t = (i + 0.5) / N * T;
        const x = t < stand.get() ? x0 : x0 + (t - stand.get()) * speed.get() * pxPerM;
        bc.drawImage(bg, 0, 0);
        if (x < w + 40) { person(bc, x, w, h); if (Math.abs(x - x0) < w * 0.02) inside++; }
        g.globalAlpha = 1 / (i + 1); g.drawImage(buf, 0, 0, w, h);
      }
      g.globalAlpha = 1;
      opacity = inside / N;
    }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, h);
    const pct = Math.round(opacity * 100);
    f.overlay.replaceChildren(el('span', { class: 'badge' }, mode.get() === 'double' ? 'ถ่ายซ้อน 2 ภาพ' : `ชัตเตอร์ ${T.toFixed(T < 1 ? 2 : 1)} s`), el('span', { class: 'badge' }, `คนทึบ ${pct}%`));
    f.result.replaceChildren(
      pct >= 95 ? el('span', {}, 'ชัตเตอร์เร็วพอ คนชัด ', el('b', {}, 'ทึบ 100%'), ' ไม่มีผี')
        : pct <= 3 ? el('span', {}, 'คนอยู่สั้นเกินไป ', el('b', {}, 'แทบไม่ติดในภาพ'), ' เหลือแค่รอยเบลอ')
          : el('span', {}, 'คนติดในภาพแค่ ', el('b', {}, `${pct}%`), ' จึงมองทะลุเห็นห้องข้างหลังได้ = ', el('b', {}, 'ผีโปร่งแสง')),
      el('br'), el('span', { class: 'faint' }, 'ชัตเตอร์นาน + คนยืนนิ่งแค่บางช่วง = ร่างโปร่งแสง ส่วนตอนเดินจะกลายเป็นรอยลาก'));
    say(`คนในภาพทึบ ${pct} เปอร์เซ็นต์`);
  }
  return { unmount: () => c.stop() };
}
