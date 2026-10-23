// Shared page chrome: header, settings sheet, footer, preview bar, easter eggs, 3D background
import { el, reduceMotion } from './ui.js';
import { prefs, setPref } from './store.js';
import { url, initPreview, exitPreview, now } from './content.js';
import { refreshCount } from './board-store.js';
import { click, hum, audioCtx } from './sfx.js';

const NAV = [
  ['index.html#toc', 'สารบัญ', 'home'],
  ['lab.html', 'SLUR Lab', 'lab'],
  ['board.html', 'กระดาน', 'board'],
  ['about.html', 'เกี่ยวกับ', 'about'],
];

function applyPrefs() {
  const p = prefs();
  const r = document.documentElement;
  r.classList.toggle('reduce-motion', !!p.reduce);
  r.classList.toggle('typed', !!p.typed);
  r.style.setProperty('--fs', p.fs);
  document.querySelectorAll('[data-pref="sound"]').forEach((b) => {
    b.setAttribute('aria-pressed', String(!!p.sound));
    b.querySelector('.lbl').textContent = p.sound ? 'เสียง: เปิด' : 'เสียง: ปิด';
    const ico = b.querySelector('.ico'); if (ico) ico.textContent = p.sound ? '🔊' : '🔇';
  });
  document.querySelectorAll('[data-pref="reduce"]').forEach((b) => b.setAttribute('aria-pressed', String(!!p.reduce)));
  document.querySelectorAll('[data-pref="typed"]').forEach((b) => b.setAttribute('aria-pressed', String(!!p.typed)));
}

function toggleSound() {
  const p = setPref('sound', !prefs().sound);
  if (p.sound) { audioCtx(); click(); hum(true); } else hum(false);
  applyPrefs();
}

function header(page) {
  const sheet = el('div', { class: 'sheet', id: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'เมนูและการตั้งค่า' });
  const closeSheet = () => { sheet.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); };
  const menuBtn = el('button', {
    class: 'icon-btn menu-btn', type: 'button', 'aria-label': 'เมนูและการตั้งค่า', 'aria-expanded': 'false', 'aria-controls': 'sheet',
    onclick: () => { sheet.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true'); sheet.querySelector('a,button').focus(); },
  }, '☰');
  const soundBtn = (cls) => el('button', { class: cls + ' sound-btn', type: 'button', 'data-pref': 'sound', 'aria-pressed': 'false', onclick: toggleSound },
    el('span', { class: 'ico', 'aria-hidden': 'true' }, '🔇'), el('span', { class: 'lbl' }, 'เสียง: ปิด'));

  sheet.append(
    el('button', { class: 'icon-btn close', type: 'button', 'aria-label': 'ปิดเมนู', onclick: closeSheet }, '✕'),
    el('nav', { 'aria-label': 'เมนูหลัก (มือถือ)' }, ...NAV.map(([h, t]) => el('a', { href: url(h), onclick: closeSheet }, t))),
    el('div', { class: 'prefs' },
      el('p', { class: 'eyebrow' }, 'การตั้งค่า'),
      el('div', { class: 'pref-row' }, el('span', {}, 'เสียงบรรยากาศ'), soundBtn('btn small')),
      el('div', { class: 'pref-row' }, el('span', {}, 'ลดการเคลื่อนไหว'),
        el('button', { class: 'btn small', type: 'button', 'data-pref': 'reduce', 'aria-pressed': 'false', onclick: () => { setPref('reduce', !prefs().reduce); applyPrefs(); location.reload(); } }, 'สลับ')),
      el('div', { class: 'pref-row' }, el('span', {}, 'อ่านไดอารี่แบบตัวพิมพ์ (อ่านง่าย)'),
        el('button', { class: 'btn small', type: 'button', 'data-pref': 'typed', 'aria-pressed': 'false', onclick: () => { setPref('typed', !prefs().typed); applyPrefs(); } }, 'สลับ')),
      el('div', { class: 'pref-row' }, el('span', {}, 'ขนาดตัวอักษร'),
        el('div', { class: 'btns' },
          el('button', { class: 'btn small', type: 'button', 'aria-label': 'ตัวอักษรเล็กลง', onclick: () => { setPref('fs', Math.max(0.9, +(prefs().fs - 0.1).toFixed(1))); applyPrefs(); } }, 'A−'),
          el('button', { class: 'btn small', type: 'button', 'aria-label': 'ตัวอักษรใหญ่ขึ้น', onclick: () => { setPref('fs', Math.min(1.3, +(prefs().fs + 0.1).toFixed(1))); applyPrefs(); } }, 'A+'))),
    ),
  );
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  const h = el('header', { class: 'site-header' },
    el('a', { class: 'brand', href: url('index.html') },
      el('span', { class: 'brand-dot', 'aria-hidden': 'true' }),
      el('span', {}, 'ไดอารี่คนเห็นผี', el('small', {}, 'CASE 407 · SLUR LAB'))),
    el('nav', { class: 'nav', 'aria-label': 'เมนูหลัก' },
      ...NAV.map(([h_, t, k]) => el('a', { href: url(h_), 'aria-current': k === page ? 'page' : null },
        t, k === 'board' ? el('span', { class: 'count', 'data-board-count': '', hidden: true }, '0') : null))),
    el('div', { class: 'header-tools' },
      soundBtn('icon-btn'),
      el('a', { class: 'icon-btn mobile-board', href: url('board.html'), 'aria-label': 'กระดานหลักฐาน' }, '📌',
        el('span', { class: 'count', 'data-board-count': '', hidden: true }, '0')),
      menuBtn),
  );
  return [el('a', { class: 'skip', href: '#main' }, 'ข้ามไปเนื้อหา'), h, sheet];
}

