import { boot } from '../core/boot.js';
import { getJSON, getText, url, config, preview } from '../core/content.js';
import { el, announce, reduceMotion, toast } from '../core/ui.js';
import { parseFront, render } from '../core/md.js';
import { load, save, prefs, setPref } from '../core/store.js';
import { setPreset, hauntOn, play, tension } from '../core/haunt.js';
import { scare } from '../core/scare.js';
import { reveals } from '../core/fx.js';
import { cover } from '../stories/covers.js';
import { mountWidget } from '../stories/widgets.js';

import { COUNTRIES, TYPES } from '../stories/meta.js';
import { award, checkReading, has, BADGES } from '../core/badges.js';
const id = (new URLSearchParams(location.search).get('id') || '').replace(/[^\w-]/g, '');
const root = document.getElementById('story-root');

boot('archive');
main().catch((e) => {
  console.error(e);
  root.replaceChildren(el('div', { class: 'container', style: { padding: '40px 16px' } },
    el('h1', {}, 'เปิดเรื่องนี้ไม่ได้'), el('p', {}, el('a', { href: url('archive.html') }, 'กลับไปคลังเรื่อง'))));
});

async function main() {
  const list = await getJSON('content/stories/index.json');
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) throw new Error('no story ' + id);
  const s = list[i];
  if (s.secret && !has(s.secret)) { locked(s); return; }
  const open = list.filter((x) => !x.secret || has(x.secret));
  const { meta, body } = parseFront(await getText(`content/stories/${s.id}.md`));
  document.title = `${s.title} — ผีทั่วโลก`;
  document.body.dataset.sound = s.sound || 'house';
  if (hauntOn()) setPreset(document.body.dataset.sound);

  // ---- hero ----
  const bg = el('div', { class: 'bg' });
  if (s.image) bg.append(el('img', { src: url(s.image), alt: '' })); else bg.append(cover(s.id, 960, 540, s));
  const hero = el('header', { class: 'st-hero' }, bg,
    el('div', { class: 'copy' },
      el('p', { class: 'eyebrow' }, `${COUNTRIES[s.cc] || s.cc} · ${s.place} · ${s.year}`),
      el('h1', {}, s.title),
      el('p', { class: 'orig' }, s.orig),
      el('div', { class: 'facts' },
        el('span', { class: 'chip' }, TYPES[s.type] || s.type),
        el('span', { class: 'chip' }, `อ่าน ~${Math.max(2, Math.round(body.length / 900))} นาที`),
        s.creditShort ? el('span', { class: 'chip' }, `ภาพ: ${s.creditShort}`) : null)));

  // ---- tools ----
  const torchBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, '🔦 อ่านด้วยไฟฉาย');
  const soundBtn = el('button', { type: 'button', 'aria-pressed': String(!!prefs().sound) }, '🎧 เสียงหลอน');
  const scareBtn = el('button', { type: 'button', 'aria-pressed': String(!!prefs().scare) }, '😱 โหมดโหด');
  const tools = el('div', { class: 'st-tools', role: 'toolbar', 'aria-label': 'เครื่องมืออ่าน' },
    el('a', { href: url('archive.html') }, '← คลัง'), torchBtn, soundBtn, scareBtn,
    el('button', { type: 'button', onclick: () => randomStory(open) }, '🎲 สุ่ม'));
  torchBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('torch');
    torchBtn.setAttribute('aria-pressed', String(on));
    if (on) { toast('ขยับเมาส์หรือนิ้วเพื่อส่องอ่าน กดปุ่มอีกครั้งเพื่อเปิดไฟ'); award('torch'); }
  });
  soundBtn.addEventListener('click', () => {
    document.querySelector('.header-tools [data-pref="sound"]')?.click();
    soundBtn.setAttribute('aria-pressed', String(!!prefs().sound));
  });
  scareBtn.addEventListener('click', () => {
    const on = !prefs().scare;
    if (on && !confirm('โหมดโหดจะมีภาพหน้าผีโผล่กะทันหันพร้อมเสียงดังในบางจังหวะ (ไม่มีไฟกะพริบ) เปิดไหม?')) return;
    setPref('scare', on);
    if (on) award('scare');
    scareBtn.setAttribute('aria-pressed', String(on));
    announce(on ? 'เปิดโหมดโหดแล้ว' : 'ปิดโหมดโหดแล้ว');
  });
  torchFollow();

  // ---- body ----
  const sentinels = [];
  const hooks = {
    block(type, ref) {
      if (type === 'widget') { const host = el('div', { class: 'widget' }); mountWidget(ref, host, s); return host; }
      if (type === 'img') {
        const im = (s.images || {})[ref];
        if (!im) return el('span');
        return el('figure', { class: 'st-fig' }, el('img', { src: url(im.file), alt: im.alt || '', loading: 'lazy', width: im.w, height: im.h }),
          el('figcaption', {}, im.caption, ' · ', im.source ? el('a', { href: im.source, target: '_blank', rel: 'noopener' }, `${im.credit} (${im.license})`) : im.credit));
      }
      if (type === 'scare' || type === 'sound') {
        const mark = el('span', { class: 'sentinel', 'aria-hidden': 'true', 'data-kind': type, 'data-ref': ref });
        sentinels.push(mark);
        return mark;
      }
      return el('span');
    },
    note(phrase, q) { return el('span', { class: 'note-mark', title: q }, phrase); },
    uv(text) { return el('span', { class: 'uv revealed' }, text); },
    shaky(text) {
      const seg = 'Segmenter' in Intl ? [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map((x) => x.segment) : [...text];
      return el('span', { class: 'shaky', 'aria-label': text }, ...seg.map((g, k) => (g === ' ' ? ' ' : el('span', { 'aria-hidden': 'true', style: { animationDelay: `${(k * 0.13) % 0.9}s` } }, g))));
    },
    thread: (block) => thread(block, s),
  };
  const article = el('article', { class: 'st-body' });
  article.append(render(body, hooks, `s-${s.id}`));
  article.querySelectorAll('.para').forEach((p, k) => { if (k > 0) p.classList.add('reveal'); });

  // ---- sources, rating, nav ----
  const sources = el('section', { class: 'sources', 'aria-labelledby': 'src-t' },
    el('h2', { id: 'src-t', class: 'eyebrow' }, 'ที่มาและอ่านต่อ'),
    el('p', { class: 'faint' }, s.type === 'classic'
      ? 'ต้นฉบับเป็นสาธารณสมบัติแล้ว ฉบับนี้แปลและเรียบเรียงเป็นภาษาไทยโดย SLUR'
      : s.type === 'classified'
      ? 'แฟ้มลับเป็นเรื่องแต่งที่เล่าต่อจากไดอารี่ของเว็บนี้ ตัวละครและหอพักไม่มีอยู่จริง'
      : s.type === 'reader'
      ? `เรื่องนี้ส่งมาจากคนอ่านที่ใช้นามแฝงว่า "${s.by || 'ไม่ประสงค์ออกนาม'}" ผ่านห้องเล่าเรื่องของเว็บบอร์ด SLUR แก้แค่คำผิดเล็กน้อย และไม่ได้ตรวจสอบว่าเกิดขึ้นจริง`
      : s.type === 'forum'
      ? 'เรื่องนี้เป็นการสรุปเล่าใหม่ด้วยภาษาของเรา ไม่ใช่คำแปลทั้งกระทู้ และไม่ได้ใช้รูปของเจ้าของโพสต์ ใครอยากอ่านฉบับเต็มกดลิงก์ด้านล่างไปที่กระทู้จริงได้เลย'
      : 'เรื่องนี้เล่าใหม่ด้วยภาษาของเราจากข้อมูลที่มีคนบันทึกไว้ ไม่ใช่คำแปลของโพสต์ต้นฉบับ รายละเอียดบางส่วนแต่ละแหล่งเล่าไม่ตรงกัน'),
    el('ol', {}, ...(s.sources || []).map(([t, u]) => el('li', {}, el('a', { href: u, target: '_blank', rel: 'noopener' }, t)))),
    s.type === 'reader' ? el('a', { class: 'btn small', href: url('webboard.html#ours') }, '🕯️ เคยเจอเหมือนกัน? ส่งเรื่องของคุณ') : null);
  root.replaceChildren(...[hero, tools, s.type === 'forum' ? opCard(s) : null, article, rating(s), sources, discussion(s), nav(open, open.indexOf(s))].filter(Boolean));
  reveals(root);
  watchSentinels(sentinels);
  const r = load('storyRead', {}); r[s.id] = Date.now(); save('storyRead', r);
  checkReading(list);
}

