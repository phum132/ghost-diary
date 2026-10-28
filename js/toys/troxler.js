// Troxler fading: blurry shapes in the corner of your eye vanish while you hold your gaze still.
import { frame, slider, fitCanvas, wirePin, narrator } from './kit.js';
import { el } from '../core/ui.js';

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  let t = 0, timer = 0, seen = null;
  const blur = slider(f.controls, { label: 'ความเบลอของขอบเงา', min: 0, max: 100, value: 80, unit: '%', onInput: () => draw() });
  const con = slider(f.controls, { label: 'ความเข้มของเงา', min: 5, max: 60, value: 18, unit: '%', onInput: () => draw() });
  const n = slider(f.controls, { label: 'จำนวนเงา', min: 1, max: 8, value: 5, unit: 'ตัว', onInput: () => draw() });
  const go = el('button', { class: 'btn small', type: 'button', onclick: () => start() }, '⏱ จ้อง 25 วินาที');
  const gone = el('button', { class: 'btn small', type: 'button', onclick: () => { seen = t; finish(); } }, 'เงาหายแล้ว!');
  f.controls.append(el('div', { class: 'row' }, go, gone));
  f.formula.append(el('div', {}, 'ภาพนิ่ง + ขอบเบลอ + อยู่หางตา → เซลล์ประสาทชินแล้วหยุดรายงาน → ภาพ "หาย"'));
  f.explain.append(
    el('p', {}, 'จ้องกากบาทตรงกลางให้นิ่งที่สุด ไม่ต้องมองเงา ภายในไม่กี่วินาที เงาเบลอๆ รอบนอกจะค่อยๆ จางหายไปทีละตัว พอกลอกตานิดเดียว มันจะ "โผล่กลับมา" ทันที'),
    el('p', {}, 'ปรากฏการณ์นี้ชื่อ Troxler fading ค้นพบปี 1804 สมองเราให้ความสนใจกับสิ่งที่เปลี่ยนแปลง ภาพที่นิ่ง ขอบไม่ชัด และอยู่หางตาจึงถูกตัดทิ้ง เหมือนเสียงพัดลมที่เราลืมไปว่ามันดังอยู่'),
    el('p', {}, 'ในห้องมืด สิ่งที่อยู่หางตาเบลอและนิ่งเกือบทุกอย่าง เงาบนผนังจึงหายแล้วโผล่ ทุกครั้งที่ตาเราขยับ ทำให้รู้สึกเหมือนมี "อะไร" ขยับอยู่ข้างๆ แต่พอหันไปมองตรงๆ ก็ไม่เจอ'),
    el('p', {}, 'นักวิจัยชาวอิตาลี Giovanni Caputo (2010) ให้คนจ้องหน้าตัวเองในกระจกที่แสงสลัว 10 นาที คนส่วนใหญ่เห็นหน้าตัวเองบิดเบี้ยว บางคนเห็นเป็นหน้าคนอื่นหรือสัตว์ ส่วนหนึ่งมาจากปรากฏการณ์เดียวกันนี้'),
    el('p', { class: 'caveat' }, 'ได้ผลดีที่สุดเมื่อเปิดเต็มจอและนั่งห่างจอพอประมาณ ไม่มีแสงกะพริบ'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { stopT(); blur.set(80); con.set(18); n.set(5); seen = null; draw(); });
  wirePin(f, o, () => seen != null ? `เงาเบลอ ${blur.get()}% เข้ม ${con.get()}% หายไปหลังจ้อง ${seen} วินาที` : `ทดลอง Troxler: เงาเบลอ ${blur.get()}% เข้ม ${con.get()}%`);

  function stopT() { clearInterval(timer); timer = 0; t = 0; }
  function start() { stopT(); seen = null; timer = setInterval(() => { t += 1; if (t >= 25) finish(); draw(); }, 1000); draw(); }
  function finish() { clearInterval(timer); timer = 0; draw(); say(seen != null ? `เงาหายหลัง ${seen} วินาที` : 'ครบเวลา'); }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.fillStyle = '#7d7a76'; g.fillRect(0, 0, w, h);
    const k = n.get(), R = Math.min(w, h) * 0.38;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 - Math.PI / 2;
      const x = w / 2 + Math.cos(a) * R * 1.35, y = h / 2 + Math.sin(a) * R;
      const r = Math.min(w, h) * 0.11;
      const soft = blur.get() / 100;
      const d = con.get() / 100;
      const gr = g.createRadialGradient(x, y - r * 0.2, r * (1 - soft) * 0.6, x, y, r * (1 + soft));
      gr.addColorStop(0, `rgba(25,22,22,${d})`); gr.addColorStop(1, 'rgba(25,22,22,0)');
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, r * (1 + soft) * 0.7, r * (1 + soft) * 1.25, 0, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#111'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2 - 9, h / 2); g.lineTo(w / 2 + 9, h / 2); g.moveTo(w / 2, h / 2 - 9); g.lineTo(w / 2, h / 2 + 9); g.stroke();
    f.overlay.replaceChildren(el('span', { class: 'badge' }, timer ? `จ้องกากบาท… ${t}/25` : 'พร้อม'));
    f.result.replaceChildren(seen != null ? el('span', {}, 'เงาหายไปหลังจ้อง ', el('b', {}, `${seen} วินาที`))
      : el('span', {}, timer ? 'จ้องกากบาทให้นิ่ง เงารอบๆ เริ่มจางหรือยัง' : 'กดปุ่มแล้วจ้องกากบาท ถ้าเงาหายให้กด "เงาหายแล้ว!"'),
      el('br'), el('span', { class: 'faint' }, 'ลองลดความเบลอให้ขอบคม เงาจะหายยากขึ้นมาก'));
  }
  return { unmount: () => { clearInterval(timer); c.stop(); } };
}
