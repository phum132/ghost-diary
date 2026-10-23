import { boot } from '../core/boot.js';
import { config, url, preview } from '../core/content.js';
import { el, svg, toast, announce } from '../core/ui.js';
import { getBoard, setBoard, TAGS } from '../core/board-store.js';
import { isRead } from '../core/store.js';

boot('board');
const root = document.getElementById('board-root');
const tagOf = (id) => TAGS.find((t) => t.id === id) || TAGS[0];
let shared = null; // board decoded from a shared link (read-only until copied)
let linking = null, linkMode = false;

// ---- share links: #s=<deflate-raw + base64url>, or #s=j<base64> when CompressionStream is missing ----
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function encode(b) {
  const slim = { c: b.cards.map(({ kind, ref, entry, day, title, text, value, tag, x, y, thumb, uid, tool }) => ({ kind, ref, entry, day, title, text, value, tag, x, y, thumb, uid, tool })), l: b.links };
  const bytes = new TextEncoder().encode(JSON.stringify(slim));
  if ('CompressionStream' in window) {
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return b64u(new Uint8Array(out));
  }
  return 'j' + b64u(bytes);
}
async function decode(s) {
  let bytes;
  if (s.startsWith('j')) bytes = unb64u(s.slice(1));
  else bytes = new Uint8Array(await new Response(new Blob([unb64u(s)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  const o = JSON.parse(new TextDecoder().decode(bytes));
  // a shared link is someone else's data: keep only plain values and local asset paths
  const str = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const cards = (Array.isArray(o.c) ? o.c : []).slice(0, 200).map((c) => ({
    kind: ['photo', 'audio', 'text', 'lab'].includes(c.kind) ? c.kind : 'text',
    ref: str(c.ref, 80), uid: str(c.uid, 16) || Math.random().toString(36).slice(2, 9),
    entry: /^\d{3}$/.test(c.entry) ? c.entry : null, day: Number.isFinite(c.day) ? c.day : null,
    title: str(c.title), text: str(c.text), value: str(c.value),
    tag: TAGS.some((t) => t.id === c.tag) ? c.tag : 'unknown',
    x: Math.max(0, Math.min(2200, +c.x || 0)), y: Math.max(0, Math.min(1500, +c.y || 0)),
    thumb: /^assets\/[\w./-]+$/.test(c.thumb || '') && !c.thumb.includes('..') ? c.thumb : undefined,
    tool: /^[a-z-]{2,20}$/.test(c.tool || '') ? c.tool : undefined,
  }));
  const links = (Array.isArray(o.l) ? o.l : []).slice(0, 400).map((l) => ({ a: str(l.a, 16), b: str(l.b, 16), solid: !!l.solid }));
  return { cards, links };
}

const current = () => shared || getBoard();
function save(b) { if (!shared) setBoard(b); }

function needle(b) {
  // each card the reader tagged as "real ghost" counts x2, any science explanation x0.5 (start at 50/50)
  let odds = 1;
  for (const c of b.cards) odds *= c.tag === 'ghost' ? 2 : c.tag === 'unknown' ? 1 : 0.5;
  const p = odds / (1 + odds);
  return el('section', { class: 'hud needle', 'aria-labelledby': 'needle-t' },
    el('div', { class: 'row', style: { justifyContent: 'space-between' } },
      el('h2', { id: 'needle-t', style: { margin: 0, fontSize: '1.1rem' } }, 'เข็มของฉัน: ผีจริงกี่ %'),
      el('span', { class: 'val' }, `${Math.round(p * 100)}%`)),
    el('div', { class: 'bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(p * 100)), 'aria-label': 'ความเชื่อว่าผีจริง' },
      el('span', { class: 'pin', style: { left: `${p * 100}%` } })),
    el('div', { class: 'scale' }, el('span', {}, '0% วิทยาศาสตร์อธิบายได้หมด'), el('span', {}, '100% ผีจริง')),
    el('p', { class: 'faint', style: { margin: '8px 0 0' } }, 'นี่คือเข็มของคุณเอง ไม่ใช่เฉลย · คิดจากแท็กของการ์ด: "ผีจริง?" ×2, คำอธิบายทางวิทยาศาสตร์ ×0.5 · ',
      el('a', { href: url('lab.html?tool=bayes') }, 'ดูว่าคิดยังไง')));
}

function cardEl(c, b, i, spoil) {
  const t = tagOf(c.tag);
  const body = c.kind === 'photo' ? el('img', { src: url(c.thumb || ''), alt: c.title || '' })
    : c.kind === 'text' ? el('div', { class: 'note' }, c.text || '')
      : c.kind === 'lab' ? el('div', { class: 'lab' }, c.value || '')
        : el('div', { class: 'lab' }, `🎧 ${c.value || ''}`);
  const sel = el('select', { 'aria-label': 'แท็กสมมติฐาน', disabled: !!shared },
    ...TAGS.map((x) => el('option', { value: x.id, selected: x.id === c.tag }, `${x.icon} ${x.label}`)));
  sel.addEventListener('change', () => { const bb = current(); bb.cards[i].tag = sel.value; save(bb); render(); });
  const del = el('button', { type: 'button', hidden: !!shared, onclick: () => removeCard(i) }, 'ลบ');
  const open = c.entry ? el('a', { href: url(`entry.html?id=${c.entry}`), class: 'faint', style: { fontSize: '.8rem' } }, `วันที่ ${+c.entry}`)
    : c.tool ? el('a', { href: url(`lab.html?tool=${c.tool}`), class: 'faint', style: { fontSize: '.8rem' } }, 'แล็บ') : '';
  const node = el('article', {
    class: 'card' + (spoil ? ' blur' : ''), tabindex: '0', 'data-i': i,
    'aria-label': `${c.title || ''} แท็ก ${t.label}`,
    style: { left: `${c.x || 0}px`, top: `${c.y || 0}px` },
  },
  el('div', { class: 'k' }, el('span', {}, `${t.icon} ${t.label}`), open),
  el('div', { class: 't' }, c.title || ''), body, sel, el('div', { class: 'row' }, del),
  spoil ? el('div', { class: 'spoil' }, `หลักฐานจากบันทึกวันที่ ${+c.entry} (คุณยังไม่ได้อ่าน) `,
    el('button', { type: 'button', class: 'btn small', onclick: (e) => { e.currentTarget.closest('.card').classList.remove('blur'); } }, 'ดูอยู่ดี')) : null);
  return node;
}

function removeCard(i) {
  const b = current(); const [gone] = b.cards.splice(i, 1);
  b.links = b.links.filter((l) => l.a !== gone.uid && l.b !== gone.uid);
  save(b); render();
  toast('ลบการ์ดแล้ว', { label: 'เลิกทำ', run: () => { const bb = current(); bb.cards.splice(i, 0, gone); save(bb); render(); } }, 5000);
}

function desktop(b) {
  const surface = el('div', { class: 'surface' });
  const linksSvg = svg('svg', { class: 'links', 'aria-hidden': 'true' });
  surface.append(linksSvg);
  const spoilers = new Set();
  b.cards.forEach((c, i) => {
    const spoil = !!shared && c.entry && !isRead(c.entry);
    if (spoil) spoilers.add(i);
    const n = cardEl(c, b, i, spoil);
    surface.append(n);
    // drag
    let start = null;
    n.addEventListener('pointerdown', (e) => {
      if (e.target.closest('select,button,a') || shared) return;
      if (linkMode) { handleLink(c.uid); return; }
      start = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y }; n.setPointerCapture(e.pointerId); n.style.cursor = 'grabbing';
    });
    n.addEventListener('pointermove', (e) => {
      if (!start) return;
      c.x = Math.max(0, Math.min(2400 - 210, start.cx + e.clientX - start.x)); c.y = Math.max(0, Math.min(1600 - 120, start.cy + e.clientY - start.y));
      n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; drawLinks();
    });
    n.addEventListener('pointerup', () => { if (start) { start = null; n.style.cursor = ''; save(b); } });
    n.addEventListener('keydown', (e) => {
      if (shared || e.target !== n) return;
      const d = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
      if (d) { c.x = Math.max(0, c.x + d[0]); c.y = Math.max(0, c.y + d[1]); n.style.left = c.x + 'px'; n.style.top = c.y + 'px'; drawLinks(); save(b); e.preventDefault(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { removeCard(i); e.preventDefault(); }
      if (e.key === 'Enter' && linkMode) handleLink(c.uid);
    });
  });
  function drawLinks() {
    linksSvg.replaceChildren();
    for (const l of b.links) {
      const A = b.cards.find((c) => c.uid === l.a), B = b.cards.find((c) => c.uid === l.b);
      if (!A || !B) continue;
      linksSvg.append(svg('line', { x1: A.x + 105, y1: A.y + 60, x2: B.x + 105, y2: B.y + 60, stroke: '#f2f5f7', 'stroke-width': 2, 'stroke-dasharray': l.solid ? null : '7 6', opacity: 0.8 }));
    }
  }
  function handleLink(uid) {
    if (!linking) { linking = uid; surface.querySelectorAll('.card').forEach((n, k) => n.classList.toggle('linking', b.cards[k].uid === uid)); announce('เลือกการ์ดใบที่สองเพื่อโยงเส้น'); return; }
    if (linking !== uid) {
      const k = b.links.findIndex((l) => (l.a === linking && l.b === uid) || (l.a === uid && l.b === linking));
      if (k < 0) b.links.push({ a: linking, b: uid, solid: false });
      else if (!b.links[k].solid) b.links[k].solid = true;
      else b.links.splice(k, 1);
      save(b);
    }
    linking = null;
    surface.querySelectorAll('.card').forEach((n) => n.classList.remove('linking'));
    drawLinks();
  }
  drawLinks();
  return el('div', { class: 'canvas-wrap', 'aria-label': 'กระดานแบบลากวาง' }, surface);
}

function list(b) {
  const groups = TAGS.map((t) => ({ t, items: b.cards.map((c, i) => [c, i]).filter(([c]) => (c.tag || 'unknown') === t.id) })).filter((g) => g.items.length);
  return el('div', { class: 'list-view' }, ...groups.map((g) => el('section', {},
    el('h2', {}, el('span', { 'aria-hidden': 'true' }, g.t.icon), g.t.label, el('span', { class: 'count' }, g.items.length)),
    el('div', { class: 'cards' }, ...g.items.map(([c, i]) => {
      const n = cardEl(c, b, i, !!shared && c.entry && !isRead(c.entry));
      const links = b.links.filter((l) => l.a === c.uid || l.b === c.uid).length;
      if (links) n.append(el('p', { class: 'faint', style: { margin: '6px 0 0', fontSize: '.8rem' } }, `โยงไว้ ${links} เส้น`));
      return n;
    })))));
}

async function share() {
  const s = await encode(getBoard());
  const link = `${location.origin}${location.pathname}#s=${s}`;
  try { await navigator.clipboard.writeText(link); toast('คัดลอกลิงก์กระดานแล้ว วางในห้องสืบสวนหรือแชตได้เลย'); }
  catch { prompt('คัดลอกลิงก์นี้', link); }
}

function exportPng(b) {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0405'; g.fillRect(0, 0, 1600, 900);
  g.strokeStyle = 'rgba(255,59,47,.08)'; for (let x = 0; x < 1600; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 900); g.stroke(); } for (let y = 0; y < 900; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1600, y); g.stroke(); }
  g.fillStyle = '#ff3b2f'; g.font = '600 28px "Chakra Petch", sans-serif'; g.fillText('CASE 407 · กระดานหลักฐาน', 40, 60);
  const cols = 5, w = 290, h = 150;
  b.cards.slice(0, 20).forEach((card, i) => {
    const x = 40 + (i % cols) * (w + 16), y = 100 + Math.floor(i / cols) * (h + 16);
    g.fillStyle = '#140809'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,59,47,.4)'; g.strokeRect(x, y, w, h);
    const t = tagOf(card.tag);
    g.fillStyle = '#ff6a3d'; g.font = '16px "IBM Plex Sans Thai", sans-serif'; g.fillText(`${t.icon} ${t.label}`, x + 12, y + 28);
    g.fillStyle = '#f3e9e2'; g.font = '18px "IBM Plex Sans Thai", sans-serif';
    wrap(g, card.title || '', x + 12, y + 60, w - 24, 24, 2);
    g.fillStyle = '#bfaba4'; g.font = '14px "IBM Plex Mono", monospace'; wrap(g, card.value || card.text || '', x + 12, y + 112, w - 24, 18, 2);
  });
  c.toBlob((blob) => download(blob, 'case-407-board.png'));
}
function wrap(g, text, x, y, maxW, lh, lines) {
  let line = '', n = 0;
  for (const ch of text) { if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, y + n * lh); line = ch; if (++n >= lines) return; } else line += ch; }
  g.fillText(line, x, y + n * lh);
}
function download(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function render() {
  const b = current();
  const tools = el('div', { class: 'board-tools' });
  if (!shared) {
    const linkBtn = el('button', { class: 'btn small', type: 'button', 'aria-pressed': String(linkMode) }, linkMode ? '✓ โหมดโยงเส้น (คลิกการ์ด A แล้ว B)' : '〰 โยงเส้น');
    linkBtn.addEventListener('click', () => { linkMode = !linkMode; linking = null; render(); });
    const fileIn = el('input', { type: 'file', accept: 'application/json', hidden: true });
    fileIn.addEventListener('change', async () => {
      try {
        const o = JSON.parse(await fileIn.files[0].text());
        if (!Array.isArray(o.cards)) throw new Error('bad');
        setBoard({ cards: o.cards.slice(0, 200), links: Array.isArray(o.links) ? o.links : [] }); render(); toast('นำเข้ากระดานแล้ว');
      } catch { toast('ไฟล์นี้ไม่ใช่กระดานที่ส่งออกจากเว็บนี้'); }
    });
    tools.append(
      matchMedia('(min-width: 1024px) and (pointer: fine)').matches ? linkBtn : '',
      el('button', { class: 'btn small', type: 'button', onclick: share, disabled: !b.cards.length }, '🔗 คัดลอกลิงก์กระดาน'),
      el('button', { class: 'btn small', type: 'button', onclick: () => exportPng(b), disabled: !b.cards.length }, '🖼 บันทึกเป็นรูป'),
      el('button', { class: 'btn small', type: 'button', onclick: () => download(new Blob([JSON.stringify(getBoard(), null, 1)], { type: 'application/json' }), 'case-407-board.json'), disabled: !b.cards.length }, '⤓ สำรอง JSON'),
      el('button', { class: 'btn small', type: 'button', onclick: () => fileIn.click() }, '⤒ นำเข้า JSON'), fileIn);
  }
  const head = shared ? el('div', { class: 'shared-bar', role: 'status' },
    el('span', {}, 'กำลังดูกระดานของคนอื่น (อ่านอย่างเดียว)'),
    el('span', { class: 'row' },
      el('button', { class: 'btn small', type: 'button', onclick: () => { setBoard(shared); shared = null; history.replaceState(null, '', location.pathname); render(); toast('คัดลอกมาเป็นกระดานของคุณแล้ว'); } }, 'คัดลอกมาเป็นของฉัน'),
      el('button', { class: 'btn small', type: 'button', onclick: () => { shared = null; history.replaceState(null, '', location.pathname); render(); } }, 'กลับไปกระดานของฉัน'))) : null;
  const body = b.cards.length ? [desktop(b), list(b)] : [el('div', { class: 'hud empty' },
    el('h2', {}, 'ยังไม่มีหลักฐานบนกระดาน'),
    el('p', { class: 'dim' }, 'เปิดบันทึก กด "วิเคราะห์" แล้วแตะ 📌 ที่รูป เสียง หรือย่อหน้า หรือกด "ปักผลนี้" ในแล็บ'),
    el('a', { class: 'btn primary', href: url('index.html#toc') }, 'ไปอ่านบันทึก'))];
  root.replaceChildren(...[head, needle(b), tools, ...body, theories()].filter(Boolean));
}

let cfg = null;
function theories() {
  const g = cfg?.giscus || {};
  if (!(g.repo && g.repoId && g.categoryId)) return preview() ? el('p', { class: 'mono faint theories' }, '(พรีวิว) ยังไม่ได้ตั้งค่า giscus — ห้องทฤษฎีรวมจะโผล่ตรงนี้') : null;
  const box = el('section', { class: 'hud theories' }, el('h2', {}, 'ห้องทฤษฎีรวม'), el('p', { class: 'dim' }, 'ทฤษฎีที่โยงหลายวันเข้าด้วยกัน แปะลิงก์กระดานของคุณได้ที่นี่ (ระวังสปอยล์)'));
  const btn = el('button', { class: 'btn', type: 'button' }, 'เข้าห้องทฤษฎี');
  btn.addEventListener('click', () => {
    btn.remove();
    const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
    box.append(el('div', { class: 'giscus' }), el('script', {
      src: 'https://giscus.app/client.js', 'data-repo': g.repo, 'data-repo-id': g.repoId, 'data-category': g.category, 'data-category-id': g.categoryId,
      'data-mapping': 'specific', 'data-term': 'theories', 'data-strict': '1', 'data-reactions-enabled': '1', 'data-input-position': 'top',
      'data-theme': local ? 'dark' : url('css/giscus-theme.css'), 'data-lang': 'th', crossorigin: 'anonymous', async: true,
    }));
  });
  box.append(btn);
  return box;
}

(async () => {
  cfg = await config().catch(() => null);
  const m = location.hash.match(/^#s=([\w-]+)/);
  if (m) {
    try { shared = await decode(m[1]); } catch { toast('ลิงก์กระดานนี้เสียหรือไม่ครบ'); }
  }
  render();
})();
