// Haunted soundscape: generative beds (drone, wind, rain, insects) + random distant events
// (creaks, knocks, whispers, footsteps, bells) through a synthetic reverb. All synthesized, opt-in.
import { audioCtx, masterOut } from './sfx.js';

const PRESETS = {
  dorm: { drone: [55, 55.6], wind: 0.35, events: ['creak', 'knock', 'whisper', 'footsteps', 'drip', 'door'], every: [6, 16] },
  room: { drone: [49, 49.35], wind: 0.15, clock: true, events: ['creak', 'whisper', 'drip', 'knock', 'breath'], every: [8, 18] },
  lab: { drone: [60, 60.4], wind: 0.05, buzz: true, events: ['click', 'whisper', 'drip'], every: [12, 24] },
  station: { drone: [46, 46.5], wind: 0.6, events: ['crossing', 'taiko', 'train', 'whisper', 'bell'], every: [5, 12] },
  field: { drone: [52, 52.3], wind: 0.45, cicada: true, events: ['pobopo', 'whisper', 'branch'], every: [7, 16] },
  forest: { drone: [43, 43.4], wind: 0.5, insects: true, events: ['branch', 'footsteps', 'childhum', 'whisper'], every: [6, 14] },
  temple: { drone: [41, 41.3], wind: 0.3, insects: true, events: ['templebell', 'whisper', 'footsteps'], every: [8, 18] },
  rain: { drone: [50, 50.5], wind: 0.2, rain: true, events: ['knock', 'whisper', 'door', 'footsteps'], every: [7, 15] },
  house: { drone: [44, 44.6], wind: 0.3, events: ['creak', 'knock', 'door', 'footsteps', 'whisper', 'childhum'], every: [5, 13] },
};

let A = null; // running state

function noise(ctx, sec, brown = false) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
  const d = b.getChannelData(0);
  let l = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { l = (l + 0.02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w;
  }
  return b;
}

function reverb(ctx, sec = 3.2) {
  const c = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * sec);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  c.buffer = ir;
  return c;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// one-shot helper: source -> (filters) -> gain(env) -> panner -> wet/dry
function voice(src, { pan = rnd(-0.9, 0.9), wet = 0.6, dry = 0.4 } = {}) {
  const { ctx } = A;
  const g = ctx.createGain(); g.gain.value = 0;
  const p = ctx.createStereoPanner(); p.pan.value = pan;
  const d = ctx.createGain(); d.gain.value = dry;
  const w = ctx.createGain(); w.gain.value = wet;
  src.connect(g).connect(p);
  p.connect(d).connect(A.out); p.connect(w).connect(A.rev);
  return g;
}

