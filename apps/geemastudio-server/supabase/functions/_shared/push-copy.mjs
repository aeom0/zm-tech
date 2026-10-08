const TEMPLATE_LABELS = {
  recordatorio_cita_zm: "Recordatorio de cita",
  recordatorio_mismo_dia_zm: "Recordatorio mismo día",
  retoque_reenganche_zm: "Reenganche de retoque",
  promo_zm_v1: "Promo",
  pago_recibido_validar_zm: "Pago recibido por validar",
};

export function friendlyTemplateLabel(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  if (TEMPLATE_LABELS[key]) return TEMPLATE_LABELS[key];
  const base = key.replace(/_zm$/, "").replace(/_/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Plantilla";
}

/** Reemplaza slugs Meta solo cuando corresponden a una plantilla. */
export function formatQuotedPreview(content) {
  const raw = String(content || "")
    .trim()
    .slice(0, 180);
  return raw.replace(
    /^\[(?:plantilla:)?((?:recordatorio|retoque|promo|pago)[a-z0-9_]*)\]\s*/i,
    (_, slug) => `${friendlyTemplateLabel(slug)} · `,
  );
}

function isDispatchProcessingError(errorMessage) {
  return /\b(peer|coalesc|lock|dispatch|inbound[_\s-]*gate)\b/i.test(
    errorMessage,
  );
}

export function formatWaErrorPushCopy({
  kind,
  phone,
  contactName,
  preview,
  fallbackSent,
  rawError,
}) {
  const name = (contactName || "").trim().split(/\s+/)[0] || null;
  const phoneTail = phone ? String(phone).replace(/\D/g, "").slice(-4) : null;
  const who = name
    ? phoneTail ? `${name} (…${phoneTail})` : name
    : phoneTail
    ? `Clienta …${phoneTail}`
    : "Clienta sin número";
  const cleanPreview = String(preview || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 70);

  if (kind === "missing_from_phone") {
    return {
      title: "WhatsApp · Sin teléfono",
      body: cleanPreview
        ? `${who} escribió y WhatsApp no envió su número. "${cleanPreview}"`
        : `${who} escribió y no pudimos identificar su número. Revisa el chat.`,
    };
  }

  if (kind === "skip_dispatch_lock_exhausted") {
    return fallbackSent
      ? {
        title: "WhatsApp · Atención requerida",
        body: cleanPreview
          ? `${who} envió un mensaje que necesita seguimiento. "${cleanPreview}"`
          : `${who} envió un mensaje que necesita seguimiento. Abre el chat.`,
      }
      : {
        title: "WhatsApp · Conversación sin respuesta",
        body: cleanPreview
          ? `${who} envió un mensaje y no recibió respuesta. "${cleanPreview}"`
          : `${who} envió un mensaje y necesita atención. Abre el chat.`,
      };
  }

  if (kind === "replace_crash") {
    return technicalReviewCopy(who);
  }

  if (isDispatchProcessingError(rawError)) {
    return fallbackSent
      ? {
        title: "WhatsApp · Atención requerida",
        body: `${who} envió un mensaje que necesita seguimiento. Abre el chat.`,
      }
      : {
        title: "WhatsApp · Conversación sin respuesta",
        body: `${who} envió un mensaje y no recibió respuesta. Abre el chat.`,
      };
  }

  return technicalReviewCopy(who);
}

function technicalReviewCopy(who) {
  return {
    title: "WhatsApp · Revisión técnica",
    body:
      `No pudimos completar automáticamente la atención de ${who}. Revisa el chat y responde manualmente.`,
  };
}

const QUALITY_FLAG_LABELS = {
  unanswered_price: "precio sin aclarar",
  cart_mismatch: "carrito ≠ pedido",
  promo_ignored: "promo ignorada",
  client_confused: "clienta confundida",
};

/**
 * Etiqueta visible en push Revisar YA.
 * Nunca usar sufijo de BSUID (PE.…3237) — no sirve para ubicar el chat.
 * Preferir nombre → @username → "Sin teléfono" (BSUID) → …últimos4 (E.164).
 */
export function qualityPushWhoLabel({
  firstName,
  waUsername,
  phone,
}) {
  const name = String(firstName || "")
    .trim()
    .split(/\s+/)[0]
    ?.slice(0, 24);
  if (name && name.length >= 2 && !/^cliente$/i.test(name)) return name;
  const user = String(waUsername || "")
    .trim()
    .replace(/^@/, "");
  if (user) return `@${user.slice(0, 22)}`;
  const p = String(phone || "").trim();
  if (/^[A-Z]{2}\./.test(p)) return "Sin teléfono";
  const digits = p.replace(/\D/g, "");
  if (digits.length >= 4) return `…${digits.slice(-4)}`;
  return "Clienta";
}

/** Título + body cortos; el nombre va en título Y body (lock screen trunca). */
export function formatQualityPushCopy({
  firstName,
  waUsername,
  phone,
  flags,
  summary,
  severity,
}) {
  const who = qualityPushWhoLabel({ firstName, waUsername, phone });
  const flagText = (flags || [])
    .slice(0, 2)
    .map((f) => QUALITY_FLAG_LABELS[f] ?? f)
    .join(" · ");
  const title = severity === "high"
    ? `WhatsApp · Revisar YA · ${who}`
    : `WhatsApp · Revisar · ${who}`;
  let body = flagText
    ? `${who} · ${flagText}`
    : `${who} · revisar conversación`;
  const hint = String(summary || "")
    .replace(/\s+/g, " ")
    .trim();
  if (hint && body.length + hint.length < 100) {
    body = `${body}. ${hint}`;
  }
  return { title: title.slice(0, 65), body: body.slice(0, 120) };
}
