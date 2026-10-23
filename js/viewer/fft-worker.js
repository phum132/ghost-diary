// Spectrogram in a worker: { samples, sr, mode: 'full' | 'low' } -> { img: RGBA, w, h }
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

// dark -> red -> ember -> white: louder is brighter
const STOPS = [[8, 3, 4], [120, 14, 10], [255, 59, 47], [255, 177, 153], [255, 255, 255]];
function color(v) {
  const x = Math.max(0, Math.min(1, v)) * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(x)), f = x - i;
  return STOPS[i].map((c, k) => c + (STOPS[i + 1][k] - c) * f);
}

onmessage = ({ data: { samples, sr, mode } }) => {
  const k = Math.max(1, Math.round(sr / 22050)); // keep the same time/frequency resolution at 44.1/48 kHz
  const N = (mode === 'low' ? 16384 : 2048) * (k > 1 ? 2 : 1);
  const hop = (mode === 'low' ? 1024 : 384) * k;
  const frames = Math.max(1, Math.floor((samples.length - N) / hop) + 1);
  const H = mode === 'low' ? 110 : 220;
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  // decodeAudioData resamples to the device rate (often 48 kHz); our clips only hold content up to ~11 kHz
  const fLo = 0, fHi = mode === 'low' ? 100 : Math.min(sr / 2, 11025);
  // map each output row to an FFT bin (linear axis: 0–Nyquist, or 0–100 Hz for the low view)
  const rowBin = new Int32Array(H);
  for (let r = 0; r < H; r++) {
    const f = fLo + (fHi - fLo) * (1 - r / (H - 1));
    rowBin[r] = Math.min(N / 2 - 1, Math.round(f / sr * N));
  }
  const mags = new Float32Array(frames * H);
  let max = -Infinity;
  const re = new Float32Array(N), im = new Float32Array(N);
  for (let fr = 0; fr < frames; fr++) {
    for (let i = 0; i < N; i++) { re[i] = (samples[fr * hop + i] || 0) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let r = 0; r < H; r++) {
      const b = rowBin[r];
      const db = 10 * Math.log10(re[b] * re[b] + im[b] * im[b] + 1e-12);
      mags[r * frames + fr] = db; if (db > max) max = db;
    }
  }
  if (mode === 'full') {
    // whiten: subtract each row's median so steady hum/fan noise fades and short-lived patterns stand out
    max = -Infinity;
    const row = new Float32Array(frames);
    for (let r = 0; r < H; r++) {
      row.set(mags.subarray(r * frames, (r + 1) * frames));
      const med = Float32Array.from(row).sort()[frames >> 1];
      for (let i = 0; i < frames; i++) { const v = (mags[r * frames + i] -= med); if (v > max) max = v; }
    }
  }
  // floor at the 55th percentile so steady background noise sits dark and anything louder pops out
  const sorted = Float32Array.from(mags).sort();
  const floor = Math.max(sorted[Math.floor(sorted.length * 0.55)], max - 80);
  const span = Math.max(1, max - floor);
  const img = new Uint8ClampedArray(frames * H * 4);
  for (let i = 0; i < frames * H; i++) {
    const [r, g, b] = color(Math.pow(Math.max(0, (mags[i] - floor) / span), 1.4));
    img[i * 4] = r; img[i * 4 + 1] = g; img[i * 4 + 2] = b; img[i * 4 + 3] = 255;
  }
  postMessage({ img, w: frames, h: H, fLo, fHi, mode }, [img.buffer]);
};
