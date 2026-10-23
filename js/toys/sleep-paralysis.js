// Sleep paralysis: wake up during REM and the body's "off switch" (REM atonia) is still on.
import { frame, slider, segmented, fitCanvas, wirePin, narrator } from './kit.js';
import { el } from '../core/ui.js';

const CONFIG = {
  start: 22, end: 6, cycleMin: 90,        // ~90-minute cycles
  rem: [10, 18, 25, 32, 40],               // REM gets longer toward morning (minutes, illustrative)
  prevalence: 7.6,                          // % of people at least once (Sharpless & Barber 2011)
};
const STAGES = ['ตื่น', 'REM', 'N1', 'N2', 'N3'];

function clock(m) { const h = (CONFIG.start + Math.floor(m / 60)) % 24; return `${String(h).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`; }

function hypnogram(deprived) {
  // returns [{t0,t1,stage}] in minutes from bedtime; sleep debt = more deep sleep early + broken REM
  const out = [];
  let t = 0;
  const total = ((CONFIG.end + 24 - CONFIG.start) % 24) * 60;
  for (let c = 0; t < total; c++) {
    const rem = CONFIG.rem[Math.min(c, CONFIG.rem.length - 1)];
    const deep = Math.max(0, (c < 2 ? 35 : c < 3 ? 15 : 0) * (1 + deprived * 0.4));
    const n2 = CONFIG.cycleMin - rem - deep - 8;
    for (const [d, s] of [[5, 2], [Math.max(10, n2 / 2), 3], [deep, 4], [Math.max(8, n2 / 2), 3], [3, 2], [rem, 1]]) {
      if (d <= 0) continue;
      out.push({ t0: t, t1: Math.min(total, t + d), s }); t += d;
      if (t >= total) break;
    }
    if (deprived > 0.4 && c > 1) out.push({ t0: t, t1: t + 2, s: 0 }), (t += 2);
  }
  return { out, total };
}

