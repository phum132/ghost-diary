// Recommended clips page: category chips + grouped lite YouTube cards
import { boot } from '../core/boot.js';
import { getJSON, url } from '../core/content.js';
import { el } from '../core/ui.js';
import { clipsData, clipCard } from '../core/clips.js';

boot('clips');
const chips = document.getElementById('cats');
const langs = document.getElementById('langs');
const list = document.getElementById('clip-list');

Promise.all([clipsData(), getJSON('content/stories/index.json').catch(() => [])]).then(([data, idx]) => {
  const stories = {};
  for (const s of idx) if (!s.secret) stories[s.id] = { title: s.title, href: url(`story.html?id=${s.id}`) };
  const cats = data.categories;
  const byId = Object.fromEntries(cats.map((k) => [k.id, k]));
  let cat = byId[location.hash.slice(1)] ? location.hash.slice(1) : 'all';
  let lang = 'all';
  const okLang = (c) => lang === 'all' || (lang === 'th') === (c.lang === 'th');

  function drawChips() {
    const n = (k) => data.clips.filter((c) => (k === 'all' || c.cat === k) && okLang(c)).length;
    chips.replaceChildren(...['all', ...cats.map((k) => k.id)].map((k) => el('button', {
      type: 'button', 'aria-pressed': String(k === cat),
      onclick: () => { cat = k; history.replaceState(null, '', k === 'all' ? location.pathname : `#${k}`); drawChips(); draw(); },
    }, k === 'all' ? `ทั้งหมด (${n('all')})` : `${byId[k].icon} ${byId[k].name} (${n(k)})`)));
    langs.replaceChildren(...[['all', 'ทุกภาษา'], ['th', 'พากย์ไทย'], ['other', 'ภาษาอื่น']].map(([k, t]) => el('button', {
      type: 'button', 'aria-pressed': String(k === lang),
      onclick: () => { lang = k; drawChips(); draw(); },
    }, t)));
  }
  function draw() {
    const groups = (cat === 'all' ? cats : [byId[cat]]).map((k) => {
      const items = data.clips.filter((c) => c.cat === k.id && okLang(c));
      if (!items.length) return null;
      return el('section', { class: 'clip-group', 'aria-labelledby': `g-${k.id}` },
        el('h2', { id: `g-${k.id}` }, `${k.icon} ${k.name}`),
        el('p', { class: 'dim' }, k.desc),
        el('div', { class: 'clip-grid' }, ...items.map((c) => clipCard(c, k, stories))));
    }).filter(Boolean);
    list.replaceChildren(...(groups.length ? groups : [el('p', { class: 'dim' }, 'หมวดนี้ยังไม่มีคลิปภาษานี้')]));
  }
  drawChips(); draw();
}).catch(() => { list.replaceChildren(el('p', {}, 'โหลดรายการคลิปไม่ได้ ลองรีเฟรชอีกครั้ง')); });
