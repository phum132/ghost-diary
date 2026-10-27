// The baked CC0 recordings (content/sounds.json) as AudioBuffers, played through the shared output.
// Used by the ritual room, which makes sound only after the reader presses a button.
import { audioCtx, masterOut } from './sfx.js';
import { getJSON, url } from './content.js';

let lib = null;
const cache = {};
const files = (name) => (lib ||= getJSON('content/sounds.json').catch(() => ({ events: {} }))).then((L) => L.events?.[name] || []);

export async function buffers(name) {
  const c = audioCtx();
  if (!c) return [];
  const list = await files(name);
  const got = await Promise.all(list.map((f) => (cache[f] ||= fetch(url(f)).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b)).catch(() => null))));
  return got.filter(Boolean);
}

export async function playSample(name, { gain = 1, rate = 1, dest = null } = {}) {
  const list = await buffers(name);
  if (!list.length) return null;
  const c = audioCtx();
  const s = c.createBufferSource();
  s.buffer = list[Math.floor(Math.random() * list.length)];
  s.playbackRate.value = rate;
  const g = c.createGain(); g.gain.value = gain;
  s.connect(g).connect(dest || masterOut());
  s.start();
  return s;
}
