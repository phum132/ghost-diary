// Eyewitness memory: look at a room for a few seconds, then answer questions. Leading questions plant details that were never there.
import { frame, segmented, fitCanvas, wirePin, narrator } from './kit.js';
import { el } from '../core/ui.js';

const CHAIRS = [['แดง', '#b8322a'], ['น้ำเงิน', '#2f5fb8'], ['เขียว', '#2f8a4a'], ['เหลือง', '#c9a92a']];
const COATS = [['ดำ', '#151515'], ['ขาว', '#e6e1d6']];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export function mount(host, o) {
  const f = frame(host, o);
  const say = narrator(f);
  let sc, phase = 'intro', left = 0, timer = 0, answers = [], qs = [];
  const mode = segmented(f.controls, 'แบบคำถาม', [['lead', 'คำถามชี้นำ (แบบนักข่าวรายการผี)'], ['fair', 'คำถามเป็นกลาง']], 'lead', () => { if (phase !== 'show') { phase = 'intro'; render(); } });
  const startBtn = el('button', { class: 'btn small', type: 'button', onclick: () => start() }, '👁 ดูห้องนี้ 6 วินาที');
  const quiz = el('div', { class: 'quiz', style: { display: 'grid', gap: '12px' } });
  f.controls.append(startBtn, quiz);
  f.formula.append(el('div', {}, 'คำถาม "ผู้หญิงที่ยืนข้างประตูใส่ชุดสีอะไร" แอบใส่ข้อมูลว่ามีผู้หญิงยืนอยู่ ทั้งที่ภาพไม่มีใครเลย'));
  f.explain.append(
    el('p', {}, 'ความจำไม่ใช่วิดีโอที่กดย้อนดูได้ ทุกครั้งที่เรานึกถึงเหตุการณ์ สมองจะ "สร้าง" มันขึ้นใหม่ และหยิบข้อมูลที่ได้ยินทีหลังมาเติมช่องว่างโดยไม่รู้ตัว'),
    el('p', {}, 'Elizabeth Loftus กับ John Palmer (1974) ให้คนดูคลิปรถชนกัน แล้วถามว่ารถวิ่งเร็วแค่ไหนตอน "ชน" หรือตอน "พุ่งชนจนยับ" กลุ่มที่ได้ยินคำแรงกว่าประเมินความเร็วสูงกว่า และอีกหนึ่งสัปดาห์ต่อมาหลายคนยืนยันว่าเห็นเศษกระจกแตก ซึ่งในคลิปไม่มีเลย'),
    el('p', {}, 'เรื่องผีถูกเล่าต่อกันหลายทอด คนที่เห็นเงาจางๆ ข้างประตู พอถูกถามว่า "ผู้หญิงคนนั้นผมยาวไหม" ก็อาจจำได้ชัดขึ้นเรื่อยๆ ว่าเห็นผู้หญิงผมยาว ลองเล่นทั้งสองแบบคำถามแล้วเทียบกัน'),
    el('p', { class: 'caveat' }, 'ห้องสุ่มใหม่ทุกครั้ง ไม่เก็บคำตอบ'));
  const c = fitCanvas(f.canvas, () => draw());
  f.resetBtn.addEventListener('click', () => { clearInterval(timer); timer = 0; phase = 'intro'; mode.set('lead'); render(); });
  let score = '';
  wirePin(f, o, () => `ทดสอบความจำพยาน (${mode.get() === 'lead' ? 'คำถามชี้นำ' : 'คำถามเป็นกลาง'}): ${score || 'ยังไม่ได้ตอบ'}`);

  function newScene() {
    const ch = pick(CHAIRS), coat = pick(COATS);
    return { h: 1 + Math.floor(Math.random() * 12), m: pick([0, 15, 30, 45]), chair: ch, coat, curtain: pick(['เปิด', 'ปิด']), lamp: Math.random() < 0.5 };
  }
  const tstr = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
  function questions() {
    const lead = mode.get() === 'lead';
    const times = shuffle([tstr(sc.h, sc.m), tstr(sc.h % 12 + 1, sc.m), tstr(sc.h, (sc.m + 30) % 60), tstr((sc.h + 5) % 12 + 1, (sc.m + 15) % 60)]);
    return [
      lead ? { q: 'ผู้หญิงผมยาวที่ยืนข้างประตูใส่ชุดสีอะไร', opts: ['ขาว', 'แดง', 'ดำ', 'ไม่มีผู้หญิงในห้อง'], ok: 'ไม่มีผู้หญิงในห้อง', fake: true }
        : { q: 'มีคนอยู่ในห้องไหม', opts: ['มี', 'ไม่มี'], ok: 'ไม่มี' },
      { q: 'นาฬิกาบนผนังบอกกี่โมง', opts: times, ok: tstr(sc.h, sc.m) },
      { q: 'เก้าอี้สีอะไร', opts: CHAIRS.map((x) => x[0]), ok: sc.chair[0] },
      lead ? { q: 'ตอนที่ไฟกะพริบ ผ้าม่านปลิวไปทางไหน', opts: ['ซ้าย', 'ขวา', 'ไฟไม่ได้กะพริบ'], ok: 'ไฟไม่ได้กะพริบ', fake: true }
        : { q: 'ผ้าม่านเปิดหรือปิด', opts: ['เปิด', 'ปิด'], ok: sc.curtain },
      { q: 'เสื้อที่แขวนข้างประตูสีอะไร', opts: ['ดำ', 'ขาว', 'ไม่มีเสื้อแขวน'], ok: sc.coat[0] },
    ];
  }
  function start() {
    clearInterval(timer); sc = newScene(); phase = 'show'; left = 6; answers = []; render();
    timer = setInterval(() => { left--; if (left <= 0) { clearInterval(timer); timer = 0; phase = 'quiz'; qs = questions(); } render(); }, 1000);
  }
  function render() {
    startBtn.textContent = phase === 'intro' ? '👁 ดูห้องนี้ 6 วินาที' : '↻ ดูห้องใหม่';
    startBtn.disabled = phase === 'show';
    quiz.replaceChildren();
    if (phase === 'quiz' || phase === 'reveal') {
      qs.forEach((q, i) => {
        const row = el('div', { class: 'seg', role: 'group', 'aria-label': q.q });
        q.opts.forEach((opt) => {
          const chosen = answers[i] === opt, right = phase === 'reveal' && opt === q.ok;
          row.append(el('button', { type: 'button', 'aria-pressed': String(chosen), disabled: phase === 'reveal',
            style: right ? { borderColor: 'var(--phos)', color: 'var(--phos)' } : null,
            onclick: () => { answers[i] = opt; if (answers.filter(Boolean).length === qs.length) { phase = 'reveal'; } render(); } }, opt));
        });
        quiz.append(el('div', { class: 'ctl' }, el('span', { class: 'lbl' }, `${i + 1}. ${q.q}`), row));
      });
    }
    if (phase === 'reveal') {
      const right = qs.filter((q, i) => answers[i] === q.ok).length;
      const planted = qs.filter((q, i) => q.fake && answers[i] !== q.ok).length;
      score = `ถูก ${right}/${qs.length}` + (mode.get() === 'lead' ? `, จำสิ่งที่ไม่มีอยู่จริง ${planted} เรื่อง` : '');
      f.result.replaceChildren('ตอบถูก ', el('b', {}, `${right}/${qs.length}`),
        mode.get() === 'lead' ? el('span', {}, ' · หลงเชื่อรายละเอียดที่คำถามแต่งขึ้น ', el('b', {}, `${planted}/2`), ' ข้อ') : '',
        el('br'), el('span', { class: 'faint' }, 'ในห้องไม่มีผู้หญิง และไฟไม่ได้กะพริบเลย สิ่งที่ดูเหมือนคนคือเสื้อที่แขวนอยู่ ลองกด "ดูห้องใหม่" แล้วเปลี่ยนแบบคำถาม'));
      say(`ตอบถูก ${right} จาก ${qs.length}`);
    } else if (phase === 'quiz') f.result.replaceChildren('ภาพหายไปแล้ว ตอบจากความจำ ', el('b', {}, `${answers.filter(Boolean).length}/${qs.length}`));
    else if (phase === 'show') f.result.replaceChildren('จำห้องนี้ให้ดี เหลือ ', el('b', {}, `${left}`), ' วินาที');
    else f.result.replaceChildren('กดปุ่มแล้วดูภาพห้องให้ดี จากนั้นภาพจะหายไปและมีคำถาม');
    draw();
  }
  function draw() {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    g.fillStyle = '#0d0809'; g.fillRect(0, 0, w, h);
    if (!(phase === 'show' || phase === 'reveal') || !sc) {
      g.fillStyle = '#8a7671'; g.font = `500 ${Math.max(14, w / 30)}px "IBM Plex Sans Thai", sans-serif`; g.textAlign = 'center';
      g.fillText(phase === 'quiz' ? 'ภาพห้องหายไปแล้ว…' : 'ห้องนอนตอนตีสอง', w / 2, h / 2);
      f.overlay.replaceChildren();
      return;
    }
    // room
    g.fillStyle = sc.lamp ? '#4a3b31' : '#2c231e'; g.fillRect(0, 0, w, h * 0.75);
    g.fillStyle = '#231a16'; g.fillRect(0, h * 0.75, w, h * 0.25);
    g.fillStyle = '#5c4535'; g.fillRect(w * 0.08, h * 0.2, w * 0.2, h * 0.55); // door
    g.fillStyle = '#c9b48a'; g.beginPath(); g.arc(w * 0.255, h * 0.5, 4, 0, Math.PI * 2); g.fill();
    // coat on a hook (the "woman")
    const cx = w * 0.34, cy = h * 0.24;
    g.fillStyle = '#777'; g.fillRect(cx - 2, cy - 8, 4, 10);
    g.fillStyle = sc.coat[1]; g.beginPath(); g.moveTo(cx - w * 0.03, cy + 4); g.lineTo(cx + w * 0.03, cy + 4); g.lineTo(cx + w * 0.045, cy + h * 0.36); g.lineTo(cx - w * 0.045, cy + h * 0.36); g.closePath(); g.fill();
    // window + curtain
    const wx = w * 0.56, wy = h * 0.14, ww = w * 0.26, wh = h * 0.3;
    g.fillStyle = '#1b2a3c'; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = '#7a2a2a'; if (sc.curtain === 'ปิด') g.fillRect(wx - 6, wy - 6, ww + 12, wh + 12); else { g.fillRect(wx - 10, wy - 6, ww * 0.18, wh + 12); g.fillRect(wx + ww - ww * 0.18 + 10, wy - 6, ww * 0.18, wh + 12); }
    // clock
    const kx = w * 0.46, ky = h * 0.16, kr = Math.min(w, h) * 0.06;
    g.fillStyle = '#e8e2d6'; g.beginPath(); g.arc(kx, ky, kr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 3; const ha = ((sc.h % 12) + sc.m / 60) / 12 * Math.PI * 2 - Math.PI / 2, ma = sc.m / 60 * Math.PI * 2 - Math.PI / 2;
    g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(ha) * kr * 0.5, ky + Math.sin(ha) * kr * 0.5); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + Math.cos(ma) * kr * 0.8, ky + Math.sin(ma) * kr * 0.8); g.stroke();
    // chair + bed + lamp
    g.fillStyle = sc.chair[1]; g.fillRect(w * 0.44, h * 0.56, w * 0.08, h * 0.05); g.fillRect(w * 0.44, h * 0.4, w * 0.015, h * 0.32); g.fillRect(w * 0.505, h * 0.6, w * 0.015, h * 0.12); g.fillRect(w * 0.44, h * 0.6, w * 0.015, h * 0.12);
    g.fillStyle = '#e1d7c7'; g.fillRect(w * 0.62, h * 0.58, w * 0.34, h * 0.14); g.fillStyle = '#3a2a22'; g.fillRect(w * 0.62, h * 0.72, w * 0.34, h * 0.05);
    g.fillStyle = sc.lamp ? '#ffd866' : '#555'; g.beginPath(); g.moveTo(w * 0.88, h * 0.45); g.lineTo(w * 0.94, h * 0.45); g.lineTo(w * 0.92, h * 0.38); g.lineTo(w * 0.9, h * 0.38); g.closePath(); g.fill();
    if (phase === 'reveal') { g.strokeStyle = '#9dffc7'; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(cx - w * 0.06, cy - 12, w * 0.12, h * 0.4); g.setLineDash([]); g.fillStyle = '#9dffc7'; g.font = '12px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'center'; g.fillText('แค่เสื้อแขวน', cx, cy + h * 0.43); }
    f.overlay.replaceChildren(el('span', { class: 'badge' }, phase === 'show' ? `จำไว้… ${left}` : 'เฉลย'));
  }
  render();
  return { unmount: () => { clearInterval(timer); c.stop(); } };
}
