// Mini-app key: base64url(payload) + "." + base64url(HMAC_SHA256(secret, base64url(payload))).
// Pure apart from Web Crypto; the caller passes `now` (unix seconds). Mirrors the app's Cloud Function.

const MAX_KEY_LEN = 2048;
const MAX_TTL_S = 25 * 3600;
const B64URL = /^[A-Za-z0-9_-]+$/;
const enc = new TextEncoder();

export function b64urlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str) {
  if (!B64URL.test(str)) return null;
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  try {
    const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function hmacKey(secret, usage) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signKey(payload, secret) {
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), enc.encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** Returns {uid, name, trip, app, exp} when valid, otherwise null. No reason is ever exposed. */
export async function verifyKey(k, { secret, app, now }) {
  if (typeof k !== "string" || !secret || k.length > MAX_KEY_LEN) return null;
  const parts = k.split(".");
  if (parts.length !== 2) return null;
  const [body, sigStr] = parts;
  const sig = b64urlDecode(sigStr);
  if (!sig || !B64URL.test(body)) return null;

  // crypto.subtle.verify compares in constant time.
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sig, enc.encode(body));
  if (!ok) return null;

  const raw = b64urlDecode(body);
  if (!raw) return null;
  let p;
  try {
    p = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (!p || typeof p !== "object") return null;
  if (!Number.isInteger(p.exp) || p.exp <= now || p.exp > now + MAX_TTL_S) return null;
  if (p.app !== app) return null;
  for (const f of ["uid", "trip"]) if (typeof p[f] !== "string" || !p[f]) return null;
  return { uid: p.uid, name: typeof p.name === "string" ? p.name : "", trip: p.trip, app: p.app, exp: p.exp };
}
