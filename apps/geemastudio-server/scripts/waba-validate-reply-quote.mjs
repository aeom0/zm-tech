#!/usr/bin/env node
/**
 * QA unitario — reply con quote (deslizar a la derecha).
 * Mirror de helpers en reply-context.ts. Sin webhook / cleanup.
 */
import assert from "node:assert/strict";

function getInboundReplyContext(message) {
  const ctx = message?.context;
  if (!ctx || typeof ctx !== "object") return null;
  if (ctx.referred_product != null) return null;
  const id = typeof ctx.id === "string" ? ctx.id.trim() : "";
  if (!id) return null;
  const from = typeof ctx.from === "string" ? ctx.from.trim() : undefined;
  return { id, ...(from ? { from } : {}) };
}

function extractMetaWamid(data) {
  if (!data || typeof data !== "object") return null;
  const messages = data.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const id = messages[0]?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function shouldEnrichWithQuotedContent(userText) {
  const reply = userText.trim();
  if (!reply) return true;
  return reply.length <= 48 && !/\n/.test(reply);
}

function enrichTextWithQuotedContent(userText, quotedContent) {
  const base = userText.trim();
  const quoted = quotedContent.trim().slice(0, 600);
  if (!quoted) return base;
  if (!shouldEnrichWithQuotedContent(base)) return base;
  if (!base) return `[Respondiendo a] ${quoted}`;
  if (base.includes("[Respondiendo a]")) return base;
  return `${base}\n[Respondiendo a] ${quoted}`;
}

function formatInboundWithQuotePreview(inboundPreview, quotedContent) {
  const base = inboundPreview.trim() || "[mensaje]";
  if (!quotedContent?.trim()) return base;
  const quoted = quotedContent
    .trim()
    .slice(0, 180)
    .replace(
      /^\[(?:plantilla:)?((?:recordatorio|retoque|promo)[a-z0-9_]*)\]\s*/i,
      (_, slug) => {
        const labels = {
          recordatorio_cita_zm: "Recordatorio de cita",
          recordatorio_mismo_dia_zm: "Recordatorio mismo día",
          retoque_reenganche_zm: "Reenganche de retoque",
          promo_zm_v1: "Promo",
        };
        const key = slug.toLowerCase();
        return `${labels[key] ?? key.replace(/_zm$/i, "").replace(/_/g, " ")} · `;
      },
    );
  return `${base} ↳ ${quoted}`.slice(0, 2000);
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  console.log(`  ✓ ${name}`);
  passed++;
}

console.log("── reply-quote unit ──");

ok(
  "sin context → null",
  getInboundReplyContext({ type: "text", text: { body: "hola" } }) === null,
);

ok(
  "context.id → quote",
  getInboundReplyContext({
    type: "text",
    text: { body: "Si" },
    context: { from: "51932535512", id: "wamid.ABC123" },
  })?.id === "wamid.ABC123",
);

ok(
  "referred_product ≠ quote de chat",
  getInboundReplyContext({
    context: {
      id: "wamid.X",
      referred_product: { catalog_id: "1", product_retailer_id: "2" },
    },
  }) === null,
);

ok(
  "Meta send response → wamid",
  extractMetaWamid({
    messaging_product: "whatsapp",
    messages: [{ id: "wamid.OUT99" }],
  }) === "wamid.OUT99",
);

ok(
  "Si + caption creativo",
  enrichTextWithQuotedContent("Si", "[imagen] Soft Gel manos y pies S/90") ===
    "Si\n[Respondiendo a] [imagen] Soft Gel manos y pies S/90",
);

ok(
  "solo quote si body vacío",
  enrichTextWithQuotedContent("", "[lista] Uñas: elige") ===
    "[Respondiendo a] [lista] Uñas: elige",
);

ok(
  "no duplicar bloque",
  enrichTextWithQuotedContent("ok\n[Respondiendo a] ya", "otro") ===
    "ok\n[Respondiendo a] ya",
);

ok(
  "pregunta larga + quote ubicación → no enriquecer (TRANSCAM)",
  enrichTextWithQuotedContent(
    "En el caso de las uñitas, que precio estan ? Por favor",
    "📍 *Nuestra ubicación*\n\nCalle Artesanos 150\nGoogle Maps:\nhttps://maps.app.goo.gl/x",
  ) === "En el caso de las uñitas, que precio estan ? Por favor",
);

ok(
  "pregunta larga + quote horarios → no enriquecer",
  enrichTextWithQuotedContent(
    "Hola, y cuánto sale el soft gel de manos y pies por favor?",
    "🕐 *Horarios de atención*\n\n**Lunes a Sábado:** 10 AM - 6 PM",
  ) === "Hola, y cuánto sale el soft gel de manos y pies por favor?",
);

ok(
  "Si corto sí enriquece",
  shouldEnrichWithQuotedContent("Si") === true &&
    shouldEnrichWithQuotedContent(
      "En el caso de las uñitas, que precio estan ? Por favor",
    ) === false,
);

ok(
  "preview panel con ↳",
  formatInboundWithQuotePreview("Este me interesa", "[imagen] Rubber base") ===
    "Este me interesa ↳ [imagen] Rubber base",
);

ok(
  "preview de plantilla con etiqueta humana",
  formatInboundWithQuotePreview(
    "Confirmo mi cita",
    "[plantilla:recordatorio_cita_zm] ADIARIS · sábado 22 de agosto a las 2:00 P. M.",
  ) ===
    "Confirmo mi cita ↳ Recordatorio de cita · ADIARIS · sábado 22 de agosto a las 2:00 P. M.",
);

console.log(`\n✅ ${passed} checks OK`);
