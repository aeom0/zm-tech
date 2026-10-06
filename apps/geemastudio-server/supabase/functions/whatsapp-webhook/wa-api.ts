// wa-api.ts — WhatsApp API helpers
import { formatCatalogBulletNewlines } from "./format.ts";
import { logOutMessage } from "./lib/message-logger.ts";
import { extractMetaWamid } from "./lib/reply-context.ts";
import { getSupabase } from "./lib/supabase.ts";
import { getRequestTenantId } from "./lib/tenant.ts";
import { metaRecipientFields } from "./lib/wa-recipient.mjs";

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

/** Función de logging inyectada desde index.ts para registrar mensajes salientes. */
export type OutLogger = (
  to: string,
  content: string,
  msg_type?: string,
) => void;

export function getWAConfig() {
  return {
    phoneNumberId: Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!,
    accessToken: Deno.env.get("WHATSAPP_ACCESS_TOKEN")!,
  };
}

/**
 * Meta cachea por URL al traer `image.link`. Mismo path en Storage (p. ej.
 * meta-ads-hero.jpg) mostraba bytes viejos en WhatsApp aunque el archivo ya se hubiera reemplazado.
 */
export function withWhatsAppImageLinkCacheBust(link: string): string {
  const u = link.trim();
  if (!u) return u;
  if (u.startsWith("data:")) return u;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}wa_cb=${Date.now()}`;
}

/** Debounce DUP_ECHO: mismo teléfono + mismo texto en ~20s → skip (anti eco ráfaga). */
const SEND_DEBOUNCE_MS = 20_000;
/** Listas interactivas: ventana BD (sobrevive isolate frío) — análisis 05-ago [P3]. */
const LIST_DEBOUNCE_SECONDS = 30;
const recentSendByKey = new Map<string, number>();

function hashSendBody(body: string): string {
  // FNV-1a 32-bit — suficiente para debounce; sin crypto deps
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function shouldSkipDuplicateSend(to: string, body: string): boolean {
  const key = `${to}|${hashSendBody(body)}`;
  const now = Date.now();
  const prev = recentSendByKey.get(key);
  if (prev != null && now - prev < SEND_DEBOUNCE_MS) {
    console.log(
      "[WABA] sendMessage debounce skip:",
      to.slice(-4),
      body.slice(0, 40),
    );
    return true;
  }
  recentSendByKey.set(key, now);
  // Evitar crecimiento infinito en isolate caliente
  if (recentSendByKey.size > 500) {
    const cutoff = now - SEND_DEBOUNCE_MS;
    for (const [k, t] of recentSendByKey) {
      if (t < cutoff) recentSendByKey.delete(k);
    }
  }
  return false;
}

/**
 * Claim BD 1×/(phone, list_title) en ~30s. El Map en memoria no sobrevive
 * cold start ni aísla dos flujos paralelos en isolates distintos (…8367).
 */
async function claimInteractiveListSend(
  to: string,
  header: string,
): Promise<boolean> {
  const titleKey = header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .slice(0, 40);
  const kind = `list:${hashSendBody(titleKey || "empty")}`;
  try {
    const { data, error } = await getSupabase().rpc(
      "waba_claim_action_debounce",
      {
        p_phone: to,
        p_kind: kind,
        p_window_seconds: LIST_DEBOUNCE_SECONDS,
        p_tenant_id: getRequestTenantId(),
      },
    );
    if (error) {
      console.error("[WABA] claimInteractiveListSend RPC:", error.message);
      // Fail-open: si el RPC falla, dejar pasar (el Map en memoria sigue).
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[WABA] claimInteractiveListSend:", e);
    return true;
  }
}

/**
 * Texto plano: claim BD, mismo problema cross-isolate que las listas
 * (Angie …5108, 15-ago: "Dónde queda su salón?" + mensaje previo llegaron
 * ~3s aparte, cada uno en su propio isolate con su propio Map en memoria —
 * el dedupe in-memory de shouldSkipDuplicateSend no los vio como duplicados
 * y la ubicación salió 2 veces seguidas).
 */
async function claimTextSend(to: string, body: string): Promise<boolean> {
  const kind = `text:${hashSendBody(body)}`;
  try {
    const { data, error } = await getSupabase().rpc(
      "waba_claim_action_debounce",
      {
        p_phone: to,
        p_kind: kind,
        p_window_seconds: Math.floor(SEND_DEBOUNCE_MS / 1000),
        p_tenant_id: getRequestTenantId(),
      },
    );
    if (error) {
      console.error("[WABA] claimTextSend RPC:", error.message);
      return true; // fail-open: si el RPC falla, no bloquear el envío
    }
    return data === true;
  } catch (e) {
    console.error("[WABA] claimTextSend:", e);
    return true;
  }
}

export async function sendMessage(to: string, body: string, log?: OutLogger) {
  const text = formatCatalogBulletNewlines(body);
  if (shouldSkipDuplicateSend(to, text)) return;
  if (!(await claimTextSend(to, text))) {
    console.log(
      "[WABA] sendMessage BD debounce skip (cross-isolate):",
      to.slice(-4),
      text.slice(0, 40),
    );
    return;
  }
  const { phoneNumberId, accessToken } = getWAConfig();
  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...metaRecipientFields(to),
      type: "text",
      text: { body: text },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errText =
      data != null ? JSON.stringify(data).slice(0, 300) : "unknown";
    console.error("[WABA] WhatsApp API sendMessage:", res.status, errText);
    throw new Error(`WhatsApp API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const wamid = extractMetaWamid(data);
  log?.(to, text, "text");
  await logOutMessage(to, text, "text", undefined, "bot", wamid);
}

