// Badges, the courage meter and the share card. Everything stays in this browser (localStorage).
import { load, save, prefs } from './store.js';
import { toast } from './ui.js';

export const BADGES = [
  { id: 'first', icon: '🕯️', name: 'เปิดเรื่องแรก', how: 'อ่านเรื่องผีเรื่องแรก' },
  { id: 'read5', icon: '📖', name: 'นักอ่านกลางดึก', how: 'อ่านครบ 5 เรื่อง' },
  { id: 'read10', icon: '🗝️', name: 'กุญแจห้องลับ', how: 'อ่านครบ 10 เรื่อง (ปลดล็อกเรื่องลับ)' },
  { id: 'read25', icon: '💀', name: 'ไม่กลัวอะไรแล้ว', how: 'อ่านครบ 25 เรื่อง' },
  { id: 'read50', icon: '👑', name: 'ราชาแห่งความมืด', how: 'อ่านครบ 50 เรื่อง' },
  { id: 'world', icon: '🌏', name: 'รอบโลกผี', how: 'อ่านเรื่องจาก 8 ประเทศ' },
  { id: 'forum', icon: '💬', name: 'ขาประจำเว็บบอร์ด', how: 'อ่านกระทู้ 5 เรื่อง' },
  { id: 'thai', icon: '🏮', name: 'ผีไทยแท้', how: 'อ่านเรื่องผีไทย 5 เรื่อง' },
  { id: 'rate', icon: '⭐', name: 'นักวิจารณ์', how: 'ให้คะแนนความหลอน 5 เรื่อง' },
  { id: 'sound', icon: '🎧', name: 'กล้าฟัง', how: 'เปิดเสียงหลอน' },
  { id: 'scare', icon: '😱', name: 'สายโหด', how: 'เปิดโหมดโหด' },
  { id: 'torch', icon: '🔦', name: 'อ่านด้วยไฟฉาย', how: 'ใช้ไฟฉายอ่านเรื่อง' },
  { id: 'mirror', icon: '🪞', name: 'เรียกเธอแล้ว', how: 'เรียกบลัดดี้แมรี่หน้ากระจกครบสามครั้ง' },
  { id: 'stare', icon: '👁️', name: 'จ้องจนหน้าเปลี่ยน', how: 'ทำการทดลองจ้องกระจก 60 วินาทีจนจบ' },
  { id: 'radio', icon: '📻', name: 'ได้ยินเสียงจากอีกฝั่ง', how: 'ทำการทดลองวิทยุผีจนจบ' },
  { id: 'glass', icon: '🥃', name: 'ส่งวิญญาณกลับบ้าน', how: 'เล่นผีถ้วยแก้ว แล้วส่งกลับบ้านให้เรียบร้อย' },
  { id: 'fortune', icon: '🎋', name: 'เสี่ยงเซียมซีผี', how: 'เขย่าเซียมซีผีในห้องพิธี' },
  { id: 'idle', icon: '👤', name: 'มีคนยืนข้างหลัง', how: 'นั่งนิ่งๆ จนเห็นเงา' },
  { id: 'egg', icon: '🔮', name: 'เรียกชื่อผี', how: 'พิมพ์ชื่อผีบางตัว (ลองชื่อดังๆ ดู)' },
  { id: 'away', icon: '🚪', name: 'อย่าทิ้งฉันไว้', how: 'สลับแท็บหนีแล้วกลับมา' },
  { id: '3am', icon: '🌑', name: 'ตีสาม', how: 'เข้าเว็บช่วงตีสาม (ปลดล็อกเรื่องลับ)' },
];

export const badges = () => load('badges', {});
export const has = (id) => !!badges()[id];

export function award(id) {
  const got = badges();
  if (got[id]) return false;
  got[id] = Date.now();
  save('badges', got);
  const b = BADGES.find((x) => x.id === id);
  if (b) toast(`${b.icon} ได้เหรียญ "${b.name}"`, null, 5000);
  document.dispatchEvent(new CustomEvent('badge', { detail: id }));
  return true;
}

