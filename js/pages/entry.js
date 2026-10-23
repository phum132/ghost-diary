import { boot } from '../core/boot.js';
import { states, config, evidence, getText, getJSON, url, now, preview } from '../core/content.js';
import { el, toast, announce, rng, fmtCountdown, reduceMotion } from '../core/ui.js';
import { parseFront, render } from '../core/md.js';
import { decrypt, normalizeKey } from '../core/crypto.js';
import { markRead, savedKey, saveKey, load, save, prefs, setPref } from '../core/store.js';
import { pin, TAGS } from '../core/board-store.js';
import { click } from '../core/sfx.js';
import { TOYS, mountToy } from '../toys/index.js';
import { openPhoto } from '../viewer/photo.js';
import { audioPlayer } from '../viewer/audio.js';

const id = (new URLSearchParams(location.search).get('id') || '001').replace(/\D/g, '').padStart(3, '0').slice(-3);
const root = document.getElementById('entry-root');
const $ = (i) => document.getElementById(i);

boot('entry');
main().catch((err) => {
  console.error(err);
  root.replaceChildren(el('div', { class: 'hud lock-card' },
    el('h2', {}, 'โหลดบันทึกไม่ได้'), el('p', { class: 'dim' }, 'ตรวจอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง'),
    el('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'ลองใหม่'),
    preview() ? el('p', { class: 'mono faint' }, String(err.message)) : null));
});

async function main() {
  const [list, ev, cfg] = await Promise.all([states(), evidence(), config()]);
  const meta = list.find((e) => e.id === id);
  if (!meta) {
    $('title').textContent = 'ไม่พบบันทึกหมายเลขนี้';
    root.replaceChildren(el('p', { class: 'dim' }, el('a', { href: url('index.html#toc') }, 'กลับไปที่สารบัญ')));
    return;
  }
  $('eyebrow').textContent = `บันทึกวันที่ ${meta.day} / ${list.length}`;
  document.title = `วันที่ ${meta.day} — ไดอารี่คนเห็นผี`;

  if (meta.state === 'soon' || meta.state === 'future') return renderSoon(meta, list);
  if (meta.unlock === 'password') {
    const lock = await getJSON(`content/entries/${meta.file}`);
    const key = savedKey(id);
    if (key) {
      try { return renderEntry(await decrypt(lock, key), meta, list, ev, cfg); } catch { /* saved key no longer valid */ }
    }
    return renderLock(meta, lock, list, ev, cfg);
  }
  renderEntry(await getText(`content/entries/${meta.file}`), meta, list, ev, cfg);
}

// ---------------------------------------------------------------- not yet
function renderSoon(meta, list) {
  $('title').textContent = 'หน้านี้ยังไม่ถึงเวลา';
  const cd = el('p', { class: 'big' }, fmtCountdown(meta.at - now()));
  root.replaceChildren(
    el('div', { class: 'paper soon-paper' },
      el('div', {}, el('p', {}, 'หน้านี้จะเปิดให้อ่านใน'), cd, el('p', {}, 'กลับมาอ่านตอน 2 ทุ่มนะ'))),
    navRow(meta, list));
  setInterval(() => { cd.textContent = fmtCountdown(meta.at - now()); if (meta.at - now() <= 0) location.reload(); }, 1000);
}

// ---------------------------------------------------------------- password
function renderLock(meta, lock, list, ev, cfg) {
  $('title').textContent = meta.teaser || 'หน้านี้ถูกล็อก';
  $('story-meta').textContent = 'หน้านี้ถูกฉีกออกไปและถูกล็อกไว้ด้วยรหัส คำตอบซ่อนอยู่ในหลักฐานของบันทึกก่อนหน้า';
  const input = el('input', { id: 'pw', name: 'pw', autocomplete: 'off', inputmode: 'text', 'aria-describedby': 'pw-err', placeholder: 'พิมพ์รหัส' });
  const err = el('p', { class: 'err', id: 'pw-err', role: 'alert' });
  const hints = el('ol', { class: 'hints' });
  const tries = load('tries', {});
  let shown = 0;
  const hintBtn = el('button', { class: 'btn small', type: 'button', hidden: (tries[id] || 0) < 3 }, 'ขอคำใบ้เพิ่ม');
  hintBtn.addEventListener('click', () => {
    if (shown < (meta.hints || []).length) hints.append(el('li', {}, meta.hints[shown++]));
    if (shown >= (meta.hints || []).length) hintBtn.hidden = true;
  });
  const card = el('div', { class: 'hud lock-card' },
    el('p', { class: 'hud-label' }, `LOCKED · วันที่ ${meta.day}`),
    el('h2', {}, 'หน้านี้ถูกล็อก'),
    el('p', { class: 'dim' }, meta.hints?.[0] || 'รหัสซ่อนอยู่ในหลักฐานของวันก่อนหน้า'),
    el('form', {
      onsubmit: async (e) => {
        e.preventDefault();
        const k = normalizeKey(input.value);
        if (!k) return;
        try {
          const md = await decrypt(lock, k);
          saveKey(id, k);
          click();
          announce('ปลดล็อกแล้ว');
          toast('ปลดล็อกแล้ว 🔓');
          renderEntry(md, meta, list, ev, cfg, true);
        } catch {
          tries[id] = (tries[id] || 0) + 1; save('tries', tries);
          err.textContent = tries[id] >= 3 ? 'ยังไม่ใช่ ลองกด "ขอคำใบ้เพิ่ม" ดูนะ' : 'ยังไม่ใช่ ลองกลับไปดูหลักฐานอีกครั้ง';
          if (tries[id] >= 3) hintBtn.hidden = false;
          if (!reduceMotion()) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
        }
      },
    }, el('label', { class: 'sr-only', for: 'pw' }, 'รหัสปลดล็อก'), input, el('button', { class: 'btn primary', type: 'submit' }, 'ปลดล็อก')),
    err, hintBtn, hints);
  root.replaceChildren(card, navRow(meta, list));
}

// ---------------------------------------------------------------- the page
function renderEntry(src, meta, list, ev, cfg, justUnlocked = false) {
  const { meta: fm, body } = parseFront(src);
  $('title').textContent = fm.title || meta.title;
  $('story-meta').textContent = fm.story_time ? `เขียนเมื่อ ${fm.story_time}` : '';
  document.title = `วันที่ ${meta.day}: ${fm.title} — ไดอารี่คนเห็นผี`;
  const mood = Math.max(1, Math.min(5, +fm.mood || 1));
  const notes = [];
  const used = [];
  const tilt = rng(id);

  const hooks = {
    block(type, ref) {
      if (type === 'lab') return labEmbed(ref);
      const e = ev[ref];
      if (!e) return el('p', { class: 'faint' }, preview() ? `[ไม่พบหลักฐาน ${ref} ใน evidence.json]` : '');
      used.push(ref);
      if (type === 'photo') {
        const btn = el('button', { type: 'button', 'aria-label': `เปิดดูรูป: ${e.caption}` },
          el('img', { src: url(e.thumb), alt: e.caption, width: e.w, height: e.h, loading: 'lazy', decoding: 'async' }));
        btn.addEventListener('click', () => openPhoto(ref, e, btn, meta.day));
        return el('div', { class: 'ev-wrap' },
          pinBtn(() => pin({ kind: 'photo', ref, entry: id, day: meta.day, title: e.caption, thumb: e.thumb }), `ปักหมุดรูป: ${e.caption}`),
          el('figure', { class: 'ev-photo', style: { '--tilt': `${(tilt() * 4 - 2).toFixed(2)}deg` } }, btn, el('figcaption', {}, e.caption)));
      }
      if (type === 'audio') return audioPlayer(ref, e, meta.day);
      if (type === 'draw') {
        return el('div', { class: 'ev-wrap' },
          pinBtn(() => pin({ kind: 'photo', ref, entry: id, day: meta.day, title: e.caption, thumb: e.file }), 'ปักหมุดภาพวาด'),
          el('figure', { class: 'ev-draw' }, el('img', { src: url(e.file), alt: 'ภาพวาดดินสอ: ร่างผู้หญิงผมยาวยืนที่ประตู ไม่มีเท้า มีเลข 03:07', width: e.w, height: e.h }), el('figcaption', {}, e.caption)));
      }
      return el('span');
    },
    note(phrase, q, tool, n) {
      notes.push({ n, phrase, q, tool });
      return el('span', { class: 'note-mark', id: `note-${n}` }, phrase, el('a', { class: 'note-n', href: `#side-${n}`, 'aria-label': `โน้ต ${n}` }, String(n)));
    },
    uv(text) {
      return el('span', { class: 'uv' }, el('span', { class: 'sr-only' }, 'หมึกล่องหน: '), text);
    },
    shaky(text) {
      const seg = 'Segmenter' in Intl ? [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map((s) => s.segment) : [...text];
      return el('span', { class: 'shaky', 'aria-label': text },
        ...seg.map((g, i) => (g === ' ' ? ' ' : el('span', { 'aria-hidden': 'true', style: { animationDelay: `${(i * 0.13) % 0.9}s` } }, g))));
    },
  };

  const paper = el('article', { class: `paper mood-${mood}`, 'aria-label': `บันทึกวันที่ ${meta.day}` },
    el('span', { class: 'stamp-time' }, fm.story_time || ''));
  paper.append(render(body, hooks, `e${id}`));
  paper.querySelectorAll('.para').forEach((p, i) => {
    p.append(pinBtn(() => pin({ kind: 'text', ref: p.id, entry: id, day: meta.day, title: `วันที่ ${meta.day} ย่อหน้า ${i + 1}`, text: p.textContent.replace(/📌/g, '').trim().slice(0, 160) }), `ปักหมุดย่อหน้าที่ ${i + 1}`));
  });

  // side notes: questions, not answers
  const toolsUsed = (fm.tools || '').split(',').map((s) => s.trim()).filter((t) => TOYS[t]);
  const side = el('aside', { class: 'side', 'aria-label': 'โน้ตสำหรับวิเคราะห์' },
    el('p', { class: 'eyebrow' }, 'โน้ตนักสืบ'),
    ...notes.map((n) => el('div', { class: 'hud side-note', id: `side-${n.n}` },
      el('span', { class: 'n' }, `${n.n}.`), el('strong', {}, `“${n.phrase}”`),
      el('p', {}, n.q),
      n.tool && TOYS[n.tool] ? el('a', { class: 'btn small', href: url(`lab.html?tool=${n.tool}`) }, `เปิดเครื่องมือ: ${TOYS[n.tool].title}`) : null)),
    toolsUsed.length ? el('div', { class: 'hud side-note' }, el('span', { class: 'hud-label' }, 'เครื่องมือที่เกี่ยวข้อง'),
      el('div', { class: 'row', style: { marginTop: '8px' } }, ...toolsUsed.map((t) => el('a', { class: 'chip', href: url(`lab.html?tool=${t}`) }, TOYS[t].title)))) : null);

  // evidence tray (lab mode)
  const tray = el('section', { class: 'tray', 'aria-label': 'หลักฐานในบันทึกนี้' },
    el('p', { class: 'eyebrow' }, `หลักฐานในบันทึกนี้ (${used.length})`),
    el('div', { class: 'tray-list' }, ...used.map((r) => {
      const e = ev[r];
      return el('div', { class: 'tray-item' },
        e.type === 'audio' ? el('span', { 'aria-hidden': 'true' }, '🎧') : el('img', { src: url(e.thumb || e.file), alt: '' }),
        el('span', {}, e.caption || e.title),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'ปักหมุด', onclick: () => pin(e.type === 'audio'
          ? { kind: 'audio', ref: r, entry: id, day: meta.day, title: e.title, value: `${e.duration}s` }
          : { kind: 'photo', ref: r, entry: id, day: meta.day, title: e.caption, thumb: e.thumb || e.file }) }, '📌'));
    })));

  // replaceChildren() would print a literal "null", so drop the optional sections that are absent
  root.replaceChildren(...[
    modeSwitch(),
    el('div', { class: 'entry-grid' }, paper, side),
    tray,
    fm.finale === 'yes' ? quiz() : null,
    discussion(cfg, meta),
    navRow(meta, list),
    toolbar(),
  ].filter(Boolean));
  setMode(load('modes', {})[id] || 'read', false);
  markRead(id);
  if (justUnlocked) window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}

