// Reenganche con Haiku: lee el chat reciente (último mensaje OUT, clienta en
// silencio) y decide si retomar y con qué texto. Lo usan browse-reengage (sin
// selección) y cart-nudge cuando el tenant tiene el agente prendido: en vez de
// copy fija + listas del bot clásico, retoma lo último que se habló (horario
// ofrecido, duda pendiente).

import { SALON_ADDRESS } from "./salon-location.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "./haiku-usage.ts";
import type { SupabaseClient } from "./supabase.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const HAIKU_TIMEOUT_MS = 5000;
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface ReengageMessageRow {
  direction: "in" | "out";
  content: string | null;
  created_at: string;
}

export interface ReengageVerdict {
  shouldSend: boolean;
  message: string;
}

/**
 * Haiku decide si reenganchar (clienta ghosteó tras respuesta del bot) o skip
 * si la charla ya cerró naturalmente. `source` va a ai_usage; `extraContext`
 * agrega datos de la sesión (p. ej. servicios en selección).
 */
export async function askHaikuReengage(
  supabase: SupabaseClient,
  phone: string,
  history: ReengageMessageRow[],
  opts: { source: string; extraContext?: string },
): Promise<ReengageVerdict | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const tag = `[${opts.source}]`;

  const transcript = history
    .map((m) => `[${m.direction}] ${(m.content ?? "").slice(0, 300)}`)
    .join("\n");

  const systemPrompt =
    "Eres parte del equipo de ZM Lash & Nails Beauty (salón en Perú). " +
    "Revisas un chat de WhatsApp donde el equipo/bot YA respondió (último mensaje " +
    "es 'out') y la clienta no ha vuelto a escribir en un rato. 'in' = clienta, " +
    "'out' = equipo/bot. " +
    "should_send=true casi siempre si el embudo quedó a medias: lista de promos, " +
    "precios, horario ofrecido, pregunta abierta, o la clienta no eligió servicio/día. " +
    "should_send=false SOLO si la charla cerró claro (gracias/listo/chau/ya agendé) " +
    "o hay cita confirmada. Si should_send=true, redacta 1–2 líneas en español " +
    "peruano, tono asesora profesional y cercana (NO amiga efusiva): retoma lo " +
    "último que quedó pendiente (si se le ofreció un horario, pregúntale si se lo " +
    "reservas; si no, qué servicio o qué día le acomoda). Nunca le pidas que " +
    "escriba una palabra clave (*agendar*, *menu*). " +
    "PROHIBIDO apodos: babe, baby, amor, cielo, linda, hermosa, bella, guapa, " +
    "nena, bebé, cariño, reina, princesa, mamacita. PROHIBIDO volver a decir ¡Hola!/Hola " +
    "(el saludo ya se dio). Trata como Srta. {nombre} si lo conoces; si no, directo al tema. " +
    "NO inventes precios ni horarios que no estén en el chat. " +
    "DATOS REALES del salón (úsalos tal cual si la clienta preguntó; NUNCA inventes dirección, distrito, horarios ni precios): dirección: " +
    SALON_ADDRESS + ". " +
    "NUNCA " +
    "digas que le dejas calendario/días. NUNCA redirijas al 932 (este YA es el " +
    "canal). " +
    (opts.extraContext ? `${opts.extraContext} ` : "") +
    "Responde ÚNICAMENTE JSON: " +
    '{"should_send": boolean, "message": "texto o cadena vacía"}';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HAIKU_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: "user", content: transcript }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`${tag} Anthropic API error:`, response.status);
      void reportAnthropicApiFailure(supabase, {
        status: response.status,
        bodyText: errText,
        source: opts.source,
        phoneNumber: phone,
      });
      return null;
    }

    const data = await response.json();
    void clearAnthropicCreditExhaustedFlag(supabase);
    void logAIUsage(
      supabase,
      opts.source,
      (data?.usage?.input_tokens as number) ?? 0,
      (data?.usage?.output_tokens as number) ?? 0,
      phone,
    );

    const rawText = (data?.content?.[0]?.text as string | undefined)?.trim();
    if (!rawText) return null;

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.should_send !== "boolean") return null;

    return {
      shouldSend: parsed.should_send,
      message: typeof parsed.message === "string" ? parsed.message : "",
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      console.warn(`${tag} Timeout Haiku`);
    } else {
      console.error(`${tag} Error Anthropic:`, err);
    }
    return null;
  }
}
