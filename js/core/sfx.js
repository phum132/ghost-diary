// Site sound: one AudioContext, created only after the reader turns sound on. Everything is synthesized.
import { prefs } from './store.js';

let ctx, master, amb;

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -24; comp.ratio.value = 12;
    master = ctx.createGain(); master.gain.value = 0.22;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export const masterOut = () => (audioCtx(), master);

const on = () => prefs().sound;

function noiseBuffer(sec, brown) {
  const c = audioCtx();
  const b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}

export function click() {
  if (!on() || !audioCtx()) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.03);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.5, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400;
  s.connect(f).connect(g).connect(master); s.start();
}

export function thump() {
  if (!on() || !audioCtx()) return;
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.6, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
  o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + 0.15);
}

export function hum(on_) {
  if (!audioCtx()) return;
  if (on_ && !amb) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(4, true); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 1.2);
    s.connect(f).connect(g).connect(master); s.start();
    amb = { s, g };
  } else if (!on_ && amb) {
    const a = amb; amb = null;
    a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => a.s.stop(), 500);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (on()) ctx.resume();
});
