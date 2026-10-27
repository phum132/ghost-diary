// Haunted soundscape built from real recordings (CC0 field recordings and foley from Freesound, see
// content/sounds.json): looping beds (wind, rain, insects, rooms) + random distant events through a reverb. Opt-in.
import { audioCtx, masterOut } from './sfx.js';
import { url } from './content.js';

const PRESETS = {
  dorm: { beds: { drone: 0.5, wind: 0.35 }, events: ['creak', 'knock', 'whisper', 'footsteps', 'drip', 'door'], every: [6, 16] },
  room: { beds: { drone2: 0.45, clock: 0.35 }, events: ['creak', 'whisper', 'drip', 'knock', 'breath'], every: [8, 18] },
  lab: { beds: { hum: 0.35, drone2: 0.25 }, events: ['click', 'whisper', 'drip'], every: [12, 24] },
  station: { beds: { station: 0.6, wind2: 0.35 }, events: ['crossing', 'taiko', 'train', 'whisper', 'bell'], every: [5, 12] },
  field: { beds: { cicada: 0.9, wind: 0.3 }, events: ['pobopo', 'whisper', 'branch', 'crow'], every: [7, 16] },
  forest: { beds: { forest: 1, drone: 0.25 }, events: ['branch', 'footsteps', 'childhum', 'whisper', 'owl'], every: [6, 14] },
  temple: { beds: { chant: 0.35, crickets: 0.4 }, events: ['templebell', 'whisper', 'footsteps'], every: [8, 18] },
  rain: { beds: { rain: 0.6, drone2: 0.3 }, events: ['knock', 'whisper', 'door', 'footsteps', 'thunder'], every: [7, 15] },
  house: { beds: { drone: 0.45, wind2: 0.3 }, events: ['creak', 'knock', 'door', 'footsteps', 'whisper', 'childhum', 'dog'], every: [5, 13] },
};

