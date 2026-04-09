/**
 * HMAC-SHA256 signed role cache for middleware.
 * Caches the user's role in a cookie to avoid querying the profiles table on every request.
 * Compatible with Edge Runtime (uses crypto.subtle).
 *
 * Next.js の型に依存しないよう、汎用インターフェースで定義。
 */

const ROLE_COOKIE = "hr1-role-cache";
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined };
}

interface CookieWriter {
  cookies: {
    set(name: string, value: string, options?: Record<string, unknown>): void;
    delete(name: string): void;
  };
}

function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("HMAC_SECRET environment variable is required in production");
    }
    // 非本番のみ anon key をフォールバックとして許可
    const fallback = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!fallback) throw new Error("HMAC_SECRET is required");
    return fallback;
  }
  return secret;
}

async function getHmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getHmacSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

async function sign(payload: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const key = await getHmacKey("sign");
  return crypto.subtle.sign("HMAC", key, encoder.encode(payload));
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/** Constant-time HMAC verification via crypto.subtle.verify */
async function verify(payload: string, signatureB64: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await getHmacKey("verify");
    const binary = atob(signatureB64);
    const sigBytes = new ArrayBuffer(binary.length);
    const view = new Uint8Array(sigBytes);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
  } catch {
    return false;
  }
}

/**
 * Try to read a valid cached role from the cookie.
 * Returns the role string if cache is valid, null otherwise.
 */
export async function getCachedRole(
  request: CookieReader,
  userId: string
): Promise<string | null> {
  const raw = request.cookies.get(ROLE_COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const isValid = await verify(payloadB64, sig);
  if (!isValid) return null;

  try {
    const payload = JSON.parse(atob(payloadB64));
    if (payload.uid !== userId || Date.now() - payload.ts > ROLE_CACHE_TTL) {
      return null;
    }
    return payload.role;
  } catch {
    return null;
  }
}

/**
 * Set the role cache cookie on the response.
 */
export async function setCachedRole(
  response: CookieWriter,
  userId: string,
  role: string
): Promise<void> {
  const payload = { uid: userId, role, ts: Date.now() };
  const payloadB64 = btoa(JSON.stringify(payload));
  const sig = toBase64(await sign(payloadB64));

  response.cookies.set(ROLE_COOKIE, `${payloadB64}.${sig}`, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
  });
}

/**
 * Clear the role cache cookie (call on sign-out).
 */
export function clearCachedRole(response: CookieWriter): void {
  response.cookies.delete(ROLE_COOKIE);
}
