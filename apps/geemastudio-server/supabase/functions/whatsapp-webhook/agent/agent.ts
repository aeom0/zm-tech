// agent.ts — Agente Haiku 5.5 con tool use (plan-cutover-agente-haiku.md, Fase 1)
//
// runAgent devuelve true si el turno quedó atendido (texto enviado o traspaso
// hecho). Devuelve false SIN haber enviado nada si el agente falló: el caller
// cae al dispatch clásico (que degrada a un menú útil).

import type { SupabaseClient } from "../lib/supabase.ts";
import { getSession } from "../lib/supabase.ts";
import type { ServiceCatalog } from "../lib/services-catalog.ts";
import {
  getConfigBoolean,
  getConfigStringArray,
  type WabaConfigMap,
} from "../lib/waba-config.ts";
import { logAIUsage } from "../lib/haiku-usage.ts";
import {
  FABRICATED_BOOKING_SAFE_REPLY,
  hasFabricatedBookingClaim,
} from "../lib/fabricated-booking-guard.ts";
import { containsRefundPromise } from "../lib/staff-escalation.ts";
import { getClientContext } from "../handlers/ai-assistant.ts";
import { sendMessage } from "../wa-api.ts";
import { notifyStaffPaymentStepText } from "../handlers/steps.ts";
import { AWAITING_CLIENT_IDENTITY } from "../handlers/client-identity.ts";
import {
  AWAITING_DEPOSIT_BOLETA,
  AWAITING_DEPOSIT_DATOS,
} from "../handlers/payment.ts";
import {
  type AgentApiResult,
  type AgentMessage,
  type AgentToolResultBlock,
  type AgentToolUseBlock,
  callAgentMessages,
} from "./anthropic.ts";
import { loadAgentHistory } from "./history.ts";
import { buildAgentSystem } from "./prompt.ts";
import { AGENT_TOOLS, type AgentToolContext, runAgentTool } from "./tools.ts";

export const AGENT_MAX_ITERATIONS = 5;
const REFUND_SAFE_REPLY =
  "Entiendo 💜 Esto lo revisa una persona del equipo y te escribe en breve.";

/**
 * Pasos de sesión en los que el agente responde texto. Imágenes (comprobante,
 * fotos previas) y taps de listas siguen en el flujo clásico, que valida el
 * pago por código.
 */
const AGENT_STEPS = new Set([
  "browsing",
  "awaiting_datetime",
  AWAITING_CLIENT_IDENTITY,
  AWAITING_DEPOSIT_DATOS,
  AWAITING_DEPOSIT_BOLETA,
  "awaiting_payment_screenshot",
]);

export function agentOwnsStep(step: string | null | undefined): boolean {
  return !step || AGENT_STEPS.has(step);
}

/** Flag por tenant (`agent_enabled`) + allowlist opcional de teléfonos. */
export function isAgentEnabledFor(
  wabaConfig: WabaConfigMap,
  phoneNumber: string,
): boolean {
  if (!getConfigBoolean(wabaConfig, "agent_enabled", false)) return false;
  const allow = getConfigStringArray(
    wabaConfig,
    "agent_phone_allowlist",
    "phones",
  );
  return allow.length === 0 || allow.includes(phoneNumber);
}

/** Compuerta completa: flag, tipo de mensaje y paso de sesión. */
export async function shouldRunAgent(opts: {
  supabase: SupabaseClient;
  wabaConfig: WabaConfigMap;
  phoneNumber: string;
  isPlainText: boolean;
}): Promise<boolean> {
  if (!opts.isPlainText) return false;
  if (!isAgentEnabledFor(opts.wabaConfig, opts.phoneNumber)) return false;
  const session = await getSession(opts.supabase, opts.phoneNumber);
  return agentOwnsStep(session?.step);
}

