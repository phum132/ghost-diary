// Ghost radio: real recorded radio static, a dial, a spirit-box sweep, and an EVP experiment that shows
// how the brain turns noise into words once it is told what to hear. No real broadcast is received:
// the "voices" are tiny random slices of recorded whispers, breaths and humming mixed under the static.
import { el, announce } from '../core/ui.js';
import { audioCtx, masterOut } from '../core/sfx.js';
import { buffers, playSample } from '../core/samples.js';
import { load, save } from '../core/store.js';
import { award } from '../core/badges.js';

const VOICES = ['whisper', 'whisper', 'breath', 'childhum', 'laugh'];
const QUESTIONS = ['มีใครอยู่ตรงนี้ไหม', 'คุณชื่ออะไร', 'ต้องการอะไรจากเรา', 'ให้เราออกไปไหม'];
const WORDS = ['ช่วยด้วย', 'ออกไป', 'อยู่ตรงนี้', 'หนาว'];
const HOT = [88.8, 95.6, 101.3, 104.7]; // spots on the dial where the static thins out
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function recipe(names = VOICES) {
  const name = pick(names);
  const list = await buffers(name);
  if (!list.length) return null;
  const i = Math.floor(Math.random() * list.length);
  const dur = rnd(0.4, 0.8);
  return { name, i, dur, off: rnd(0, Math.max(0, list[i].duration - dur)), rate: rnd(0.82, 1.08), gain: rnd(1.3, 1.8) };
}

// one slice of a recording, band-limited like a cheap speaker, into `dest` at time t
async function slice(c, r, dest, t) {
  const b = (await buffers(r.name))[r.i];
  if (!b) return;
  const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = r.rate;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.3;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(r.gain, t + 0.04);
  g.gain.setValueAtTime(r.gain, t + r.dur - 0.07); g.gain.linearRampToValueAtTime(0, t + r.dur);
  s.connect(f).connect(g).connect(dest);
  s.start(t, r.off, r.dur + 0.05);
}

