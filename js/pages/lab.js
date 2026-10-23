import { boot } from '../core/boot.js';
import { url } from '../core/content.js';
import { el } from '../core/ui.js';
import { TOYS, mountToy } from '../toys/index.js';

boot('lab');
const root = document.getElementById('lab-root');
const tool = new URLSearchParams(location.search).get('tool');

if (tool && TOYS[tool]) {
  document.title = `${TOYS[tool].title} — SLUR Lab`;
  document.getElementById('lab-title').textContent = TOYS[tool].title;
  document.querySelector('.lead').textContent = TOYS[tool].blurb;
  const host = el('div');
  root.append(el('p', { class: 'back-row' }, el('a', { href: url('lab.html') }, '← เครื่องมือทั้งหมด')), host);
  mountToy(tool, host).catch((e) => { console.error(e); host.append(el('p', {}, 'โหลดเครื่องมือไม่ได้ ลองรีเฟรชอีกครั้ง')); });
} else {
  root.append(el('div', { class: 'lab-grid' }, ...Object.entries(TOYS).map(([k, t], i) =>
    el('a', { class: 'hud tool-card', href: url(`lab.html?tool=${k}`) },
      el('span', { class: 'num' }, `TOOL ${String(i + 1).padStart(2, '0')} · ${t.topic}`),
      el('h3', {}, t.title),
      el('p', {}, t.blurb)))));
}
