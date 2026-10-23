// Password-locked entries: PBKDF2-SHA256 -> AES-GCM (Web Crypto). Also runs in Node 20+.
const te = new TextEncoder();
const td = new TextDecoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Same answer however the reader types it: spaces, case, Thai digits
export function normalizeKey(s) {
  return String(s).normalize('NFC').replace(/\s+/g, '').toLowerCase()
    .replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0E50));
}

async function derive(pass, salt, iter) {
  const km = await crypto.subtle.importKey('raw', te.encode(normalizeKey(pass)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, km,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encrypt(text, pass, iter = 200000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(pass, salt, iter);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(text));
  return { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

// Throws when the password is wrong (GCM auth fails) — no hash of the answer is stored anywhere
export async function decrypt(obj, pass) {
  const key = await derive(pass, unb64(obj.salt), obj.iter);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.ct));
  return td.decode(pt);
}

export async function sha256hex(s) {
  const h = await crypto.subtle.digest('SHA-256', te.encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