/**
 * Indicador "escribiendo…" (dura ~25s o hasta el próximo mensaje del bot) +
 * marca el inbound como leído. Requiere el wamid del mensaje que se responde.
 * Análisis 09-sep [entrada Ads]: el saludo + lista CTWA llegaban <1s aparte —
 * sensación de bombardeo automático que hacía que la clienta no respondiera más.
 */
export async function sendTypingIndicator(messageId: string): Promise<void> {
  const { phoneNumberId, accessToken } = getWAConfig();
  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
      typing_indicator: { type: "text" },
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    console.error(
      "[WABA] sendTypingIndicator failed:",
      res.status,
      data != null ? JSON.stringify(data).slice(0, 200) : "unknown",
    );
  }
}

export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string,
  log?: OutLogger,
) {
  const { phoneNumberId, accessToken } = getWAConfig();
  const link = withWhatsAppImageLinkCacheBust(imageUrl);
  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...metaRecipientFields(to),
      type: "image",
      image: {
        link,
        ...(caption ? { caption: caption.slice(0, 1024) } : {}),
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errText =
      data != null ? JSON.stringify(data).slice(0, 300) : "unknown";
    console.error("[WABA] WhatsApp API sendImage:", res.status, errText);
  } else {
    const logContent = caption ? `[imagen] ${caption}` : "[imagen]";
    const wamid = extractMetaWamid(data);
    log?.(to, logContent, "image");
    await logOutMessage(to, logContent, "image", imageUrl, "bot", wamid);
  }
}

/** Tipo de ítem para listas interactivas (catálogo, menús). */
export interface InteractiveListRow {
  id: string;
  title: string;
  description: string;
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

/**
 * Construye el objeto JSON del mensaje interactivo tipo lista para la API de WhatsApp.
 * No incluye "to"; se usa desde sendInteractiveList o para enviar a otro destino.
 */
export function buildInteractiveList(
  header: string,
  body: string,
  buttonText: string,
  sections: InteractiveListSection[],
): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header.slice(0, 60) },
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: (r.description ?? "").slice(0, 72),
          })),
        })),
      },
    },
  };
}

export async function sendInteractiveList(
  to: string,
  header: string,
  body: string,
  buttonText: string,
  sections: InteractiveListSection[],
  log?: OutLogger,
  opts?: { force?: boolean },
): Promise<boolean> {
  const payload = buildInteractiveList(header, body, buttonText, sections);
  // Debounce en memoria (mismo isolate) + claim BD por (phone, list_title)
  // ~30s — aísla cold start y flujos paralelos (análisis 05-ago [P3], …8367).
  const dedupeKey = JSON.stringify(payload.interactive ?? payload);
  // force: la clienta preguntó algo en medio (ubicación, parqueo…) y la lista
  // previa ya quedó arriba — hay que reenviarla (Mila …9883, 4-oct).
  if (!opts?.force && shouldSkipDuplicateSend(to, dedupeKey)) return true;
  if (!opts?.force && !(await claimInteractiveListSend(to, header))) {
    console.log(
      "[WABA] sendInteractiveList BD debounce skip:",
      to.slice(-4),
      header.slice(0, 40),
    );
    return true;
  }

  const { phoneNumberId, accessToken } = getWAConfig();
  const res = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, ...metaRecipientFields(to) }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errText =
      data != null ? JSON.stringify(data).slice(0, 300) : "unknown";
    console.error(
      "[WABA] sendInteractiveList failed:",
      res.status,
      errText.slice(0, 300),
    );
  } else {
    const logContent = `[lista] ${header}: ${body}`.slice(0, 300);
    const wamid = extractMetaWamid(data);
    log?.(to, logContent, "interactive");
    await logOutMessage(to, logContent, "interactive", undefined, "bot", wamid);
  }
  return res.ok;
}