// secret stories open only after the matching badge
function locked(s) {
  const b = BADGES.find((x) => x.id === s.secret);
  document.title = 'เรื่องลับ — ผีทั่วโลก';
  root.replaceChildren(el('section', { class: 'container st-locked' },
    el('p', { class: 'eyebrow' }, 'CLASSIFIED · เรื่องลับ'),
    el('h1', {}, '🔒 ประตูนี้ยังไม่เปิด'),
    el('p', { class: 'dim' }, `ต้องได้เหรียญ "${b ? b.icon + ' ' + b.name : s.secret}" ก่อน: ${b ? b.how : ''}`),
    el('a', { class: 'btn primary', href: url('archive.html#courage') }, 'ดูเหรียญของฉัน')));
}

function opCard(s) {
  const link = s.thread || (s.sources || [])[0]?.[1];
  return el('aside', { class: 'op-card hud', 'aria-label': 'ข้อมูลกระทู้ต้นฉบับ' },
    el('span', { class: 'hud-label' }, 'กระทู้ต้นฉบับ'),
    el('p', {}, el('b', {}, s.board || 'เว็บบอร์ด'), ` · โพสต์ราวปี ${s.year}`, s.orig.startsWith(s.board) ? '' : ` · ${s.orig}`),
    el('p', { class: 'faint' }, 'ด้านล่างคือฉบับเล่าใหม่ ตัดให้กระชับ เปลี่ยนชื่อคนในเรื่อง และไม่ใช้รูปของเจ้าของกระทู้'),
    link ? el('a', { class: 'btn small', href: link, target: '_blank', rel: 'noopener' }, s.thread ? 'อ่านกระทู้ต้นฉบับ ↗' : 'อ่านที่มาของกระทู้ ↗') : null);
}