function footer() {
  return el('footer', { class: 'site-footer' },
    el('div', { class: 'container' },
      el('span', {}, '© SLUR · ไดอารี่คนเห็นผี เป็นเรื่องแต่ง ตัวละครและสถานที่ไม่มีอยู่จริง'),
      el('span', {}, el('a', { href: url('about.html#credits') }, 'เครดิตรูปและเสียง'), ' · ', el('a', { href: url('lab.html') }, 'SLUR Lab'))));
}

function eggs() {
  const h = now().getHours();
  if (h === 3) {
    const bar = el('div', { class: 'egg-bar', role: 'status' },
      el('span', {}, '☾ ตีสามแล้วยังไม่นอนอีกเหรอ… นอนน้อยทำให้ "ผีอำ" ง่ายขึ้นนะ'),
      el('button', { type: 'button', 'aria-label': 'ปิด', onclick: () => bar.remove() }, '✕'));
    document.body.append(bar);
  }
  let typed = '';
  addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,[contenteditable]')) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === 'slur') signature();
  });
}

// Lissajous signature for the "slur" easter egg
function signature() {
  const c = el('canvas', { 'aria-hidden': 'true', style: { position: 'fixed', inset: '0', zIndex: 96, pointerEvents: 'none' } });
  document.body.append(c);
  const dpr = Math.min(devicePixelRatio, 2);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const cx = innerWidth / 2, cy = innerHeight / 2, R = Math.min(innerWidth, innerHeight) * 0.3;
  g.strokeStyle = '#ff3b2f'; g.lineWidth = 2; g.shadowColor = '#ff3b2f'; g.shadowBlur = 16;
  let t = 0;
  const step = () => {
    g.beginPath();
    for (let i = 0; i < 40; i++, t += 0.01) {
      const x = cx + R * Math.sin(3 * t + Math.PI / 2), y = cy + R * Math.sin(2 * t);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    if (t < Math.PI * 2) requestAnimationFrame(step);
    else {
      g.shadowBlur = 0; g.fillStyle = '#f3e9e2'; g.font = '600 28px "Chakra Petch", sans-serif'; g.textAlign = 'center';
      g.fillText('— SLUR —', cx, cy + 10);
      setTimeout(() => c.remove(), 2200);
    }
  };
  step();
}

export async function boot(page, { scene = 'ambient' } = {}) {
  applyPrefs();
  const pv = await initPreview().catch(() => null);
  const head = header(page);
  document.body.prepend(...head);
  if (pv) {
    const d = pv.date ? `วันที่จำลอง ${pv.date}` : 'ทุกหน้าเปิดหมด (ไม่จำกัดวัน)';
    head[1].before(el('div', { class: 'preview-bar', role: 'status' },
      el('span', {}, `โหมดพรีวิวของเจ้าของเว็บ — ${d} · คนอ่านทั่วไปไม่เห็นแบบนี้`),
      el('button', { type: 'button', onclick: exitPreview }, 'ออกจากพรีวิว')));
  }
  document.body.append(footer());
  applyPrefs();
  refreshCount();
  eggs();
  if (prefs().sound) {
    // browsers need a gesture before audio can start
    addEventListener('pointerdown', () => { audioCtx(); hum(true); }, { once: true });
  }
  const host = el('div', { id: 'bg3d', 'aria-hidden': 'true' });
  document.body.prepend(host);
  try {
    const m = await import('../three/scene.js');
    return m.start(host, { mode: scene, still: reduceMotion() });
  } catch (err) {
    console.warn('3D background unavailable:', err.message);
    return null;
  }
}
