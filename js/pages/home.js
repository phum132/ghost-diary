import { boot } from '../core/boot.js';
import { states, url, now } from '../core/content.js';
import { el, fmtCountdown, announce, reduceMotion, osReducesMotion } from '../core/ui.js';
import { setPref, prefs } from '../core/store.js';
import { reveals, tilt, scramble } from '../core/fx.js';

const labels = { figure: 'SUBJECT: FIGURE AT THE DOOR', ring: 'SUBJECT: GLORY RING', 407: 'SUBJECT: ROOM 407' };
const hero = document.getElementById('hero');
const shapeLabel = document.getElementById('shape-label');

// the OS can ask for less motion (Windows "Animation effects" off); offer the full show instead of silently going static
const chip = document.getElementById('motion-chip');
if (osReducesMotion() && prefs().motion === 'auto') {
  chip.hidden = false;
  chip.addEventListener('click', () => { setPref('motion', 'full'); location.reload(); });
}

const scene = boot('home', { scene: 'hero' });
let lastShape = '';
const showShape = (s) => {
  const k = s.shape();
  if (k === lastShape) return;
  lastShape = k;
  shapeLabel.dataset.text = labels[k] || '';
  scramble(shapeLabel, 500);
};
scene.then((s) => {
  const btn = document.getElementById('morph');
  if (!s) { btn.hidden = true; return; }
  btn.addEventListener('click', () => { s.next(); showShape(s); announce(shapeLabel.dataset.text); });
  setInterval(() => showShape(s), 400);
  // scroll position through the tall hero = progress of the 3D story
  const onScroll = () => {
    const r = hero.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - innerHeight)));
    s.setProgress(p);
    const stage = p < 0.34 ? 0 : p < 0.68 ? 1 : 2;
    if (hero.dataset.stage !== String(stage)) hero.dataset.stage = stage;
  };
  if (!reduceMotion()) { addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
});
requestAnimationFrame(() => hero.classList.add('ready'));

// HUD ticker: duplicated so the -50% loop is seamless
const words = ['CASE 407 · LIVE', 'ห้ามเปิดประตูตอนตีสาม', '19 Hz', 'ทางเดิน 12 ก้าว', 'ไฟผีกระสือ', 'P(ผี | เห็น) = ?', 'ตรวจท่อแก๊สล่าสุด ????', 'ไม่มีใครอยู่ครบเทอม', 'SLUR LAB'];
document.getElementById('ticker').append(...[...words, ...words].map((w) => el('span', {}, w)));

const clock = document.getElementById('clock');
setInterval(() => { clock.textContent = new Date().toLocaleTimeString('th-TH', { hour12: false }); }, 1000);

async function toc() {
  const list = document.getElementById('toc-list');
  let items;
  try { items = await states(); } catch (e) {
    list.replaceChildren(el('li', { class: 'toc-skel' }, 'เปิดสารบัญไม่ได้ ตรวจอินเทอร์เน็ตแล้วรีเฟรชอีกครั้ง'));
    return;
  }
  const rows = [];
  let futureCount = 0;
  for (const e of items) {
    if (e.state === 'future') { futureCount++; continue; }
    const day = el('span', { class: 'day' }, `วันที่ ${String(e.day).padStart(2, '0')}`);
    if (e.state === 'soon') {
      rows.push(el('li', {}, el('div', { class: 'row-static' }, day, el('span', { class: 'ttl faint' }, '? ? ? ?'),
        el('span', { class: 'meta' }, 'เปิดใน ', el('span', { class: 'mono', 'data-count': e.at.getTime() }, fmtCountdown(e.at - now()))))));
      continue;
    }
    const chip = e.state === 'password' ? el('span', { class: 'chip lock' }, '🔒 ล็อกด้วยรหัส')
      : e.read ? el('span', { class: 'meta' }, 'อ่านแล้ว') : el('span', { class: 'chip new' }, 'ใหม่');
    rows.push(el('li', {}, el('a', { href: url(`entry.html?id=${e.id}`), class: e.read ? 'read' : '' },
      day, el('span', { class: 'ttl' }, e.state === 'password' ? (e.teaser || 'หน้าที่ถูกล็อก') : e.title), chip)));
  }
  if (futureCount) rows.push(el('li', { class: 'future-row' }, `อีก ${futureCount} หน้า ยังไม่ถึงเวลาเปิด`));
  rows.forEach((r, i) => { r.classList.add('reveal'); r.style.setProperty('--d', `${Math.min(i, 8) * 60}ms`); });
  list.replaceChildren(...rows);
  reveals(list);

  // hero CTA → newest open page that hasn't been read, else newest open
  const open = items.filter((e) => e.state === 'open' || e.state === 'password');
  const target = open.find((e) => !e.read) || open[open.length - 1];
  if (target) {
    const cta = document.getElementById('cta-latest');
    cta.href = url(`entry.html?id=${target.id}`);
    cta.textContent = target.read ? `อ่านต่อ: วันที่ ${target.day}` : `อ่านบันทึกวันที่ ${target.day}`;
  }
  const soon = items.find((e) => e.state === 'soon');
  const line = document.getElementById('next-line');
  const tick = () => {
    document.querySelectorAll('[data-count]').forEach((n) => { n.textContent = fmtCountdown(+n.dataset.count - now()); });
    line.textContent = soon ? `หน้าถัดไปเปิดใน ${fmtCountdown(soon.at - now())}` : 'เปิดครบทุกหน้าแล้ว';
    if (soon && soon.at - now() <= 0) location.reload();
  };
  tick();
  setInterval(tick, 1000);
}
toc();