export function mount(host, o) {
  const f = frame(host, o, { wide: true });
  const say = narrator(f);
  const st = { wake: 300, paralysis: 0, msg: '', shadow: 0 };
  const dep = slider(f.controls, { label: 'อดนอนมาแค่ไหน', min: 0, max: 100, value: 20, unit: '%', onInput: () => { draw(); } });
  const pose = segmented(f.controls, 'ท่านอน', [['back', 'นอนหงาย'], ['side', 'นอนตะแคง']], 'back', () => draw());
  const wake = slider(f.controls, { label: 'เวลาที่ตื่น (ลากเส้นบนกราฟก็ได้)', min: 0, max: 480, step: 5, value: 300, fmt: (m) => clock(m), onInput: (v) => { st.wake = v; draw(); } });
  const go = el('button', { class: 'btn primary small', type: 'button' }, 'ตื่น!');
  f.controls.append(go);
  f.formula.append(el('div', {}, 'รอบการนอน ≈ 90 นาที × 4–6 รอบ · ช่วง REM ยาวขึ้นเรื่อยๆ ตอนใกล้เช้า'), el('div', { class: 'faint' }, `เคยเป็นผีอำอย่างน้อยหนึ่งครั้ง ≈ ${CONFIG.prevalence}% ของคนทั่วไป (สูงกว่านั้นมากในนักศึกษา)`));
  f.explain.append(
    el('p', {}, 'ตอนฝันในช่วง REM สมองสั่ง "ปิดกล้ามเนื้อ" ทั้งตัว (REM atonia) เพื่อไม่ให้เราลุกขึ้นทำตามฝัน ถ้าเราตื่นขึ้นมากลางช่วงนี้ สติกลับมาแล้วแต่สวิตช์ยังไม่ปิด จะขยับไม่ได้ หายใจลำบาก และสมองที่ยังฝันค้างอยู่อาจสร้างภาพหลอน เช่น คนยืนที่ประตู หรือมีอะไรนั่งทับหน้าอก'),
    el('p', {}, 'อาการมักหายเองภายในไม่กี่วินาทีถึงไม่กี่นาที เกิดง่ายขึ้นเมื่ออดนอน นอนไม่เป็นเวลา เครียด และนอนหงาย'),
    el('p', { class: 'caveat' }, 'กราฟนี้วาดแบบประมาณให้เห็นภาพ คนแต่ละคนมีรูปแบบการนอนต่างกัน'));

  const c = fitCanvas(f.canvas, () => draw());
  const stageAt = (m, hyp) => (hyp.out.find((x) => m >= x.t0 && m < x.t1) || { s: 0 }).s;
  let countdown = null;
  go.addEventListener('click', () => {
    const hyp = hypnogram(dep.get() / 100);
    const s = stageAt(st.wake, hyp);
    clearInterval(countdown);
    if (s === 1) {
      const risk = (pose.get() === 'back' ? 1.5 : 1) * (0.5 + dep.get() / 100);
      st.paralysis = Math.round(2 + Math.min(10, risk * 6));
      st.msg = `ตื่นกลางช่วง REM ตอน ${clock(st.wake)} — ตาเปิดแต่ตัวขยับไม่ได้! อัมพาตจะหายในอีก ~${st.paralysis} วินาที`;
      st.shadow = 0;
      countdown = setInterval(() => {
        st.paralysis--; st.shadow = Math.min(1, st.shadow + 0.35);
        if (st.paralysis <= 0) { clearInterval(countdown); st.msg = 'ขยับนิ้วได้แล้ว… เปิดไฟ ไม่มีใครอยู่ที่ประตู'; st.shadow = 0; }
        else st.msg = `อัมพาตจะหายในอีก ~${st.paralysis} วินาที`;
        draw();
      }, 1000);
    } else if (s === 4) { st.msg = 'ตื่นจากหลับลึก (N3): งัวเงีย ตื่นยาก แต่ขยับได้ปกติ'; st.shadow = 0; }
    else { st.msg = `ตื่นช่วง ${STAGES[s]}: ตื่นได้ปกติ ไม่มีอะไรแปลก`; st.shadow = 0; }
    say(st.msg); draw();
  });
  // drag the wake line on the chart
  let dragging = false;
  const toMin = (e) => { const r = f.canvas.getBoundingClientRect(); return Math.max(0, Math.min(480, Math.round(((e.clientX - r.left) / r.width - 0.06) / 0.9 * 480 / 5) * 5)); };
  f.canvas.addEventListener('pointerdown', (e) => { dragging = true; f.canvas.setPointerCapture(e.pointerId); wake.set(toMin(e)); });
  f.canvas.addEventListener('pointermove', (e) => { if (dragging) wake.set(toMin(e)); });
  f.canvas.addEventListener('pointerup', () => { dragging = false; });
  f.resetBtn.addEventListener('click', () => { clearInterval(countdown); st.msg = ''; st.shadow = 0; dep.set(20); pose.set('back'); wake.set(300); });
  wirePin(f, o, () => `ตื่น ${clock(st.wake)}, อดนอน ${dep.get()}%, ${pose.get() === 'back' ? 'นอนหงาย' : 'นอนตะแคง'} → ${st.msg || 'ยังไม่ได้ลองตื่น'}`);

  function draw(t = 0) {
    const { g, size } = c; const { w, h } = size(); if (!w) return;
    const hyp = hypnogram(dep.get() / 100);
    g.clearRect(0, 0, w, h);
    const x0 = w * 0.06, gw = w * 0.9, y0 = h * 0.08, gh = h * 0.38;
    const X = (m) => x0 + m / hyp.total * gw;
    const Y = (s) => y0 + [0, 1, 2, 3, 4][s] / 4 * gh;
    g.fillStyle = '#8a7671'; g.font = '11px "IBM Plex Sans Thai", sans-serif';
    STAGES.forEach((s, i) => g.fillText(s, 2, Y(i) + 4));
    for (const seg of hyp.out) {
      if (seg.s === 1) { g.fillStyle = 'rgba(255,59,47,.25)'; g.fillRect(X(seg.t0), y0 - 4, X(seg.t1) - X(seg.t0), gh + 8); }
    }
    g.beginPath();
    hyp.out.forEach((seg, i) => { const y = Y(seg.s); i ? g.lineTo(X(seg.t0), y) : g.moveTo(X(seg.t0), y); g.lineTo(X(seg.t1), y); });
    g.strokeStyle = '#f3e9e2'; g.lineWidth = 2; g.stroke();
    for (let hh = 0; hh <= 8; hh += 2) { g.fillStyle = '#8a7671'; g.fillText(clock(hh * 60), X(hh * 60) - 14, y0 + gh + 18); }
    // wake line
    g.strokeStyle = '#ffd866'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(st.wake), y0 - 6); g.lineTo(X(st.wake), y0 + gh + 6); g.stroke();
    g.fillStyle = '#ffd866'; g.fillText('ตื่น ' + clock(st.wake), X(st.wake) + 4, y0 + 2);
    // bedroom
    const by = h * 0.6, bh = h * 0.36;
    g.fillStyle = '#0d0607'; g.fillRect(x0, by, gw, bh);
    g.fillStyle = '#2a1414'; g.fillRect(x0 + gw * 0.1, by + bh * 0.55, gw * 0.45, bh * 0.25); // bed
    g.fillStyle = '#d9cfc8';
    if (pose.get() === 'back') { g.beginPath(); g.arc(x0 + gw * 0.14, by + bh * 0.5, 9, 0, Math.PI * 2); g.fill(); g.fillRect(x0 + gw * 0.16, by + bh * 0.48, gw * 0.3, 12); }
    else { g.beginPath(); g.arc(x0 + gw * 0.14, by + bh * 0.48, 9, 0, Math.PI * 2); g.fill(); g.fillRect(x0 + gw * 0.16, by + bh * 0.42, gw * 0.3, 18); }
    // door + shadow figure
    const dx = x0 + gw * 0.78;
    g.strokeStyle = '#3a2a24'; g.lineWidth = 3; g.strokeRect(dx, by + bh * 0.08, gw * 0.12, bh * 0.86);
    g.fillStyle = 'rgba(255,214,150,.25)'; g.fillRect(dx, by + bh * 0.92, gw * 0.12, 4);
    if (st.shadow > 0) {
      g.fillStyle = `rgba(0,0,0,${0.9 * st.shadow})`;
      g.beginPath(); g.ellipse(dx + gw * 0.06, by + bh * 0.25, 9, 12, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(dx + gw * 0.035, by + bh * 0.3); g.lineTo(dx + gw * 0.085, by + bh * 0.3); g.lineTo(dx + gw * 0.1, by + bh * 0.85); g.lineTo(dx + gw * 0.02, by + bh * 0.85); g.fill();
    }
    f.result.replaceChildren(st.msg || 'เลือกเวลาตื่น แล้วกด "ตื่น!" ลองตื่นในช่วงสีแดง (REM) ดู');
  }
  draw();
  return { unmount: () => { clearInterval(countdown); c.stop(); } };
}