export function extractText(result: AgentApiResult): string {
  return result.content
    .filter((b) => b.type === "text")
    .map((b) => String((b as { text?: string }).text ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function sanitizeAgentReply(text: string): string {
  if (hasFabricatedBookingClaim(text)) return FABRICATED_BOOKING_SAFE_REPLY;
  if (containsRefundPromise(text)) return REFUND_SAFE_REPLY;
  return text;
}

export async function runAgent(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  catalog: ServiceCatalog;
  wabaConfig: WabaConfigMap;
  phoneCountry?: string | null;
  messageText: string;
  callApi?: typeof callAgentMessages;
}): Promise<boolean> {
  const { supabase, phoneNumber } = opts;
  const callApi = opts.callApi ?? callAgentMessages;
  const toolCtx: AgentToolContext = {
    supabase,
    phoneNumber,
    contactName: opts.contactName,
    catalog: opts.catalog,
    phoneCountry: opts.phoneCountry,
    wabaConfig: opts.wabaConfig,
    messageText: opts.messageText,
    turnHandled: false,
    sentToClient: false,
  };

  try {
    const [clientContext, history, session] = await Promise.all([
      getClientContext(supabase, phoneNumber),
      loadAgentHistory(supabase, phoneNumber, opts.messageText),
      getSession(supabase, phoneNumber),
    ]);
    const system = buildAgentSystem({
      wabaConfig: opts.wabaConfig,
      catalog: opts.catalog,
      phoneCountry: opts.phoneCountry,
      clientContext,
      staffOutInHistory: history.staffOutInHistory,
      isCtwaLead: Boolean(session?.from_ad_at),
      sessionStep: session?.step ?? null,
    });
    const messages: AgentMessage[] = [...history.messages];

    // Mid-pago el equipo debe ver lo que escribe la clienta (el bot clásico lo
    // avisaba con debounce de 3 min); un fallo del aviso no frena el turno.
    if (session?.step === "awaiting_payment_screenshot") {
      await notifyStaffPaymentStepText(supabase, phoneNumber, opts.messageText)
        .catch((err: unknown) => console.error("[AGENT] aviso a staff:", err));
    }

    for (let i = 0; i < AGENT_MAX_ITERATIONS; i++) {
      // Un reintento ante falla transitoria de la API.
      let result = await callApi({
        system,
        messages,
        tools: AGENT_TOOLS,
        supabase,
        phoneNumber,
      });
      if (!result && !toolCtx.turnHandled) {
        result = await callApi({
          system,
          messages,
          tools: AGENT_TOOLS,
          supabase,
          phoneNumber,
        });
      }
      if (!result) return toolCtx.turnHandled || toolCtx.sentToClient;

      await logAIUsage(
        supabase,
        "agent",
        result.inputTokens,
        result.outputTokens,
        phoneNumber,
        {
          cacheCreationInputTokens: result.cacheCreationInputTokens,
          cacheReadInputTokens: result.cacheReadInputTokens,
        },
      );

      if (result.stopReason === "refusal") {
        return toolCtx.turnHandled || toolCtx.sentToClient;
      }

      if (result.stopReason !== "tool_use") {
        if (toolCtx.turnHandled) return true;
        const text = extractText(result);
        if (!text) return toolCtx.sentToClient;
        await sendMessage(phoneNumber, sanitizeAgentReply(text));
        return true;
      }

      // Historial append-only: devolver los bloques tal cual (incluye thinking).
      messages.push({ role: "assistant", content: result.content });
      const toolResults: AgentToolResultBlock[] = [];
      for (const block of result.content) {
        if (block.type !== "tool_use") continue;
        const use = block as AgentToolUseBlock;
        const out = await runAgentTool(use.name, use.input ?? {}, toolCtx);
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: out.content,
          ...(out.isError ? { is_error: true } : {}),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
    return toolCtx.turnHandled || toolCtx.sentToClient;
  } catch (err) {
    console.error("[AGENT] runAgent:", err);
    return toolCtx.turnHandled || toolCtx.sentToClient;
  }
}