function torchFollow() {
  const d = document.querySelector('.darkness');
  const set = (x, y) => { d.style.setProperty('--x', x + 'px'); d.style.setProperty('--y', y + 'px'); };
  addEventListener('pointermove', (e) => set(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) set(t.clientX, t.clientY - 60); }, { passive: true });
}

// trigger sounds / the opt-in scare when the reader scrolls past a marked line
function watchSentinels(list) {
  if (!list.length) return;
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const { kind, ref } = e.target.dataset;
      if (kind === 'sound') {
        if (ref === 'tense') tension(0.8); else if (ref === 'calm') tension(0); else play(ref);
      } else scare();
    }
  }, { rootMargin: '0px 0px -35% 0px' });
  list.forEach((n) => io.observe(n));
}

// forum thread replayed like it is happening live
function thread(block, s) {
  const lines = block.split('\n');
  const title = lines[0].replace(/^\[\[thread:/, '').replace(/\]\]$/, '');
  const posts = lines.slice(1).filter((l) => l.includes('|')).map((l) => {
    const [n, name, time, ...rest] = l.split('|');
    return { op: n.startsWith('*'), n: n.replace('*', ''), name, time, text: rest.join('|').replace(/\\n/g, '\n') };
  });
  const box = el('div', { class: 'thread', role: 'log', 'aria-label': `กระทู้: ${title}` });
  const typing = el('p', { class: 'typing', hidden: true }, 'มีคนกำลังพิมพ์…');
  const nodes = posts.map((p) => {
    const body = el('div', { class: 'pb' });
    // >>12 style replies in blue
    p.text.split(/(>>\d+)/).forEach((part) => body.append(/^>>\d+$/.test(part) ? el('span', { class: 'q' }, part) : part));
    return el('div', { class: 'post' + (p.op ? ' op' : '') },
      el('div', { class: 'ph' }, `${p.n} : `, el('b', {}, p.name), ` : ${p.time}`), body);
  });
  let playing = false, timer = 0, shown = posts.length;
  const playBtn = el('button', { type: 'button' }, '▶ เล่นแบบสด');
  const allBtn = el('button', { type: 'button' }, 'แสดงทั้งหมด');
  const speed = el('button', { type: 'button', 'data-x': '1' }, 'ความเร็ว 1×');
  function stop() { playing = false; clearTimeout(timer); typing.hidden = true; playBtn.textContent = '▶ เล่นแบบสด'; }
  function step() {
    if (!playing) return;
    if (shown >= nodes.length) { stop(); if (s.id === 'kisaragi') { box.classList.add('dead'); scare(); } return; }
    typing.hidden = false;
    const p = posts[shown];
    const wait = Math.min(4200, 900 + p.text.length * 22) / +speed.dataset.x;
    timer = setTimeout(() => {
      typing.hidden = true;
      nodes[shown].classList.remove('hidden');
      if (hauntOn()) play(p.op ? 'drip' : 'click');
      if (p.op && /เสียง|กลอง|กระดิ่ง/.test(p.text)) play(/กลอง/.test(p.text) ? 'taiko' : 'bell');
      nodes[shown].scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
      shown++;
      timer = setTimeout(step, 300);
    }, wait);
  }
  playBtn.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (shown >= nodes.length) { nodes.forEach((n) => n.classList.add('hidden')); shown = 0; box.classList.remove('dead'); }
    playing = true; playBtn.textContent = '❚❚ หยุด'; tension(0.4); step();
  });
  allBtn.addEventListener('click', () => { stop(); nodes.forEach((n) => n.classList.remove('hidden')); shown = nodes.length; });
  speed.addEventListener('click', () => { const x = speed.dataset.x === '1' ? '2' : speed.dataset.x === '2' ? '4' : '1'; speed.dataset.x = x; speed.textContent = `ความเร็ว ${x}×`; });
  box.append(el('div', { class: 't-head' }, el('span', {}, title), el('span', { class: 't-ctrl' }, playBtn, speed, allBtn)), ...nodes, typing);
  return box;
}

