// Code-drawn cover art for stories that have no free-to-use photo
import { rng } from '../core/ui.js';

const DRAW = {
  kisaragi(g, w, h, r) {
    sky(g, w, h, '#05060c', '#141a2a');
    fog(g, w, h, r, 'rgba(160,170,190,.05)');
    // platform + track
    g.fillStyle = '#1c1c22'; g.fillRect(0, h * 0.7, w, h * 0.3);
    g.fillStyle = '#2a2a33'; g.fillRect(0, h * 0.7, w, 6);
    g.strokeStyle = '#3a3a44'; g.lineWidth = 3;
    for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(0, h * (0.86 + k * 0.08)); g.lineTo(w, h * (0.84 + k * 0.08)); g.stroke(); }
    // lamp
    g.fillStyle = '#333'; g.fillRect(w * 0.78, h * 0.25, 5, h * 0.45);
    glow(g, w * 0.78 + 2, h * 0.25, 90, 'rgba(255,240,200,.35)');
    // station sign
    const sx = w * 0.2, sy = h * 0.32, sw = w * 0.42, sh = h * 0.24;
    g.fillStyle = '#e9e9e2'; g.fillRect(sx, sy, sw, sh);
    g.fillStyle = '#2b2b2b'; g.fillRect(sx + sw * 0.1, sy + sh, 4, h * 0.18); g.fillRect(sx + sw * 0.9, sy + sh, 4, h * 0.18);
    g.fillStyle = '#111'; g.textAlign = 'center'; g.font = `700 ${sh * 0.42}px "Noto Sans JP", "Yu Gothic", sans-serif`;
    g.fillText('きさらぎ', sx + sw / 2, sy + sh * 0.5);
    g.font = `500 ${sh * 0.16}px sans-serif`; g.fillText('KISARAGI', sx + sw / 2, sy + sh * 0.75);
    g.fillStyle = '#1a5fb4'; g.fillRect(sx, sy + sh * 0.82, sw, sh * 0.1);
    g.fillStyle = '#fff'; g.font = `500 ${sh * 0.09}px sans-serif`; g.textAlign = 'left'; g.fillText('← ??', sx + 6, sy + sh * 0.9); g.textAlign = 'right'; g.fillText('?? →', sx + sw - 6, sy + sh * 0.9);
  },
  hasshaku(g, w, h, r) {
    sky(g, w, h, '#2a2318', '#b9a77d');
    g.fillStyle = '#3f5a2b'; g.fillRect(0, h * 0.62, w, h * 0.38);
    // hedge
    g.fillStyle = '#1f3318';
    for (let x = 0; x < w; x += 14) { g.beginPath(); g.arc(x, h * 0.62, 12 + r() * 8, 0, Math.PI * 2); g.fill(); }
    g.fillRect(0, h * 0.62, w, h * 0.12);
    // the tall woman: white hat + dress showing above the hedge
    const x = w * 0.62;
    g.fillStyle = '#ecebe6'; g.beginPath(); g.ellipse(x, h * 0.18, w * 0.07, h * 0.03, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(x - w * 0.035, h * 0.12, w * 0.07, h * 0.07);
    g.fillStyle = '#111'; g.fillRect(x - w * 0.03, h * 0.2, w * 0.06, h * 0.12); // long black hair
    g.fillStyle = '#f2f1ec'; g.beginPath(); g.moveTo(x - w * 0.04, h * 0.3); g.lineTo(x + w * 0.04, h * 0.3); g.lineTo(x + w * 0.06, h * 0.64); g.lineTo(x - w * 0.06, h * 0.64); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; g.font = `700 ${h * 0.09}px sans-serif`; g.fillText('ぽ ぽ ぽ', w * 0.08, h * 0.2);
  },
  kunekune(g, w, h, r) {
    sky(g, w, h, '#c9c2a2', '#efe9cf');
    g.fillStyle = '#6f8a3a'; g.fillRect(0, h * 0.55, w, h * 0.45);
    g.strokeStyle = 'rgba(40,60,20,.35)';
    for (let y = h * 0.58; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (y - h * 0.55) * 0.1); g.stroke(); }
    // heat shimmer + white wriggling figure far away
    g.fillStyle = 'rgba(255,255,255,.9)';
    const fx = w * 0.7, fy = h * 0.5;
    g.beginPath();
    for (let t = 0; t <= 1; t += 0.05) { const x = fx + Math.sin(t * 9) * 5, y = fy - t * h * 0.16; t ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke();
  },
  kuchisake(g, w, h, r) {
    sky(g, w, h, '#06070a', '#1c1b20');
    glow(g, w * 0.3, h * 0.1, 160, 'rgba(255,230,180,.25)');
    g.fillStyle = '#2b2b2f'; g.fillRect(w * 0.3 - 3, h * 0.1, 6, h * 0.9);
    // long coat + hair + white mask
    const x = w * 0.58, y = h * 0.3;
    g.fillStyle = '#3c3326'; g.beginPath(); g.moveTo(x - 40, y + 40); g.lineTo(x + 40, y + 40); g.lineTo(x + 70, h); g.lineTo(x - 70, h); g.fill();
    g.fillStyle = '#0b0b0b'; g.beginPath(); g.ellipse(x, y, 34, 44, 0, 0, Math.PI * 2); g.fill(); g.fillRect(x - 36, y, 72, 80);
    g.fillStyle = '#d8cfc4'; g.beginPath(); g.ellipse(x, y + 6, 22, 30, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f4f2'; g.fillRect(x - 22, y + 10, 44, 22); // mask
    g.fillStyle = '#111'; g.fillRect(x - 12, y - 4, 7, 3); g.fillRect(x + 5, y - 4, 7, 3);
  },
  'black-eyed'(g, w, h, r) {
    sky(g, w, h, '#05060a', '#101421');
    glow(g, w * 0.8, h * 0.2, 140, 'rgba(255,220,160,.2)');
    // car window frame
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, w, h * 0.08); g.fillRect(0, h * 0.85, w, h * 0.15); g.fillRect(0, 0, w * 0.06, h); g.fillRect(w * 0.94, 0, w * 0.06, h);
    for (const [x, s] of [[0.42, 1], [0.6, 0.85]]) {
      const cx = w * x, cy = h * 0.55;
      g.fillStyle = '#1b1b1f'; g.fillRect(cx - 28 * s, cy, 56 * s, h);
      g.fillStyle = '#c9bfb6'; g.beginPath(); g.ellipse(cx, cy - 20 * s, 22 * s, 28 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(cx - 8 * s, cy - 24 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2); g.ellipse(cx + 8 * s, cy - 24 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1b12'; g.beginPath(); g.ellipse(cx, cy - 40 * s, 24 * s, 14 * s, 0, Math.PI, 0); g.fill();
    }
  },
  enfield(g, w, h, r) {
    sky(g, w, h, '#0b0a12', '#1a1726');
    g.fillStyle = '#2d2420'; g.fillRect(w * 0.1, h * 0.15, w * 0.8, h * 0.85);
    g.fillStyle = '#efe0a8'; g.fillRect(w * 0.35, h * 0.3, w * 0.3, h * 0.3);
    g.strokeStyle = '#2d2420'; g.lineWidth = 4; g.strokeRect(w * 0.35, h * 0.3, w * 0.3, h * 0.3); g.beginPath(); g.moveTo(w * 0.5, h * 0.3); g.lineTo(w * 0.5, h * 0.6); g.stroke();
    // floating chair silhouette in the window
    g.fillStyle = '#1a1310'; g.save(); g.translate(w * 0.47, h * 0.42); g.rotate(-0.3);
    g.fillRect(-14, -18, 4, 30); g.fillRect(-14, 6, 28, 4); g.fillRect(-12, 10, 3, 14); g.fillRect(10, 10, 3, 14); g.restore();
  },
  bunshinsaba(g, w, h, r) {
    g.fillStyle = '#e8e1cc'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#333'; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, h * 0.35, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#222'; g.font = `600 ${h * 0.09}px sans-serif`; g.textAlign = 'center';
    g.fillText('O', w * 0.3, h * 0.25); g.fillText('X', w * 0.7, h * 0.25); g.fillText('분신사바', w / 2, h * 0.93);
    g.strokeStyle = '#c00'; g.lineWidth = 3; g.beginPath();
    for (let t = 0; t < 30; t += 0.1) { const rr = h * 0.08 + t * 1.5; const x = w / 2 + Math.cos(t * 2.3) * rr * (0.6 + r() * 0.1), y = h / 2 + Math.sin(t * 2.3) * rr * 0.6; t ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.fillStyle = '#b00'; g.save(); g.translate(w * 0.6, h * 0.5); g.rotate(0.6); g.fillRect(-4, -60, 8, 70); g.restore();
  },
  gonjiam(g, w, h, r) {
    sky(g, w, h, '#0a0b0b', '#141616');
    const vx = w / 2, vy = h * 0.45;
    g.strokeStyle = '#2a2d2c'; g.lineWidth = 2;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(vx, vy); g.stroke(); }
    for (let k = 1; k < 6; k++) {
      const t = 1 - k / 6, x = vx - (vx) * t, y = vy - vy * t, ww = w * t, hh = h * t;
      g.strokeStyle = `rgba(80,90,88,${0.6 * t})`; g.strokeRect(x, y, ww, hh);
    }
    g.fillStyle = '#3a2a24'; g.fillRect(w * 0.12, h * 0.3, w * 0.12, h * 0.5);
    g.fillStyle = '#d8d0c0'; g.font = `700 ${h * 0.06}px "IBM Plex Mono", monospace`; g.fillText('402', w * 0.14, h * 0.38);
    glow(g, vx, vy, 60, 'rgba(160,190,170,.15)');
  },
  default(g, w, h) { sky(g, w, h, '#0a0405', '#2a0909'); },
};

function sky(g, w, h, a, b) { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, a); s.addColorStop(1, b); g.fillStyle = s; g.fillRect(0, 0, w, h); }
function glow(g, x, y, r, c) { const k = g.createRadialGradient(x, y, 0, x, y, r); k.addColorStop(0, c); k.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = k; g.fillRect(x - r, y - r, r * 2, r * 2); }
function fog(g, w, h, r, c) { for (let i = 0; i < 18; i++) { g.fillStyle = c; g.beginPath(); g.ellipse(r() * w, h * (0.4 + r() * 0.4), w * 0.3, h * 0.06, 0, 0, Math.PI * 2); g.fill(); } }

export function cover(id, w = 960, h = 540) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'ภาพประกอบวาดด้วยโค้ด');
  const g = c.getContext('2d');
  (DRAW[id] || DRAW.default)(g, w, h, rng(id));
  // film grain + vignette so the drawings feel like found footage
  const img = g.getImageData(0, 0, w, h), d = img.data, r = rng(id + 'grain');
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.7)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  return c;
}
