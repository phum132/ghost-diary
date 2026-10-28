import { boot } from '../core/boot.js';
import { getJSON, url, config, preview } from '../core/content.js';
import { el } from '../core/ui.js';
import { load, save } from '../core/store.js';
import { reveals } from '../core/fx.js';
import { COUNTRIES } from '../stories/meta.js';
import { submitForm } from '../stories/submit.js';

boot('webboard');

const ROOMS = [
  { term: 'board-encounter', icon: '👁️', title: 'เจอกับตัว', desc: 'เรื่องที่คุณเจอเอง เห็น ได้ยิน หรือรู้สึกว่ามีอะไรอยู่ด้วย' },
  { term: 'board-dorm', icon: '🏫', title: 'หอพัก · โรงเรียน', desc: 'ห้องพัก หอใน ห้องน้ำโรงเรียน ค่ายลูกเสือ' },
  { term: 'board-work', icon: '🏥', title: 'โรงพยาบาล · ที่ทำงาน', desc: 'เวรดึก ออฟฟิศว่างตอนสองทุ่ม โรงงาน ร้านสะดวกซื้อ' },
  { term: 'board-travel', icon: '🛣️', title: 'เดินทาง · โรงแรม', desc: 'ถนนเปลี่ยว แท็กซี่ โรงแรม รีสอร์ต บ้านเพื่อนต่างจังหวัด' },
  { term: 'board-dream', icon: '🌙', title: 'ฝัน · ผีอำ', desc: 'ฝันซ้ำ ฝันเห็นคนตาย ตื่นมาขยับไม่ได้' },
];
const BOARDS = { all: 'ทุกเว็บบอร์ด', Pantip: 'Pantip', '2channel': '2channel', PTT: 'PTT', Reddit: 'Reddit', 'เว็บบอร์ดเกาหลี': 'เกาหลี' };

// ---- tabs ----
const tabs = { world: document.getElementById('tab-world'), ours: document.getElementById('tab-ours') };
function show(name) {
  for (const [k, b] of Object.entries(tabs)) {
    b.setAttribute('aria-selected', String(k === name));
    document.getElementById(`pane-${k}`).hidden = k !== name;
  }
  history.replaceState(null, '', `#${name}`);
}
tabs.world.addEventListener('click', () => show('world'));
tabs.ours.addEventListener('click', () => show('ours'));
show(location.hash === '#ours' ? 'ours' : 'world');

// ---- retold threads from around the world ----
let threads = [];
let board = 'all';
const box = document.getElementById('threads');
const chips = document.getElementById('boards');

function renderThreads() {
  const read = load('storyRead', {}), fear = load('fear', {});
  const list = threads.filter((s) => board === 'all' || s.board === board);
  box.replaceChildren(
    el('div', { class: 'wb-row wb-th', 'aria-hidden': 'true' }, el('span', {}, 'กระทู้'), el('span', {}, 'เว็บบอร์ด'), el('span', {}, 'ปี'), el('span', {}, '')),
    ...list.map((s) => el('div', { class: 'wb-row' + (read[s.id] ? ' read' : '') },
      el('a', { class: 'wb-title', href: url(`story.html?id=${s.id}`) }, el('b', {}, s.title), el('span', { class: 'faint' }, s.blurb)),
      el('span', { class: 'wb-board' }, s.board, el('small', {}, ` · ${COUNTRIES[s.cc] || s.cc}`)),
      el('span', { class: 'mono' }, String(s.year)),
      el('span', { class: 'wb-acts' },
        fear[s.id] ? el('span', { title: 'ความน่ากลัวที่คุณให้' }, '💀'.repeat(fear[s.id]))
          : read[s.id] ? el('span', { class: 'faint' }, 'อ่านแล้ว') : el('span', { class: 'new' }, 'ใหม่'),
        el('a', { class: 'btn small', href: s.thread || s.sources?.[0]?.[1], target: '_blank', rel: 'noopener' }, s.thread ? 'ต้นฉบับ ↗' : 'ที่มา ↗')))));
  reveals(box);
}

function renderChips() {
  const have = new Set(threads.map((s) => s.board));
  chips.replaceChildren(...Object.entries(BOARDS).filter(([k]) => k === 'all' || have.has(k)).map(([k, t]) => el('button', {
    type: 'button', 'aria-pressed': String(k === board),
    onclick: () => { board = k; renderChips(); renderThreads(); },
  }, `${t} (${k === 'all' ? threads.length : threads.filter((s) => s.board === k).length})`)));
}

