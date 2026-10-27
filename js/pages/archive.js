import { boot } from '../core/boot.js';
import { getJSON, url } from '../core/content.js';
import { el, reduceMotion } from '../core/ui.js';
import { load } from '../core/store.js';
import { reveals, tilt } from '../core/fx.js';
import { cover } from '../stories/covers.js';
import { COUNTRIES, TYPES } from '../stories/meta.js';
import { BADGES, badges, has, courage, checkReading, shareCard } from '../core/badges.js';
import { summon } from '../core/ghosts.js';

boot('archive');

const grid = document.getElementById('grid');
const filters = document.getElementById('filters');
let all = [];
let filter = 'all';
let kind = new URLSearchParams(location.search).get('type') === 'forum' ? 'forum' : 'all';
const kinds = document.getElementById('kinds');

const storyUrl = (s) => url(`story.html?id=${s.id}`);

const isLocked = (s) => s.secret && !has(s.secret);

function lockedCard(s, i) {
  const b = BADGES.find((x) => x.id === s.secret);
  return el('div', { class: 'hud story-card locked reveal', style: { '--d': `${(i % 3) * 100}ms` } },
    el('div', { class: 'pic' }, el('span', { class: 'tag' }, 'CLASSIFIED'), el('span', { class: 'lock', 'aria-hidden': 'true' }, '🔒')),
    el('div', { class: 'body' },
      el('h3', {}, 'เรื่องลับ'),
      el('p', { class: 'blurb' }, `ปลดล็อกด้วยเหรียญ ${b ? b.icon + ' ' + b.name : ''}: ${b ? b.how : ''}`)));
}

function card(s, i) {
  if (isLocked(s)) return lockedCard(s, i);
  const ratings = load('fear', {});
  const read = load('storyRead', {})[s.id];
  const pic = el('div', { class: 'pic' }, el('span', { class: 'tag' }, `${COUNTRIES[s.cc] || s.cc} · ${TYPES[s.type] || s.type}`));
  if (s.image) pic.append(el('img', { src: url(s.image), alt: '', loading: 'lazy', decoding: 'async' }));
  else pic.append(cover(s.id, 640, 360, s));
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
  const list = all.filter((s) => (filter === 'all' || s.cc === filter) && (kind === 'all' || (kind === 'forum') === (s.type === 'forum')));
  grid.replaceChildren(...list.map(card));
  reveals(grid); tilt(grid);
}

function kindChips() {
  const n = (k) => all.filter((s) => k === 'all' || (k === 'forum') === (s.type === 'forum')).length;
  kinds.replaceChildren(...[['all', 'ทุกแบบ'], ['forum', '💬 กระทู้เว็บบอร์ด'], ['legend', '📜 ตำนานและเหตุการณ์']].map(([k, t]) => el('button', {
    type: 'button', 'aria-pressed': String(k === kind),
    onclick: () => { kind = k; kindChips(); render(); },
  }, `${t} (${n(k)})`)));
}

function chips() {
  const ccs = ['all', ...new Set(all.map((s) => s.cc))];
  filters.replaceChildren(...ccs.map((cc) => el('button', {
    type: 'button', 'aria-pressed': String(cc === filter),
    onclick: () => { filter = cc; chips(); kindChips(); render(); },
  }, cc === 'all' ? `ทั้งหมด (${all.length})` : `${COUNTRIES[cc]} (${all.filter((s) => s.cc === cc).length})`)));
}

document.getElementById('random').addEventListener('click', () => {
  if (!all.length) return;
  const read = load('storyRead', {});
  const open = all.filter((s) => !isLocked(s));
  const pool = open.filter((s) => !read[s.id]);
  const s = (pool.length ? pool : open)[Math.floor(Math.random() * (pool.length || open.length))];
  location.href = storyUrl(s);
});

(async () => {
  try { all = await getJSON('content/stories/index.json'); } catch { grid.replaceChildren(el('p', {}, 'เปิดคลังไม่ได้ ลองรีเฟรชอีกครั้ง')); return; }
  checkReading(all);
  chips(); kindChips(); render(); meter();
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
    const pins = all.filter((s) => !isLocked(s)).map((s) => { const k = `${s.lat},${s.lon}`; const n = (seen[k] = (seen[k] || 0) + 1) - 1; return { ...s, lat: s.lat + n * 1.6, lon: s.lon + n * 1.6 }; });
    globe(document.getElementById('globe'), pins, { onPick: show, onHover: (p) => p && show(p), still: reduceMotion() });
  } catch (e) {
    document.querySelector('.globe-wrap').hidden = true;
  }
})();

// ---- courage meter, badges, share card, summon box ----
function meter() {
  const c = courage(), got = badges();
  document.getElementById('c-level').textContent = c.title;
  const m = document.getElementById('c-meter');
  m.setAttribute('aria-valuenow', c.pct); m.style.setProperty('--p', c.pct + '%');
  document.getElementById('c-stats').textContent = `อ่านแล้ว ${c.read} เรื่อง · เหรียญ ${c.got}/${BADGES.length} · คะแนน ${c.score}${c.next ? ` (อีก ${c.next - c.score} คะแนนเลื่อนขั้น)` : ''}`;
  document.getElementById('badges').replaceChildren(...BADGES.map((b) => el('div', { class: 'badge' + (got[b.id] ? ' on' : ''), role: 'listitem', title: b.how },
    el('span', { class: 'ico', 'aria-hidden': 'true' }, got[b.id] ? b.icon : '?'),
    el('b', {}, got[b.id] ? b.name : '???'), el('small', {}, b.how))));
}
meter();
document.addEventListener('badge', () => { meter(); if (all.length) render(); });

document.getElementById('summon').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = document.getElementById('summon-in');
  const ok = summon(inp.value);
  document.getElementById('summon-out').textContent = ok ? 'มีบางอย่างตอบรับ…' : 'เงียบ… ไม่มีใครตอบ ลองชื่ออื่น';
  inp.value = '';
});

document.getElementById('share-btn').addEventListener('click', async () => {
  await document.fonts?.ready;
  const c = shareCard(document.getElementById('share-name').value.trim());
  const out = document.getElementById('share-out');
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'slur-courage.png', { type: 'image/png' });
  const href = URL.createObjectURL(blob);
  out.replaceChildren(el('img', { src: href, alt: 'การ์ดความกล้าของคุณ', class: 'share-img' }),
    el('div', { class: 'share-row' },
      el('a', { class: 'btn small', href, download: 'slur-courage.png' }, '⬇ บันทึกรูป'),
      navigator.canShare?.({ files: [file] }) ? el('button', { class: 'btn small primary', type: 'button', onclick: () => navigator.share({ files: [file], title: 'ความกล้าของฉัน', text: 'มาวัดความกล้ากัน https://phum132.github.io/ghost-diary/' }).catch(() => {}) }, '📤 แชร์') : null));
});
