// Per-story interactive bits. mountWidget(name, host, story)
import { el, rng, announce, reduceMotion, whenVisible } from '../core/ui.js';
import { audioCtx, masterOut } from '../core/sfx.js';
import { hauntOn, play, tension } from '../core/haunt.js';
import { scare } from '../core/scare.js';
import { prefs } from '../core/store.js';
import { url } from '../core/content.js';
import { cover } from './covers.js';

// small helpers
function frame(host, title, { w = 960, h = 540 } = {}) {
  const c = el('canvas', { width: w, height: h, role: 'img', 'aria-label': title });
  const out = el('div', { class: 'wg-out', 'aria-live': 'polite' });
  const bar = el('div', { class: 'wg-bar' });
  const box = el('div', { class: 'wg' }, el('div', { class: 'wg-title' }, `▣ ${title}`), c, bar, out);
  host.append(box);
  return { box, c, g: c.getContext('2d'), out, bar, w, h };
}
const sfx = (name) => { if (hauntOn()) play(name); };
const btn = (text, onclick, attrs = {}) => el('button', { class: 'btn small', type: 'button', onclick, ...attrs }, text);
function canvasPoint(c, e) { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * c.width, y: (e.clientY - r.top) / r.height * c.height }; }
function animate(box, fn) {
  if (reduceMotion()) { fn(0); return () => {}; }
  let raf = 0, on = false;
  const tick = (t) => { fn(t / 1000); if (on) raf = requestAnimationFrame(tick); };
  return whenVisible(box, (v) => { if (v && !on) { on = true; raf = requestAnimationFrame(tick); } if (!v) { on = false; cancelAnimationFrame(raf); } });
}

// direct "po po po" for when the soundscape is off but the reader presses the button
function poPoPo() {
  if (hauntOn()) { play('pobopo'); return; }
  const ctx = audioCtx(); if (!ctx) return;
  for (let i = 0; i < 3; i++) {
    const at = ctx.currentTime + i * 0.42;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(105, at); o.frequency.linearRampToValueAtTime(92, at + 0.18);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, at); f.frequency.exponentialRampToValueAtTime(260, at + 0.15); f.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.6, at + 0.015); g.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
    o.connect(f).connect(g).connect(masterOut()); o.start(at); o.stop(at + 0.25);
  }
}