const EVENTS = {
  creak(t) {
    const { ctx } = A;
    const s = ctx.createBufferSource(); s.buffer = A.white;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 18;
    const dur = rnd(0.8, 1.8);
    f.frequency.setValueAtTime(rnd(250, 400), t); f.frequency.linearRampToValueAtTime(rnd(700, 1100), t + dur * 0.4); f.frequency.linearRampToValueAtTime(rnd(300, 500), t + dur);
    s.connect(f);
    const g = voice(f, { wet: 0.7 });
    for (let k = 0; k < dur; k += 0.03) g.gain.setValueAtTime(0.25 + Math.random() * 0.5, t + k);
    g.gain.setValueAtTime(0, t + dur);
    s.start(t, rnd(0, 2)); s.stop(t + dur + 0.1);
  },
  knock(t) {
    const n = pick([2, 3, 3, 4]);
    for (let i = 0; i < n; i++) thud(t + i * rnd(0.28, 0.4), 110, 0.9);
  },
  footsteps(t) {
    const n = Math.floor(rnd(4, 8)), p0 = rnd(-1, 1), p1 = -p0;
    for (let i = 0; i < n; i++) thud(t + i * rnd(0.45, 0.6), 80, 0.45, p0 + (p1 - p0) * i / n);
  },
  door(t) {
    EVENTS.creak(t);
    thud(t + rnd(1.4, 2), 70, 1, rnd(-0.8, 0.8));
  },
  drip(t) {
    const { ctx } = A;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(rnd(1100, 1600), t); o.frequency.exponentialRampToValueAtTime(rnd(400, 600), t + 0.08);
    const g = voice(o, { wet: 0.8, dry: 0.3 });
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.start(t); o.stop(t + 0.2);
  },
  whisper(t) {
    // breathy "syllables": noise through two moving formant filters, panned to one ear
    const { ctx } = A;
    const n = Math.floor(rnd(4, 9)), pan = pick([-0.95, 0.95]) * rnd(0.6, 1);
    let at = t;
    for (let i = 0; i < n; i++) {
      const s = ctx.createBufferSource(); s.buffer = A.white;
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 8; f1.frequency.value = rnd(450, 900);
      const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 10; f2.frequency.value = rnd(1300, 2600);
      const mix = ctx.createGain();
      s.connect(f1).connect(mix); s.connect(f2).connect(mix);
      const g = voice(mix, { pan, wet: 0.45, dry: 0.6 });
      const d = rnd(0.08, 0.2);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(rnd(0.6, 1.1), at + d * 0.3); g.gain.linearRampToValueAtTime(0, at + d);
      s.start(at, rnd(0, 2)); s.stop(at + d + 0.05);
      at += d + rnd(0.02, 0.12);
    }
  },
  breath(t) {
    const { ctx } = A;
    for (let i = 0; i < 2; i++) {
      const s = ctx.createBufferSource(); s.buffer = A.white;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = i ? 900 : 600; f.Q.value = 1.5;
      s.connect(f);
      const g = voice(f, { pan: rnd(-0.3, 0.3), wet: 0.3, dry: 0.7 });
      const a = t + i * 1.6;
      g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.35, a + 0.6); g.gain.linearRampToValueAtTime(0, a + 1.3);
      s.start(a, rnd(0, 2)); s.stop(a + 1.4);
    }
  },
  bell(t) { partials(t, rnd(700, 1100), [1, 2.76, 5.4, 8.93], 2.5, 0.25); },
  templebell(t) { partials(t, rnd(95, 120), [1, 2.32, 4.1, 5.2, 6.8], 7, 0.5); },
  crossing(t) {
    // railroad crossing bell, far away
    for (let i = 0; i < 10; i++) partials(t + i * 0.42, 880, [1, 2.4], 0.35, 0.12, -0.6);
  },
  taiko(t) {
    for (let i = 0; i < pick([1, 2, 3]); i++) thud(t + i * 0.7, 62, 0.8, rnd(-0.4, 0.4), 0.9);
  },
  train(t) {
    const { ctx } = A;
    const s = ctx.createBufferSource(); s.buffer = A.brown; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    s.connect(f);
    const p = ctx.createStereoPanner(); const g = ctx.createGain(); g.gain.value = 0;
    f.connect(g).connect(p).connect(A.out); p.connect(A.rev);
    p.pan.setValueAtTime(-1, t); p.pan.linearRampToValueAtTime(1, t + 9);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 4); g.gain.linearRampToValueAtTime(0, t + 9);
    s.start(t); s.stop(t + 9.2);
    for (let k = 0.5; k < 8.5; k += 0.55) thud(t + k, 140, 0.18 * Math.sin(Math.PI * k / 9), -1 + 2 * k / 9, 0.2);
  },
  branch(t) {
    const { ctx } = A;
    const s = ctx.createBufferSource(); s.buffer = A.white;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    s.connect(f);
    const g = voice(f, { wet: 0.5 });
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.start(t); s.stop(t + 0.1);
  },
  childhum(t) {
    // a child humming a few notes, very far away
    const { ctx } = A;
    const notes = [0, 3, 5, 3, 0, -2, 0].slice(0, Math.floor(rnd(4, 7)));
    const pan = rnd(-0.8, 0.8);
    notes.forEach((n, i) => {
      const o = ctx.createOscillator(); o.type = 'triangle';
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
      const at = t + i * 0.55;
      o.frequency.setValueAtTime(440 * Math.pow(2, n / 12), at);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5; const lg = ctx.createGain(); lg.gain.value = 4;
      lfo.connect(lg).connect(o.frequency);
      o.connect(f);
      const g = voice(f, { pan, wet: 0.9, dry: 0.15 });
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.07, at + 0.12); g.gain.linearRampToValueAtTime(0, at + 0.52);
      o.start(at); lfo.start(at); o.stop(at + 0.55); lfo.stop(at + 0.55);
    });
  },
  pobopo(t) {
    // the low "po... po... po" of the tall woman: a voiced pop through a closed-mouth filter
    const { ctx } = A;
    const pan = rnd(-0.6, 0.6);
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.42;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(105, at); o.frequency.linearRampToValueAtTime(92, at + 0.18);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, at); f.frequency.exponentialRampToValueAtTime(260, at + 0.15); f.Q.value = 6;
      o.connect(f);
      const g = voice(f, { pan, wet: 0.55, dry: 0.5 });
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.5, at + 0.015); g.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
      o.start(at); o.stop(at + 0.25);
    }
  },
  click(t) { thud(t, 1800, 0.12, rnd(-0.5, 0.5), 0.02); },
};

