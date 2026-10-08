/**
 * Plantillas Meta (promo, recordatorios) se guardan en `wa_messages` con
 * `msg_type='template'` y contenido `[plantilla:<nombre>] <nombre clienta> · <cuerpo>`
 * (ver `_shared/wa-outbound-log.ts`). Haiku debe verlas en el historial: sin ellas,
 * un "Yo quiero" tras la promo se contesta como si no se hubiera ofrecido nada.
 */
export function templateLogToHistoryText(raw: string): string {
  const body = raw
    .replace(/^\[plantilla:[^\]]*\]\s*/i, "")
    // Primer segmento = nombre de la clienta (parámetro {{1}}), no aporta contexto.
    .replace(/^[^·]{1,60}·\s*/, "")
    .trim();
  return body ? `[Plantilla enviada por el salón]: ${body}` : "";
}
