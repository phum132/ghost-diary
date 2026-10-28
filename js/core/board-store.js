// Evidence board state (localStorage) shared by every page
import { load, save } from './store.js';
import { toast, announce } from './ui.js';
import { thump } from './sfx.js';
import { url } from './content.js';

export const TAGS = [
  { id: 'unknown', label: 'ยังไม่รู้', icon: '?' },
  { id: 'ghost', label: 'ผีจริง?', icon: '👁' },
  { id: 'pareidolia', label: 'สมองเห็นหน้า', icon: '◉' },
  { id: 'sleep', label: 'ผีอำ / การนอน', icon: '☾' },
  { id: 'infrasound', label: 'เสียงความถี่ต่ำ', icon: '∿' },
  { id: 'co', label: 'ก๊าซ CO', icon: '☁' },
  { id: 'ideomotor', label: 'มือขยับเอง', icon: '✋' },
  { id: 'wisp', label: 'แก๊สหนองน้ำ', icon: '✦' },
  { id: 'coincidence', label: 'ความบังเอิญ', icon: '⚄' },
  { id: 'brocken', label: 'เงาในหมอก', icon: '◎' },
  { id: 'camera', label: 'กล้องหลอก', icon: '◐' },
  { id: 'eye', label: 'ตาล้า / ภาพติดตา', icon: '◑' },
  { id: 'echo', label: 'เสียงสะท้อน', icon: '⌇' },
  { id: 'draft', label: 'ลมและแรงดันอากาศ', icon: '≋' },
  { id: 'emf', label: 'ไฟฟ้าในบ้าน', icon: 'ϟ' },
  { id: 'resonance', label: 'การสั่นพ้อง', icon: '〰' },
  { id: 'mirage', label: 'ภาพลวงตาในอากาศ', icon: '◬' },
  { id: 'memory', label: 'ความจำเพี้ยน', icon: '✎' },
  { id: 'barnum', label: 'คำทำนายกว้างๆ', icon: '✧' },
  { id: 'cold', label: 'ความหนาว', icon: '❄' },
  { id: 'disease', label: 'โรคระบาด', icon: '✚' },
];

export function getBoard() {
  const b = load('board', null);
  return b && Array.isArray(b.cards) ? { links: [], ...b } : { cards: [], links: [] };
}
export function setBoard(b) { save('board', b); refreshCount(); }
export const boardCount = () => getBoard().cards.length;

export function refreshCount() {
  const n = boardCount();
  document.querySelectorAll('[data-board-count]').forEach((c) => { c.textContent = n; c.hidden = n === 0; });
}

// card: { kind: photo|audio|text|lab, ref, entry, day, title, text?, value? }
export function pin(card) {
  const b = getBoard();
  const key = `${card.kind}:${card.ref}`;
  if (b.cards.some((c) => `${c.kind}:${c.ref}` === key && c.kind !== 'lab')) {
    toast('ชิ้นนี้อยู่บนกระดานแล้ว', { label: 'ดูกระดาน', run: () => (location.href = url('board.html')) });
    return false;
  }
  const n = b.cards.length;
  b.cards.push({
    uid: Math.random().toString(36).slice(2, 9), tag: 'unknown', ts: Date.now(),
    x: 80 + (n % 6) * 240, y: 80 + Math.floor(n / 6) * 220, ...card,
  });
  setBoard(b);
  thump();
  announce(`ปักไว้ในกระดานแล้ว มีทั้งหมด ${b.cards.length} ชิ้น`);
  toast(`ปักไว้ในกระดานแล้ว (${b.cards.length})`, { label: 'ดูกระดาน', run: () => (location.href = url('board.html')) });
  return true;
}
