// ผีถ้วยแก้ว: the Thai spirit-glass board. Keep a finger on the glass and it walks to the letters.
// Your own small finger movements are added to the path, and "no-ghost mode" lets only those move it,
// which is the ideomotor effect that moves real Ouija planchettes.
import { el, svg, announce } from '../core/ui.js';
import { playSample } from '../core/samples.js';
import { load, save } from '../core/store.js';
import { award } from '../core/badges.js';

const CONS = 'กขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ'.split('');
const MARKS = ['ะ', 'า', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', 'เ', 'แ', 'โ', 'ใ', 'ไ', 'ำ', 'ั', '็', '่', '้', '๊', '๋', '์'];
const COMBINING = new Set(['ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', 'ั', '็', '่', '้', '๊', '๋', '์']);
const PRESETS = ['คุณชื่ออะไร', 'คุณอยู่ที่ไหน', 'คุณอายุเท่าไหร่', 'คุณต้องการอะไร', 'ในห้องนี้มีคนอื่นไหม', 'งวดนี้ออกอะไร'];
const HOME = { x: 500, y: 600 };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// a canned answer, picked by what the question seems to be about
function answer(q) {
  const has = (...w) => w.some((x) => q.includes(x));
  if (has('ชื่อ')) return pick(['นิด', 'แก้ว', 'จำไม่ได้', 'ไม่บอก']);
  if (has('อยู่ไหน', 'ที่ไหน', 'ตรงไหน')) return pick(['ข้างหลัง', 'ใต้เตียง', 'ห้อง407', 'ตรงนี้']);
  if (has('อายุ', 'กี่ปี')) return pick(['7', '17', '99']);
  if (has('หวย', 'เลข', 'งวด', 'รางวัล')) return pick(['ทำบุญก่อน', 'ไม่ให้', 'ไม่รู้']);
  if (has('ตาย')) return pick(['จำไม่ได้', 'มืด', 'หนาว']);
  if (has('ต้องการ', 'อยากได้', 'อยากให้')) return pick(['บุญ', 'เพื่อน', 'กลับบ้าน', 'อย่าหันไป']);
  if (has('รัก', 'แฟน')) return pick(['ใช่', 'ไม่ใช่', 'รอ', 'เขารู้']);
  if (has('คนอื่น')) return pick(['ใช่', 'สาม', 'ข้างหลัง']);
  if (has('ไหม', 'มั้ย', 'หรือเปล่า', 'รึเปล่า', 'หรือไม่')) return pick(['ใช่', 'ใช่', 'ไม่ใช่', 'ไม่ใช่', 'ไม่รู้']);
  return pick(['ฟังอยู่', 'ใช่', 'ไม่ใช่', 'อย่าถาม', 'รอ']);
}

export function glass(host) {
  const cells = new Map(); // label -> {x, y, node}
  const board = svg('svg', { viewBox: '0 0 1000 700', class: 'glass-board', role: 'img', 'aria-label': 'กระดานผีถ้วยแก้ว มีตัวอักษรไทย สระ ตัวเลข ใช่ ไม่ใช่ และวงกลมบ้านตรงกลางด้านล่าง' });
  const cell = (label, x, y, show = label, cls = 'g-cell') => {
    const node = svg('g', { class: cls }, svg('circle', { cx: x, cy: y, r: cls === 'g-big' ? 46 : 22 }), svg('text', { x, y: y + (cls === 'g-big' ? 9 : 8), 'text-anchor': 'middle' }, show));
    board.append(node); cells.set(label, { x, y, node });
  };
  board.append(svg('rect', { x: 8, y: 8, width: 984, height: 684, rx: 18, class: 'g-frame' }),
    svg('text', { x: 500, y: 92, 'text-anchor': 'middle', class: 'g-title' }, 'ผีถ้วยแก้ว'));
  cell('ใช่', 130, 82, 'ใช่', 'g-big');
  cell('ไม่ใช่', 870, 82, 'ไม่ใช่', 'g-big');
  CONS.forEach((c, i) => cell(c, 85 + (i % 14) * 64, 175 + Math.floor(i / 14) * 70, c));
  MARKS.forEach((m, i) => cell(m, 70 + i * 43, 400, COMBINING.has(m) ? '◌' + m : m));
  for (let d = 0; d <= 9; d++) cell(String(d), 230 + d * 60, 480, String(d));
  board.append(svg('circle', { cx: HOME.x, cy: HOME.y, r: 60, class: 'g-home' }), svg('text', { x: HOME.x, y: HOME.y + 9, 'text-anchor': 'middle', class: 'g-home-t' }, 'บ้าน'));
  cells.set('บ้าน', { ...HOME, node: null });

  const cup = svg('g', { class: 'g-cup', tabindex: '0', role: 'button', 'aria-label': 'แก้ว กดค้างไว้ (หรือกด Space ค้าง) เพื่อวางนิ้วบนแก้ว' },
    svg('circle', { r: 40, class: 'g-cup-rim' }), svg('circle', { r: 28, class: 'g-cup-base' }), svg('circle', { r: 5, class: 'g-finger' }));
  board.append(cup);

  const status = el('p', { class: 'glass-status', 'aria-live': 'polite' }, 'จุดธูปเชิญก่อน แล้ววางนิ้วบนแก้วค้างไว้');
  const said = el('p', { class: 'glass-answer', 'aria-live': 'polite' });
  const drift = el('span', { class: 'faint' }, '');
  const inviteBtn = el('button', { type: 'button', class: 'btn primary' }, '🕯️ จุดธูปเชิญวิญญาณ');
  const homeBtn = el('button', { type: 'button', class: 'btn', disabled: true }, '🙏 ส่งกลับบ้าน');
  const freeBtn = el('button', { type: 'button', class: 'btn small', 'aria-pressed': 'false' }, '🔬 โหมดไม่มีผี');
  const qIn = el('input', { type: 'text', maxlength: 60, placeholder: 'พิมพ์คำถามถึงวิญญาณ…', 'aria-label': 'คำถาม', disabled: true });
  const qForm = el('form', { class: 'glass-q' }, qIn, el('button', { type: 'submit', class: 'btn small', disabled: true }, 'ถาม'));
  const presets = el('div', { class: 'chips' }, ...PRESETS.map((p) => el('button', { type: 'button', disabled: true, onclick: () => askQ(p) }, p)));

  let pos = { ...HOME }, queue = [], holding = false, press = null, finger = { x: 0, y: 0 };
  let invited = !!load('glassOpen', false), asked = 0, dwell = 0, warned = false, free = false, raf = 0, freeAnchor = null, freeCell = null, freeSince = 0;

  const setInvited = (v) => {
    invited = v; save('glassOpen', v);
    inviteBtn.disabled = v; homeBtn.disabled = !v; qIn.disabled = !v; qForm.querySelector('button').disabled = !v;
    presets.querySelectorAll('button').forEach((b) => { b.disabled = !v; });
  };
  setInvited(invited);
  if (invited) status.textContent = 'วิญญาณที่คุณเชิญไว้คราวก่อนยังไม่ได้กลับบ้าน… ถามต่อได้ หรือส่งเขากลับให้เรียบร้อย';

  const go = (labels) => { queue.push(...labels.map((l) => ({ l, ...cells.get(l) })).filter((c) => c.x)); };
  function spell(text) {
    said.textContent = '';
    if (cells.has(text)) go([text]);
    else go([...text].filter((ch) => cells.has(ch)));
    go(['บ้าน']);
  }
  function askQ(q) {
    if (!invited || queue.length) return;
    asked++;
    status.textContent = `ถาม: "${q}" … วางนิ้วบนแก้วค้างไว้`;
    spell(answer(q));
  }

  inviteBtn.onclick = () => {
    setInvited(true);
    status.textContent = '"ถ้ามีวิญญาณอยู่ตรงนี้ ขอให้มาที่ใช่" — วางนิ้วบนแก้วค้างไว้';
    playSample('whisper', { gain: 0.5 });
    said.textContent = '';
    go(['ใช่', 'บ้าน']);
  };
  homeBtn.onclick = () => {
    queue = [];
    status.textContent = '"ขอบคุณที่มา เชิญกลับบ้านได้แล้ว" — วางนิ้วค้างไว้จนแก้วถึงบ้าน';
    go(['บ้าน']);
    queue[queue.length - 1].sendHome = true;
  };
  qForm.onsubmit = (e) => { e.preventDefault(); const q = qIn.value.trim(); if (q) { askQ(q); qIn.value = ''; } };
  freeBtn.onclick = () => {
    free = !free; freeBtn.setAttribute('aria-pressed', String(free));
    queue = []; said.textContent = ''; freeAnchor = null;
    status.textContent = free
      ? 'โหมดไม่มีผี: แก้วขยับตามนิ้วคุณอย่างเดียว (ขยายให้ใหญ่ขึ้น 3 เท่า) วางนิ้วค้างไว้ อย่าตั้งใจขยับ แค่คิดถึงคำตอบในใจ แล้วดูว่าแก้วไปไหน'
      : 'กลับสู่โหมดปกติ';
  };

  // ---- finger on the glass ----
  const toBoard = (e) => { const p = board.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(board.getScreenCTM().inverse()); };
  cup.addEventListener('pointerdown', (e) => { e.preventDefault(); cup.setPointerCapture(e.pointerId); holding = true; press = toBoard(e); finger = { x: 0, y: 0 }; freeAnchor = { ...pos }; cup.classList.add('held'); });
  cup.addEventListener('pointermove', (e) => { if (!holding || !press) return; const p = toBoard(e); finger = { x: p.x - press.x, y: p.y - press.y }; });
  const release = () => { if (!holding) return; holding = false; press = null; finger = { x: 0, y: 0 }; cup.classList.remove('held'); if (queue.length && !warned) { warned = true; status.textContent = '⚠️ ห้ามยกนิ้วออกระหว่างที่แก้วกำลังเดิน! วางนิ้วกลับไปเร็ว'; } };
  cup.addEventListener('pointerup', release); cup.addEventListener('pointercancel', release);
  cup.addEventListener('keydown', (e) => { if (e.key === ' ' && !holding) { e.preventDefault(); holding = true; freeAnchor = { ...pos }; cup.classList.add('held'); } });
  cup.addEventListener('keyup', (e) => { if (e.key === ' ') release(); });

  function arrive(t) {
    t.node?.classList.add('hit'); setTimeout(() => t.node?.classList.remove('hit'), 700);
    if (t.l !== 'บ้าน') { said.textContent += t.l; announce(t.l); }
    if (t.l === 'บ้าน' && queue.length === 0) {
      if (t.sendHome) {
        setInvited(false);
        status.textContent = 'แก้วกลับถึงบ้านแล้ว วิญญาณกลับไปเรียบร้อย ยกนิ้วได้';
        playSample('bell', { gain: 0.5 });
        if (asked) award('glass');
      } else if (said.textContent) status.textContent = `คำตอบ: "${said.textContent}" — ถามต่อได้ หรือส่งกลับบ้าน`;
      warned = false;
    }
  }

  function frame() {
    const t = queue[0];
    if (free && holding && freeAnchor) {
      pos = { x: Math.max(40, Math.min(960, freeAnchor.x + finger.x * 3)), y: Math.max(40, Math.min(660, freeAnchor.y + finger.y * 3)) };
      let near = null, best = 34;
      for (const [l, c] of cells) { const d = Math.hypot(c.x - pos.x, c.y - pos.y); if (d < best && c.node) { best = d; near = l; } }
      if (near !== freeCell) { freeCell = near; freeSince = performance.now(); }
      else if (near && performance.now() - freeSince > 1200) { arrive({ l: near, ...cells.get(near) }); freeSince = performance.now() + 99999; }
    } else if (t && holding) {
      const dx = t.x - pos.x, dy = t.y - pos.y, d = Math.hypot(dx, dy);
      if (d < 3) {
        if (!dwell) dwell = performance.now();
        if (performance.now() - dwell > 520) { dwell = 0; queue.shift(); arrive(t); if (queue[0]) playSample('slide', { gain: 0.45, rate: 0.9 + Math.random() * 0.3 }); }
      } else {
        if (d > 200 && !t.started) { t.started = true; playSample('slide', { gain: 0.45, rate: 0.9 + Math.random() * 0.3 }); }
        const sp = Math.min(d, 4.5 + Math.sin(performance.now() / 180) * 1.5);
        pos = { x: pos.x + (dx / d) * sp, y: pos.y + (dy / d) * sp };
      }
    }
    const fx = free ? 0 : Math.max(-50, Math.min(50, finger.x * 0.5)), fy = free ? 0 : Math.max(-50, Math.min(50, finger.y * 0.5));
    cup.setAttribute('transform', `translate(${pos.x + fx} ${pos.y + fy})`);
    drift.textContent = holding ? `นิ้วคุณขยับไป ${Math.round(Math.hypot(finger.x, finger.y))} หน่วย` : '';
    raf = requestAnimationFrame(frame);
  }
  frame();

  host.append(
    el('div', { class: 'glass-wrap' }, board),
    status, said,
    el('div', { class: 'radio-row' }, inviteBtn, homeBtn, freeBtn, drift),
    qForm, presets,
    el('details', { class: 'hud glass-why' },
      el('summary', {}, '🔬 ทำไมแก้วถึงเลื่อนได้เอง?'),
      el('p', {}, 'ผีถ้วยแก้วของไทยกับกระดานวิญญาณ (Ouija) ของฝรั่งทำงานแบบเดียวกัน ทุกคนวางนิ้วบนแก้ว ไม่มีใครตั้งใจผลัก แต่แก้วก็เดินได้ นักวิทยาศาสตร์เรียกว่า **ปรากฏการณ์ไอดีโอมอเตอร์ (ideomotor effect)** คือกล้ามเนื้อเราขยับนิดๆ ตามสิ่งที่เราคิดหรือคาดหวัง โดยที่เราไม่รู้สึกว่าตัวเองเป็นคนทำ คำนี้ตั้งโดยนักสรีรวิทยาชาวอังกฤษในปี 1852'.replace(/\*\*/g, '')),
      el('p', {}, 'ในเกมนี้ แก้วเดินตามคำตอบที่เว็บสุ่มไว้ แต่ทุกการขยับเล็กๆ ของนิ้วคุณก็ถูกบวกเข้าไปด้วย ลองกด "โหมดไม่มีผี" ดู แก้วจะขยับตามนิ้วคุณอย่างเดียว แล้วคุณอาจแปลกใจว่ามันไปหยุดที่ตัวอักษรที่คุณกำลังคิดอยู่'),
      el('p', { class: 'faint' }, 'มีงานวิจัยของมหาวิทยาลัยบริติชโคลัมเบีย (Gauchou, Rensink & Fels, 2012) ที่ให้คนตอบคำถามความรู้ผ่านกระดานวิญญาณ แล้วพบว่าตอนที่คนคิดว่าตัวเอง "แค่เดา" กระดานกลับตอบถูกบ่อยกว่าตอนตอบเองตรงๆ เหมือนนิ้วรู้คำตอบที่ใจยังไม่แน่ใจ'),
      el('p', { class: 'faint' }, 'คนไทยรุ่นก่อนมีกติกาว่าห้ามยกนิ้วกลางคัน และต้องส่งวิญญาณกลับบ้านทุกครั้งก่อนเลิกเล่น ในเกมนี้ก็เหมือนกัน ถ้าลืมส่งกลับ… เว็บจะคอยเตือนคุณเอง')));

  return () => cancelAnimationFrame(raf);
}
