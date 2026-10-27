// Small apparitions that live on every page: a shadow that peeks in when the reader sits still,
// a tab that begs you to come back, ghost names you can "summon" by typing, and the 3 a.m. mode.
// None of these flash, and the loud scare still only happens when the reader turned on scare mode.
import { el, reduceMotion, toast } from './ui.js';
import { now, url } from './content.js';
import { hauntOn, play } from './haunt.js';
import { scare } from './scare.js';
import { award } from './badges.js';

const sfx = (n) => { if (hauntOn()) play(n); };
const once = (k) => { try { if (sessionStorage.getItem('slur.v1.' + k)) return false; sessionStorage.setItem('slur.v1.' + k, '1'); } catch { /* private mode */ } return true; };

// ---- a woman's silhouette, long hair, standing just past the edge of the screen ----
const FIGURE = `<svg viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><filter id="gh-blur"><feGaussianBlur stdDeviation="2.4"/></filter>
  <linearGradient id="gh-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".75" stop-color="#050203"/><stop offset="1" stop-color="#050203" stop-opacity="0"/></linearGradient></defs>
  <g filter="url(#gh-blur)" fill="url(#gh-fade)">
    <ellipse cx="100" cy="78" rx="34" ry="44"/>
    <path d="M62 60 C50 140 54 230 44 300 L156 300 C146 230 150 140 138 60 Z"/>
    <path d="M58 150 C30 170 26 260 30 330 C40 420 48 520 60 600 L140 600 C152 520 160 420 170 330 C174 260 170 170 142 150 Z"/>
  </g>
  <g fill="#d9cfc7" opacity=".55"><ellipse cx="88" cy="84" rx="3.2" ry="2"/><ellipse cx="112" cy="84" rx="3.2" ry="2"/></g>
</svg>`;

function idleShadow() {
  let last = Date.now(), shown = null, lastShow = 0;
  const wake = () => {
    last = Date.now();
    if (!shown) return;
    const s = shown; shown = null;
    s.style.transition = 'opacity .12s linear'; s.style.opacity = '0';
    setTimeout(() => s.remove(), 200);
    sfx('whisper');
    if (award('idle')) toast('…เมื่อกี้เหมือนมีใครยืนอยู่ข้างจอ', null, 4000);
  };
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach((e) => addEventListener(e, wake, { passive: true }));
  setInterval(() => {
    if (shown || document.hidden || Date.now() - last < 25000 || Date.now() - lastShow < 180000) return;
    if (document.querySelector('.scare, dialog[open], .mirror-live')) return;
    lastShow = Date.now();
    const left = Math.random() < 0.5;
    shown = el('div', { class: `ghost-peek ${left ? 'left' : 'right'}`, 'aria-hidden': 'true' });
    shown.innerHTML = FIGURE;
    document.body.append(shown);
    setTimeout(() => shown && shown.classList.add('on'), 60);
    sfx('breath');
  }, 2000);
}

// ---- the tab title and icon when the reader looks away ----
function tabTitle() {
  const BEG = ['กลับมาก่อน…', 'ฉันยังรออยู่ตรงนี้', 'อย่าทิ้งฉันไว้คนเดียว', 'ได้ยินเสียงเคาะไหม', 'หันหลังทำไม'];
  const EYE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#120405"/><ellipse cx="16" cy="16" rx="12" ry="7" fill="#e9dcd4"/><circle cx="16" cy="16" r="5" fill="#b30f0f"/><circle cx="16" cy="16" r="2" fill="#000"/></svg>');
  let saved = null, iv = 0, away = 0;
  const icon = () => document.querySelector('link[rel="icon"]');
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saved = { title: document.title, icon: icon()?.href };
      away = Date.now();
      let k = 0;
      document.title = BEG[0];
      if (icon()) icon().href = EYE;
      iv = setInterval(() => { document.title = BEG[++k % BEG.length]; }, 3000);
    } else if (saved) {
      clearInterval(iv);
      document.title = saved.title;
      if (icon() && saved.icon) icon().href = saved.icon;
      saved = null;
      if (Date.now() - away > 4000) {
        award('away');
        if (once('backToast')) { toast('ตอนคุณไม่อยู่ มีอะไรบางอย่างเปิดหน้านี้อ่านต่อ…', null, 4500); sfx('door'); }
      }
    }
  });
}

// ---- names you can type (or enter in the summon box on the archive page) ----
const NAMES = [
  { keys: ['แม่นาค', 'maenak', 'mae nak'], run: maeNak },
  { keys: ['ปากฉีก', 'kuchisake', 'kuchisake-onna'], run: kuchisake },
  { keys: ['คิซารางิ', 'kisaragi', 'きさらぎ'], run: kisaragi },
  { keys: ['บลัดดี้แมรี่', 'bloody mary', 'bloodymary'], run: () => { toast('เธอไม่มาทางคีย์บอร์ด… ต้องไปหน้ากระจก', { label: 'ไปหน้ากระจก', run: () => { location.href = url('story.html?id=bloody-mary'); } }, 6000); } },
  { keys: ['407'], run: room407 },
];

export function summon(text) {
  const t = String(text).toLowerCase().replace(/\s+/g, ' ').trim();
  const hit = NAMES.find((n) => n.keys.some((k) => t.endsWith(k)));
  if (!hit) return false;
  hit.run();
  award('egg');
  return true;
}