let readers = [];
getJSON('content/stories/index.json').then((all) => {
  threads = all.filter((s) => s.type === 'forum').sort((a, b) => b.year - a.year);
  readers = all.filter((s) => s.type === 'reader').reverse();
  renderChips(); renderThreads(); renderReaders();
}).catch(() => box.replaceChildren(el('p', {}, 'โหลดกระทู้ไม่ได้ ลองรีเฟรชอีกครั้ง')));

// ---- stories readers sent in (picked by the owner, built by _src/import-reader-stories.mjs) ----
function renderReaders() {
  const host = document.getElementById('reader-list');
  const list = readers.filter((s) => s.board === room.term);
  const read = load('storyRead', {});
  host.replaceChildren(
    el('h3', { class: 'eyebrow' }, `เรื่องจากคนอ่านในห้องนี้ (${list.length})`),
    list.length
      ? el('ul', { class: 'wb-reader-ul' }, ...list.map((s) => el('li', {},
          el('a', { class: 'wb-title', href: url(`story.html?id=${s.id}`) }, el('b', {}, s.title, read[s.id] ? '' : el('span', { class: 'new' }, 'ใหม่')), el('span', { class: 'faint' }, `เล่าโดย ${s.by} · ${s.blurb}`)))))
      : el('p', { class: 'faint' }, 'ห้องนี้ยังไม่มีเรื่องที่ได้ขึ้นเว็บ เป็นคนแรกที่เล่าสิ ฟอร์มอยู่ด้านล่าง'));
}

// ---- our rooms: one giscus discussion per room ----
const roomsBox = document.getElementById('rooms');
const roomBox = document.getElementById('room-box');
let room = ROOMS.find((r) => r.term === load('wbRoom', '')) || ROOMS[0];
let cfg = null;
let mounted = false;

function renderRooms() {
  roomsBox.replaceChildren(...ROOMS.map((r) => el('button', {
    type: 'button', class: 'hud wb-room-btn', 'aria-pressed': String(r === room), onclick: () => pick(r),
  }, el('span', { class: 'ico', 'aria-hidden': 'true' }, r.icon), el('b', {}, r.title), el('span', { class: 'faint' }, r.desc))));
  document.getElementById('room-title').textContent = `${room.icon} ${room.title}`;
  document.getElementById('room-desc').textContent = room.desc;
}

function pick(r) {
  room = r;
  save('wbRoom', r.term);
  renderRooms();
  renderReaders();
  const roomSel = document.querySelector('.sf select[name="room"]');
  if (roomSel) roomSel.value = r.term;
  const frame = document.querySelector('iframe.giscus-frame');
  if (frame) frame.contentWindow.postMessage({ giscus: { setConfig: { term: r.term } } }, 'https://giscus.app');
}

function mount() {
  const g = cfg?.giscus || {};
  if (!(g.repo && g.repoId && g.categoryId)) { roomBox.replaceChildren(el('p', { class: 'faint' }, preview() ? 'ยังไม่ได้ตั้งค่า giscus' : 'ห้องคุยยังไม่เปิด')); return; }
  const local = /^(localhost|127\.)/.test(location.hostname);
  mounted = true;
  roomBox.replaceChildren(el('div', { class: 'giscus' }), el('script', {
    src: 'https://giscus.app/client.js', 'data-repo': g.repo, 'data-repo-id': g.repoId, 'data-category': g.category, 'data-category-id': g.categoryId,
    'data-mapping': 'specific', 'data-term': room.term, 'data-strict': '1', 'data-reactions-enabled': '1', 'data-input-position': 'top',
    'data-theme': local ? 'dark' : url('css/giscus-theme.css'), 'data-lang': 'th', crossorigin: 'anonymous', async: true,
  }));
}

renderRooms();
config().then((c) => {
  cfg = c;
  const sf = submitForm({ prefillUrl: c.storyForm?.prefillUrl, rooms: ROOMS, current: room.term });
  if (sf) {
    document.getElementById('submit-slot').append(sf);
    roomsBox.before(el('a', { class: 'btn primary wb-tell', href: '#submit-slot', onclick: (e) => { e.preventDefault(); sf.scrollIntoView({ behavior: 'smooth', block: 'start' }); sf.querySelector('input')?.focus({ preventScroll: true }); } }, '✍️ เล่าเรื่องผีของคุณ (ไม่ต้องล็อกอิน)'));
  }
  else if (preview()) document.getElementById('submit-slot').append(el('p', { class: 'mono faint' }, '(พรีวิว) ฟอร์มส่งเรื่องยังไม่เปิด ใส่ storyForm.prefillUrl ใน config.json ก่อน ดูคู่มือหัวข้อ 11'));
  roomBox.append(el('button', { class: 'btn primary', type: 'button', onclick: () => mount() }, 'เปิดห้องเล่าเรื่อง'));
  if (location.hash === '#ours' && !mounted) mount();
});
