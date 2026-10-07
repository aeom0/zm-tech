/**
 * Contador de fallos consecutivos de Haiku (texto libre → fallback).
 * Al llegar al umbral el dispatcher pausa el bot y notifica al staff.
 */

export const HAIKU_FALLBACK_PAUSE_THRESHOLD = 3;

export function nextHaikuFallbackState(
  currentCount: number | null | undefined,
): {
  /** Valor a persistir en `whatsapp_sessions.haiku_fallback_count`. */
  nextCount: number;
  /** Si true: setear `bot_paused_at`, avisar clienta y push al staff. */
  shouldPause: boolean;
} {
  const failCount = (Number(currentCount) || 0) + 1;
  if (failCount >= HAIKU_FALLBACK_PAUSE_THRESHOLD) {
    return { nextCount: 0, shouldPause: true };
  }
  return { nextCount: failCount, shouldPause: false };
}
