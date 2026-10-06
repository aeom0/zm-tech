/**
 * Reply con quote (deslizar a la derecha en WhatsApp).
 * Meta manda `message.context.id` = wamid del mensaje citado.
 * Sin enriquecer el texto, "Si" / "este" / "me interesa" llegan a Haiku
 * sin saber a qué creativo/lista respondían → fallback 932.
 */

import type { SupabaseClient } from "./supabase.ts";
import { formatQuotedPreview } from "../../_shared/push-copy.mjs";

export interface InboundReplyContext {
  /** wamid del mensaje citado */
  id: string;
  /** WhatsApp id del autor del mensaje citado (negocio o clienta) */
  from?: string;
}
export interface QuotedMessageRow {
  content: string;
  msg_type: string | null;
  image_url: string | null;
  direction: string | null;
  created_at: string | null;
}

/** Extrae context de reply/quote del payload inbound de Meta. */
export function getInboundReplyContext(
  message: Record<string, unknown>,
): InboundReplyContext | null {
  const ctx = message?.context;
  if (!ctx || typeof ctx !== "object") return null;
  const c = ctx as Record<string, unknown>;
  // Reacción / producto referido no son quote de chat libre
  if (c.referred_product != null) return null;
  const id = typeof c.id === "string" ? c.id.trim() : "";
  if (!id) return null;
  const from = typeof c.from === "string" ? c.from.trim() : undefined;
  return { id, ...(from ? { from } : {}) };
}

