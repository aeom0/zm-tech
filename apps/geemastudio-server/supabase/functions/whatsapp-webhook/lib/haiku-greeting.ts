// haiku-greeting.ts — Saludos de bienvenida generados por Haiku

import type { SupabaseClient } from "./supabase.ts";
import type { HaikuRuntimeSettings } from "./waba-config.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "./haiku-usage.ts";
import { clientFirstName } from "./client-address.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// ---------------------------------------------------------------------------
// getTimeSlot
// ---------------------------------------------------------------------------

/** Franja horaria Lima para personalizar el tono del saludo. */
export type TimeSlot =
  | "madrugada" // 00:00–05:59 — cómplice, divertida
  | "manana" // 06:00–09:59 — energética, positiva
  | "dia" // 10:00–12:59 — directa, cálida
  | "tarde" // 13:00–17:59 — aspiracional, relajada
  | "noche" // 18:00–21:59 — cálido, motivador
  | "noche_tarde"; // 22:00–23:59 — cómplice, decisiva

export function getTimeSlot(): TimeSlot {
  const now = new Date();
  const lima = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Lima" }),
  );
  const h = lima.getHours();
  if (h < 6) return "madrugada";
  if (h < 10) return "manana";
  if (h < 13) return "dia";
  if (h < 18) return "tarde";
  if (h < 22) return "noche";
  return "noche_tarde";
}

// ---------------------------------------------------------------------------
// generateWelcomeGreeting
// ---------------------------------------------------------------------------

/**
 * Genera un saludo de bienvenida con Haiku.
 * System prompt y límites vienen de `haiku_settings` (BD / `getHaikuRuntimeSettings`).
 * Retorna null si falla — el llamador debe usar getFallbackGreeting().
 */
export async function generateWelcomeGreeting(
  settings: HaikuRuntimeSettings,
  firstName: string,
  promoTitles: string[],
  fromAd: boolean,
  supabase?: SupabaseClient,
  phoneNumber?: string,
): Promise<string | null> {
  const slot = getTimeSlot();
  const slotCtx = settings.welcome_slot_context[slot] ?? "";
  const promosLine =
    promoTitles.length > 0
      ? `Promos activas: ${promoTitles.slice(0, 3).join(", ")}.`
      : "No hay promos activas este momento.";
  const adCtx = fromAd
    ? "La clienta llegó haciendo clic en un anuncio de Instagram o Facebook — ya mostró interés previo en nuestras promos."
    : "La clienta llegó de forma orgánica por WhatsApp.";

  const systemPrompt = settings.welcome_generation_system;

  const userPrompt = `Saludo de bienvenida para:
- Nombre: ${firstName || "(sin nombre — usa solo ¡Hola!)"}
- Tratamiento: si hay nombre, "¡Hola Srta. ${firstName}!"; si no, "¡Hola!"
- Contexto horario: ${slotCtx}
- ${adCtx}
- ${promosLine}

Máximo 3 líneas. Español neutro latinoamericano (Lima); tuteo (cuéntame, dime, mira). PROHIBIDO voseo: contame, decime, mirá, fijate. Sin mencionar horarios. Un solo ¡Hola! (este es el único del chat). Termina con gancho hacia promos/servicios.`;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    settings.welcome_timeout_ms,
  );

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: settings.welcome_max_tokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      if (supabase) {
        void reportAnthropicApiFailure(supabase, {
          status: response.status,
          bodyText: errText,
          source: "welcome_greeting",
          phoneNumber,
        });
      }
      return null;
    }
    const data = await response.json();
    const text = (data?.content?.[0]?.text as string | undefined)?.trim();
    if (!text) return null;
    if (supabase) {
      void clearAnthropicCreditExhaustedFlag(supabase);
      void logAIUsage(
        supabase,
        "welcome_greeting",
        (data?.usage?.input_tokens as number) ?? 0,
        (data?.usage?.output_tokens as number) ?? 0,
        phoneNumber,
      );
    }
    return text;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ---------------------------------------------------------------------------
// getFallbackGreeting
// ---------------------------------------------------------------------------

/**
 * Saludo de respaldo si Haiku falla. Plantillas por franja en `haiku_settings` (BD).
 * Usa el placeholder `{nombre}` (= nombre de pila). Sin nombre → ¡Hola! sin Srta.
 */
export function getFallbackGreeting(
  firstName: string,
  fromAd: boolean,
  settings: HaikuRuntimeSettings,
): string {
  const slot = getTimeSlot();
  const map = fromAd
    ? settings.welcome_fallback_ad
    : settings.welcome_fallback_organic;
  const tpl = map[slot] ?? map.dia ?? "¡Hola! 💜";
  const nombre = clientFirstName(firstName);
  if (nombre) return tpl.replace(/\{nombre\}/g, nombre);
  return tpl
    .replace(/Srta\.\s*\{nombre\}!?/gi, "")
    .replace(/\{nombre\}/g, "")
    .replace(/¡Hola\s*,?/i, "¡Hola!")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([!,.])/g, "$1")
    .trim();
}
