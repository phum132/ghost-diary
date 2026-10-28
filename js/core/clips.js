// Recommended YouTube clips: shared card + lite embed (thumbnail first, player loads only on click)
import { el } from './ui.js';
import { getJSON } from './content.js';

let memo;
export const clipsData = () => (memo ??= getJSON('content/clips.json'));

const LANG = { th: 'ไทย', en: 'อังกฤษ', zh: 'จีน', ja: 'ญี่ปุ่น' };

function play(box, c) {
  const f = el('iframe', {
    src: `https://www.youtube-nocookie.com/embed/${c.id}?autoplay=1&rel=0`,
    title: c.title,
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    allowfullscreen: '',
    referrerpolicy: 'strict-origin-when-cross-origin',
  });
  box.replaceChildren(f);
  f.focus();
}

export function clipCard(c, cat, stories = {}) {
  const watch = `https://www.youtube.com/watch?v=${c.id}`;
  const box = el('div', { class: 'clip-media' },
    el('button', { class: 'clip-play', type: 'button', 'aria-label': `เล่นคลิป ${c.title}`, onclick: () => play(box, c) },
      el('img', { src: `https://i.ytimg.com/vi/${c.id}/mqdefault.jpg`, alt: '', loading: 'lazy', width: 320, height: 180 }),
      el('span', { class: 'clip-btn', 'aria-hidden': 'true' }, '▶'),
      el('span', { class: 'clip-dur' }, c.dur)));
  const tags = [cat ? `${cat.icon} ${cat.name}` : null, LANG[c.lang] ? `เสียง${LANG[c.lang]}` : null, c.note || null].filter(Boolean);
  const rel = (c.stories || []).filter((id) => stories[id]);
  return el('article', { class: 'clip-card' }, box,
    el('div', { class: 'clip-body' },
      el('h3', { class: 'clip-title' }, c.title),
      el('p', { class: 'clip-ch' }, 'ช่อง ', el('a', { href: c.channelUrl, target: '_blank', rel: 'noopener' }, c.channel)),
      el('p', { class: 'clip-desc' }, c.desc),
      el('div', { class: 'clip-tags' }, ...tags.map((t) => el('span', { class: 'chip' }, t))),
      rel.length ? el('p', { class: 'clip-rel' }, 'อ่านในเว็บ: ', ...rel.flatMap((id, k) => [k ? ' · ' : '', el('a', { href: stories[id].href }, stories[id].title)])) : null,
      el('p', { class: 'clip-src faint' }, 'ที่มา: ', el('a', { href: watch, target: '_blank', rel: 'noopener' }, 'ดูบน YouTube'), ' · ลิขสิทธิ์เป็นของเจ้าของช่อง')));
}