function rating(s) {
  const ratings = load('fear', {});
  const out = el('p', { class: 'faint' }, ratings[s.id] ? `คุณให้ ${ratings[s.id]}/5` : 'ยังไม่ได้ให้คะแนน');
  const btns = [1, 2, 3, 4, 5].map((n) => el('button', { type: 'button', 'aria-label': `หลอน ${n} จาก 5`, class: n <= (ratings[s.id] || 0) ? 'on' : '' }, '💀'));
  btns.forEach((b, k) => b.addEventListener('click', () => {
    const r = load('fear', {}); r[s.id] = k + 1; save('fear', r);
    getJSON('content/stories/index.json').then(checkReading);
    btns.forEach((x, j) => x.classList.toggle('on', j <= k));
    out.textContent = `คุณให้ ${k + 1}/5 · ${['เฉยๆ', 'ขนลุกนิดๆ', 'เริ่มไม่กล้าปิดไฟ', 'คืนนี้นอนไม่หลับ', 'ไม่อ่านแล้ว!'][k]}`;
    announce(out.textContent);
  }));
  return el('section', { class: 'hud rate', 'aria-labelledby': 'rate-t' },
    el('h2', { id: 'rate-t', style: { fontSize: '1.2rem', margin: 0 } }, 'เรื่องนี้หลอนแค่ไหน?'),
    el('div', { class: 'skulls', role: 'group', 'aria-label': 'ให้คะแนนความหลอน' }, ...btns), out);
}

function discussion(s) {
  const box = el('section', { class: 'hud rate', 'aria-labelledby': 'disc-t' },
    el('h2', { id: 'disc-t', style: { fontSize: '1.2rem', margin: 0 } }, 'เคยเจอแบบนี้ไหม? เล่าให้ฟังหน่อย'),
    el('p', { class: 'faint' }, 'อ่านได้ทุกคน ถ้าจะพิมพ์ต้องล็อกอิน GitHub'));
  config().then((cfg) => {
    const g = cfg.giscus || {};
    if (!(g.repo && g.repoId && g.categoryId)) { if (!preview()) box.remove(); return; }
    const btn = el('button', { class: 'btn', type: 'button' }, 'เปิดห้องคุย');
    btn.addEventListener('click', () => {
      btn.remove();
      const local = /^(localhost|127\.)/.test(location.hostname);
      box.append(el('div', { class: 'giscus' }), el('script', {
        src: 'https://giscus.app/client.js', 'data-repo': g.repo, 'data-repo-id': g.repoId, 'data-category': g.category, 'data-category-id': g.categoryId,
        'data-mapping': 'specific', 'data-term': `story-${s.id}`, 'data-strict': '1', 'data-reactions-enabled': '1', 'data-input-position': 'top',
        'data-theme': local ? 'dark' : url('css/giscus-theme.css'), 'data-lang': 'th', crossorigin: 'anonymous', async: true,
      }));
    });
    box.append(btn);
  });
  return box;
}

function nav(list, i) {
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  return el('nav', { class: 'st-nav', 'aria-label': 'เรื่องอื่น' },
    el('a', { class: 'btn small', href: url(`story.html?id=${prev.id}`) }, `← ${prev.title}`),
    el('a', { class: 'btn small', href: url('archive.html') }, 'คลังทั้งหมด'),
    el('a', { class: 'btn small primary', href: url(`story.html?id=${next.id}`) }, `${next.title} →`));
}

function randomStory(list) {
  const read = load('storyRead', {});
  const pool = list.filter((x) => x.id !== id && !read[x.id]);
  const pickFrom = pool.length ? pool : list.filter((x) => x.id !== id);
  location.href = url(`story.html?id=${pickFrom[Math.floor(Math.random() * pickFrom.length)].id}`);
}