function pinBtn(fn, label) {
  return el('button', { class: 'pin-btn', type: 'button', 'aria-label': label, title: 'ปักหมุดลงกระดาน', onclick: fn }, '📌');
}

function labEmbed(name) {
  if (!TOYS[name]) return el('span');
  const host = el('div', { class: 'lab-embed' }, el('p', { class: 'faint' }, `กำลังโหลดเครื่องมือ ${TOYS[name].title}…`));
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    host.replaceChildren();
    mountToy(name, host, { compact: true, entry: id }).catch(() => host.replaceChildren(el('p', {}, 'โหลดเครื่องมือไม่ได้')));
  }, { rootMargin: '300px' });
  io.observe(host);
  return host;
}

// ---------------------------------------------------------------- read / analyse
function modeSwitch() {
  const mk = (m, t) => el('button', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-m': m, onclick: () => setMode(m, true) }, t);
  return el('div', { class: 'mode-switch', role: 'radiogroup', 'aria-label': 'โหมดการอ่าน' }, mk('read', 'อ่านบันทึก'), mk('lab', 'วิเคราะห์'));
}

function setMode(m, animate) {
  if (document.body.dataset.mode === m && animate) return;
  document.querySelectorAll('.mode-switch [data-m]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.m === m)));
  const modes = load('modes', {}); modes[id] = m; save('modes', modes);
  if (animate && m === 'lab' && !reduceMotion()) {
    click();
    // two neon flickers in ~0.6s (well under the 3-flashes-per-second limit), then the lights come on
    const f = el('div', { class: 'flash', 'aria-hidden': 'true' });
    document.body.append(f);
    f.animate([{ opacity: 0 }, { opacity: 0.22, offset: 0.2 }, { opacity: 0, offset: 0.35 }, { opacity: 0.32, offset: 0.7 }, { opacity: 0 }], { duration: 750 }).onfinish = () => f.remove();
    setTimeout(() => { document.body.dataset.mode = m; }, 600);
  } else document.body.dataset.mode = m;
  announce(m === 'lab' ? 'โหมดวิเคราะห์: เห็นโน้ตและปุ่มปักหมุด' : 'โหมดอ่านบันทึก');
}

// ---------------------------------------------------------------- UV lamp + toolbar
function toolbar() {
  const lamp = el('div', { class: 'uv-lamp', 'aria-hidden': 'true' });
  const lens = el('div', { class: 'uv-lens', 'aria-hidden': 'true' });
  document.body.append(lamp, lens);
  let lx = innerWidth / 2, ly = innerHeight / 2;
  const R = 120;
  const light = () => {
    document.querySelectorAll('.uv').forEach((u) => {
      const r = u.getBoundingClientRect();
      const dx = Math.max(r.left - lx, 0, lx - r.right), dy = Math.max(r.top - ly, 0, ly - r.bottom);
      u.classList.toggle('lit', document.body.classList.contains('uv-on') && Math.hypot(dx, dy) < R);
    });
  };
  addEventListener('pointermove', (e) => {
    if (!document.body.classList.contains('uv-on') || e.pointerType === 'touch') return;
    lx = e.clientX; ly = e.clientY; lamp.style.left = lx + 'px'; lamp.style.top = ly + 'px'; light();
  }, { passive: true });
  addEventListener('scroll', light, { passive: true });
  // touch: draggable lens so the page can still scroll
  let drag = null;
  lens.addEventListener('pointerdown', (e) => { drag = { dx: e.clientX - lens.offsetLeft, dy: e.clientY - lens.offsetTop }; lens.setPointerCapture(e.pointerId); });
  lens.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const x = e.clientX - drag.dx, y = e.clientY - drag.dy;
    lens.style.left = x + 'px'; lens.style.top = y + 'px';
    lx = x + 48; ly = y + 48; light();
  });
  lens.addEventListener('pointerup', () => { drag = null; });

  const uvBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-pressed': 'false' }, '🔦 ไฟ UV');
  uvBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('uv-on');
    uvBtn.setAttribute('aria-pressed', String(on));
    if (on) {
      lens.style.left = (innerWidth / 2 - 48) + 'px'; lens.style.top = (innerHeight * 0.45) + 'px';
      lx = innerWidth / 2; ly = innerHeight * 0.45 + 48;
      toast(matchMedia('(pointer: coarse)').matches ? 'ลากวงแสงสีม่วงไปส่องบนหน้ากระดาษ' : 'เลื่อนเมาส์ส่องหาหมึกล่องหนบนหน้ากระดาษ', { label: 'ส่องทั้งหน้า', run: revealAll });
    }
    light();
  });
  const revealAll = () => {
    const uvs = document.querySelectorAll('.uv');
    uvs.forEach((u) => u.classList.add('revealed'));
    announce(uvs.length ? `เจอหมึกล่องหน ${uvs.length} จุด: ` + [...uvs].map((u) => u.textContent.replace('หมึกล่องหน: ', '')).join(' / ') : 'หน้านี้ไม่มีหมึกล่องหน');
    setTimeout(() => uvs.forEach((u) => u.classList.remove('revealed')), 10000);
  };
  const typed = el('button', { class: 'icon-btn', type: 'button', 'aria-pressed': String(!!prefs().typed), 'aria-label': 'สลับลายมือกับตัวพิมพ์' }, 'Aa');
  typed.addEventListener('click', () => {
    const p = setPref('typed', !prefs().typed);
    document.documentElement.classList.toggle('typed', p.typed);
    typed.setAttribute('aria-pressed', String(p.typed));
  });
  const all = el('button', { class: 'icon-btn', type: 'button' }, '✦ ส่องทั้งหน้า');
  all.addEventListener('click', revealAll);
  return el('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'เครื่องมืออ่าน' }, uvBtn, all, typed);
}

