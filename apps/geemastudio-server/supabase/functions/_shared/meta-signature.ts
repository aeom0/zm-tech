// meta-signature.ts — Firma de los webhooks de Meta (X-Hub-Signature-256).
//
// Meta firma el body crudo con HMAC-SHA256 y el App Secret de la app:
// `sha256=<hex>`. Se valida antes de parsear el JSON.

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparación en tiempo constante para strings de igual largo. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signMetaBody(
  rawBody: string,
  appSecret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return `sha256=${toHex(sig)}`;
}

/** False si falta el header, el secret o la firma no coincide. */
export async function isValidMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
): Promise<boolean> {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = await signMetaBody(rawBody, appSecret);
  return timingSafeEqual(expected, signatureHeader.trim().toLowerCase());
}
