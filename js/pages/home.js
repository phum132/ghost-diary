import { boot } from '../core/boot.js';
import { states, url, now } from '../core/content.js';
import { el, fmtCountdown, announce } from '../core/ui.js';

const labels = { figure: 'SUBJECT: ร่างที่ประตู', ring: 'SUBJECT: วงแสงรอบเงา', 407: 'SUBJECT: ห้อง 407' };

const scene = boot('home', { scene: 'hero' });
scene.then((s) => {
  const btn = document.getElementById('morph');
  if (!s) { btn.hidden = true; return; }
  btn.addEventListener('click', () => {
    s.next();
    const l = labels[s.shape()];
    document.getElementById('shape-label').textContent = l;
    announce(l);
  });
  setInterval(() => { document.getElementById('shape-label').textContent = labels[s.shape()] || ''; }, 1000);
});

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
  list.replaceChildren(...rows);

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