// ---------------------------------------------------------------- giscus
function discussion(cfg, meta) {
  const g = cfg.giscus || {};
  const ready = g.repo && g.repoId && g.categoryId;
  if (!ready && !preview()) return null;
  const box = el('section', { class: 'hud discuss', 'aria-labelledby': 'disc-t' },
    el('h2', { id: 'disc-t' }, `ห้องสืบสวน: บันทึกวันที่ ${meta.day}`),
    el('p', { class: 'dim' }, `คุยได้ถึงแค่วันที่ ${meta.day} ห้ามสปอยล์วันถัดไปนะ · อ่านได้ทันที ถ้าจะพิมพ์ต้องล็อกอิน GitHub`));
  if (!ready) {
    box.append(el('p', { class: 'mono faint' }, '(เห็นข้อความนี้เพราะอยู่ในโหมดพรีวิว) ยังไม่ได้ตั้งค่า giscus ใน content/config.json — ดูวิธีใน README'));
    return box;
  }
  const btn = el('button', { class: 'btn', type: 'button' }, 'เข้าห้องสืบสวน');
  btn.addEventListener('click', () => {
    btn.remove();
    const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
    const s = el('script', {
      src: 'https://giscus.app/client.js', 'data-repo': g.repo, 'data-repo-id': g.repoId, 'data-category': g.category, 'data-category-id': g.categoryId,
      'data-mapping': 'specific', 'data-term': `entry-${id}`, 'data-strict': '1', 'data-reactions-enabled': '1', 'data-emit-metadata': '0',
      'data-input-position': 'top', 'data-theme': local ? 'dark' : url('css/giscus-theme.css'), 'data-lang': 'th', 'data-loading': 'lazy',
      crossorigin: 'anonymous', async: true,
    });
    s.onerror = () => box.append(el('p', {}, 'โหลดห้องสืบสวนไม่ได้ ', el('a', { href: `https://github.com/${g.repo}/discussions`, target: '_blank', rel: 'noopener' }, 'ไปคุยที่หน้า Discussions')));
    box.append(el('div', { class: 'giscus' }), s);
  });
  box.append(el('div', { class: 'row' }, btn, el('a', { class: 'btn small', href: url('board.html') }, 'ไปกระดานหลักฐาน')));
  return box;
}