export function radio(host) {
  let R = null, scanIv = 0, voiceT = 0, raf = 0, last = null, freq = 94.3, tuneAt = 0;

  const scope = el('canvas', { class: 'radio-scope', width: 640, height: 140, 'aria-hidden': 'true' });
  const fdisp = el('output', { class: 'radio-freq' }, '94.3');
  const dial = el('input', { type: 'range', min: 875, max: 1080, step: 1, value: 943, class: 'radio-dial', 'aria-label': 'หมุนหาคลื่น (เมกะเฮิรตซ์)', disabled: true });
  const power = el('button', { type: 'button', class: 'btn primary', 'aria-pressed': 'false' }, '⏻ เปิดวิทยุ');
  const scanBtn = el('button', { type: 'button', class: 'btn', disabled: true, 'aria-pressed': 'false' }, '⟳ สแกนแบบ spirit box');
  const replay = el('button', { type: 'button', class: 'btn small', disabled: true }, '▶ ฟังเสียงล่าสุดซ้ำ');
  const log = el('ol', { class: 'radio-log', 'aria-live': 'polite' });
  const askBtns = QUESTIONS.map((q) => el('button', { type: 'button', disabled: true, onclick: () => ask(q) }, q));
  const lamp = el('span', { class: 'radio-lamp', 'aria-hidden': 'true' });

  const note = (t) => { log.prepend(el('li', {}, t)); while (log.children.length > 6) log.lastChild.remove(); };
  const hot = () => Math.max(0, ...HOT.map((h) => 1 - Math.abs(freq - h) / 0.7));
  const base = () => 0.95 - 0.5 * hot();

  function tune(f, quiet) {
    freq = Math.round(f * 10) / 10;
    fdisp.textContent = freq.toFixed(1);
    dial.value = String(Math.round(freq * 10));
    lamp.style.opacity = String(0.25 + hot() * 0.75);
    if (!R) return;
    const t = R.c.currentTime;
    R.bp.frequency.setTargetAtTime(380 + ((freq - 87.5) / 20.5) * 3200, t, 0.03);
    R.sg.gain.setTargetAtTime(base(), t, 0.05);
    if (!quiet && performance.now() - tuneAt > 140) { tuneAt = performance.now(); playSample('tune', { gain: 0.35, rate: rnd(0.9, 1.3), dest: R.an }); }
  }

  async function voice(r) {
    if (!R) return;
    r ||= await recipe();
    if (!r || !R) return;
    const t = R.c.currentTime + 0.03;
    await slice(R.c, r, R.an, t);
    R.sg.gain.setTargetAtTime(0.4, t, 0.03);
    R.sg.gain.setTargetAtTime(base(), t + r.dur, 0.1);
    last = r; replay.disabled = false;
  }

  function loop() {
    clearTimeout(voiceT);
    voiceT = setTimeout(() => {
      if (!R) return;
      if (Math.random() < 0.35 + hot() * 0.5) { voice(); note(`${freq.toFixed(1)} MHz · มีเสียงแทรกเข้ามา…`); }
      loop();
    }, rnd(3500, 8000));
  }

  function draw() {
    const g = scope.getContext('2d');
    const data = new Uint8Array(R.an.fftSize);
    const frame = () => {
      if (!R) return;
      R.an.getByteTimeDomainData(data);
      g.fillStyle = 'rgba(8,3,4,.55)'; g.fillRect(0, 0, scope.width, scope.height);
      g.strokeStyle = `rgba(157,255,199,${0.5 + hot() * 0.5})`; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / data.length) * scope.width, y = (data[i] / 255) * scope.height;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      raf = requestAnimationFrame(frame);
    };
    frame();
  }

  async function on() {
    const c = audioCtx();
    if (!c) { note('เบราว์เซอร์นี้เล่นเสียงไม่ได้'); return; }
    power.disabled = true;
    const [stat] = await buffers('radio');
    power.disabled = false;
    if (!stat) { note('โหลดเสียงวิทยุไม่สำเร็จ ลองใหม่อีกครั้ง'); return; }
    const out = c.createGain(); out.gain.value = 0; out.connect(masterOut());
    out.gain.setTargetAtTime(1.7, c.currentTime, 0.25);
    const an = c.createAnalyser(); an.fftSize = 1024; an.connect(out);
    const src = c.createBufferSource(); src.buffer = stat; src.loop = true; src.loopStart = 0.2; src.loopEnd = stat.duration - 0.4;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.6;
    const sg = c.createGain(); sg.gain.value = 0.9;
    src.connect(bp).connect(sg).connect(an);
    src.start(0, rnd(0.2, stat.duration - 1));
    R = { c, out, an, src, bp, sg };
    tune(freq, true);
    draw(); loop();
    [dial, scanBtn, ...askBtns].forEach((b) => { b.disabled = false; });
    power.textContent = '⏻ ปิดวิทยุ'; power.setAttribute('aria-pressed', 'true');
    host.classList.add('on');
    note('วิทยุเปิดแล้ว ค่อยๆ หมุนหาคลื่นที่เสียงซ่าเบาลง');
    // preload the voices so the first one is not late
    VOICES.forEach((n) => buffers(n));
  }

  function off() {
    if (!R) return;
    const { c, out, src } = R;
    out.gain.setTargetAtTime(0, c.currentTime, 0.08);
    setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } out.disconnect(); }, 400);
    R = null;
    clearInterval(scanIv); scanIv = 0; clearTimeout(voiceT); cancelAnimationFrame(raf);
    [dial, scanBtn, ...askBtns].forEach((b) => { b.disabled = true; });
    scanBtn.setAttribute('aria-pressed', 'false');
    power.textContent = '⏻ เปิดวิทยุ'; power.setAttribute('aria-pressed', 'false');
    host.classList.remove('on');
  }

  function scan() {
    if (scanIv) { clearInterval(scanIv); scanIv = 0; scanBtn.setAttribute('aria-pressed', 'false'); note('หยุดสแกน'); return; }
    scanBtn.setAttribute('aria-pressed', 'true');
    note('กำลังสแกน กระโดดข้ามคลื่นทุก 0.1 วินาทีแบบ spirit box ฟังดีๆ ว่ามีคำหลุดออกมาไหม');
    scanIv = setInterval(() => {
      if (!R) return;
      tune(freq >= 107.8 ? 87.5 : freq + 0.3);
      R.sg.gain.setValueAtTime(Math.random() < 0.5 ? 0.25 : base(), R.c.currentTime);
      if (Math.random() < 0.05) voice();
    }, 110);
  }

  function ask(q) {
    note(`คุณถาม: "${q}"`);
    askBtns.forEach((b) => { b.disabled = true; });
    setTimeout(async () => {
      if (!R) return;
      const n = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < n; k++) { await voice(); await new Promise((r) => setTimeout(r, 700)); }
      note(`บันทึกได้ ${n} ช่วงสั้นๆ หลังคำถาม คุณได้ยินว่าอะไร?`);
      announce('มีเสียงตอบกลับมา');
      if (R) askBtns.forEach((b) => { b.disabled = false; });
    }, rnd(1200, 2600));
  }

  power.addEventListener('click', () => (R ? off() : on()));
  scanBtn.addEventListener('click', scan);
  dial.addEventListener('input', () => tune(+dial.value / 10));
  replay.addEventListener('click', () => last && voice(last));

  host.append(
    el('div', { class: 'radio-set' },
      el('div', { class: 'radio-top' }, el('span', { class: 'radio-brand' }, 'SLUR · RECEIVER'), lamp, el('span', { class: 'radio-unit' }, fdisp, ' MHz')),
      scope,
      el('label', { class: 'radio-dial-wrap' }, el('span', { class: 'faint' }, '87.5'), dial, el('span', { class: 'faint' }, '108')),
      el('div', { class: 'radio-row' }, power, scanBtn, replay),
      el('p', { class: 'hud-label' }, 'ถามคำถาม แล้วฟังช่วงสองสามวินาทีหลังจากนั้น'),
      el('div', { class: 'chips radio-ask', role: 'group', 'aria-label': 'ถามคำถาม' }, ...askBtns),
      log),
    experiment());

  const stop = () => off();
  addEventListener('pagehide', stop);
  return () => { removeEventListener('pagehide', stop); off(); };
}

