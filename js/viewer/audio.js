// Evidence audio player: waveform, speed, reverse, spectrogram. Opt-in, volume-limited.
import { el, toast, rng, announce } from '../core/ui.js';
import { url } from '../core/content.js';
import { audioCtx } from '../core/sfx.js';
import { pin } from '../core/board-store.js';
import { load, save } from '../core/store.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let playing = null; // only one clip at a time

export function audioPlayer(id, ev, entryDay) {
  const play = el('button', { class: 'play', type: 'button', 'aria-label': 'เล่นเสียง' }, '▶');
  const wave = el('canvas', { class: 'wave', role: 'slider', tabindex: '0', 'aria-label': 'ตำแหน่งเสียง', 'aria-valuemin': '0', 'aria-valuemax': String(ev.duration), 'aria-valuenow': '0' });
  const time = el('span', { class: 'time' }, `0:00 / ${fmt(ev.duration)}`);
  const btn = (t, attrs = {}) => el('button', { type: 'button', ...attrs }, t);
  const speeds = [btn('½ ช้า', { 'aria-pressed': 'false', 'data-r': '0.5' }), btn('ปกติ', { 'aria-pressed': 'true', 'data-r': '1' }), btn('2× เร็ว', { 'aria-pressed': 'false', 'data-r': '2' })];
  const rev = btn('⇄ เล่นย้อน', { 'aria-pressed': 'false' });
  const specBtn = btn('▦ สเปกโตรแกรม', { 'aria-pressed': 'false', 'aria-expanded': 'false' });
  const pinBtn = btn('📌 ปักหมุด');
  const specCanvas = el('canvas', { role: 'img', 'aria-label': 'สเปกโตรแกรมของเสียง แกนตั้งคือความถี่ แกนนอนคือเวลา' });
  const rangeFull = btn('เต็มช่วง', { 'aria-pressed': 'true' });
  const rangeLow = btn('ต่ำ 0–100 Hz', { 'aria-pressed': 'false' });
  const spec = el('div', { class: 'spec' },
    el('div', { class: 'spec-bar' }, el('span', {}, 'ความถี่ (สูง ↑) × เวลา →'), el('span', { class: 'row' }, rangeFull, rangeLow)), specCanvas);
  const root = el('div', { class: 'player', 'data-ev': id },
    el('div', { class: 'title' }, el('span', {}, '● REC  ', ev.title), el('span', { class: 'mono' }, `${ev.duration}s`)),
    el('div', { class: 'top' }, play, wave, time),
    el('div', { class: 'ctrls' }, ...speeds, rev, specBtn, pinBtn),
    spec,
    el('details', {}, el('summary', {}, 'ถอดเสียง (เท่าที่หูได้ยิน)'), el('p', {}, ev.transcript || '—')));

  const S = { buf: null, rbuf: null, src: null, gain: null, startAt: 0, offset: 0, rate: 1, reversed: false, peaks: null, specMode: 'full', specImg: {}, raf: 0 };

  function drawWave() {
    const r = wave.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio, 2);
    wave.width = r.width * dpr; wave.height = r.height * dpr;
    const g = wave.getContext('2d'); g.scale(dpr, dpr);
    const bars = Math.max(30, Math.floor(r.width / 4));
    const peaks = S.peaks || Array.from({ length: bars }, ((rand) => () => 0.15 + rand() * 0.5)(rng(id)));
    const pos = cur() / ev.duration;
    for (let i = 0; i < bars; i++) {
      const v = S.peaks ? peaks[Math.floor(i / bars * peaks.length)] : peaks[i];
      const hgt = Math.max(2, v * r.height * 0.9);
      g.fillStyle = i / bars < pos ? '#ff3b2f' : 'rgba(243,233,226,.35)';
      g.fillRect(i * 4, (r.height - hgt) / 2, 2, hgt);
    }
    wave.setAttribute('aria-valuenow', String(Math.round(cur())));
  }
  const cur = () => (S.src ? Math.min(ev.duration, S.offset + (audioCtx().currentTime - S.startAt) * S.rate) : S.offset);

  async function ensure() {
    if (S.buf) return true;
    const ctx = audioCtx();
    if (!ctx) { toast('เบราว์เซอร์นี้เล่นเสียงแบบนี้ไม่ได้'); return false; }
    try {
      const ab = await (await fetch(url(ev.file))).arrayBuffer();
      S.buf = await ctx.decodeAudioData(ab);
    } catch { toast('โหลดไฟล์เสียงไม่ได้ ลองใหม่อีกครั้ง'); return false; }
    const d = S.buf.getChannelData(0), n = 240, step = Math.floor(d.length / n);
    let m = 0;
    S.peaks = Array.from({ length: n }, (_, i) => { let p = 0; for (let k = 0; k < step; k++) p = Math.max(p, Math.abs(d[i * step + k])); m = Math.max(m, p); return p; }).map((p) => p / (m || 1));
    S.rbuf = ctx.createBuffer(1, S.buf.length, S.buf.sampleRate);
    S.rbuf.getChannelData(0).set(Float32Array.from(d).reverse());
    drawWave();
    return true;
  }

  function stop(keepPos = true) {
    if (S.src) { const o = cur(); S.src.onended = null; try { S.src.stop(); } catch { /* already stopped */ } S.src = null; S.offset = keepPos ? o : 0; }
    cancelAnimationFrame(S.raf);
    play.textContent = '▶'; play.setAttribute('aria-label', 'เล่นเสียง');
    if (playing === api) playing = null;
  }
  async function start() {
    if (!(await ensure())) return;
    if (playing && playing !== api) playing.stop();
    if (!load('volWarned', false)) { toast('🔉 ลดเสียงลงก่อนนะ บางคลิปมีเสียงต่ำๆ ที่ลำโพงสั่น'); save('volWarned', true); }
    const ctx = audioCtx();
    if (S.offset >= ev.duration - 0.05) S.offset = 0;
    const src = ctx.createBufferSource();
    src.buffer = S.reversed ? S.rbuf : S.buf;
    src.playbackRate.value = S.rate;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 12;
    src.connect(g).connect(comp).connect(ctx.destination);
    src.start(0, S.offset);
    S.src = src; S.startAt = ctx.currentTime; playing = api;
    src.onended = () => { S.src = null; S.offset = 0; play.textContent = '▶'; drawWave(); drawSpec(); };
    play.textContent = '❚❚'; play.setAttribute('aria-label', 'หยุดเสียง');
    const tick = () => { time.textContent = `${fmt(cur())} / ${fmt(ev.duration)}`; drawWave(); drawSpec(); if (S.src) S.raf = requestAnimationFrame(tick); };
    tick();
  }
  const api = { stop: () => stop(true) };

  play.addEventListener('click', () => (S.src ? stop(true) : start()));
  speeds.forEach((b) => b.addEventListener('click', () => {
    S.rate = +b.dataset.r; speeds.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (S.src) { stop(true); start(); }
  }));
  rev.addEventListener('click', () => {
    const was = !!S.src; const pos = cur();
    stop(true);
    S.reversed = !S.reversed; S.offset = Math.max(0, ev.duration - pos);
    rev.setAttribute('aria-pressed', String(S.reversed));
    announce(S.reversed ? 'เล่นย้อนกลับ' : 'เล่นปกติ');
    if (was) start(); else drawWave();
  });
  const seek = (clientX) => {
    const r = wave.getBoundingClientRect();
    const was = !!S.src; stop(true);
    S.offset = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * ev.duration;
    time.textContent = `${fmt(S.offset)} / ${fmt(ev.duration)}`;
    drawWave(); drawSpec();
    if (was) start();
  };
  wave.addEventListener('pointerdown', (e) => seek(e.clientX));
  wave.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const r = wave.getBoundingClientRect();
      const t = Math.max(0, Math.min(ev.duration, cur() + (e.key === 'ArrowRight' ? 5 : -5)));
      seek(r.left + t / ev.duration * r.width); e.preventDefault();
    } else if (e.key === ' ') { play.click(); e.preventDefault(); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'r' || e.key === 'R') rev.click();
    if (e.key === 's' || e.key === 'S') specBtn.click();
  });

  // spectrogram
  async function compute(mode) {
    if (S.specImg[mode]) return S.specImg[mode];
    if (!(await ensure())) return null;
    const w = new Worker(new URL('./fft-worker.js', import.meta.url));
    const res = await new Promise((resolve) => {
      w.onmessage = (e) => resolve(e.data);
      w.onerror = () => resolve(null);
      w.postMessage({ samples: S.buf.getChannelData(0).slice(), sr: S.buf.sampleRate, mode });
    });
    w.terminate();
    if (!res) return null;
    const c = document.createElement('canvas'); c.width = res.w; c.height = res.h;
    c.getContext('2d').putImageData(new ImageData(res.img, res.w, res.h), 0, 0);
    return (S.specImg[mode] = { canvas: c, ...res });
  }
  function drawSpec() {
    const im = S.specImg[S.specMode];
    if (!im || !spec.classList.contains('open')) return;
    const r = specCanvas.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(devicePixelRatio, 2);
    specCanvas.width = r.width * dpr; specCanvas.height = r.height * dpr;
    const g = specCanvas.getContext('2d'); g.scale(dpr, dpr);
    g.imageSmoothingEnabled = true;
    const L = 46;
    g.drawImage(im.canvas, L, 0, r.width - L, r.height - 16);
    g.fillStyle = '#080304'; g.fillRect(0, 0, L, r.height);
    g.font = '11px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(243,233,226,.75)';
    const ticks = im.mode === 'low' ? [100, 75, 50, 25, 0] : [10000, 8000, 6000, 4000, 2000, 0];
    for (const f of ticks) {
      const t = 1 - (f - im.fLo) / (im.fHi - im.fLo);
      const y = t * (r.height - 16);
      g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), 4, Math.min(r.height - 20, Math.max(10, y + 4)));
      g.fillRect(L - 4, y, 4, 1);
    }
    g.fillText('Hz', 4, r.height - 4);
    const pos = S.reversed ? 1 - cur() / ev.duration : cur() / ev.duration;
    const x = L + pos * (r.width - L);
    g.fillStyle = '#ffd866'; g.fillRect(x, 0, 2, r.height - 16);
  }
  const setRange = async (mode) => {
    S.specMode = mode;
    rangeFull.setAttribute('aria-pressed', String(mode === 'full')); rangeLow.setAttribute('aria-pressed', String(mode === 'low'));
    if (await compute(mode)) drawSpec();
  };
  specBtn.addEventListener('click', async () => {
    const open = !spec.classList.contains('open');
    spec.classList.toggle('open', open);
    specBtn.setAttribute('aria-pressed', String(open)); specBtn.setAttribute('aria-expanded', String(open));
    if (open) { specBtn.textContent = '▦ กำลังคำนวณ…'; await setRange(S.specMode); specBtn.textContent = '▦ สเปกโตรแกรม'; }
  });
  rangeFull.addEventListener('click', () => setRange('full'));
  rangeLow.addEventListener('click', () => setRange('low'));
  pinBtn.addEventListener('click', () => pin({ kind: 'audio', ref: id, entry: ev.entry, day: entryDay, title: ev.title, value: `${ev.duration}s` }));
  new ResizeObserver(() => { drawWave(); drawSpec(); }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.src) stop(true); });
  return root;
}