function typedNames() {
  let buf = '';
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    buf = (buf + e.key.toLowerCase()).slice(-16);
    if (summon(buf)) buf = '';
  });
}

// Mae Nak's arm stretches across the screen to pick up a lime that fell
function maeNak() {
  const lime = el('div', { class: 'egg-lime', 'aria-hidden': 'true' });
  const arm = el('div', { class: 'egg-arm', 'aria-hidden': 'true' });
  arm.innerHTML = '<svg viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0 22 L940 26 C955 18 975 14 990 20 C998 24 998 34 990 38 C975 44 955 42 940 34 L0 38 Z" fill="#cdbfb3"/><path d="M940 26 L996 14 M944 30 L999 28 M940 34 L994 42" stroke="#b9a99c" stroke-width="5" stroke-linecap="round"/></svg>';
  document.body.append(lime, arm);
  sfx('creak');
  if (reduceMotion()) { arm.style.transform = 'translateX(-60vw)'; lime.style.transform = 'translateY(66vh)'; setTimeout(() => { arm.remove(); lime.remove(); }, 1600); }
  else {
    lime.animate([{ transform: 'translateY(-10vh)' }, { transform: 'translateY(66vh)' }], { duration: 700, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' });
    const a = arm.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-78vw)', offset: 0.45 }, { transform: 'translateX(-78vw)', offset: 0.6 }, { transform: 'translateX(0)' }], { duration: 3200, delay: 700, easing: 'ease-in-out' });
    setTimeout(() => lime.animate([{ transform: 'translateY(66vh)' }, { transform: 'translate(78vw, 66vh)' }], { duration: 1300, easing: 'ease-in-out', fill: 'forwards' }), 700 + 3200 * 0.6);
    a.onfinish = () => { arm.remove(); lime.remove(); };
  }
  toast('มะนาวหล่นใต้ถุนบ้าน… แขนยาวผิดปกติยื่นลงไปเก็บ', null, 4500);
}

// "Am I pretty?" — answer like the legend says or else
function kuchisake() {
  const out = el('p', { class: 'egg-q-out' });
  const close = () => d.close();
  const pick = (k) => {
    d.querySelectorAll('button[data-a]').forEach((b) => { b.disabled = true; });
    if (k === 'yes') { out.textContent = 'เธอค่อยๆ ดึงผ้าปิดปากลง… "แล้วแบบนี้ล่ะ ยังสวยอยู่ไหม?" ปากฉีกยาวถึงหู'; sfx('laugh'); d.classList.add('torn'); setTimeout(scare, 700); }
    else if (k === 'no') { out.textContent = 'ผิดคำตอบ เธอหยิบกรรไกรออกมาจากเสื้อโค้ต…'; sfx('scream'); setTimeout(scare, 300); }
    else { out.textContent = 'เธอยืนงงอยู่ครู่หนึ่ง แล้วเดินจากไป ตามตำนาน คำตอบกำกวมแบบนี้ทำให้รอด'; }
    setTimeout(close, 4200);
  };
  const d = el('dialog', { class: 'egg-q', 'aria-label': 'ผู้หญิงปิดปากถามคำถาม' },
    el('div', { class: 'mask', 'aria-hidden': 'true' }),
    el('p', { class: 'q' }, '"ฉัน… สวยไหม?"'),
    el('div', { class: 'a' },
      el('button', { type: 'button', class: 'btn small', 'data-a': 'yes', onclick: () => pick('yes') }, 'สวย'),
      el('button', { type: 'button', class: 'btn small', 'data-a': 'no', onclick: () => pick('no') }, 'ไม่สวย'),
      el('button', { type: 'button', class: 'btn small', 'data-a': 'meh', onclick: () => pick('meh') }, 'ก็งั้นๆ แหละ')),
    out);
  d.addEventListener('close', () => d.remove());
  document.body.append(d);
  d.showModal();
  sfx('footsteps');
}

// a station sign for a station that does not exist slides past
function kisaragi() {
  const s = el('div', { class: 'egg-station', 'aria-hidden': 'true' }, el('b', {}, 'きさらぎ'), el('small', {}, 'KISARAGI'), el('span', {}, '← ??'), el('span', {}, '?? →'));
  document.body.append(s);
  sfx('train');
  if (reduceMotion()) setTimeout(() => s.remove(), 2500);
  else s.animate([{ transform: 'translateX(110vw)' }, { transform: 'translateX(-120%)' }], { duration: 3800, easing: 'cubic-bezier(.3,.1,.7,.9)' }).onfinish = () => s.remove();
  toast('รถไฟจอดที่สถานีที่ไม่มีบนแผนที่…', null, 4000);
}

function room407() {
  document.documentElement.classList.add('egg-dim');
  sfx('knock');
  setTimeout(() => document.documentElement.classList.remove('egg-dim'), 2200);
  toast('ก๊อก ก๊อก ก๊อก… ห้อง 407 ยังไม่ว่างนะ', null, 4000);
}

// ---- 3 a.m. ----
function witching() {
  if (now().getHours() !== 3) return;
  document.documentElement.classList.add('witching');
  if (award('3am')) toast('🌑 ตีสามแล้ว… เรื่องลับในคลังเปิดให้อ่านแล้ว', null, 6000);
}

export function initGhosts() {
  witching();
  tabTitle();
  typedNames();
  idleShadow();
}