const W = {
  // ---------------------------------------------------------------- Kisaragi: the route that leaves the map
  route(host) {
    const f = frame(host, 'เส้นทางรถไฟคืนนั้น (จำลอง)');
    const stations = ['新浜松', '八幡', '助信', '曳馬', '上島', '自動車学校前'];
    let t0 = performance.now(), playing = true;
    const stop = animate(f.box, (t) => {
      const { g, w, h } = f;
      g.fillStyle = '#0b0d14'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,140,180,.15)';
      for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      // known line
      const y = h * 0.4;
      g.strokeStyle = '#3d7bd9'; g.lineWidth = 6; g.beginPath(); g.moveTo(60, y); g.lineTo(w * 0.55, y); g.stroke();
      stations.forEach((s, i) => {
        const x = 60 + i * (w * 0.55 - 60) / (stations.length - 1);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#cfd6e6'; g.font = '18px "Noto Sans JP", sans-serif'; g.textAlign = 'center'; g.fillText(s, x, y - 18);
      });
      // the part that isn't on any map
      g.setLineDash([10, 10]); g.strokeStyle = '#ff3b2f'; g.beginPath(); g.moveTo(w * 0.55, y); g.bezierCurveTo(w * 0.7, y, w * 0.72, h * 0.75, w * 0.86, h * 0.72); g.stroke(); g.setLineDash([]);
      const glitch = Math.sin(t * 13) > 0.6 ? (Math.random() - 0.5) * 8 : 0;
      g.fillStyle = '#ff3b2f'; g.beginPath(); g.arc(w * 0.86 + glitch, h * 0.72, 10, 0, Math.PI * 2); g.fill();
      g.font = '700 26px "Noto Sans JP", sans-serif'; g.fillText('きさらぎ', w * 0.86 + glitch, h * 0.72 + 40);
      g.font = '14px "IBM Plex Sans Thai", sans-serif'; g.fillStyle = '#ff9a7a'; g.fillText('ไม่พบในแผนที่ใดๆ', w * 0.86, h * 0.72 + 64);
      // the train dot
      const k = playing ? ((performance.now() - t0) / 1000 % 14) / 14 : 0;
      let px, py;
      if (k < 0.5) { px = 60 + (w * 0.55 - 60) * (k / 0.5); py = y; } else { const u = (k - 0.5) / 0.5; px = w * 0.55 + (w * 0.31) * u; py = y + (h * 0.32) * u * u; }
      g.fillStyle = '#ffd866'; g.fillRect(px - 14, py - 6, 28, 12);
      const mins = Math.round(k * 70);
      g.textAlign = 'left'; g.fillStyle = '#cfd6e6'; g.font = '16px "IBM Plex Mono", monospace';
      g.fillText(`เวลาผ่านไป ${mins} นาที · ${k < 0.5 ? 'จอดตามสถานีปกติ' : 'ไม่จอดเลย…'}`, 20, h - 24);
    });
    f.out.textContent = 'สถานีบนเส้นสีฟ้าเป็นสถานีจริงของรถไฟสายเอ็นชู ส่วนเส้นประสีแดงคือเส้นทางที่ "ไม่ควรมีอยู่"';
    f.bar.append(btn('รีสตาร์ทรถไฟ', () => { t0 = performance.now(); sfx('train'); }));
    return stop;
  },

  // ---------------------------------------------------------------- Hasshaku-sama: how tall is 8 shaku?
  height(host) {
    const f = frame(host, 'สูงแปดชากุ = ราว 2.4 เมตร เทียบกับคุณ');
    let you = 165;
    const slider = el('input', { type: 'range', min: 100, max: 200, value: you, 'aria-label': 'ส่วนสูงของคุณ (ซม.)' });
    const lbl = el('output', {}, `${you} ซม.`);
    slider.addEventListener('input', () => { you = +slider.value; lbl.textContent = `${you} ซม.`; draw(); });
    function person(g, x, base, cm, scale, color, label, hat) {
      const H = cm * scale;
      g.fillStyle = color;
      g.beginPath(); g.ellipse(x, base - H + H * 0.06, H * 0.055, H * 0.065, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x - H * 0.09, base - H + H * 0.13, H * 0.18, H * 0.45);
      g.fillRect(x - H * 0.07, base - H * 0.42, H * 0.06, H * 0.42); g.fillRect(x + H * 0.01, base - H * 0.42, H * 0.06, H * 0.42);
      if (hat) { g.fillStyle = '#f4f3ee'; g.beginPath(); g.ellipse(x, base - H + H * 0.02, H * 0.12, H * 0.025, 0, 0, Math.PI * 2); g.fill(); g.fillRect(x - H * 0.06, base - H - H * 0.03, H * 0.12, H * 0.05); }
      g.fillStyle = '#cfc6bd'; g.font = '18px "IBM Plex Sans Thai", sans-serif'; g.textAlign = 'center'; g.fillText(label, x, base + 26);
    }
    function draw() {
      const { g, w, h } = f;
      g.fillStyle = '#0d0b08'; g.fillRect(0, 0, w, h);
      const base = h - 60, scale = (h - 110) / 250;
      // ruler
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.fillStyle = '#8a7671'; g.font = '13px "IBM Plex Mono", monospace'; g.textAlign = 'left';
      for (let cm = 0; cm <= 250; cm += 50) { const yy = base - cm * scale; g.beginPath(); g.moveTo(40, yy); g.lineTo(w - 20, yy); g.stroke(); g.fillText(`${cm}`, 6, yy + 4); }
      // door frame 200 cm
      g.strokeStyle = '#6b5a4a'; g.lineWidth = 8; g.strokeRect(w * 0.12, base - 200 * scale, 90, 200 * scale); g.lineWidth = 1;
      g.fillStyle = '#cfc6bd'; g.textAlign = 'center'; g.font = '16px "IBM Plex Sans Thai", sans-serif'; g.fillText('วงกบประตู 2 ม.', w * 0.12 + 45, base + 26);
      person(g, w * 0.42, base, you, scale, '#7d8fb0', `คุณ ${you} ซม.`);
      person(g, w * 0.72, base, 242, scale, '#efeee9', 'ฮัสชาคุซามะ ~242 ซม.', true);
      const over = 242 - you;
      f.out.textContent = `เธอสูงกว่าคุณ ${over} ซม. ต้องก้มตัวลอดประตูบ้านทั่วไป · 1 ชากุ ≈ 30.3 ซม. × 8 = 242 ซม.`;
    }
    f.bar.append(el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, 'ส่วนสูงคุณ', slider, lbl), btn('🔊 ぽ ぽ ぽ', () => { poPoPo(); announce('เสียง โปะ โปะ โปะ'); }));
    draw();
    return () => {};
  },

  // ---------------------------------------------------------------- Kunekune: don't look too long
  kunekune(host) {
    const f = frame(host, 'ทุ่งนาตอนเที่ยง · มีอะไรขาวๆ ดิ้นอยู่ไกลๆ');
    let zoom = 1, holding = false, held = 0;
    const page = document.querySelector('.st-body');
    const stop = animate(f.box, (t) => {
      if (holding) { zoom = Math.min(6, zoom + 0.04); held += 1 / 60; } else { zoom = Math.max(1, zoom - 0.08); held = Math.max(0, held - 0.05); }
      const { g, w, h } = f;
      g.save();
      g.translate(w * 0.7, h * 0.5); g.scale(zoom, zoom); g.translate(-w * 0.7, -h * 0.5);
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#d7d0b0'); sky.addColorStop(1, '#f3edd4'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#6f8a3a'; g.fillRect(0, h * 0.55, w, h * 0.45);
      g.strokeStyle = 'rgba(40,60,20,.3)';
      for (let y = h * 0.57; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      // heat shimmer
      g.globalAlpha = 0.25; g.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) g.fillRect(0, h * 0.5 + Math.sin(t * 3 + i) * 4 + i * 3, w, 1);
      g.globalAlpha = 1;
      g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
      for (let k = 0; k <= 1; k += 0.04) { const x = w * 0.7 + Math.sin(k * 8 + t * 6) * 6 * (1 + k), y = h * 0.53 - k * 70; k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.restore();
      if (held > 2.5) {
        page?.classList.add('wobble');
        f.out.textContent = '…มันเริ่มเข้าใจแล้วว่านั่นคืออะไร ปล่อยปุ่มเดี๋ยวนี้!';
        tension(1);
      } else {
        page?.classList.remove('wobble');
        if (!holding) f.out.textContent = 'กดค้างที่ปุ่ม "ซูมเข้าไปดู" ถ้ากล้า ตำนานบอกว่าคนที่มองจนเข้าใจว่ามันคืออะไร จะไม่เหมือนเดิมอีกเลย';
      }
    });
    const zb = btn('🔍 ซูมเข้าไปดู (กดค้าง)', null);
    const on = () => { holding = true; sfx('whisper'); }, off = () => { holding = false; tension(0); page?.classList.remove('wobble'); };
    zb.addEventListener('pointerdown', on); zb.addEventListener('pointerup', off); zb.addEventListener('pointerleave', off);
    zb.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); on(); } });
    zb.addEventListener('keyup', off);
    f.bar.append(zb, el('span', { class: 'faint' }, 'คำอธิบายที่เป็นไปได้: ไอร้อนลอยจากนา หุ่นไล่กา หรือผ้าพลาสติกปลิวลม'));
    return stop;
  },

  // ---------------------------------------------------------------- Kuchisake-onna: answer carefully
  kuchisake(host) {
    const box = el('div', { class: 'wg' });
    host.append(box);
    const scene = cover('kuchisake', 960, 400);
    const line = el('p', { class: 'dialog-line' }, '');
    const choices = el('div', { class: 'choices' });
    const out = el('div', { class: 'wg-out', 'aria-live': 'polite' });
    box.append(el('div', { class: 'wg-title' }, '▣ ทางกลับบ้าน 18:40 · มีผู้หญิงใส่หน้ากากยืนอยู่ใต้เสาไฟ'), scene, line, choices, out);
    const say = (t) => { line.textContent = t; announce(t); };
    const set = (opts) => choices.replaceChildren(...opts.map(([t, fn]) => el('button', { type: 'button', onclick: fn }, t)));
    function start() {
      out.textContent = '';
      say('"ฉัน… สวยไหม?"');
      sfx('breath');
      set([
        ['สวยครับ/ค่ะ', () => { say('เธอค่อยๆ ดึงหน้ากากลง… "แล้วแบบนี้ล่ะ?"'); tension(0.9); sfx('whisper');
          set([['…ยังสวยอยู่', () => end('เธอยิ้ม รอยแผลยาวถึงหู "งั้นเธอก็ต้องเหมือนฉัน" — ตามตำนาน คำตอบนี้ก็ไม่รอด', true)],
            ['ไม่สวย!', () => end('ตามตำนาน ตอบว่าไม่สวยตอนนี้คือจบเห่', true)],
            ['ก็…ธรรมดานะ', () => end('เธอนิ่งไปเพราะไม่รู้จะทำยังไงกับคำตอบนี้ คุณมีเวลาพอจะวิ่งหนี ✔ (วิธีรอดตามตำนาน)')]]); }],
        ['ไม่สวย', () => end('ตามตำนาน คนที่ตอบว่าไม่สวยจะถูกทำร้ายทันที', true)],
        ['ก็ธรรมดานะ', () => end('คำตอบกลางๆ ทำให้เธองง คุณวิ่งหนีได้ ✔')],
        ['"ขอโทษนะ ผมรีบ"', () => end('ในบางเวอร์ชัน เธอจะโค้งขอโทษแล้วปล่อยไป ✔')],
        ['โยนลูกอมเบกโกะ', () => end('เธอก้มเก็บลูกอม คุณวิ่งหนีได้ ✔ (ลูกอมเบกโกะเป็นของโปรดเธอตามตำนาน)')],
        ['พูด "โพมาด" 3 ครั้ง', () => end('ว่ากันว่าเธอเกลียดกลิ่นน้ำมันใส่ผมโพมาด เธอจึงถอยไป ✔')],
      ]);
    }
    function end(text, bad = false) {
      tension(0);
      out.textContent = text;
      if (bad) { sfx('door'); scare(); }
      set([['ลองใหม่', start]]);
    }
    start();
    return () => {};
  },

  // ---------------------------------------------------------------- Hoichi: paint the sutra, don't forget the ears
  hoichi(host) {
    const f = frame(host, 'เขียนพระสูตรลงบนตัวโฮอิจิ · ลากเพื่อเขียน');
    const { g, w, h } = f;
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const m = mask.getContext('2d');
    // silhouette of a seated monk (head, ears, body)
    const shape = (ctx) => {
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.24, 52, 62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w / 2 - 70, h * 0.38); ctx.quadraticCurveTo(w / 2 - 170, h * 0.75, w / 2 - 200, h * 0.95); ctx.lineTo(w / 2 + 200, h * 0.95); ctx.quadraticCurveTo(w / 2 + 170, h * 0.75, w / 2 + 70, h * 0.38); ctx.closePath(); ctx.fill();
    };
    const ears = [[w / 2 - 56, h * 0.25], [w / 2 + 56, h * 0.25]];
    m.fillStyle = '#fff'; shape(m); ears.forEach(([x, y]) => { m.beginPath(); m.ellipse(x, y, 12, 20, 0, 0, Math.PI * 2); m.fill(); });
    const paint = document.createElement('canvas'); paint.width = w; paint.height = h;
    const p = paint.getContext('2d');
    const chars = '般若波羅蜜多心経観自在菩薩行深色即是空空即是色';
    let ci = 0, last = null;
    function draw() {
      g.fillStyle = '#120c09'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c9b49a'; shape(g); ears.forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 12, 20, 0, 0, Math.PI * 2); g.fill(); });
      g.drawImage(paint, 0, 0);
    }
    const stamp = (x, y) => {
      if (!m.getImageData(x | 0, y | 0, 1, 1).data[3]) return;
      p.fillStyle = '#1b1310'; p.font = '26px "Noto Serif JP", serif'; p.textAlign = 'center';
      p.fillText(chars[ci++ % chars.length], x, y + 9);
    };
    f.c.addEventListener('pointerdown', (e) => { f.c.setPointerCapture(e.pointerId); last = canvasPoint(f.c, e); stamp(last.x, last.y); draw(); });
    f.c.addEventListener('pointermove', (e) => {
      if (!last) return;
      const q = canvasPoint(f.c, e);
      if (Math.hypot(q.x - last.x, q.y - last.y) > 22) { stamp(q.x, q.y); last = q; draw(); }
    });
    f.c.addEventListener('pointerup', () => { last = null; });
    const coverage = () => {
      const a = m.getImageData(0, 0, w, h).data, b = p.getImageData(0, 0, w, h).data;
      let body = 0, inked = 0;
      for (let i = 3; i < a.length; i += 64) if (a[i]) { body++; if (b[i]) inked++; }
      const earInk = ears.map(([x, y]) => p.getImageData(x - 10, y - 16, 20, 32).data.some((v, k) => k % 4 === 3 && v));
      return { pct: Math.round(inked / body * 100), ears: earInk.every(Boolean) };
    };
    f.bar.append(
      btn('🌙 คืนนี้ซามูไรมาแล้ว', () => {
        const c = coverage();
        sfx('templebell');
        if (c.pct < 25) { f.out.textContent = `เขียนไปแค่ ${c.pct}% ซามูไรผีมองเห็นโฮอิจิทั้งตัว… และพาเขาไปบรรเลงบิวะให้คนตายฟังอีกคืน`; scare(); }
        else if (!c.ears) { f.out.textContent = `คุณเขียนครอบคลุม ${c.pct}% แต่ลืมหู! ซามูไรเห็นแค่หูสองข้างลอยอยู่ในความมืด แล้วฉีกมันกลับไปเป็นหลักฐาน… เหมือนในตำนาน`; scare(); }
        else f.out.textContent = `เขียนครบทั้งตัวรวมหู (${c.pct}%) ซามูไรผีมองไม่เห็นโฮอิจิเลย ✔ คุณเก่งกว่าพระในเรื่องอีก`;
      }),
      btn('ลบแล้วเขียนใหม่', () => { p.clearRect(0, 0, w, h); ci = 0; draw(); f.out.textContent = ''; }));
    f.out.textContent = 'ลากนิ้วหรือเมาส์บนตัวโฮอิจิเพื่อเขียนพระสูตร แล้วกด "คืนนี้ซามูไรมาแล้ว"';
    draw();
    return () => {};
  },

  // ---------------------------------------------------------------- Little girl in red: spot her in the footage
  'find-girl'(host, s) {
    const f = frame(host, 'เทปวิดีโอครอบครัว 1998 (จำลอง) · หาเด็กชุดแดงให้เจอ');
    const img = new Image();
    const bgReady = new Promise((r) => { img.onload = r; img.onerror = r; });
    img.src = s.images?.trail ? url(s.images.trail.file) : '';
    let spot = null, found = false, start = 0;
    const R = rng('girl' + Date.now());
    function place() { spot = { x: 120 + R() * (f.w - 240), y: f.h * 0.45 + R() * f.h * 0.3, s: 0.7 + R() * 0.4 }; found = false; start = performance.now(); }
    const stop = animate(f.box, (t) => {
      const { g, w, h } = f;
      if (img.naturalWidth) g.drawImage(img, 0, 0, w, h); else { g.fillStyle = '#1d2a1a'; g.fillRect(0, 0, w, h); }
      // VHS treatment
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, w, 1); }
      const jitter = Math.sin(t * 40) > 0.97 ? (Math.random() - 0.5) * 12 : 0;
      if (spot) {
        const { x, y, s: k } = spot;
        g.save(); g.globalAlpha = found ? 1 : 0.55; g.translate(x + jitter, y);
        g.fillStyle = '#b3201a'; g.beginPath(); g.moveTo(-8 * k, -6 * k); g.lineTo(8 * k, -6 * k); g.lineTo(12 * k, 22 * k); g.lineTo(-12 * k, 22 * k); g.fill();
        g.fillStyle = '#d9cfc7'; g.beginPath(); g.arc(0, -12 * k, 6 * k, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#111'; g.fillRect(-6 * k, -18 * k, 12 * k, 5 * k);
        g.restore();
        if (found) { g.strokeStyle = '#ffd866'; g.lineWidth = 3; g.strokeRect(x - 30 * k, y - 30 * k, 60 * k, 60 * k); }
      }
      g.fillStyle = '#fff'; g.font = '22px "IBM Plex Mono", monospace'; g.textAlign = 'left';
      g.fillText('▶ PLAY   1998.03.01', 20, 36);
    });
    f.c.addEventListener('click', (e) => {
      if (!spot || found) return;
      const q = canvasPoint(f.c, e);
      if (Math.hypot(q.x - spot.x, q.y - spot.y) < 40) {
        found = true; const sec = ((performance.now() - start) / 1000).toFixed(1);
        f.out.textContent = `เจอแล้วใน ${sec} วินาที… ไม่มีใครในครอบครัวจำได้ว่ามีเด็กคนนี้เดินตามมาด้วย`;
        sfx('childhum'); scare();
      } else { f.out.textContent = 'ไม่ใช่ตรงนั้น… ลองดูดีๆ ตามขอบทาง'; sfx('branch'); }
    });
    f.bar.append(btn('เล่นเทปใหม่', () => { place(); f.out.textContent = 'คลิกที่เด็กชุดแดงเมื่อเห็น'; }));
    bgReady.then(place);
    f.out.textContent = 'คลิกที่เด็กชุดแดงเมื่อเห็น (เธอจางมาก)';
    return stop;
  },

  // ---------------------------------------------------------------- Mo-sin-a: someone calls your name in the forest
  mosina(host) {
    const box = el('div', { class: 'wg' }); host.append(box);
    const line = el('p', { class: 'dialog-line' }); const choices = el('div', { class: 'choices' }); const out = el('div', { class: 'wg-out', 'aria-live': 'polite' });
    box.append(el('div', { class: 'wg-title' }, '▣ เดินป่าตอนเย็น · ทางแยก'), line, choices, out);
    let depth = 0;
    const set = (t, opts) => { line.textContent = t; announce(t); choices.replaceChildren(...opts.map(([x, fn]) => el('button', { type: 'button', onclick: fn }, x))); };
    function start() {
      depth = 0; out.textContent = '';
      set('ได้ยินเสียงเรียกชื่อคุณจากในป่า เสียงเหมือนแม่เลย…', [['เดินตามเสียง', deeper], ['อยู่บนทางเดิน แล้วโทรหาแม่', safe]]);
      sfx('whisper');
    }
    function deeper() {
      depth++;
      sfx(depth % 2 ? 'footsteps' : 'childhum');
      if (depth < 3) set(['มีเด็กใส่เสื้อแดงยืนยิ้มอยู่ข้างหน้า กวักมือเรียก', 'เด็กยื่นข้าวเหนียวห่อใบไม้ให้กิน "หิวไหม"', ''][depth - 1],
        [['ตามไป', deeper], ['หยุด แล้วหันกลับ', safe]]);
      else {
        set('…', [['เริ่มใหม่', start]]);
        out.textContent = 'สามวันต่อมา ทีมค้นหาเจอคุณนั่งนิ่งอยู่ใต้ต้นไม้ห่างจากทางเดิน 4 กิโลเมตร ในปากมีดินกับใบไม้ คุณจำได้แค่ว่ามีคนพาไปกินข้าว — แบบเดียวกับเรื่องเล่าคนหายในป่าไต้หวัน';
        scare();
      }
    }
    function safe() { set('เสียงเรียกเงียบไป โทรศัพท์ติด แม่บอกว่า "แม่อยู่บ้านทั้งวันนะลูก"', [['เริ่มใหม่', start]]); out.textContent = 'คุณรอด ✔ คนไต้หวันรุ่นเก่าสอนว่า ถ้ามีเสียงเรียกในป่า อย่าตอบ และอย่าออกนอกทาง'; }
    start();
    return () => {};
  },

  // ---------------------------------------------------------------- Painted Skin: scratch the beauty away
  peel(host) {
    const f = frame(host, 'ขูดผิวสาวงามดูสิ ว่าข้างใต้คืออะไร', { w: 720, h: 720 });
    const { g, w, h } = f;
    const under = document.createElement('canvas'); under.width = w; under.height = h;
    const u = under.getContext('2d');
    // demon beneath: green-grey face, jagged teeth, holding a brush
    u.fillStyle = '#0d1410'; u.fillRect(0, 0, w, h);
    u.fillStyle = '#4c6b4a'; u.beginPath(); u.ellipse(w / 2, h * 0.48, 190, 240, 0, 0, Math.PI * 2); u.fill();
    u.fillStyle = '#ffde59'; u.beginPath(); u.ellipse(w * 0.42, h * 0.4, 26, 18, 0, 0, Math.PI * 2); u.ellipse(w * 0.58, h * 0.4, 26, 18, 0, 0, Math.PI * 2); u.fill();
    u.fillStyle = '#000'; u.fillRect(w * 0.42 - 4, h * 0.4 - 16, 8, 32); u.fillRect(w * 0.58 - 4, h * 0.4 - 16, 8, 32);
    u.fillStyle = '#1b0b0b'; u.beginPath(); u.ellipse(w / 2, h * 0.62, 90, 40, 0, 0, Math.PI); u.fill();
    u.fillStyle = '#e8e2cf'; for (let i = -4; i <= 4; i++) { u.beginPath(); u.moveTo(w / 2 + i * 20 - 8, h * 0.62); u.lineTo(w / 2 + i * 20 + 8, h * 0.62); u.lineTo(w / 2 + i * 20, h * 0.66); u.fill(); }
    const top = document.createElement('canvas'); top.width = w; top.height = h;
    const t = top.getContext('2d');
    // beauty on top: pale face, red lips, black hair
    t.fillStyle = '#16100f'; t.fillRect(0, 0, w, h);
    t.fillStyle = '#121010'; t.beginPath(); t.ellipse(w / 2, h * 0.42, 230, 290, 0, 0, Math.PI * 2); t.fill();
    t.fillStyle = '#f0ddd0'; t.beginPath(); t.ellipse(w / 2, h * 0.5, 170, 220, 0, 0, Math.PI * 2); t.fill();
    t.fillStyle = '#1a1a1a'; t.beginPath(); t.ellipse(w * 0.42, h * 0.45, 22, 6, 0, 0, Math.PI * 2); t.ellipse(w * 0.58, h * 0.45, 22, 6, 0, 0, Math.PI * 2); t.fill();
    t.fillStyle = '#b3201a'; t.beginPath(); t.ellipse(w / 2, h * 0.63, 30, 10, 0, 0, Math.PI * 2); t.fill();
    t.fillStyle = 'rgba(200,80,80,.18)'; t.beginPath(); t.ellipse(w * 0.38, h * 0.55, 34, 18, 0, 0, Math.PI * 2); t.ellipse(w * 0.62, h * 0.55, 34, 18, 0, 0, Math.PI * 2); t.fill();
    const draw = () => { g.drawImage(under, 0, 0); g.drawImage(top, 0, 0); };
    let down = false, scratched = 0, scared = false;
    const scratch = (e) => {
      const q = canvasPoint(f.c, e);
      t.globalCompositeOperation = 'destination-out';
      t.beginPath(); t.arc(q.x, q.y, 34, 0, Math.PI * 2); t.fill();
      t.globalCompositeOperation = 'source-over';
      scratched++; draw();
      if (scratched % 12 === 0) sfx('creak');
      if (scratched > 70 && !scared) { scared = true; f.out.textContent = '"ผิวหนัง" ที่บัณฑิตหวังเห็นแท้จริงเป็นแค่ภาพวาดบนหนัง ปีศาจข้างใต้กำลังมองเขาอยู่'; scare(); }
    };
    f.c.addEventListener('pointerdown', (e) => { down = true; f.c.setPointerCapture(e.pointerId); scratch(e); });
    f.c.addEventListener('pointermove', (e) => down && scratch(e));
    f.c.addEventListener('pointerup', () => { down = false; });
    f.bar.append(btn('วาดหน้าใหม่', () => { host.replaceChildren(); W.peel(host); }));
    f.out.textContent = 'ลากเพื่อขูดหน้าหญิงสาวออกทีละนิด';
    draw();
    return () => {};
  },

  // ---------------------------------------------------------------- Bunshinsaba: the pen that answers
  bunshinsaba(host) {
    const f = frame(host, 'พิธีบุนชินซาบะ (จำลอง) · ถามคำถามแบบตอบ O หรือ X');
    const input = el('input', { type: 'text', placeholder: 'พิมพ์คำถาม เช่น "คืนนี้จะฝันร้ายไหม"', 'aria-label': 'คำถาม', style: { flex: '1 1 220px', minHeight: '44px', borderRadius: '6px', border: '1px solid var(--line-strong)', background: '#0b0506', padding: '0 12px' } });
    let pen = { x: f.w / 2, y: f.h / 2 }, target = null, trail = [];
    const O = { x: f.w * 0.3, y: f.h * 0.3 }, X = { x: f.w * 0.7, y: f.h * 0.3 };
    const stop = animate(f.box, (t) => {
      const { g, w, h } = f;
      g.fillStyle = '#e8e1cc'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, h * 0.38, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#222'; g.font = '700 56px sans-serif'; g.textAlign = 'center'; g.fillText('O', O.x, O.y + 20); g.fillText('X', X.x, X.y + 20);
      g.font = '28px sans-serif'; g.fillText('분신사바 분신사바', w / 2, h * 0.92);
      // two hands share one pen: tiny tremor + drift toward what they expect
      const dest = target || { x: w / 2 + Math.cos(t * 1.7) * 60, y: h / 2 + Math.sin(t * 2.3) * 40 };
      pen.x += (dest.x - pen.x) * 0.02 + (Math.random() - 0.5) * 2.4; pen.y += (dest.y - pen.y) * 0.02 + (Math.random() - 0.5) * 2.4;
      trail.push({ ...pen }); if (trail.length > 600) trail.shift();
      g.strokeStyle = '#c00'; g.lineWidth = 3; g.beginPath(); trail.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
      g.fillStyle = '#900'; g.beginPath(); g.arc(pen.x, pen.y, 8, 0, Math.PI * 2); g.fill();
    });
    const ask = () => {
      if (!input.value.trim()) { f.out.textContent = 'ต้องถามก่อน'; return; }
      // the "spirit" leans toward whatever the question already expects (very ideomotor)
      const q = input.value;
      const yesish = /ไหม|มั้ย|หรือเปล่า/.test(q) ? Math.random() < 0.6 : Math.random() < 0.5;
      target = yesish ? O : X; trail = [];
      sfx('whisper');
      f.out.textContent = 'ปากกาเริ่มเคลื่อน…';
      setTimeout(() => {
        f.out.textContent = yesish ? 'ปากกาวนที่ O … "ใช่"' : 'ปากกาวนที่ X … "ไม่ใช่"';
        f.out.append(el('br'), el('span', { class: 'faint' }, 'ในการเล่นจริงคนสองคนจับปากกาด้ามเดียว แรงเล็กๆ ที่ไม่รู้ตัวรวมกันพาปากกาไปหาคำตอบที่ทั้งคู่คาดไว้ '),
          el('a', { href: url('lab.html?tool=ouija') }, 'ทดลองแรงนี้ใน SLUR Lab'));
        setTimeout(() => { target = null; }, 2500);
      }, 2600);
    };
    f.bar.append(input, btn('ถามวิญญาณ', ask));
    f.out.textContent = 'กติกาที่คนเล่าต่อกัน: ห้ามปล่อยมือกลางพิธี และต้องส่งวิญญาณกลับก่อนเลิกเล่นเสมอ';
    return stop;
  },

  // ---------------------------------------------------------------- Gonjiam: knock on the doors
  room402(host) {
    const box = el('div', { class: 'wg' }); host.append(box);
    const scene = cover('gonjiam', 960, 420);
    const out = el('div', { class: 'wg-out', 'aria-live': 'polite' });
    const doors = el('div', { class: 'choices' });
    let knocks = 0;
    [401, 402, 403, 404, 405].forEach((n) => doors.append(el('button', {
      type: 'button',
      onclick: () => {
        sfx('knock');
        if (n !== 402) { out.textContent = `ห้อง ${n}: ประตูเปิดอ้า ข้างในมีแต่เตียงเหล็กขึ้นสนิมกับเศษกระจก`; return; }
        knocks++;
        if (knocks < 3) out.textContent = `ห้อง 402: ล็อกตาย… เคาะครั้งที่ ${knocks}`;
        else { out.textContent = 'ห้อง 402: มีเสียงเคาะตอบกลับมาจากข้างใน… สามครั้ง'; setTimeout(() => sfx('knock'), 600); scare(); knocks = 0; }
      },
    }, `ห้อง ${n}`)));
    box.append(el('div', { class: 'wg-title' }, '▣ ทางเดินชั้น 4 (จำลอง)'), scene, doors, out);
    out.textContent = 'ลองเคาะประตูทีละห้อง ห้อง 402 คือห้องที่ข่าวลือบอกว่าไม่มีใครเปิดได้';
    return () => {};
  },

  // ---------------------------------------------------------------- Black-eyed kids: can we come in?
  knock(host) {
    const box = el('div', { class: 'wg' }); host.append(box);
    const scene = cover('black-eyed', 960, 400);
    const line = el('p', { class: 'dialog-line' }); const choices = el('div', { class: 'choices' }); const out = el('div', { class: 'wg-out', 'aria-live': 'polite' });
    box.append(el('div', { class: 'wg-title' }, '▣ ลานจอดรถ 22:00 · มีเด็กสองคนเคาะกระจก'), scene, line, choices, out);
    const set = (t, opts) => { line.textContent = t; announce(t); choices.replaceChildren(...opts.map(([x, fn]) => el('button', { type: 'button', onclick: fn }, x))); };
    function start() {
      out.textContent = ''; sfx('knock');
      set('"ขอติดรถไปโรงหนังหน่อยได้ไหมครับ แป๊บเดียว… เราไม่ทำอะไรหรอก"', [
        ['ลดกระจกลงคุย', () => { set('เด็กคนโตยิ้มไม่หยุด "แค่ปลดล็อกประตูให้เราก็พอ" แล้วคุณก็เห็นตาของเขา… ดำสนิททั้งลูก ไม่มีตาขาวเลย', [['ปลดล็อกประตู', bad], ['ถอยรถออกทันที', good]]); tension(0.8); }],
        ['ไม่ตอบ แล้วถอยรถออก', good],
      ]);
    }
    function bad() { tension(0); out.textContent = 'ทุกเรื่องเล่าเรื่องเด็กตาดำไม่มีใครเล่าต่อว่าเกิดอะไรขึ้นหลังจากนี้ เพราะไม่มีใครที่เปิดประตูให้แล้วกลับมาเล่า'; scare(); set('…', [['ลองใหม่', start]]); }
    function good() { tension(0); out.textContent = 'คุณขับออกมาแล้วมองกระจกหลัง เด็กสองคนหายไปแล้ว ทั้งที่ลานจอดรถโล่งทั้งลาน ✔ (เหมือนที่ไบรอัน เบเธลเล่าไว้)'; set('…', [['ลองใหม่', start]]); }
    start();
    return () => {};
  },

  // ---------------------------------------------------------------- Enfield: things move when you look away
  // Bloody Mary: camera mirror (loaded only on that story)
  mirror(host) { import('./mirror.js').then((m) => m.mirror(host)); },

  poltergeist(host) {
    const f = frame(host, 'ห้องนอนเลขที่ 284 (จำลอง) · ลองละสายตาดู');
    const items = [
      { n: 'เก้าอี้', x: 0.25, y: 0.7, w: 70, h: 90, c: '#5a4636' },
      { n: 'หมอน', x: 0.55, y: 0.66, w: 80, h: 30, c: '#c9c3b8' },
      { n: 'ลิ้นชัก', x: 0.78, y: 0.62, w: 110, h: 120, c: '#4a3a2c' },
      { n: 'ตุ๊กตา', x: 0.5, y: 0.5, w: 30, h: 44, c: '#b88c6a' },
      { n: 'ลูกเต๋าของเล่น', x: 0.35, y: 0.82, w: 22, h: 22, c: '#eee' },
    ].map((o) => ({ ...o, tx: o.x, ty: o.y, r: 0 }));
    let moves = 0;
    const shuffle = () => {
      items.forEach((o) => { if (Math.random() < 0.6) { o.tx = 0.15 + Math.random() * 0.7; o.ty = 0.45 + Math.random() * 0.4; o.r = (Math.random() - 0.5) * 1.2; } });
      moves++;
      sfx(pick(['knock', 'creak', 'door']));
      f.out.textContent = `ตอนคุณไม่ได้มอง ของในห้องถูกย้ายไปแล้ว ${moves} ครั้ง`;
      if (moves === 3) scare();
    };
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    f.box.addEventListener('pointerleave', shuffle);
    const onVis = () => { if (document.hidden) shuffle(); };
    document.addEventListener('visibilitychange', onVis);
    const stop = animate(f.box, () => {
      const { g, w, h } = f;
      g.fillStyle = '#2b2420'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3a302a'; g.fillRect(0, h * 0.58, w, h * 0.42);
      g.fillStyle = '#efe0a8'; g.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.2);
      for (const o of items) {
        o.x += (o.tx - o.x) * 0.08; o.y += (o.ty - o.y) * 0.08;
        g.save(); g.translate(o.x * w, o.y * h); g.rotate(o.r);
        g.fillStyle = o.c; g.fillRect(-o.w / 2, -o.h, o.w, o.h);
        g.restore();
      }
    });
    f.out.textContent = 'เลื่อนเมาส์ออกจากภาพ หรือสลับแท็บไปที่อื่นแล้วกลับมาดู';
    f.bar.append(btn('จัดห้องใหม่', () => { items.forEach((o) => { o.tx = o.x = 0.15 + Math.random() * 0.7; }); moves = 0; f.out.textContent = ''; }));
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  },
};

export function mountWidget(name, host, story) {
  const fn = W[name];
  if (!fn) { host.append(el('p', { class: 'faint' }, `[widget ${name}]`)); return () => {}; }
  try { return fn(host, story); } catch (e) { console.error(e); host.append(el('p', { class: 'faint' }, 'ลูกเล่นนี้โหลดไม่ได้')); return () => {}; }
}
