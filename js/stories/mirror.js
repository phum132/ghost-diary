// Bloody Mary mirror: the front camera becomes a dark candle-lit mirror. Two modes:
//  - the ritual: say her name three times, the reflection darkens, warps and something stands behind you
//  - the real experiment (Caputo 2010): stare 60 s in dim light with no tricks at all, then report
// The camera image is drawn on a canvas in this browser only; nothing is uploaded or saved.
import { el, reduceMotion, announce } from '../core/ui.js';
import { hauntOn, play, tension } from '../core/haunt.js';
import { scare } from '../core/scare.js';
import { award } from '../core/badges.js';
import { load, save } from '../core/store.js';

const W = 320, H = 240;
const sfx = (n) => { if (hauntOn()) play(n); };

export function mirror(host) {
  const c = el('canvas', { width: W * 2, height: H * 2, class: 'mirror-c', role: 'img', 'aria-label': 'กระจกจากกล้องหน้า' });
  const g = c.getContext('2d', { willReadFrequently: true });
  const small = el('canvas', { width: W, height: H });
  const sg = small.getContext('2d', { willReadFrequently: true });
  const out = el('div', { class: 'wg-out', 'aria-live': 'polite' }, 'กล้องจะเปิดเมื่อคุณกดเท่านั้น ภาพอยู่ในเครื่องคุณ ไม่ถูกส่งหรือบันทึกที่ไหน');
  const bar = el('div', { class: 'wg-bar' });
  const box = el('div', { class: 'wg mirror' }, el('div', { class: 'wg-title' }, '▣ กระจกในห้องน้ำ (กล้องหน้า)'), c, bar, out);
  host.append(box);

  let video = null, stream = null, raf = 0, mode = 'idle', calls = 0, t0 = 0, prev = null, figure = 0, warp = 0;

  const startBtn = el('button', { class: 'btn small primary', type: 'button' }, '🕯️ เปิดกระจก (ใช้กล้อง)');
  const darkBtn = el('button', { class: 'btn small', type: 'button' }, 'ไม่เปิดกล้อง ใช้กระจกมืด');
  const callBtn = el('button', { class: 'btn small primary', type: 'button', hidden: true }, 'เรียก "บลัดดี้แมรี่" (0/3)');
  const stareBtn = el('button', { class: 'btn small', type: 'button', hidden: true }, '👁️ ทดลองจริง: จ้อง 60 วินาที');
  const stopBtn = el('button', { class: 'btn small', type: 'button', hidden: true }, 'ปิดกระจก');
  bar.append(startBtn, darkBtn, callBtn, stareBtn, stopBtn);

  async function open(useCam) {
    if (useCam) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
        video = el('video', { playsinline: '', muted: '' });
        video.srcObject = stream; await video.play();
      } catch {
        out.textContent = 'เปิดกล้องไม่ได้ (ไม่อนุญาตหรือไม่มีกล้อง) เลยใช้กระจกมืดแทน';
        video = null;
      }
    }
    startBtn.hidden = darkBtn.hidden = true;
    callBtn.hidden = stareBtn.hidden = stopBtn.hidden = false;
    box.classList.add('mirror-live');
    mode = 'mirror'; calls = 0; figure = 0; warp = 0;
    if (!video) out.textContent = 'กระจกมืดสนิท มีแค่แสงเทียนสะท้อน… กดเรียกชื่อเธอได้เลย';
    else out.textContent = 'ปิดไฟในห้อง ให้หน้าอยู่กลางกระจก แล้วกดเรียกชื่อเธอสามครั้ง';
    loop();
  }

  function close() {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null; video = null; mode = 'idle';
    box.classList.remove('mirror-live');
    tension(0);
    startBtn.hidden = darkBtn.hidden = false;
    callBtn.hidden = stareBtn.hidden = stopBtn.hidden = true;
    callBtn.textContent = 'เรียก "บลัดดี้แมรี่" (0/3)';
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  }

  function call() {
    calls++;
    callBtn.textContent = `เรียก "บลัดดี้แมรี่" (${calls}/3)`;
    sfx(calls < 3 ? 'whisper' : 'breath');
    tension(calls * 0.3);
    announce(`เรียกครั้งที่ ${calls}`);
    if (calls < 3) { out.textContent = ['เปลวเทียนสั่น…', 'อากาศในห้องเย็นลง… อย่าละสายตาจากกระจก'][calls - 1]; return; }
    callBtn.hidden = stareBtn.hidden = true;
    mode = 'ritual'; t0 = performance.now();
    out.textContent = 'ครั้งที่สาม… ไม่มีอะไรเกิดขึ้น หรือเปล่า?';
  }

  function stare() {
    callBtn.hidden = stareBtn.hidden = true;
    mode = 'stare'; t0 = performance.now();
    out.textContent = 'จ้องตาตัวเองในกระจก อย่ากะพริบตาบ่อย หายใจช้าๆ 60 วินาที ไม่มีเอฟเฟกต์หลอกใดๆ ทั้งนั้น';
  }

  function finishStare() {
    mode = 'asked';
    out.replaceChildren('ครบ 60 วินาที… หน้าในกระจกดูเปลี่ยนไปไหม? ',
      ...[['เปลี่ยน เหมือนหน้าคนอื่น', 'other'], ['บิดเบี้ยว/บางส่วนหายไป', 'warp'], ['ไม่เปลี่ยนเลย', 'none']].map(([t, k]) => el('button', {
        class: 'btn small', type: 'button', onclick: () => {
          const r = load('stare', {}); r[k] = (r[k] || 0) + 1; save('stare', r);
          award('stare');
          out.replaceChildren(el('p', {}, k === 'none'
            ? 'คุณเป็นส่วนน้อย ในการทดลองของ Caputo (2010) คนส่วนใหญ่เริ่มเห็นอะไรบางอย่างตั้งแต่นาทีแรก ลองอีกครั้งในห้องที่มืดกว่านี้ หรือจ้องนานขึ้นดู'
            : 'คุณไม่ได้คิดไปเอง ในการทดลองของ Giovanni Caputo (2010) ให้คนจ้องกระจกในแสงสลัว 10 นาที คนส่วนใหญ่เริ่มเห็นหน้าตัวเองบิดเบี้ยวตั้งแต่นาทีแรก บางคนเห็นเป็นหน้าคนแก่ เด็ก สัตว์ หรือ "ปีศาจ"'),
          el('p', { class: 'faint' }, 'เหตุผล: เมื่อจ้องนิ่งๆ สมองค่อยๆ หยุดรับรู้ภาพที่ไม่เปลี่ยน (Troxler fading) ส่วนต่างๆ ของหน้าจึงจางหาย แล้วสมองที่ถนัดมองหาหน้าคนก็ประกอบหน้าใหม่ขึ้นมาเอง นี่อาจเป็นที่มาจริงของพิธีบลัดดี้แมรี่'));
        },
      }, t)));
  }

  // pale woman behind the reader's shoulder, drawn on top of the mirror
  function drawFigure(a) {
    const x = W * 0.78, y = H * 0.18;
    sg.save(); sg.globalAlpha = a;
    sg.fillStyle = '#d8d2cc';
    sg.beginPath(); sg.ellipse(x, y + 22, 13, 17, 0, 0, Math.PI * 2); sg.fill();
    sg.fillStyle = '#050304';
    sg.beginPath(); sg.moveTo(x - 17, y + 4); sg.quadraticCurveTo(x, y - 14, x + 17, y + 4); sg.lineTo(x + 20, y + 120); sg.lineTo(x + 6, y + 120); sg.lineTo(x + 8, y + 26); sg.lineTo(x - 8, y + 26); sg.lineTo(x - 6, y + 120); sg.lineTo(x - 20, y + 120); sg.closePath(); sg.fill();
    sg.beginPath(); sg.ellipse(x - 5, y + 21, 2.4, 3, 0, 0, Math.PI * 2); sg.ellipse(x + 5, y + 21, 2.4, 3, 0, 0, Math.PI * 2); sg.fill();
    sg.restore();
  }

  function loop() {
    const t = performance.now();
    const k = (t - t0) / 1000;
    // base image: mirrored camera, or nothing
    sg.save(); sg.translate(W, 0); sg.scale(-1, 1);
    if (video && video.readyState >= 2) sg.drawImage(video, 0, 0, W, H); else { sg.fillStyle = '#060404'; sg.fillRect(0, 0, W, H); }
    sg.restore();
    // candle light: flicker + vignette, grey and reddish
    const img = sg.getImageData(0, 0, W, H), d = img.data;
    const flick = mode === 'stare' ? 0.9 : 0.75 + Math.sin(t / 90) * 0.06 + Math.random() * 0.08;
    const darken = mode === 'ritual' ? Math.max(0.25, 1 - k * 0.12) : 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.62) / H;
      const v = Math.max(0, 1 - (dx * dx * 0.7 + dy * dy * 2.2)) * flick * darken;
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * v * 1.2;
      d[i] = Math.min(255, l * 1.15 + 6 * v); d[i + 1] = l * 0.82; d[i + 2] = l * 0.72;
    }
    // the ritual: the face swirls a little, then a figure fades in behind
    if (mode === 'ritual') {
      warp = Math.min(1, Math.max(0, (k - 2) / 4));
      if (warp > 0 && !reduceMotion()) swirl(d, warp);
      if (Math.random() < 0.05 + warp * 0.2 && prev) d.set(prev); // frame stutter
      figure = Math.min(0.9, Math.max(0, (k - 3.5) / 3));
    }
    prev = new Uint8ClampedArray(d);
    sg.putImageData(img, 0, 0);
    if (figure > 0) drawFigure(figure * (0.85 + Math.random() * 0.15));
    // candle
    sg.fillStyle = `rgba(255,190,110,${0.5 + Math.random() * 0.2})`;
    sg.beginPath(); sg.ellipse(W / 2, H - 8, 4, 9, 0, 0, Math.PI * 2); sg.fill();
    g.imageSmoothingEnabled = true;
    g.drawImage(small, 0, 0, c.width, c.height);
    if (mode === 'stare') {
      const left = Math.max(0, 60 - Math.floor(k));
      g.fillStyle = 'rgba(243,233,226,.5)'; g.font = '600 22px "Chakra Petch", monospace'; g.textAlign = 'right';
      g.fillText(String(left).padStart(2, '0'), c.width - 16, 34);
      if (left === 0) finishStare();
    }
    if (mode === 'ritual' && k > 7.5) { endRitual(); return; }
    if (mode !== 'idle') raf = requestAnimationFrame(loop);
  }

  function endRitual() {
    mode = 'done';
    sfx('scream');
    scare();
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    award('mirror');
    tension(0);
    out.textContent = 'กระจกดับวูบ… เธอเคยยืนอยู่ข้างหลังคุณ ตอนนี้อยู่ที่ไหนแล้วก็ไม่รู้ ลองหันไปดูสิ';
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null; video = null;
    stopBtn.textContent = 'เริ่มใหม่';
  }

  function swirl(d, s) {
    const src = new Uint8ClampedArray(d), cx = W / 2, cy = H * 0.45, R = H * 0.42;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
      if (r >= R) continue;
      const a = s * 1.6 * (1 - r / R) ** 2;
      const sx = Math.round(cx + dx * Math.cos(a) - dy * Math.sin(a)), sy = Math.round(cy + dx * Math.sin(a) + dy * Math.cos(a));
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const i = (y * W + x) * 4, j = (sy * W + sx) * 4;
      d[i] = src[j]; d[i + 1] = src[j + 1]; d[i + 2] = src[j + 2];
    }
  }

  startBtn.addEventListener('click', () => open(true));
  darkBtn.addEventListener('click', () => open(false));
  callBtn.addEventListener('click', call);
  stareBtn.addEventListener('click', stare);
  stopBtn.addEventListener('click', () => { close(); stopBtn.textContent = 'ปิดกระจก'; });
  addEventListener('pagehide', close);
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
}
