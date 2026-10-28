// Barnum / Forer effect: a "personal" spirit reading that is word-for-word the same for everyone.
import { frame, fitCanvas, wirePin, narrator } from './kit.js';
import { el } from '../core/ui.js';

const SPIRITS = ['พญานาคน้ำ', 'นกยูงทอง', 'เสือสมิง', 'กระต่ายจันทร์', 'ช้างเผือก', 'หงส์ฟ้า', 'วานรขาว', 'มังกรไฟ', 'เต่าหิน', 'กวางทอง', 'ปลาตะเพียน', 'แมวดำ'];
const ICON = ['🐉', '🦚', '🐅', '🐇', '🐘', '🦢', '🐒', '🔥', '🐢', '🦌', '🐟', '🐈‍⬛'];
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const LINES = [
  'ภายนอกคุณดูเป็นคนเข้มแข็ง แต่ลึกๆ มีบางเรื่องที่ยังกังวลและไม่ค่อยเล่าให้ใครฟัง',
  'บางวันคุณคุยเก่ง เข้ากับคนง่าย แต่บางวันก็อยากอยู่เงียบๆ คนเดียว',
  'คุณมีความสามารถบางอย่างที่ยังไม่ได้ใช้เต็มที่ และคนรอบตัวยังมองไม่เห็นมันทั้งหมด',
  'เคยมีช่วงที่คุณสงสัยว่าตัดสินใจถูกหรือเปล่า แม้จะไม่ได้แสดงออกให้ใครเห็น',
  'คุณไม่ชอบให้ใครมาบังคับ ชอบคิดให้ถี่ถ้วนด้วยตัวเองก่อนจะเชื่ออะไร',
  'ช่วงนี้มีพลังบางอย่างวนอยู่รอบตัวคุณ ถ้ากล้าเริ่มเรื่องใหม่ จะมีข่าวดีเข้ามาภายในสามเดือน',
];

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  let phase = 'ask', rating = null, month = 0;
  const nick = el('input', { type: 'text', maxlength: 20, placeholder: 'ไม่ใส่ก็ได้', autocomplete: 'off', style: { minHeight: '44px', padding: '0 10px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '6px' } });
  const sel = el('select', { style: { minHeight: '44px', padding: '0 8px', background: '#140809', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '6px' } }, ...MONTHS.map((m, i) => el('option', { value: i }, m)));
  const go = el('button', { class: 'btn small', type: 'button', onclick: () => { month = +sel.value; phase = 'read'; rating = null; render(); } }, '🔮 ให้ดวงวิญญาณทำนาย');
  const rate = el('div', { class: 'seg', role: 'group', 'aria-label': 'คำทำนายตรงกับคุณแค่ไหน' });
  f.controls.append(el('label', { class: 'ctl' }, el('span', { class: 'lbl' }, 'ชื่อเล่น'), nick), el('label', { class: 'ctl' }, el('span', { class: 'lbl' }, 'เดือนเกิด'), sel), go, rate);
  f.formula.append(el('div', {}, 'Forer (1949): นักศึกษา 39 คนได้ "ผลวิเคราะห์บุคลิกภาพเฉพาะตัว" ซึ่งจริงๆ เป็นข้อความเดียวกันทั้งห้อง ให้คะแนนความแม่นเฉลี่ย 4.3 จาก 5'));
  f.explain.append(
    el('p', {}, 'คำทำนายที่ดูแม่นมักเป็นประโยคที่ "จริงกับเกือบทุกคน" เช่น ภายนอกเข้มแข็งแต่ข้างในกังวล หรือมีความสามารถที่ยังไม่ได้ใช้ เราอ่านแล้วนึกถึงเรื่องของตัวเองทันที เลยรู้สึกว่าหมอดูรู้ใจ'),
    el('p', {}, 'นักจิตวิทยาเรียกสิ่งนี้ว่า Barnum effect หรือ Forer effect หมอดู ร่างทรง และคนที่อ้างว่าคุยกับวิญญาณได้ ใช้เทคนิคนี้ร่วมกับการสังเกตท่าทางของเรา (cold reading) แล้วเลือกพูดต่อในเรื่องที่เราพยักหน้า'),
    el('p', {}, 'ลองเปลี่ยนเดือนเกิดแล้วทำนายใหม่ จะเห็นว่าเปลี่ยนแค่ชื่อสัตว์ประจำตัวกับรูป ส่วนคำทำนายเหมือนเดิมทุกตัวอักษร'),
    el('p', { class: 'caveat' }, 'ชื่อเล่นใช้แค่แสดงบนหน้านี้ ไม่ถูกเก็บหรือส่งไปไหน'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { phase = 'ask'; rating = null; nick.value = ''; sel.value = 0; render(); });
  wirePin(f, o, () => rating == null ? 'ทดลองหมอดูรู้ใจ (ยังไม่ให้คะแนน)' : `ให้คะแนนคำทำนาย "เฉพาะตัว" ว่าแม่น ${rating}/5 ทั้งที่ทุกคนได้ข้อความเดียวกัน (Forer 1949 เฉลี่ย 4.3/5)`);
  const who = () => (nick.value.trim() ? nick.value.trim().slice(0, 20) : 'คุณ');
  function render() {
    rate.replaceChildren();
    if (phase !== 'ask') {
      rate.append(el('span', { class: 'lbl', style: { width: '100%' } }, 'คำทำนายตรงกับคุณแค่ไหน'),
        ...[0, 1, 2, 3, 4, 5].map((n) => el('button', { type: 'button', 'aria-pressed': String(rating === n), onclick: () => { rating = n; phase = 'reveal'; render(); } }, String(n))));
    }
    if (phase === 'ask') f.result.replaceChildren('ใส่ชื่อเล่นกับเดือนเกิด แล้วให้ดวงวิญญาณทำนาย');
    else {
      const box = el('div', {}, el('p', { style: { margin: '0 0 6px' } }, `ดวงวิญญาณ${SPIRITS[month]}ส่งข้อความถึง${who()}:`),
        el('ul', { style: { margin: 0, paddingLeft: '1.2em' } }, ...LINES.map((l) => el('li', {}, l))));
      if (phase === 'reveal') box.append(el('p', { style: { marginTop: '10px' } }, 'คุณให้ ', el('b', {}, `${rating}/5`), ' · ', el('b', {}, 'ความจริงคือทุกคนทุกเดือนเกิดได้ 6 ข้อนี้เหมือนกันหมด'), ' ไม่มีการคำนวณดวงใดๆ เลย'));
      f.result.replaceChildren(box);
      if (phase === 'reveal') say(`คุณให้คะแนน ${rating} จาก 5 แต่ทุกคนได้คำทำนายเดียวกัน`);
    }
    draw();
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const bg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7); bg.addColorStop(0, '#2a0f18'); bg.addColorStop(1, '#070304');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const cw = Math.min(w * 0.5, h * 0.6), ch = cw * 1.45, x = w / 2 - cw / 2, y = h / 2 - ch / 2;
    g.fillStyle = '#1a0a0e'; g.strokeStyle = '#c9a24a'; g.lineWidth = 3;
    g.beginPath(); g.rect(x, y, cw, ch); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(201,162,74,.4)'; g.lineWidth = 1; g.strokeRect(x + 8, y + 8, cw - 16, ch - 16);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(w / 2 + Math.cos(a) * cw * 0.32, y + ch * 0.42 + Math.sin(a) * cw * 0.32, 2, 0, Math.PI * 2); g.fillStyle = '#c9a24a'; g.fill(); }
    g.textAlign = 'center'; g.fillStyle = '#f3e9e2';
    g.font = `${cw * 0.3}px serif`; g.fillText(phase === 'ask' ? '✶' : ICON[month], w / 2, y + ch * 0.5);
    g.fillStyle = '#c9a24a'; g.font = `600 ${Math.max(13, cw * 0.075)}px "Kanit", sans-serif`;
    g.fillText(phase === 'ask' ? 'ไพ่ดวงวิญญาณ' : SPIRITS[month], w / 2, y + ch * 0.82);
    g.fillStyle = '#8a7671'; g.font = `${Math.max(11, cw * 0.05)}px "IBM Plex Sans Thai", sans-serif`;
    g.fillText(phase === 'ask' ? 'รอคำถาม…' : `เกิดเดือน${MONTHS[month]}`, w / 2, y + ch * 0.9);
    f.overlay.replaceChildren(el('span', { class: 'badge' }, phase === 'reveal' ? 'เฉลย' : 'หมอดูออนไลน์'));
  }
  render();
  return { unmount: () => c.stop() };
}
