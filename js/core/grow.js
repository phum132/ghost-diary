// Free growth helpers: share buttons, support box (PromptPay QR / tip link) and opt-in analytics.
// Everything reads content/config.json and stays hidden until the owner fills it in.
import { el, toast } from './ui.js';
import { url, config } from './content.js';

const isHttp = (s) => /^https:\/\//i.test(s || '');

// the page link without owner-only preview params
function shareUrl() {
  const u = new URL(location.href);
  u.searchParams.delete('preview');
  u.searchParams.delete('date');
  return u.href;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย'); }
  catch { prompt('คัดลอกลิงก์นี้', text); }
}

export function shareBar() {
  const open = (base) => () => window.open(base + encodeURIComponent(shareUrl()), '_blank', 'noopener,width=600,height=560');
  const btn = (label, onclick, cls = '') => el('button', { type: 'button', class: 'btn small ' + cls, onclick }, label);
  return el('section', { class: 'share-bar', 'aria-label': 'แชร์หน้านี้' },
    el('p', { class: 'eyebrow' }, 'ชวนเพื่อนมาหลอนด้วยกัน'),
    el('div', { class: 'share-btns' },
      navigator.share ? btn('📤 แชร์', () => navigator.share({ title: document.title, url: shareUrl() }).catch(() => {}), 'primary') : null,
      btn('LINE', open('https://social-plugins.line.me/lineit/share?url=')),
      btn('Facebook', open('https://www.facebook.com/sharer/sharer.php?u=')),
      btn('X', () => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(document.title) + '&url=' + encodeURIComponent(shareUrl()), '_blank', 'noopener,width=600,height=560')),
      btn('🔗 คัดลอกลิงก์', () => copy(shareUrl()))));
}

export function supportBox(cfg) {
  const s = cfg.support || {};
  const qr = s.qr ? url(s.qr) : '';
  const link = isHttp(s.link) ? s.link : '';
  if (!qr && !link) return null;
  return el('section', { class: 'support-box', id: 'support', 'aria-label': 'สนับสนุนเว็บ' },
    el('div', { class: 'support-text' },
      el('p', { class: 'eyebrow' }, '🕯️ จุดธูปให้ SLUR'),
      el('p', {}, s.message || 'ชอบเรื่องผีที่นี่ไหม สนับสนุนให้เว็บมีเรื่องใหม่มาหลอนเรื่อยๆ'),
      link ? el('a', { class: 'btn small primary', href: link, target: '_blank', rel: 'noopener' }, s.linkLabel || 'สนับสนุน') : null),
    qr ? el('figure', { class: 'support-qr' },
      el('img', { src: qr, alt: 'QR พร้อมเพย์สำหรับสนับสนุนเว็บ', width: 160, height: 160, loading: 'lazy' }),
      el('figcaption', {}, 'สแกนด้วยแอปธนาคาร · ใส่เท่าไหร่ก็ได้')) : null);
}

export function startAnalytics(cfg, isPreview) {
  const a = cfg.analytics || {};
  if (isPreview || /^(localhost|127\.)/.test(location.hostname)) return; // don't count the owner
  if (/^[a-z0-9-]+$/i.test(a.goatcounter || '')) {
    document.head.append(el('script', { async: true, src: 'https://gc.zgo.at/count.js', 'data-goatcounter': `https://${a.goatcounter}.goatcounter.com/count` }));
  }
  if (/^[a-f0-9]{20,}$/i.test(a.cloudflareToken || '')) {
    document.head.append(el('script', { defer: true, src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': JSON.stringify({ token: a.cloudflareToken }) }));
  }
}

export async function grow(footerEl, isPreview) {
  const cfg = await config().catch(() => ({}));
  const box = supportBox(cfg);
  footerEl.before(...[shareBar(), box].filter(Boolean));
  if (box) footerEl.querySelector('[data-support-link]')?.removeAttribute('hidden');
  startAnalytics(cfg, isPreview);
}
