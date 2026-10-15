// haiku-model.ts — Parámetros comunes para las llamadas sueltas a Haiku 5.5
// (saludo, clasificadores, OCR, reenganches, watchdog, revisión de chats). El
// agente tiene su propio cliente en agent/anthropic.ts.
//
// Haiku 5.5 rompe vs 4.5: sin temperature/top_p/top_k ni prefill; thinking
// adaptativo por defecto y cuenta dentro de max_tokens; la respuesta puede
// empezar con bloques `thinking`, así que el texto se lee por `type`.

export const HAIKU_MODEL = "claude-haiku-5-5";

/** Tokens extra sobre el tope de la respuesta para que el thinking no la corte. */
export const HAIKU_THINKING_TOKEN_MARGIN = 1024;
/** Latencia extra por el thinking (los timeouts del CMS se pensaron para 4.5). */
export const HAIKU_THINKING_TIMEOUT_MARGIN_MS = 3000;

export type HaikuEffort = "low" | "medium";

/**
 * Campos de modelo para el body de /v1/messages. `answerMaxTokens` es el tope
 * pensado para el texto visible (el mismo que se usaba con 4.5).
 */
export function haikuRequestBase(
  answerMaxTokens: number,
  effort: HaikuEffort = "low",
) {
  return {
    model: HAIKU_MODEL,
    max_tokens: answerMaxTokens + HAIKU_THINKING_TOKEN_MARGIN,
    thinking: { type: "adaptive" as const },
    output_config: { effort },
  };
}

/** Timeout configurado + margen por thinking. */
export function haikuTimeoutMs(baseMs: number): number {
  return baseMs + HAIKU_THINKING_TIMEOUT_MARGIN_MS;
}

/** Une los bloques `text` de la respuesta (ignora `thinking`). */
export function haikuResponseText(data: unknown): string {
  const content = (data as { content?: unknown })?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is { type: "text"; text: string } =>
      (b as { type?: unknown })?.type === "text" &&
      typeof (b as { text?: unknown }).text === "string"
    )
    .map((b) => b.text)
    .join("");
}