// ---------------------------------------------------------------- prev / next
function navRow(meta, list) {
  const i = list.findIndex((e) => e.id === meta.id);
  const cell = (e, dir) => {
    if (!e) return el('span', {}, dir < 0 ? 'หน้าแรกของสมุด' : 'หน้าสุดท้าย');
    const label = dir < 0 ? `← วันที่ ${e.day}` : `วันที่ ${e.day} →`;
    if (e.state === 'soon') return el('span', {}, `วันที่ ${e.day} เปิดใน ${fmtCountdown(e.at - now())}`);
    if (e.state === 'future') return el('span', {}, `วันที่ ${e.day} ยังไม่ถึงเวลา`);
    return el('a', { href: url(`entry.html?id=${e.id}`) }, e.state === 'password' ? `${label} 🔒` : label);
  };
  return el('nav', { class: 'entry-nav', 'aria-label': 'ไปบันทึกอื่น' }, cell(list[i - 1], -1), el('a', { href: url('index.html#toc') }, 'สารบัญ'), cell(list[i + 1], 1));
}

// ---------------------------------------------------------------- finale
function quiz() {
  const Q = [
    ['หน้าคนร้องไห้บนผนังห้องน้ำ (วันที่ 2)', 'pareidolia'],
    ['ผู้หญิงที่ประตูตอนตีสาม ตอนที่ตัวขยับไม่ได้ (วันที่ 3)', 'sleep'],
    ['อาการสั่นในอกกับเงาที่หางตาในทางเดิน (วันที่ 4)', 'infrasound'],
    ['ปวดหัว เวียนหัว และเงาในกระจกหลังอาบน้ำอุ่น (วันที่ 6)', 'co'],
    ['แก้วสะกดชื่อ "ฝน" (วันที่ 7)', 'ideomotor'],
    ['แสงลอยเหนือหนองน้ำ (วันที่ 8)', 'wisp'],
    ['วันเกิดตรงกับพี่ฝน (วันที่ 10)', 'coincidence'],
    ['ยักษ์มีวงรุ้งในหมอกบนดอย (วันที่ 11)', 'brocken'],
  ];
  const opts = TAGS.filter((t) => t.id !== 'unknown');
  const saved = load('quiz', {});
  const items = Q.map(([q], i) => {
    const sel = el('select', { id: `q${i}`, 'aria-label': q },
      el('option', { value: '' }, '— เลือกคำอธิบาย —'),
      ...opts.map((t) => el('option', { value: t.id, selected: saved[i] === t.id }, `${t.icon} ${t.label}`)));
    sel.addEventListener('change', () => { saved[i] = sel.value; save('quiz', saved); });
    return el('li', {}, el('label', { for: `q${i}` }, q), el('br'), sel);
  });
  const res = el('p', { class: 'res', role: 'status' });
  const nameIn = el('input', { id: 'cert-name', maxlength: '28', placeholder: 'ชื่อนักสืบ', style: { minHeight: '44px', borderRadius: '6px', border: '1px solid var(--line-strong)', background: '#0b0506', padding: '0 12px' } });
  const certRow = el('div', { class: 'row', hidden: true },
    el('label', { class: 'sr-only', for: 'cert-name' }, 'ชื่อบนใบประกาศ'), nameIn,
    el('button', { class: 'btn primary', type: 'button', onclick: () => certificate(nameIn.value.trim() || 'นักสืบนิรนาม', score) }, 'ดาวน์โหลดใบประกาศ'));
  let score = 0;
  const check = el('button', { class: 'btn', type: 'button' }, 'ปิดคดี');
  check.addEventListener('click', () => {
    score = 0;
    Q.forEach(([, a], i) => { const ok = saved[i] === a; score += ok; items[i].className = saved[i] ? (ok ? 'ok' : 'bad') : ''; });
    res.textContent = `คุณอธิบายได้ ${score} / ${Q.length} เรื่อง`;
    announce(res.textContent);
    certRow.hidden = false;
  });
  return el('section', { class: 'hud quiz', 'aria-labelledby': 'quiz-t' },
    el('p', { class: 'eyebrow' }, 'ปิดคดี CASE 407'),
    el('h2', { id: 'quiz-t' }, 'แต่ละเรื่องคืออะไร'),
    el('p', { class: 'dim' }, 'เลือกคำอธิบายที่คุณคิดว่าใช่ที่สุด แล้วกดปิดคดี ส่วนเรื่องเลข 312 ในเสียง กับกระดาษที่เป็นลายมือของเจ้าของสมุดเอง… ไม่มีเฉลย ไปถกกันในห้องสืบสวน'),
    el('ol', {}, items), check, res, certRow);
}

