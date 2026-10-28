// "ส่งเรื่องผีของคุณ" form. No login: answers go to the owner's Google Form (free) and land in a Google Sheet.
// The owner pastes a Google Forms *pre-filled link* into content/config.json -> storyForm.prefillUrl,
// where each question was pre-filled with one key word: nick, room, title, story, place, when, consent.
import { el, toast } from '../core/ui.js';
import { load, save } from '../core/store.js';
import { award } from '../core/badges.js';

const KEYS = ['nick', 'room', 'title', 'story', 'place', 'when', 'consent'];
const MIN_STORY = 150, MAX_STORY = 8000, COOLDOWN = 3 * 60 * 1000;
const WHEN = ['ปีนี้', '1-5 ปีก่อน', 'นานกว่า 5 ปี', 'ตอนเด็ก', 'ไม่แน่ใจ'];

// "https://docs.google.com/forms/d/e/<id>/viewform?usp=pp_url&entry.1=nick&..." -> { action, map: { nick: 'entry.1', ... } }
export function parsePrefill(link) {
  try {
    const u = new URL(link);
    if (u.hostname !== 'docs.google.com' || !/\/forms\/d\/e\/[\w-]+\/viewform/.test(u.pathname)) return null;
    const map = {};
    for (const [k, v] of u.searchParams) if (/^entry\.\d+$/.test(k) && KEYS.includes(v.trim().toLowerCase())) map[v.trim().toLowerCase()] = k;
    if (!map.story || !map.title) return null;
    return { action: u.origin + u.pathname.replace(/\/viewform$/, '/formResponse'), map };
  } catch { return null; }
}

