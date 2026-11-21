// 보상경매 물건 금고: 비밀번호에서 키를 만들어(PBKDF2-SHA256) AES-GCM으로 암호화한다.
// 배포본에는 암호문(vault.json)만 들어간다. 비밀번호가 곧 열쇠라 짧으면 대입 공격에 약하다.
export const ITERATIONS = 600000;
export const MIN_PASSWORD = 10;

const enc = new TextEncoder();
const b64 = (u8) => (typeof Buffer !== 'undefined' ? Buffer.from(u8).toString('base64') : btoa(String.fromCharCode(...u8)));
const unb64 = (s) => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

async function keyFrom(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(data, password, { iterations = ITERATIONS } = {}) {
  if (String(password || '').length < MIN_PASSWORD) throw new Error(`비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(password, salt, iterations);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data))));
  return { v: 1, kdf: 'PBKDF2-SHA256', iterations, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

/** 비밀번호가 틀리면 null */
export async function open(vault, password) {
  try {
    const key = await keyFrom(password, unb64(vault.salt), vault.iterations);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, key, unb64(vault.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch { return null; }
}
