import { boot } from '../core/boot.js';
import { url } from '../core/content.js';
import { el } from '../core/ui.js';
import { TOYS, GROUPS, mountToy } from '../toys/index.js';
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
  const all = Object.entries(TOYS);
  let grp = GROUPS[location.hash.slice(1)] ? location.hash.slice(1) : 'all';
  const chips = el('div', { class: 'chips lab-chips', role: 'group', 'aria-label': 'เลือกหมวดเครื่องมือ' });
  const grid = el('div', { class: 'lab-grid' });
  const card = ([k, t], i) => el('a', { class: 'hud tool-card reveal', href: url(`lab.html?tool=${k}`), 'data-tilt': '', style: { '--d': `${(i % 3) * 110}ms` } },
    el('span', { class: 'num', 'data-scramble': '' }, `TOOL ${String(all.findIndex(([x]) => x === k) + 1).padStart(2, '0')} · ${GROUPS[t.group].icon} ${GROUPS[t.group].name}`),
    el('span', { class: 'topic-line' }, t.topic),
    el('h3', {}, t.title),
    el('p', {}, t.blurb));
  function show() {
    chips.replaceChildren(...['all', ...Object.keys(GROUPS)].map((g) => el('button', {
      type: 'button', 'aria-pressed': String(g === grp),
      onclick: () => { grp = g; history.replaceState(null, '', g === 'all' ? location.pathname : `#${g}`); show(); },
    }, g === 'all' ? `ทั้งหมด (${all.length})` : `${GROUPS[g].icon} ${GROUPS[g].name} (${all.filter(([, t]) => t.group === g).length})`)));
    grid.replaceChildren(...all.filter(([, t]) => grp === 'all' || t.group === grp).map(card));
    reveals(grid);
    tilt(grid);
  }
  root.append(chips, grid);
  show();
}
