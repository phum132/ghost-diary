// Opt-in "โหมดโหด": a single, brief scare (one dark frame + a face + a sting). Never flashes repeatedly,
// never runs unless the reader turned scare mode on themselves.
import { prefs } from './store.js';
import { sting } from './haunt.js';
import { reduceMotion } from './ui.js';

let last = 0;

function face(c) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const grd = g.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.5, W * 0.6);
  grd.addColorStop(0, '#1a0f0f'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // pale face between curtains of hair
  g.fillStyle = '#cfc6bd';
  g.beginPath(); g.ellipse(W / 2, H * 0.48, W * 0.17, H * 0.24, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#050303';
  for (let i = 0; i < 160; i++) {
    const side = i % 2 ? 1 : -1, x = W / 2 + side * (W * 0.04 + Math.random() * W * 0.2);
    g.fillRect(x, H * 0.12 + Math.random() * H * 0.1, 2 + Math.random() * 4, H * (0.5 + Math.random() * 0.4));
  }
  // eyes: just black, wide
  g.beginPath(); g.ellipse(W * 0.44, H * 0.45, W * 0.035, H * 0.03, 0, 0, Math.PI * 2); g.ellipse(W * 0.56, H * 0.45, W * 0.035, H * 0.03, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(W / 2, H * 0.6, W * 0.04, H * 0.05, 0, 0, Math.PI * 2); g.fill();
}

export const scareOn = () => !!prefs().scare;

export function scare() {
  if (!scareOn() || Date.now() - last < 20000) return; // at most one scare every 20 s
  last = Date.now();
  const box = document.createElement('div');
  box.className = 'scare'; box.setAttribute('aria-hidden', 'true');
  const c = document.createElement('canvas'); c.width = c.height = 600;
  face(c); box.append(c);
  document.body.append(box);
  sting();
  if (!reduceMotion()) c.animate([{ transform: 'scale(.6)' }, { transform: 'scale(1.15)' }], { duration: 650, easing: 'cubic-bezier(.2,.9,.2,1)' });
  box.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1100 }).onfinish = () => box.remove();
}