// call after a story is read or rated; `list` is content/stories/index.json
export function checkReading(list) {
  const read = load('storyRead', {});
  const r = list.filter((s) => read[s.id]);
  const n = r.length;
  [[1, 'first'], [5, 'read5'], [10, 'read10'], [25, 'read25'], [50, 'read50']].forEach(([k, id]) => { if (n >= k) award(id); });
  if (new Set(r.map((s) => s.cc)).size >= 8) award('world');
  if (r.filter((s) => s.type === 'forum').length >= 5) award('forum');
  if (r.filter((s) => s.cc === 'TH').length >= 5) award('thai');
  if (Object.keys(load('fear', {})).length >= 5) award('rate');
}

const LEVELS = [[0, 'ขวัญอ่อน'], [20, 'เริ่มกล้า'], [50, 'คนเดินกลางคืน'], [100, 'นักล่าผี'], [170, 'ผีกลัวคุณ']];
export function courage() {
  const read = Object.keys(load('storyRead', {})).length;
  const got = Object.keys(badges()).length;
  const score = read * 3 + got * 5 + (prefs().scare ? 10 : 0) + (prefs().sound ? 5 : 0);
  const lvl = LEVELS.filter(([k]) => score >= k).pop();
  const next = LEVELS.find(([k]) => k > score);
  return { score, read, got, title: lvl[1], next: next ? next[0] : null, pct: Math.min(100, Math.round(score / 2.2)) };
}

// 1080x1350 share card drawn on a canvas
export function shareCard(name) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#120405'); bg.addColorStop(1, '#3a0808');
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
  const v = g.createRadialGradient(540, 600, 200, 540, 600, 900); v.addColorStop(0, 'rgba(255,59,47,.12)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = v; g.fillRect(0, 0, 1080, 1350);
  g.strokeStyle = 'rgba(255,59,47,.6)'; g.lineWidth = 4; g.strokeRect(40, 40, 1000, 1270);
  const c0 = courage();
  g.textAlign = 'center'; g.fillStyle = '#ff6b5f';
  g.font = '600 34px "Chakra Petch", "IBM Plex Mono", sans-serif'; g.fillText('CASE 407 · ใบประกาศความกล้า', 540, 130);
  g.fillStyle = '#f3e9e2'; g.font = '800 92px "Kanit", sans-serif';
  g.fillText((name || 'ผู้กล้านิรนาม').slice(0, 18), 540, 270);
  g.font = '500 44px "Kanit", sans-serif'; g.fillStyle = '#ffb3ab'; g.fillText(`ระดับ: ${c0.title}`, 540, 350);
  // meter
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(140, 400, 800, 34);
  g.fillStyle = '#ff3b2f'; g.fillRect(140, 400, 8 * c0.pct, 34);
  g.fillStyle = '#f3e9e2'; g.font = '500 36px "Kanit", sans-serif';
  g.fillText(`อ่านไปแล้ว ${c0.read} เรื่อง · เหรียญ ${c0.got}/${BADGES.length} · คะแนน ${c0.score}`, 540, 500);
  const got = badges();
  BADGES.forEach((b, i) => {
    const x = 540 + ((i % 7) - 3) * 132, y = 620 + Math.floor(i / 7) * 190;
    g.globalAlpha = got[b.id] ? 1 : 0.18;
    g.font = '68px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'; g.fillText(b.icon, x, y);
    const label = got[b.id] ? b.name : '???';
    let px = 22;
    do g.font = `400 ${px}px "Kanit", sans-serif`; while (g.measureText(label).width > 124 && --px > 14);
    g.fillStyle = '#f3e9e2'; g.fillText(label, x, y + 44);
    g.globalAlpha = 1;
  });
  g.fillStyle = '#ff6b5f'; g.font = '600 36px "Chakra Petch", sans-serif';
  g.fillText('phum132.github.io/ghost-diary', 540, 1230);
  g.fillStyle = 'rgba(243,233,226,.6)'; g.font = '400 26px "Kanit", sans-serif'; g.fillText('ไดอารี่คนเห็นผี · SLUR', 540, 1275);
  return c;
}