export function submitForm({ prefillUrl, rooms, current }) {
  const form = parsePrefill(prefillUrl || '');
  if (!form) return null;
  const draft = load('storyDraft', {});
  const field = (label, input) => el('label', { class: 'sf-field' }, el('span', { class: 'sf-label' }, label), input);
  const nick = el('input', { name: 'nick', required: true, minlength: 2, maxlength: 30, autocomplete: 'nickname', placeholder: 'เช่น คนนอนไม่หลับห้อง 5', value: draft.nick || '' });
  const room = el('select', { name: 'room' }, ...rooms.map((r) => el('option', { value: r.term, selected: r.term === (draft.room || current) }, `${r.icon} ${r.title}`)));
  const title = el('input', { name: 'title', required: true, minlength: 4, maxlength: 80, placeholder: 'ตั้งชื่อเรื่องให้น่าอ่าน', value: draft.title || '' });
  const story = el('textarea', { name: 'story', required: true, maxlength: MAX_STORY, rows: 10, placeholder: 'เล่าเหมือนเล่าให้เพื่อนฟัง เกิดอะไรขึ้น ตอนไหน แล้วตอนนี้เป็นยังไง' });
  story.value = draft.story || '';
  const place = el('input', { name: 'place', maxlength: 60, placeholder: 'เช่น หอพักแถวรังสิต, โรงพยาบาลต่างจังหวัด', value: draft.place || '' });
  const when = el('select', { name: 'when' }, ...WHEN.map((w) => el('option', { selected: w === draft.when }, w)));
  const consent = el('input', { type: 'checkbox', name: 'consent' });
  const trap = el('input', { name: 'website', tabindex: '-1', autocomplete: 'off', class: 'sf-trap', 'aria-hidden': 'true' }); // bots fill this
  const count = el('small', { class: 'faint sf-count', 'aria-live': 'polite' });
  const status = el('p', { class: 'sf-status', role: 'status' });
  const send = el('button', { class: 'btn primary', type: 'submit' }, '🕯️ ส่งเรื่อง');

  const updateCount = () => {
    const n = story.value.trim().length;
    count.textContent = n < MIN_STORY ? `${n} ตัวอักษร · ขอเพิ่มอีก ${MIN_STORY - n} ตัวอักษร` : `${n} / ${MAX_STORY} ตัวอักษร`;
  };
  const keepDraft = () => save('storyDraft', { nick: nick.value, room: room.value, title: title.value, story: story.value, place: place.value, when: when.value });
  updateCount();

  const f = el('form', { class: 'sf hud', novalidate: true },
    el('div', { class: 'sf-head' },
      el('h2', {}, '✍️ ส่งเรื่องผีของคุณ'),
      el('p', { class: 'faint' }, 'ไม่ต้องล็อกอิน เรื่องที่ SLUR เลือกจะได้ขึ้นเว็บพร้อมนามแฝงของคุณ และอาจถูกเล่าในคลิปหรือไลฟ์')),
    el('div', { class: 'sf-grid' }, field('นามแฝง', nick), field('ห้อง', room)),
    field('ชื่อเรื่อง', title),
    field('เรื่องที่เจอ', story), count,
    el('div', { class: 'sf-grid' }, field('เกิดที่ไหน (ไม่ต้องบอกชื่อจริงของสถานที่)', place), field('เกิดเมื่อไหร่', when)),
    trap,
    el('label', { class: 'sf-consent' }, consent,
      el('span', {}, 'เรื่องนี้เป็นของฉันหรือคนใกล้ตัว ไม่ได้ก๊อปมาจากที่อื่น และยินยอมให้ SLUR นำไปลงเว็บ เล่าในคลิปหรือไลฟ์ โดยอาจแก้คำผิดหรือตัดให้สั้นลง')),
    el('p', { class: 'faint sf-rules' }, 'ห้ามใส่ชื่อจริง เบอร์โทร ที่อยู่ หรือชื่อโรงเรียนและบริษัทที่ทำให้รู้ว่าเป็นใคร ทั้งของตัวเองและคนอื่น'),
    el('div', { class: 'sf-actions' }, send, status));

  f.addEventListener('input', () => { updateCount(); keepDraft(); status.textContent = ''; });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = (msg, input) => { status.textContent = msg; status.className = 'sf-status err'; input?.focus(); };
    if (trap.value) return; // silently drop bots
    if (nick.value.trim().length < 2) return bad('ใส่นามแฝงก่อนนะ อย่างน้อย 2 ตัวอักษร', nick);
    if (title.value.trim().length < 4) return bad('ตั้งชื่อเรื่องก่อน อย่างน้อย 4 ตัวอักษร', title);
    if (story.value.trim().length < MIN_STORY) return bad(`เล่าอีกนิด เรื่องต้องยาวอย่างน้อย ${MIN_STORY} ตัวอักษร`, story);
    if (!consent.checked) return bad('ติ๊กยินยอมก่อนส่งนะ', consent);
    if (Date.now() - load('storySentAt', 0) < COOLDOWN) return bad('เพิ่งส่งไปเมื่อกี้ รออีกสักครู่ค่อยส่งเรื่องต่อไปนะ');

    const roomName = rooms.find((r) => r.term === room.value)?.title || room.value;
    const vals = { nick: nick.value.trim(), room: roomName, title: title.value.trim(), story: story.value.trim(), place: place.value.trim(), when: when.value, consent: 'ยินยอม' };
    const body = new URLSearchParams();
    for (const [k, entry] of Object.entries(form.map)) body.append(entry, vals[k] ?? '');
    send.disabled = true; status.className = 'sf-status'; status.textContent = 'กำลังส่ง…';
    try {
      // Google Forms sends no CORS headers, so the reply is opaque; a network failure still throws
      await fetch(form.action, { method: 'POST', mode: 'no-cors', body });
      save('storySentAt', Date.now());
      save('storyDraft', {});
      f.replaceChildren(el('div', { class: 'sf-done' },
        el('h2', {}, '🕯️ ได้รับเรื่องแล้ว ขอบคุณที่เล่านะ'),
        el('p', { class: 'dim' }, `"${vals.title}" ส่งถึง SLUR แล้ว ถ้าได้รับเลือกจะขึ้นในห้อง ${roomName} พร้อมนามแฝง ${vals.nick}`),
        el('button', { class: 'btn small', type: 'button', onclick: () => location.reload() }, 'เล่าอีกเรื่อง')));
      award('teller');
    } catch {
      send.disabled = false;
      bad('ส่งไม่สำเร็จ เน็ตอาจหลุด เรื่องของคุณยังอยู่ในช่อง ลองกดส่งอีกครั้ง');
      toast('ส่งไม่สำเร็จ ลองอีกครั้ง');
    }
  });
  return f;
}
