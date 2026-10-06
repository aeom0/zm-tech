// haiku-usage.ts — Rate-limiting, logging de tokens y alerta de crédito Anthropic

import type { SupabaseClient } from "./supabase.ts";
import { notifyAdmins } from "./notify.ts";
import { getRequestTenantId } from "./tenant.ts";

/** Evita spam de push si Haiku falla en ráfaga (todas las Edge Functions). */
const CREDIT_ALERT_DEBOUNCE_SECONDS = 6 * 60 * 60;

// ---------------------------------------------------------------------------
// hashPhone — privacidad en logs
// ---------------------------------------------------------------------------

/** Hash simple del teléfono para privacidad (no guardamos el número real). */
async function hashPhone(phone: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(phone);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 8);
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Rate-limiting por número — protección anti-bots
// ---------------------------------------------------------------------------

/**
 * Verifica si un número superó el límite de llamadas IA en la última hora.
 * El tope sale de `haiku_settings.rate_limit_per_hour` (BD).
 * Si la query falla, permite la llamada (fail-open).
 */
export async function isAIRateLimited(
  supabase: SupabaseClient,
  phoneNumber: string,
  maxPerHour: number,
): Promise<boolean> {
  try {
    const phoneHash = await hashPhone(phoneNumber);
    // welcome_greeting no cuenta — es un saludo automático, no una pregunta de la clienta
    const { count, error } = await supabase
      .from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("phone_hash", phoneHash)
      // intent_shadow es un clasificador interno (1 fila por mensaje de la
      // clienta, no genera respuesta): contarlo duplicaba el consumo y a los
      // ~7 mensajes bloqueaba a Haiku → menú genérico (Nancy Alvites …9158,
      // 4-oct, campaña Halloween: "Me confirma lunes 10 am" → menú).
      .neq("trigger_type", "intent_shadow")
      .neq("trigger_type", "welcome_greeting")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) return false; // fail-open
    const calls = count ?? 0;
    if (calls >= maxPerHour) {
      console.warn(
        `[AI Rate-limit] ${phoneHash} superó ${maxPerHour} llamadas/hora (actual: ${calls})`,
      );
      return true;
    }
    return false;
  } catch {
    return false; // fail-open
  }
}

// ---------------------------------------------------------------------------
// logAIUsage — fire-and-forget, nunca bloquea el flujo principal
// ---------------------------------------------------------------------------

/**
 * Registra el uso de tokens de Haiku en ai_usage_log.
 * Fire-and-forget: nunca bloquea el flujo principal.
 * Importante: el client de Supabase NO lanza en INSERT fallido — hay que
 * mirar `error` (antes se tragaba en silencio y el "saldo" quedaba corto).
 */
export async function logAIUsage(
  supabase: SupabaseClient,
  triggerType: string,
  inputTokens: number,
  outputTokens: number,
  phoneNumber?: string,
  cacheTokens?: {
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  },
): Promise<void> {
  try {
    const phoneHash = phoneNumber ? await hashPhone(phoneNumber) : null;
    const baseRow = {
      trigger_type: triggerType,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      phone_hash: phoneHash,
      tenant_id: getRequestTenantId(),
    };
    const withCache =
      cacheTokens?.cacheCreationInputTokens != null ||
      cacheTokens?.cacheReadInputTokens != null
        ? {
            ...baseRow,
            cache_creation_input_tokens:
              cacheTokens.cacheCreationInputTokens ?? null,
            cache_read_input_tokens: cacheTokens.cacheReadInputTokens ?? null,
          }
        : baseRow;

    let { error } = await supabase.from("ai_usage_log").insert(withCache);
    // Fail-soft si la migración de columnas cache aún no está aplicada:
    // no perder el log de tokens base.
    if (
      error &&
      withCache !== baseRow &&
      /cache_(creation|read)_input_tokens|schema cache|Could not find/i.test(
        error.message ?? "",
      )
    ) {
      ({ error } = await supabase.from("ai_usage_log").insert(baseRow));
    }
    if (error) {
      console.warn(
        "[AI Usage] insert falló:",
        error.message?.slice(0, 160) ?? error,
      );
    }
  } catch (err) {
    console.warn("[AI Usage] Error guardando log:", err);
  }
}

// ---------------------------------------------------------------------------
// Crédito Anthropic agotado — detectar, persistir wallet=0, push staff
// ---------------------------------------------------------------------------

/** True si el body/status de Anthropic indica prepaid sin fondos. */
export function isAnthropicCreditExhausted(
  status: number,
  bodyText: string,
): boolean {
  if (status === 402) return true;
  const lower = (bodyText || "").toLowerCase();
  return (
    lower.includes("credit balance is too low") ||
    lower.includes("purchase credits") ||
    lower.includes("plans & billing") ||
    (lower.includes("credit") && lower.includes("too low"))
  );
}

async function upsertAppConfig(
  supabase: SupabaseClient,
  key: string,
  value: string,
): Promise<void> {
  const { error } = await supabase.from("app_config").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) {
    console.warn(
      "[AI Credit] app_config upsert falló:",
      key,
      error.message?.slice(0, 120),
    );
  }
}

/**
 * Tras un HTTP error de Anthropic: si es crédito agotado → wallet=0 + flag
 * + push FCM (debounce 6h). Siempre loguea un trigger `api_error_*` con 0 tokens
 * para que Finanzas/diagnóstico vean la falla (antes solo console.error).
 */
export async function reportAnthropicApiFailure(
  supabase: SupabaseClient | null | undefined,
  opts: {
    status: number;
    bodyText: string;
    source: string;
    phoneNumber?: string;
  },
): Promise<void> {
  const creditOut = isAnthropicCreditExhausted(opts.status, opts.bodyText);
  const triggerType = creditOut
    ? "api_error_credit"
    : `api_error_http_${opts.status}`;

  if (supabase) {
    await logAIUsage(supabase, triggerType, 0, 0, opts.phoneNumber);
  }

  if (!creditOut || !supabase) return;

  try {
    await upsertAppConfig(supabase, "anthropic_wallet_usd", "0");
    await upsertAppConfig(supabase, "anthropic_api_status", "credit_exhausted");

    const { data: claimed, error: claimErr } = await supabase.rpc(
      "waba_claim_action_debounce",
      {
        p_phone: "system:anthropic",
        p_kind: "credit_exhausted_alert",
        p_window_seconds: CREDIT_ALERT_DEBOUNCE_SECONDS,
        p_tenant_id: getRequestTenantId(),
      },
    );
    if (claimErr) {
      console.warn("[AI Credit] debounce claim:", claimErr.message);
    } else if (claimed !== true) {
      console.log("[AI Credit] skip push (debounce 6h)");
      return;
    }

    await notifyAdmins(
      supabase,
      "Haiku sin crédito",
      "Se acabó el saldo de Anthropic. Recarga para que el bot vuelva a responder.",
      {
        type: "anthropic_credit",
        source: opts.source,
      },
    );
  } catch (err) {
    console.error("[AI Credit] reportAnthropicApiFailure:", err);
  }
}

/** Tras una llamada Messages exitosa, limpia el flag credit_exhausted si estaba. */
export async function clearAnthropicCreditExhaustedFlag(
  supabase: SupabaseClient | null | undefined,
): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "anthropic_api_status")
      .maybeSingle();
    if (data?.value !== "credit_exhausted") return;
    await upsertAppConfig(supabase, "anthropic_api_status", "ok");
  } catch (err) {
    console.warn("[AI Credit] clear flag:", err);
  }
}
