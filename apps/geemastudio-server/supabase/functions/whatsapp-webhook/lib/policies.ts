// policies.ts — Generado por scripts/copy-policies-to-edge.js desde packages/policies-text/data.json
// No editar a mano; editar data.json y ejecutar: yarn copy-policies

export const CONSIDERACIONES_PREVIAS_BY_CATEGORY: Record<string, string> = {
  "cat-extensiones":
    `• *Pestañas (extensiones):* Ven desmaquillada (sin rímel ni delineador en ojos). Evita cremas grasas en la zona el día de la cita.`,
  "cat-lifting":
    `• *Lifting de pestañas:* Ven desmaquillada. Zona de ojos limpia; evita cremas el día del servicio.`,
  "cat-cejas-rostro":
    `• *Cejas y rostro:* Ven desmaquillada. Si usas retinol o ácidos en la zona, coméntalo antes.`,
  "cat-unas":
    `• *Uñas:* Ven sin esmalte en manos o pies (según el servicio). Uñas limpias y cortas facilitan el trabajo.`,
  "cat-microblading":
    `• *Microblading / cejas / labios:* Ven desmaquillada. No anticoagulantes ni alcohol 24 h antes. Evita sol fuerte y exfoliantes en la zona 48 h antes.`,
  "cat-depilacion":
    `• *Depilación:* Zona limpia y seca. Evita cremas el día del servicio. Si es zona sensible, avisa con anticipación.`,
};

const CONSIDERACIONES_PREVIAS_HEADER = `📌 *Antes de tu cita:*

`;

export function getConsideracionesPreviasWhatsApp(
  categoryIds: string[],
): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const id of categoryIds) {
    const text = CONSIDERACIONES_PREVIAS_BY_CATEGORY[id];
    if (text && !seen.has(id)) {
      seen.add(id);
      lines.push(text);
    }
  }
  if (lines.length === 0) return "";
  return CONSIDERACIONES_PREVIAS_HEADER + lines.join("\n\n");
}

export function getPoliticasCitaWhatsApp(): string {
  return `📋 *Políticas de la cita:*

⏰ *Tardanzas:* Si llegas más de 15 min tarde, el servicio puede acortarse o reprogramarse según disponibilidad.

❌ *Cancelación:* Avisa con mínimo 24 horas de anticipación.

🚫 *Inasistencia:* Si no avisas y no te presentas, el turno se pierde y el adelanto no es reembolsable.

🔄 *Reprogramación:* Se permite una sola vez, con aviso de mínimo 24 h antes de la cita y según disponibilidad. El adelanto se mantiene a tu favor. A partir de la segunda aplican condiciones del salón.

💰 *Adelanto:* Reserva tu cupo y *no es reembolsable* si cancelas, no asistes o tienes un imprevisto; la alternativa es reprogramar una sola vez, según lo indicado arriba. Si somos nosotras quienes no podemos atenderte, reprogramamos sin costo o te reembolsamos el adelanto. Al enviar tu pago aceptas estas condiciones.

📄 Términos completos: zmlashnails.com/terminos-y-condiciones

_ZM Lash & Nails Beauty · @zmlashandnails_`;
}
