import { boot } from '../core/boot.js';
import { url } from '../core/content.js';
import { el } from '../core/ui.js';
import { TOYS, mountToy } from '../toys/index.js';
import { reveals, tilt } from '../core/fx.js';

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
    el('a', { class: 'hud tool-card reveal', href: url(`lab.html?tool=${k}`), 'data-tilt': '', style: { '--d': `${(i % 3) * 110}ms` } },
      el('span', { class: 'num', 'data-scramble': '' }, `TOOL ${String(i + 1).padStart(2, '0')}`),
      el('span', { class: 'topic-line' }, t.topic),
      el('h3', {}, t.title),
      el('p', {}, t.blurb)))));
  reveals(root);
  tilt(root);
}