function thud(t, f0, amp, pan = rnd(-0.6, 0.6), dur = 0.18) {
  const { ctx } = A;
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + dur);
  const g = voice(o, { pan, wet: 0.55, dry: 0.6 });
  g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
  const s = A.ctx.createBufferSource(); s.buffer = A.white;
  const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  s.connect(lp);
  const gn = voice(lp, { pan, wet: 0.4, dry: 0.5 });
  gn.gain.setValueAtTime(amp * 0.4, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  s.start(t, Math.random()); s.stop(t + 0.06);
}

function partials(t, f0, ratios, decay, amp, pan = rnd(-0.7, 0.7)) {
  const { ctx } = A;
  ratios.forEach((r, i) => {
    const o = ctx.createOscillator(); o.frequency.value = f0 * r;
    const g = voice(o, { pan, wet: 0.7, dry: 0.35 });
    const a = amp / (i + 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + decay / (1 + i * 0.4));
    o.start(t); o.stop(t + decay + 0.1);
  });
}

// ---- continuous beds ----
function beds(p) {
  const { ctx } = A;
  const nodes = [];
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(A.out); bus.connect(A.rev);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  // drone: two detuned saws, lowpassed, with a slow breathing filter
  if (p.drone) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; f.Q.value = 4;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 90;
    lfo.connect(lg).connect(f.frequency); lfo.start(); nodes.push(lfo);
    const g = ctx.createGain(); g.gain.value = 0.16;
    for (const hz of p.drone) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); nodes.push(o); }
    f.connect(g).connect(bus);
  }
  if (p.wind) {
    const s = ctx.createBufferSource(); s.buffer = A.white; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.value = 500;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05; const lg = ctx.createGain(); lg.gain.value = 320;
    lfo.connect(lg).connect(f.frequency); lfo.start();
    const g = ctx.createGain(); g.gain.value = 0.12 * p.wind;
    const al = ctx.createOscillator(); al.frequency.value = 0.11; const ag = ctx.createGain(); ag.gain.value = 0.07 * p.wind;
    al.connect(ag).connect(g.gain); al.start();
    s.connect(f).connect(g).connect(bus); s.start(); nodes.push(s, lfo, al);
  }
  if (p.rain) {
    const s = ctx.createBufferSource(); s.buffer = A.white; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    const g = ctx.createGain(); g.gain.value = 0.05;
    s.connect(f).connect(g).connect(bus); s.start(); nodes.push(s);
  }
  if (p.cicada) {
    const s = ctx.createBufferSource(); s.buffer = A.white; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 6;
    const g = ctx.createGain(); g.gain.value = 0;
    const am = ctx.createOscillator(); am.frequency.value = 38; const ag = ctx.createGain(); ag.gain.value = 0.03;
    am.connect(ag).connect(g.gain); am.start();
    s.connect(f).connect(g).connect(bus); s.start(); nodes.push(s, am);
  }
  if (p.insects) {
    const o = ctx.createOscillator(); o.frequency.value = 4300;
    const g = ctx.createGain(); g.gain.value = 0;
    const am = ctx.createOscillator(); am.type = 'square'; am.frequency.value = 17; const ag = ctx.createGain(); ag.gain.value = 0.006;
    am.connect(ag).connect(g.gain); am.start();
    o.connect(g).connect(bus); o.start(); nodes.push(o, am);
  }
  if (p.buzz) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0.02;
    o.connect(f).connect(g).connect(bus); o.start(); nodes.push(o);
  }
  if (p.clock) {
    let k = ctx.currentTime + 0.5;
    const iv = setInterval(() => { while (k < ctx.currentTime + 1.2) { EVENTS.click(k); k += 1; } }, 400);
    nodes.push({ stop: () => clearInterval(iv) });
  }
  return { bus, nodes };
}

