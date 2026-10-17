// support-webhook — WhatsApp de soporte de GeemaStudio (plan-agente-soporte-zmtech.md).
// Número propio, separado de los salones. verify_jwt = false (Meta no envía JWT).
//
// Secrets: SUPPORT_WA_VERIFY_TOKEN, SUPPORT_META_APP_SECRET,
// SUPPORT_WA_PHONE_NUMBER_ID, SUPPORT_WA_ACCESS_TOKEN y ZMTECH_ANTHROPIC_API_KEY
// (cuenta de Anthropic de ZM Tech; ZM Lash sigue con ANTHROPIC_API_KEY).
// Avisos al equipo: SUPPORT_TELEGRAM_BOT_TOKEN y SUPPORT_TELEGRAM_CHAT_ID (telegram.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AgentMessage,
  callMessagesApi,
} from "../_shared/agent/anthropic.ts";
import {
  clearAnthropicCreditExhausted,
  isAnthropicCreditExhausted,
  isAnthropicCreditMarkedExhausted,
  markAnthropicCreditExhausted,
} from "../_shared/agent/anthropic-credit.ts";
import { isValidMetaSignature } from "../_shared/meta-signature.ts";
import { buildSystem, runSupportAgent, SUPPORT_TOOLS } from "./agent.ts";
import { humanReplyNotice, supportHoursStatus } from "./hours.ts";
import {
  countRecentReplies,
  getSupportSupabase,
  hasNewerInbound,
  historyToMessages,
  insertInbound,
  loadHistory,
  logOutbound,
  upsertTicket,
} from "./store.ts";
import {
  type EscalationAlert,
  formatEscalationAlert,
  sendTelegramAlert,
} from "./telegram.ts";
import { sendSupportText, supportPhoneNumberId } from "./wa.ts";

/** Espera para agrupar mensajes seguidos antes de responder. */
const COALESCE_WINDOW_MS = 4_000;
const AGENT_ATTEMPTS = 2;
const MAX_REPLIES_PER_HOUR = 30;

function inboundText(message: Record<string, unknown>): string {
  const type = String(message.type ?? "");
  if (type === "text") {
    return String((message.text as { body?: string })?.body ?? "");
  }
  if (type === "interactive") {
    const i = message.interactive as Record<string, { title?: string }>;
    return String(i?.button_reply?.title ?? i?.list_reply?.title ?? "");
  }
  if (type === "button") {
    return String((message.button as { text?: string })?.text ?? "");
  }
  const caption = (message[type] as { caption?: string } | undefined)?.caption;
  const label =
    `[El usuario envió un mensaje de tipo ${type}; por ahora solo puedes leer texto]`;
  return caption ? `${label}\n${caption}` : label;
}

/** Aviso del escalamiento al equipo por Telegram; si falla, queda en logs y el ticket en la BD. */
async function notifyEscalation(alert: EscalationAlert): Promise<void> {
  console.log(
    `[SUPPORT] ticket #${alert.id}${alert.reused ? " (actualizado)" : ""}`,
    alert.categoria,
    alert.urgente ? "URGENTE" : "",
  );
  await sendTelegramAlert(formatEscalationAlert(alert));
}

/** Marca el crédito de ZM Tech como agotado y avisa por Telegram solo la primera vez. */
async function handleCreditExhausted(supabase: SupabaseClient): Promise<void> {
  const already = await isAnthropicCreditMarkedExhausted(supabase, "zmtech");
  await markAnthropicCreditExhausted(supabase, "zmtech");
  if (!already) {
    await sendTelegramAlert(
      "Soporte GeemaStudio: la cuenta de Anthropic de ZM Tech se quedó sin crédito. " +
        "El agente no responde; cada mensaje queda como caso. Recargar en console.anthropic.com.",
    );
  }
}

