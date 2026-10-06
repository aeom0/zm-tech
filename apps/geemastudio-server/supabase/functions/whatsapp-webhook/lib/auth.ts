// auth.ts — Validación del webhook Meta (GET verify, POST body)

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN")!;

export interface VerifyResult {
  ok: true;
  challenge: string;
}

/**
 * Valida la petición GET de verificación de Meta.
 * Devuelve el challenge si mode=subscribe y token coincide; si no, null.
 */
export function validateGetVerify(req: Request): VerifyResult | null {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return { ok: true, challenge };
  }
  return null;
}

/**
 * Parsea el body POST y comprueba que sea un objeto.
 * Devuelve el body o null si no es JSON válido.
 */
export async function parsePostBody(
  req: Request,
): Promise<Record<string, unknown> | null> {
  if (req.method !== "POST") return null;
  try {
    const body = await req.json();
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Indica si el body corresponde al formato estándar de WhatsApp Business.
 */
export function isWhatsAppPayload(body: Record<string, unknown>): boolean {
  return body.object === "whatsapp_business_account";
}
