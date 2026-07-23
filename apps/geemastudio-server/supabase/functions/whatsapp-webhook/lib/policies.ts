// policies.ts — Textos genéricos de políticas (sin datos de un solo salón)

const CONSIDERACIONES_PREVIAS_HEADER = `📌 *Antes de tu cita:*

`;

/**
 * Si en el futuro se carga `consideraciones_previas_by_category` en waba_config,
 * el dispatcher puede pasar textos por categoría. Por ahora: mensaje genérico.
 */
export function getConsideracionesPreviasWhatsApp(
  categoryIds: string[],
): string {
  if (categoryIds.length === 0) return "";
  return (
    CONSIDERACIONES_PREVIAS_HEADER +
    `• Llega puntual y, si aplica, sin maquillaje o productos en la zona a tratar.\n\n` +
    `• Si tienes alergias, embarazo o tratamiento médico reciente, avísale al equipo antes de la cita.`
  );
}

export function getPoliticasCitaWhatsApp(businessName: string): string {
  return `📋 *Políticas de la cita:*

⏰ *Tardanzas:* Si llegas tarde, el servicio puede acortarse o reprogramarse según disponibilidad.

❌ *Cancelación:* Avisa con la mayor anticipación posible.

🚫 *No-show:* Si no avisas y no te presentas, el turno puede perderse.

🔄 *Reprogramación:* Consulta con el negocio las condiciones.

💰 *Adelantos:* Si aplica adelanto, las reglas las confirma el equipo al validar tu pago.

_${businessName}_`;
}