/** wamid de la respuesta Graph API al enviar un mensaje. */
export function extractMetaWamid(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const messages = (data as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const first = messages[0];
  if (!first || typeof first !== "object") return null;
  const id = (first as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function rowFromQuoted(data: Record<string, unknown>): QuotedMessageRow | null {
  const imageUrl =
    typeof data.image_url === "string" && data.image_url.trim()
      ? data.image_url.trim()
      : null;
  const content =
    String(data.content ?? "").trim() || (imageUrl ? "[imagen]" : "");
  if (!content && !imageUrl) return null;
  return {
    content: content || "[imagen]",
    msg_type: (data.msg_type as string) ?? null,
    image_url: imageUrl,
    direction: (data.direction as string) ?? null,
    created_at: typeof data.created_at === "string" ? data.created_at : null,
  };
}

/**
 * Busca el mensaje citado por wamid.
 * Fallback (transición / plantillas sin log): último OUT del hilo ≤6 h
 * solo cuando el reply de la clienta es corto (afirmación / “este”).
 */
export async function resolveQuotedMessage(
  supabase: SupabaseClient,
  phone: string,
  contextId: string,
  opts?: { replyText?: string; softFallbackHours?: number },
): Promise<QuotedMessageRow | null> {
  const { data, error } = await supabase
    .from("wa_messages")
    .select("content, msg_type, image_url, direction, created_at")
    .eq("wamid", contextId)
    .maybeSingle();
  if (error) {
    console.error("[WABA] resolveQuotedMessage:", error.message);
  }
  if (data) {
    const row = rowFromQuoted(data as Record<string, unknown>);
    if (row) return row;
  }

  const reply = (opts?.replyText ?? "").trim();
  const softOk = reply.length > 0 && reply.length <= 48 && !/\n/.test(reply);
  if (!softOk) return null;

  const hours = opts?.softFallbackHours ?? 6;
  const sinceIso = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data: lastOut, error: outErr } = await supabase
    .from("wa_messages")
    .select("content, msg_type, image_url, direction, created_at")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (outErr) {
    console.error("[WABA] resolveQuotedMessage soft:", outErr.message);
  }
  if (lastOut) {
    const content = String(lastOut.content ?? "").trim();
    const msgType = (lastOut.msg_type as string) ?? null;
    const imageUrl =
      typeof lastOut.image_url === "string" && lastOut.image_url.trim()
        ? lastOut.image_url.trim()
        : null;
    // Evitar atribuir un "Si" al último "envía el voucher" / ack corto
    const looksLikeCreative =
      msgType === "image" ||
      msgType === "interactive" ||
      Boolean(imageUrl) ||
      content.includes("[imagen]") ||
      content.includes("[lista]") ||
      content.length >= 60;
    if (!looksLikeCreative) return null;
    return rowFromQuoted(lastOut as Record<string, unknown>);
  }
  return null;
}

/**
 * Staff suele mandar foto + texto de etiqueta en burbujas separadas
 * (Angui: imagen → "🪻 Mojado ó húmedo"). Si el quote es solo `[imagen]`,
 * toma el OUT texto ≤2 min después para panel/Haiku.
 */
export async function withNearbyImageCaption(
  supabase: SupabaseClient,
  phone: string,
  quoted: QuotedMessageRow,
): Promise<QuotedMessageRow> {
  const isImage =
    quoted.msg_type === "image" ||
    Boolean(quoted.image_url) ||
    /^\[imagen\]/i.test(quoted.content);
  if (!isImage || !quoted.created_at) return quoted;

  const withoutTag = quoted.content.replace(/^\[imagen\]\s*/i, "").trim();
  if (withoutTag.length >= 3) return quoted;

  const untilIso = new Date(
    new Date(quoted.created_at).getTime() + 120_000,
  ).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("content")
    .eq("phone", phone)
    .eq("direction", "out")
    .eq("msg_type", "text")
    .gt("created_at", quoted.created_at)
    .lte("created_at", untilIso)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[WABA] withNearbyImageCaption:", error.message);
    return quoted;
  }
  const caption = String(data?.content ?? "").trim();
  // Solo etiquetas cortas (nombre de look); no el párrafo largo de Vanessa
  if (!caption || caption.length > 100) return quoted;
  return {
    ...quoted,
    content: `[imagen] ${caption}`.slice(0, 600),
  };
}

/**
 * Texto que escribió la clienta, sin el bloque del mensaje citado
 * (`[Respondiendo a]` / preview `↳`). Usar en gates Plan 04 / matchers
 * que no deben heredar keywords del collage citado (JNKM …0611: "Precio"
 * + caption Rimel/Ardilla → falso "efecto concreto").
 */
export function clientTypedPortion(enrichedOrPreview: string): string {
  let t = (enrichedOrPreview ?? "").trim();
  if (!t) return "";
  const arrow = t.indexOf(" ↳ ");
  if (arrow >= 0) t = t.slice(0, arrow);
  const respIdx = t.search(/\n\[Respondiendo a\]/i);
  if (respIdx >= 0) t = t.slice(0, respIdx);
  t = t.replace(/^\[Respondiendo a\][\s\S]*$/i, "").trim();
  return t.trim();
}

/** "Precio" / "cuánto cuesta" sin nombrar servicio — no es intención de un efecto. */
export function isBarePriceAsk(text: string): boolean {
  const raw = clientTypedPortion(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!raw || raw.length > 40) return false;
  return /^(precios?|cuanto(s)?(\s+(cuesta|vale|sale|es))?\??|tarifas?)\s*\??$/.test(
    raw,
  );
}

/**
 * Solo enriquecer replies cortos (afirmación / "este" / "me interesa").
 * Preguntas largas con swipe-reply (TRANSCAM …5337: precios de uñas citando
 * ubicación → matchers leían "ubicación"/"Google Maps" del quote y reenviaban
 * Maps; igual pasaría con horarios) no deben concatenar el cuerpo citado.
 * Tampoco "Precio"/"cuánto" solos (JNKM …0611): el caption del collage
 * dispara falso efecto concreto + Plan 04 sin S/ en el texto.
 * Mismo umbral que el soft-fallback de resolveQuotedMessage.
 */
export function shouldEnrichWithQuotedContent(userText: string): boolean {
  const reply = userText.trim();
  if (!reply) return true;
  if (reply.length > 48 || /\n/.test(reply)) return false;
  if (isBarePriceAsk(reply)) return false;
  return true;
}

/** Une el texto de la clienta con el contenido citado para matchers + Haiku. */
export function enrichTextWithQuotedContent(
  userText: string,
  quotedContent: string,
): string {
  const base = userText.trim();
  const quoted = quotedContent.trim().slice(0, 600);
  if (!quoted) return base;
  if (!shouldEnrichWithQuotedContent(base)) return base;
  if (!base) return `[Respondiendo a] ${quoted}`;
  // Evitar duplicar si el coalesce ya metió el bloque
  if (base.includes("[Respondiendo a]")) return base;
  return `${base}\n[Respondiendo a] ${quoted}`;
}

/** Preview para panel / logs. */
export function formatInboundWithQuotePreview(
  inboundPreview: string,
  quotedContent: string | null,
): string {
  const base = inboundPreview.trim() || "[mensaje]";
  if (!quotedContent?.trim()) return base;
  return `${base} ↳ ${formatQuotedPreview(quotedContent)}`.slice(0, 2000);
}
