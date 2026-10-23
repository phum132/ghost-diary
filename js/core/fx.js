// Motion layer: scroll reveals, 3D tilt on HUD cards, scrambled HUD labels, cursor glow.
// Everything here is skipped when the reader (or their OS, unless overridden) asks for less motion.
import { reduceMotion } from './ui.js';

const GLYPHS = '!<>-_\\/[]{}=+*^?#0123456789ABCDEFX';

export function scramble(node, ms = 700) {
  const final = node.dataset.text || node.textContent;
  node.dataset.text = final;
  if (reduceMotion()) { node.textContent = final; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const keep = Math.floor(final.length * k);
    node.textContent = final.slice(0, keep) + [...final.slice(keep)].map((c) => (c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// add .reveal (and optionally style="--d:120ms") to anything that should rise in when scrolled into view
export function reveals(root = document) {
  const items = root.querySelectorAll('.reveal:not(.in)');
  if (reduceMotion() || !('IntersectionObserver' in window)) { items.forEach((n) => n.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-scramble]').forEach((s) => scramble(s));
      if (e.target.hasAttribute('data-scramble')) scramble(e.target);
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  items.forEach((n) => io.observe(n));
}

// perspective tilt that follows the pointer (mouse/pen only)
export function tilt(root = document) {
  if (reduceMotion() || !matchMedia('(pointer: fine)').matches) return;
  root.querySelectorAll('[data-tilt]').forEach((card) => {
    const glare = document.createElement('span');
    glare.className = 'glare'; glare.setAttribute('aria-hidden', 'true');
    card.append(glare);
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(0)`;
      card.style.setProperty('--gx', `${(x + 0.5) * 100}%`); card.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

// soft red light that trails the cursor
export function cursorGlow() {
  if (reduceMotion() || !matchMedia('(pointer: fine)').matches) return;
  const g = document.createElement('div');
  g.className = 'cursor-glow'; g.setAttribute('aria-hidden', 'true');
  document.body.append(g);
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; g.style.opacity = '1'; }, { passive: true });
  document.addEventListener('pointerleave', () => { g.style.opacity = '0'; });
  const loop = () => {
    x += (tx - x) * 0.12; y += (ty - y) * 0.12;
    g.style.transform = `translate(${x - 200}px, ${y - 200}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

export function initFx() {
  reveals();
  tilt();
  cursorGlow();
  document.querySelectorAll('[data-scramble]:not(.reveal [data-scramble])').forEach((n) => scramble(n, 900));
}
