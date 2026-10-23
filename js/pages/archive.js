import { boot } from '../core/boot.js';
import { getJSON, url } from '../core/content.js';
import { el, reduceMotion } from '../core/ui.js';
import { load } from '../core/store.js';
import { reveals, tilt } from '../core/fx.js';
import { cover } from '../stories/covers.js';

boot('archive');
const COUNTRIES = { JP: 'ญี่ปุ่น', CN: 'จีน', TW: 'ไต้หวัน', KR: 'เกาหลี', US: 'อเมริกา', GB: 'อังกฤษ' };
const TYPES = { thread: 'กระทู้เน็ต', rumor: 'ข่าวลือจริง', case: 'เหตุการณ์จริง', folklore: 'ตำนานพื้นบ้าน', classic: 'วรรณกรรมคลาสสิก', place: 'สถานที่จริง' };

const grid = document.getElementById('grid');
const filters = document.getElementById('filters');
let all = [];
let filter = 'all';

const storyUrl = (s) => url(`story.html?id=${s.id}`);

function card(s, i) {
  const ratings = load('fear', {});
  const read = load('storyRead', {})[s.id];
  const pic = el('div', { class: 'pic' }, el('span', { class: 'tag' }, `${COUNTRIES[s.cc] || s.cc} · ${TYPES[s.type] || s.type}`));
  if (s.image) pic.append(el('img', { src: url(s.image), alt: '', loading: 'lazy', decoding: 'async' }));
  else pic.append(cover(s.id, 640, 360));
  return el('a', { class: 'hud story-card reveal', href: storyUrl(s), 'data-tilt': '', style: { '--d': `${(i % 3) * 100}ms` } },
    pic,
    el('div', { class: 'body' },
      el('h3', {}, s.title),
      el('span', { class: 'orig' }, s.orig),
      el('p', { class: 'blurb' }, s.blurb),
      el('div', { class: 'meta' },
        el('span', {}, `${s.year} · ${s.place}`),
        el('span', {}, ratings[s.id] ? '💀'.repeat(ratings[s.id]) : read ? 'อ่านแล้ว' : 'ยังไม่อ่าน'))));
}

function render() {
  const list = all.filter((s) => filter === 'all' || s.cc === filter);
  grid.replaceChildren(...list.map(card));
  reveals(grid); tilt(grid);
}

function chips() {
  const ccs = ['all', ...new Set(all.map((s) => s.cc))];
  filters.replaceChildren(...ccs.map((cc) => el('button', {
    type: 'button', 'aria-pressed': String(cc === filter),
    onclick: () => { filter = cc; chips(); render(); },
  }, cc === 'all' ? `ทั้งหมด (${all.length})` : `${COUNTRIES[cc]} (${all.filter((s) => s.cc === cc).length})`)));
}

document.getElementById('random').addEventListener('click', () => {
  if (!all.length) return;
  const read = load('storyRead', {});
  const pool = all.filter((s) => !read[s.id]);
  const s = (pool.length ? pool : all)[Math.floor(Math.random() * (pool.length || all.length))];
  location.href = storyUrl(s);
});

(async () => {
  try { all = await getJSON('content/stories/index.json'); } catch { grid.replaceChildren(el('p', {}, 'เปิดคลังไม่ได้ ลองรีเฟรชอีกครั้ง')); return; }
  chips(); render();
  const cardBox = document.getElementById('globe-card');
  const show = (s) => {
    if (!s) return;
    cardBox.hidden = false;
    cardBox.replaceChildren(
      el('span', { class: 'hud-label' }, `${COUNTRIES[s.cc]} · ${s.year}`),
      el('h3', {}, s.title), el('p', {}, s.blurb),
      el('a', { class: 'btn primary small', href: storyUrl(s) }, 'อ่านเรื่องนี้ →'));
  };
  try {
    const { globe } = await import('../three/globe.js');
    // spread pins that share a city a little so they don't overlap
    const seen = {};
    const pins = all.map((s) => { const k = `${s.lat},${s.lon}`; const n = (seen[k] = (seen[k] || 0) + 1) - 1; return { ...s, lat: s.lat + n * 1.6, lon: s.lon + n * 1.6 }; });
    globe(document.getElementById('globe'), pins, { onPick: show, onHover: (p) => p && show(p), still: reduceMotion() });
  } catch (e) {
    document.querySelector('.globe-wrap').hidden = true;
  }
})();
