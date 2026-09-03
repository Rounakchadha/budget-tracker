// Signed session token for the single-user password gate. Uses Web Crypto
// (available in both the Edge middleware runtime and Node) rather than
// Node's `crypto` module, so the same code works in middleware.ts.

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE_NAME = "budget_tracker_session";

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Buffer.from(signature).toString("hex");
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiry = Date.now() + SESSION_TTL_MS;
  const signature = await hmac(secret, String(expiry));
  return `${expiry}.${signature}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [expiryStr, signature] = token.split(".");
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const expectedSignature = await hmac(secret, expiryStr);
  return signature === expectedSignature;
}