// ---- the experiment: same clip twice, the second time with a "transcript" ----
function experiment() {
  const stage = el('div', { class: 'exp-stage', 'aria-live': 'polite' });
  const box = el('section', { class: 'hud radio-exp', 'aria-labelledby': 'evp-t' },
    el('h3', { id: 'evp-t' }, '🧪 ทดลอง: เสียงซ่านี้พูดว่าอะไร?'),
    el('p', { class: 'dim' }, 'นักล่าผีทั่วโลกอัดเสียงในที่เงียบๆ แล้วเอามาฟังหา "เสียงวิญญาณ" เรียกว่า EVP ลองฟังคลิปที่ได้มาดู 3 วินาที แล้วตอบตามที่ได้ยินจริงๆ ใส่หูฟังจะชัดกว่า'),
    stage);
  let clip = null, first = null, caption = null;

  async function play(btn) {
    const c = audioCtx();
    if (!c) return;
    btn.disabled = true;
    clip ||= { voice: await recipe(['whisper']), off: rnd(0.5, 6) };
    const [stat] = await buffers('radio');
    if (!stat || !clip.voice) { btn.disabled = false; return; }
    const out = c.createGain(); out.connect(masterOut());
    const t = c.currentTime + 0.05;
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(1.6, t + 0.3); out.gain.setValueAtTime(1.6, t + 2.7); out.gain.linearRampToValueAtTime(0, t + 3.1);
    const s = c.createBufferSource(); s.buffer = stat;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.6;
    const sg = c.createGain(); sg.gain.value = 0.7;
    s.connect(bp).connect(sg).connect(out); s.start(t, clip.off, 3.2);
    await slice(c, clip.voice, out, t + 1.3);
    await new Promise((r) => setTimeout(r, 3300));
    out.disconnect();
    btn.disabled = false;
  }

  function step1() {
    const b = el('button', { type: 'button', class: 'btn primary' }, '▶ ฟังคลิป EVP');
    b.onclick = async () => { await play(b); ask1(); };
    stage.replaceChildren(b);
  }
  function ask1() {
    const pickA = (a) => { first = a; caption = pick(WORDS.filter((w) => w !== a)); step2(); };
    stage.replaceChildren(
      el('p', {}, 'ได้ยินคำว่าอะไร?'),
      el('div', { class: 'chips' }, ...WORDS.map((w) => el('button', { type: 'button', onclick: () => pickA(w) }, `"${w}"`)),
        el('button', { type: 'button', onclick: () => pickA(null) }, 'ไม่ได้ยินเป็นคำ')),
      el('button', { type: 'button', class: 'btn small', onclick: (e) => play(e.currentTarget) }, '▶ ฟังอีกที'));
  }
  function step2() {
    const cap = el('p', { class: 'evp-caption' }, `"${caption}"`);
    const b = el('button', { type: 'button', class: 'btn primary' }, '▶ ฟังอีกครั้ง พร้อมคำถอดเสียง');
    b.onclick = async () => {
      cap.classList.add('pulse');
      await play(b);
      cap.classList.remove('pulse');
      stage.append(el('p', {}, `ตอนนี้ได้ยินคำว่า "${caption}" ไหม?`),
        el('div', { class: 'chips' }, ...[['clear', 'ได้ยินชัดเลย'], ['some', 'พอได้ยิน'], ['no', 'ไม่ได้ยิน']].map(([k, t]) => el('button', { type: 'button', onclick: () => reveal(k) }, t))));
    };
    stage.replaceChildren(el('p', {}, first ? `คุณได้ยินว่า "${first}" แต่ทีมถอดเสียง EVP ฟังแล้วบอกว่าคลิปนี้พูดว่า` : 'ทีมถอดเสียง EVP ฟังแล้วบอกว่าคลิปนี้พูดว่า'), cap, b);
  }
  function reveal(heard) {
    const hist = load('evp', []);
    hist.push({ first, caption, heard, at: Date.now() });
    save('evp', hist.slice(-20));
    award('radio');
    const swayed = heard !== 'no';
    stage.replaceChildren(
      el('p', { class: 'evp-big' }, swayed ? 'สมองคุณเพิ่งเติมคำเข้าไปเอง' : 'คุณไม่หลงกล เก่งมาก'),
      el('p', {}, `ทั้งสองครั้งคือคลิปเดียวกันทุกวินาที เสียงซ่าเป็นเสียงอัดจากวิทยุเทปจริง ส่วน "เสียงพูด" คือเศษเสียงกระซิบยาว ${clip.voice.dur.toFixed(1)} วินาที ที่ตัดแบบสุ่มจากเสียงคนกระซิบที่อัดไว้ ไม่มีใครพูดคำว่า "${caption}" เป็นภาษาไทยในนั้นเลย และ "ทีมถอดเสียง" ก็คือเว็บนี้สุ่มคำมาให้`),
      el('p', {}, swayed
        ? 'แค่เห็นคำบรรยายก่อน หูก็ได้ยินคำนั้นทันที นักจิตวิทยาเรียกว่า การเห็นรูปแบบในเสียง (auditory pareidolia) บวกกับ การชี้นำล่วงหน้า (priming) สมองเราไม่ได้ฟังแบบเครื่องอัดเสียง มันเดาตลอดเวลาว่ากำลังได้ยินอะไร แล้วใช้สิ่งที่คาดไว้มาเติมช่องว่าง'
        : 'หลายคนพอเห็นคำบรรยายแล้วจะได้ยินคำนั้นทันที เพราะสมองใช้สิ่งที่คาดไว้มาเติมช่องว่างในเสียงที่ไม่ชัด นักจิตวิทยาเรียกว่า auditory pareidolia บวกกับ priming ลองชวนเพื่อนมาทำดู'),
      el('p', { class: 'faint' }, 'EVP เริ่มดังตั้งแต่ปี 1959 เมื่อนักทำสารคดีชาวสวีเดนอัดเสียงนกแล้วอ้างว่าได้ยินเสียงคนในเทป ต่อมามีงานวิจัยหลายชิ้น เช่น Nees & Phillips (2015) ที่พบว่าคนที่ถูกบอกล่วงหน้าว่ากำลังฟัง "เสียงผี" มีแนวโน้มได้ยินคำในเสียงรบกวนมากขึ้น ส่วนรายการล่าผีที่ขึ้นคำบรรยายให้ก่อน ก็ทำแบบเดียวกับที่เว็บนี้เพิ่งทำกับคุณ'),
      el('button', { type: 'button', class: 'btn small', onclick: () => { clip = null; step1(); } }, '↺ ลองใหม่ด้วยคลิปใหม่'));
  }

  step1();
  return box;
}
