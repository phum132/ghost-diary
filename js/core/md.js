// Tiny Markdown + shortcode renderer that builds DOM nodes (never innerHTML)
import { el } from './ui.js';

export function parseFront(src) {
  const meta = {};
  let body = src.replace(/^﻿/, '');
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    body = body.slice(m[0].length);
  }
  return { meta, body };
}

const BLOCK = /^\[\[(photo|audio|lab|draw):([\w-]+)\]\]$/;
const INLINE = /\[\[(note|uv|scratch):([^\]]*)\]\]|\[\[shaky\]\]([\s\S]*?)\[\[\/shaky\]\]|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;

// hooks.block(type, id) -> Node ; hooks.note(phrase, question, tool, n) -> Node ; hooks.uv(text) -> Node
export function render(body, hooks, idPrefix) {
  const frag = document.createDocumentFragment();
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let p = 0;
  let notes = 0;
  for (const b of blocks) {
    const bm = b.match(BLOCK);
    if (bm) { frag.append(hooks.block(bm[1], bm[2])); continue; }
    if (/^#{1,3} /.test(b)) {
      const lvl = b.match(/^#+/)[0].length + 1;
      frag.append(el('h' + Math.min(lvl, 4), { class: 'paper-h' }, inline(b.replace(/^#+ /, ''))));
      continue;
    }
    if (/^---+$/.test(b)) { frag.append(el('hr', { class: 'paper-hr' })); continue; }
    const para = el('p', { id: `${idPrefix}-p${++p}`, class: 'para' });
    para.append(inline(b));
    frag.append(para);
  }
  return frag;

  function inline(text) {
    const f = document.createDocumentFragment();
    let last = 0;
    INLINE.lastIndex = 0;
    for (let m; (m = INLINE.exec(text));) {
      f.append(lines(text.slice(last, m.index)));
      if (m[1] === 'note') {
        const [phrase, q = '', tool = ''] = m[2].split('|');
        f.append(hooks.note(phrase, q, tool, ++notes));
      } else if (m[1] === 'uv') f.append(hooks.uv(m[2]));
      else if (m[1] === 'scratch') f.append(el('s', { class: 'scratch', 'aria-label': 'ข้อความที่ถูกขีดฆ่า: ' + m[2] }, m[2]));
      else if (m[3] != null) f.append(hooks.shaky(m[3]));
      else if (m[4] != null) f.append(el('strong', {}, m[4]));
      else if (m[5] != null) f.append(el('em', {}, m[5]));
      last = INLINE.lastIndex;
    }
    f.append(lines(text.slice(last)));
    return f;
  }
  function lines(t) {
    const f = document.createDocumentFragment();
    t.split('\n').forEach((s, i) => { if (i) f.append(el('br')); if (s) f.append(s); });
    return f;
  }
}