async function replyToTurn(
  supabase: SupabaseClient,
  opts: { phone: string; contactName: string | null; inboundId: number },
): Promise<void> {
  const { phone, contactName, inboundId } = opts;

  if (await countRecentReplies(supabase, phone) >= MAX_REPLIES_PER_HOUR) {
    console.warn("[SUPPORT] tope de respuestas por hora:", phone.slice(-4));
    return;
  }

  const hours = supportHoursStatus();
  const history = historyToMessages(await loadHistory(supabase, phone));
  if (history.length === 0) return;
  const lastUserText = (() => {
    const last = history[history.length - 1];
    return typeof last.content === "string" ? last.content : "";
  })();

  const apiKey = Deno.env.get("ZMTECH_ANTHROPIC_API_KEY");
  const escalate = async (input: {
    resumen: string;
    categoria: string;
    urgente: boolean;
  }): Promise<string> => {
    const ticket = await upsertTicket(supabase, {
      phone,
      contactName,
      summary: input.resumen || lastUserText.slice(0, 500),
      diagnosis: {
        categoria: input.categoria,
        urgente: input.urgente,
        en_horario: hours.open,
        hora_vet: hours.localTime,
        origen: "agente",
      },
    });
    await notifyEscalation({
      ...ticket,
      ...input,
      phone,
      contactName,
      enHorario: hours.open,
    });
    return `Caso #${ticket.id} registrado. Aviso para el usuario: ${
      humanReplyNotice(hours)
    }`;
  };

  let result = null;
  if (apiKey) {
    const system = buildSystem({ hours, contactName });
    for (let attempt = 1; attempt <= AGENT_ATTEMPTS && !result; attempt++) {
      result = await runSupportAgent({
        system,
        history,
        handlers: { escalate },
        call: (messages: AgentMessage[]) =>
          callMessagesApi({
            apiKey,
            system,
            messages,
            tools: SUPPORT_TOOLS,
            logTag: "[SUPPORT]",
            onApiError: (status, bodyText) => {
              if (isAnthropicCreditExhausted(status, bodyText)) {
                void handleCreditExhausted(supabase).catch(() => {});
              }
            },
          }),
      });
    }
    if (result) {
      void clearAnthropicCreditExhausted(supabase, "zmtech").catch(() => {});
    }
  } else {
    console.error("[SUPPORT] ZMTECH_ANTHROPIC_API_KEY no configurada");
  }

  // Llegó otro mensaje mientras respondíamos: ese turno responde todo junto.
  if (await hasNewerInbound(supabase, phone, inboundId)) return;

  let text: string;
  if (result) {
    text = result.text;
  } else {
    // Falla del agente: el caso queda registrado y el usuario sabe qué sigue.
    const ticket = await upsertTicket(supabase, {
      phone,
      contactName,
      summary: lastUserText.slice(0, 500) || "(sin texto)",
      diagnosis: {
        origen: "falla_agente",
        en_horario: hours.open,
        hora_vet: hours.localTime,
      },
    });
    await notifyEscalation({
      ...ticket,
      urgente: false,
      categoria: "falla_agente",
      resumen: lastUserText,
      phone,
      contactName,
      enHorario: hours.open,
    });
    text =
      `No pude procesar tu mensaje en este momento, pero registré tu caso con el número *#${ticket.id}*. ${
        humanReplyNotice(hours)
      }`;
  }

  const wamid = await sendSupportText(phone, text);
  await logOutbound(supabase, {
    phone,
    body: text,
    wamid,
    inputTokens: result?.inputTokens,
    outputTokens: result?.outputTokens,
  });
}

async function processPayload(body: Record<string, unknown>): Promise<void> {
  const supabase = getSupportSupabase();
  const ourPhoneNumberId = supportPhoneNumberId();
  for (const entry of (body.entry as Record<string, unknown>[]) ?? []) {
    for (const change of (entry.changes as Record<string, unknown>[]) ?? []) {
      const value = change.value as Record<string, unknown> | undefined;
      const metadata = value?.metadata as
        | { phone_number_id?: string }
        | undefined;
      if (!value?.messages) continue; // statuses y otros eventos
      if (!ourPhoneNumberId || metadata?.phone_number_id !== ourPhoneNumberId) {
        console.warn(
          "[SUPPORT] phone_number_id ajeno, se ignora:",
          metadata?.phone_number_id,
        );
        continue;
      }
      const contact = (value.contacts as Record<string, unknown>[] | undefined)
        ?.[0];
      const contactName =
        (contact?.profile as { name?: string } | undefined)?.name ?? null;

      for (const message of value.messages as Record<string, unknown>[]) {
        const phone = typeof message.from === "string" ? message.from : "";
        if (!phone) continue;
        const inboundId = await insertInbound(supabase, {
          phone,
          wamid: typeof message.id === "string" ? message.id : null,
          msgType: String(message.type ?? "other"),
          body: inboundText(message),
        });
        if (inboundId === null) continue; // reintento de Meta

        await new Promise((r) => setTimeout(r, COALESCE_WINDOW_MS));
        if (await hasNewerInbound(supabase, phone, inboundId)) continue;
        await replyToTurn(supabase, { phone, contactName, inboundId });
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const verifyToken = Deno.env.get("SUPPORT_WA_VERIFY_TOKEN");
    const challenge = url.searchParams.get("hub.challenge");
    if (
      verifyToken &&
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === verifyToken &&
      challenge
    ) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureOk = await isValidMetaSignature(
    rawBody,
    req.headers.get("x-hub-signature-256"),
    Deno.env.get("SUPPORT_META_APP_SECRET"),
  );
  if (!signatureOk) return new Response("Unauthorized", { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (body?.object !== "whatsapp_business_account") {
    return new Response("ok", { status: 200 });
  }

  // 200 inmediato a Meta; el turno corre en segundo plano.
  const promise = processPayload(body).catch((err) =>
    console.error("[SUPPORT] processPayload:", err)
  );
  const g = globalThis as unknown as {
    EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void };
  };
  g.EdgeRuntime?.waitUntil?.(promise);

  return new Response("ok", { status: 200 });
});