function certificate(name, score) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(600, 260, 50, 600, 315, 700); grd.addColorStop(0, '#2a0909'); grd.addColorStop(1, '#060304');
  g.fillStyle = grd; g.fillRect(0, 0, 1200, 630);
  g.strokeStyle = '#ff3b2f'; g.lineWidth = 3; g.strokeRect(30, 30, 1140, 570);
  g.lineWidth = 1; g.strokeRect(44, 44, 1112, 542);
  g.fillStyle = '#ff6a3d'; g.font = '600 26px "Chakra Petch", sans-serif'; g.textAlign = 'center';
  g.fillText('CASE 407 · SLUR LAB', 600, 110);
  g.fillStyle = '#f3e9e2'; g.font = '800 64px "Kanit", sans-serif'; g.fillText('ใบประกาศนักสืบ', 600, 200);
  g.font = '500 30px "IBM Plex Sans Thai", sans-serif'; g.fillStyle = '#bfaba4'; g.fillText('มอบให้', 600, 260);
  g.fillStyle = '#ff3b2f'; g.font = '800 72px "Kanit", sans-serif'; g.fillText(name, 600, 350);
  g.fillStyle = '#f3e9e2'; g.font = '500 30px "IBM Plex Sans Thai", sans-serif';
  g.fillText(`ผู้อ่านไดอารี่คนเห็นผีครบ 14 วัน และอธิบายได้ ${score} จาก 8 เรื่อง`, 600, 420);
  g.fillStyle = '#8a7671'; g.font = '400 22px "IBM Plex Mono", monospace';
  g.fillText(new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }) + ' · ' + location.host, 600, 540);
  c.toBlob((b) => {
    const a = el('a', { href: URL.createObjectURL(b), download: 'case-407-certificate.png' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}