// heartbeat that can be raised for tense moments (0 = off)
function heartbeat() {
  const { ctx } = A;
  let next = ctx.currentTime + 0.3;
  const iv = setInterval(() => {
    if (!A || A.tension <= 0) { next = ctx.currentTime + 0.3; return; }
    const period = 60 / (70 + A.tension * 60);
    while (next < ctx.currentTime + 0.6) {
      thud(next, 55, 0.5 * A.tension, 0, 0.12);
      thud(next + 0.16, 50, 0.3 * A.tension, 0, 0.1);
      next += period;
    }
  }, 150);
  return () => clearInterval(iv);
}

function schedule() {
  if (!A) return;
  const p = PRESETS[A.preset] || PRESETS.dorm;
  const wait = rnd(p.every[0], p.every[1]);
  A.timer = setTimeout(() => {
    if (!A) return;
    try { EVENTS[pick(p.events)](A.ctx.currentTime + 0.05); } catch { /* ignore */ }
    schedule();
  }, wait * 1000);
}

export function startHaunt(preset = 'dorm') {
  const ctx = audioCtx();
  if (!ctx) return;
  if (A) { setPreset(preset); return; }
  const out = ctx.createGain(); out.gain.value = 0.9; out.connect(masterOut());
  const rev = reverb(ctx); const rg = ctx.createGain(); rg.gain.value = 0.55; rev.connect(rg).connect(masterOut());
  A = { ctx, out, rev, preset, white: noise(ctx, 3), brown: noise(ctx, 3, true), tension: 0 };
  A.bed = beds(PRESETS[preset] || PRESETS.dorm);
  A.stopHeart = heartbeat();
  // first event soon so the reader notices the room is "alive"
  setTimeout(() => A && EVENTS[pick((PRESETS[preset] || PRESETS.dorm).events)](ctx.currentTime + 0.05), 2500);
  schedule();
}

export function setPreset(preset) {
  if (!A || A.preset === preset) return;
  A.preset = preset;
  const old = A.bed;
  old.bus.gain.linearRampToValueAtTime(0, A.ctx.currentTime + 2);
  setTimeout(() => old.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }), 2200);
  A.bed = beds(PRESETS[preset] || PRESETS.dorm);
}

export function stopHaunt() {
  if (!A) return;
  const a = A; A = null;
  clearTimeout(a.timer); a.stopHeart();
  a.out.gain.linearRampToValueAtTime(0, a.ctx.currentTime + 0.6);
  a.bed.bus.gain.linearRampToValueAtTime(0, a.ctx.currentTime + 0.6);
  setTimeout(() => { a.bed.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); a.out.disconnect(); }, 800);
}

export const hauntOn = () => !!A;
export function tension(v) { if (A) A.tension = Math.max(0, Math.min(1, v)); }
export function play(name) { if (A && EVENTS[name]) EVENTS[name](A.ctx.currentTime + 0.02); }

// a short, loud-ish sting for the opt-in scare mode (still limited by the master compressor)
export function sting() {
  const ctx = audioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const out = masterOut();
  [0, 1, 6, 11].forEach((st) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 220 * Math.pow(2, st / 12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g).connect(out); o.start(t); o.stop(t + 1.5);
  });
  const s = ctx.createBufferSource(); s.buffer = noise(ctx, 0.6);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  s.connect(g).connect(out); s.start(t);
}