let A = null; // running state
let LIB = null; // content/sounds.json
const raw = {}; // file -> Promise<ArrayBuffer>
const decoded = {}; // file -> Promise<AudioBuffer>

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const lib = () => (LIB ||= fetch(url('content/sounds.json')).then((r) => r.json()).catch(() => ({ beds: {}, events: {} })));
const fetchRaw = (file) => (raw[file] ||= fetch(url(file)).then((r) => r.arrayBuffer()));
function buffer(ctx, file) {
  return (decoded[file] ||= fetchRaw(file).then((b) => ctx.decodeAudioData(b.slice(0))).catch(() => { delete decoded[file]; return null; }));
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

// one-shot helper: source -> gain(env) -> panner -> wet/dry
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

// play one recording of an event, a bit far away and to one side
const MIX = {
  whisper: { gain: 0.9, wet: 0.4, dry: 0.7, pan: () => pick([-1, 1]) * rnd(0.6, 1) },
  breath: { gain: 0.8, wet: 0.25, dry: 0.8, pan: () => rnd(-0.3, 0.3) },
  heartbeat: { gain: 1, wet: 0.1, dry: 0.9, pan: () => 0 },
  thunder: { gain: 0.8, wet: 0.3, dry: 0.7, pan: () => rnd(-0.4, 0.4) },
  childhum: { gain: 0.5, wet: 0.9, dry: 0.2 },
  templebell: { gain: 0.9, wet: 0.8, dry: 0.4 },
  train: { gain: 0.8, wet: 0.5, dry: 0.5 },
};
async function sample(name, t) {
  const files = (await lib()).events?.[name];
  if (!A || !files?.length) return;
  const b = await buffer(A.ctx, pick(files));
  if (!A || !b) return;
  const m = MIX[name] || {};
  const s = A.ctx.createBufferSource(); s.buffer = b;
  s.playbackRate.value = rnd(0.94, 1.04);
  const g = voice(s, { pan: m.pan ? m.pan() : rnd(-0.9, 0.9), wet: m.wet ?? 0.6, dry: m.dry ?? 0.45 });
  const at = Math.max(t, A.ctx.currentTime + 0.01);
  g.gain.setValueAtTime((m.gain ?? 0.8) * rnd(0.7, 1), at);
  s.start(at);
}

// the low "po... po... po" of the tall woman has no free recording, so it stays a filtered voice-like pop
function pobopo(t) {
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
}

function event(name, t) {
  if (name === 'pobopo') pobopo(t); else sample(name, t);
}

// ---- looping beds: each loop overlaps the next by 2 s so the baked fades crossfade ----
function beds(p) {
  const { ctx } = A;
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(A.out); bus.connect(A.rev);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  const timers = [], playing = [];
  lib().then((L) => Object.entries(p.beds).forEach(async ([key, level]) => {
    const b = L.beds?.[key] && await buffer(ctx, L.beds[key]);
    if (!b || !A) return;
    const g = ctx.createGain(); g.gain.value = level; g.connect(bus);
    let next = ctx.currentTime + 0.1;
    const tick = () => {
      while (next < ctx.currentTime + 4) {
        const s = ctx.createBufferSource(); s.buffer = b; s.connect(g); s.start(next);
        playing.push(s); if (playing.length > 6) playing.shift();
        next += b.duration - 2;
      }
    };
    tick(); timers.push(setInterval(tick, 1000));
  }));
  return { bus, stop: () => { timers.forEach(clearInterval); playing.forEach((s) => { try { s.stop(); } catch { /* not started */ } }); } };
}

// a recorded heartbeat that speeds up and gets louder with tension (0 = silent)
async function heartbeat() {
  const L = await lib();
  const b = L.events?.heartbeat?.[0] && await buffer(A.ctx, L.events.heartbeat[0]);
  if (!A || !b) return;
  const s = A.ctx.createBufferSource(); s.buffer = b; s.loop = true;
  const g = A.ctx.createGain(); g.gain.value = 0;
  s.connect(g).connect(A.out); s.start();
  A.heart = { s, g };
  setTension();
}
function setTension() {
  if (!A?.heart) return;
  const t = A.ctx.currentTime;
  A.heart.g.gain.setTargetAtTime(A.tension * 1.1, t, 0.4);
  A.heart.s.playbackRate.setTargetAtTime(1 + A.tension * 0.5, t, 0.4);
}

function schedule() {
  if (!A) return;
  const p = PRESETS[A.preset] || PRESETS.dorm;
  const wait = rnd(p.every[0], p.every[1]);
  A.timer = setTimeout(() => {
    if (!A) return;
    try { event(pick(p.events), A.ctx.currentTime + 0.05); } catch { /* ignore */ }
    schedule();
  }, wait * 1000);
}

export function startHaunt(preset = 'dorm') {
  const ctx = audioCtx();
  if (!ctx) return;
  if (A) { setPreset(preset); return; }
  const out = ctx.createGain(); out.gain.value = 1.4; out.connect(masterOut());
  const rev = reverb(ctx); const rg = ctx.createGain(); rg.gain.value = 0.45; rev.connect(rg).connect(masterOut());
  A = { ctx, out, rev, preset, tension: 0 };
  A.bed = beds(PRESETS[preset] || PRESETS.dorm);
  heartbeat();
  // first event soon so the reader notices the room is "alive"
  setTimeout(() => A && event(pick((PRESETS[preset] || PRESETS.dorm).events), ctx.currentTime + 0.05), 2500);
  schedule();
}

export function setPreset(preset) {
  if (!A || A.preset === preset) return;
  A.preset = preset;
  const old = A.bed;
  old.bus.gain.linearRampToValueAtTime(0, A.ctx.currentTime + 2);
  setTimeout(old.stop, 2200);
  A.bed = beds(PRESETS[preset] || PRESETS.dorm);
}

export function stopHaunt() {
  if (!A) return;
  const a = A; A = null;
  clearTimeout(a.timer);
  a.out.gain.linearRampToValueAtTime(0, a.ctx.currentTime + 0.6);
  a.bed.bus.gain.linearRampToValueAtTime(0, a.ctx.currentTime + 0.6);
  setTimeout(() => { a.bed.stop(); try { a.heart?.s.stop(); } catch { /* not started */ } a.out.disconnect(); }, 800);
}

export const hauntOn = () => !!A;
export function tension(v) { if (A) { A.tension = Math.max(0, Math.min(1, v)); setTension(); } }
export function play(name) { if (A) event(name, A.ctx.currentTime + 0.02); }

// fetch the scream early so the opt-in scare is not silent the first time
export function primeSting() { lib().then((L) => (L.events?.scream || []).forEach(fetchRaw)); }

// a short, loud-ish real scream (+ thunder) for the opt-in scare mode, still limited by the master compressor
export async function sting() {
  const ctx = audioCtx(); if (!ctx) return;
  const L = await lib();
  const [scream, thunder] = await Promise.all([L.events?.scream, L.events?.thunder].map((f) => (f?.length ? buffer(ctx, pick(f)) : null)));
  [[scream, 1.6], [thunder, 0.9]].forEach(([b, v]) => {
    if (!b) return;
    const s = ctx.createBufferSource(); s.buffer = b;
    const g = ctx.createGain(); g.gain.value = v;
    s.connect(g).connect(masterOut()); s.start();
  });
}
