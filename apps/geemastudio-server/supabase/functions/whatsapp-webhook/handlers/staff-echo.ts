/**
 * staff-echo.ts — Ecos de mensajes enviados desde la app WhatsApp Business
 * (campo webhook Meta `smb_message_echoes`, modo coexistencia).
 *
 * Sin esto, Vanessa responde en el celular y los nudges siguen porque
 * `bot_paused_at` solo se setea desde el panel / foto diseño.
 */

import type { SupabaseClient } from "../lib/supabase.ts";
import { upsertSession } from "../lib/supabase.ts";
import { waConversationKey } from "../lib/wa-recipient.mjs";

function echoContent(echo: Record<string, unknown>): string {
  const type = typeof echo.type === "string" ? echo.type : "text";
  if (type === "text") {
    const text = echo.text as { body?: string } | undefined;
    return (text?.body ?? "").trim() || "[texto]";
  }
  if (type === "image") {
    const img = echo.image as { caption?: string } | undefined;
    return img?.caption?.trim() ? `[imagen] ${img.caption.trim()}` : "[imagen]";
  }
  if (type === "interactive") {
    return "[interactivo staff]";
  }
  return `[${type}]`;
}

/**
 * Procesa `smb_message_echoes`: log out + pausa bot.
 * Idempotente por wamid.
 */
export async function handleStaffMessageEchoes(
  supabase: SupabaseClient,
  value: Record<string, unknown>,
): Promise<number> {
  const echoes = value.message_echoes;
  if (!Array.isArray(echoes) || echoes.length === 0) return 0;

  let handled = 0;
  for (const raw of echoes) {
    if (!raw || typeof raw !== "object") continue;
    const echo = raw as Record<string, unknown>;
    const wamid = typeof echo.id === "string" ? echo.id : null;

    // Destinatario = clienta (campo `to` en el eco)
    const toRaw = (typeof echo.to === "string" && echo.to) ||
      (typeof echo.recipient_id === "string" && echo.recipient_id) ||
      "";
    const phone = waConversationKey(toRaw);
    if (!phone) {
      console.warn("[WABA] staff echo sin destinatario");
      continue;
    }

    if (wamid) {
      const { data: existing } = await supabase
        .from("wa_messages")
        .select("id")
        .eq("wamid", wamid)
        .maybeSingle();
      if (existing) continue;
    }

    const content = echoContent(echo).slice(0, 2000);
    const msgType = typeof echo.type === "string" && echo.type.length > 0
      ? echo.type
      : "text";

    await supabase.from("wa_messages").insert({
      phone,
      direction: "out",
      msg_type: msgType.slice(0, 40),
      content,
      source: "staff_app",
      ...(wamid ? { wamid } : {}),
      ...(wamid
        ? {
          delivery_status: "accepted",
          delivery_status_at: new Date().toISOString(),
        }
        : {}),
    });

    await upsertSession(supabase, phone, {
      bot_paused_at: new Date().toISOString(),
    });

    console.log(`[WABA] staff_app echo → pause: …${phone.slice(-4)}`);
    handled++;
  }
  return handled;
}

/** True si el change del webhook es eco de app Business. */
export function isSmbMessageEchoesChange(
  change: Record<string, unknown> | undefined,
): boolean {
  return change?.field === "smb_message_echoes";
}
