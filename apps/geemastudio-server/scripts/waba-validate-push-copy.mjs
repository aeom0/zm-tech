#!/usr/bin/env node
/** Pruebas unitarias del copy de alertas push y previews de plantillas. */
import assert from "node:assert/strict";
import {
  formatQuotedPreview,
  formatWaErrorPushCopy,
  formatQualityPushCopy,
  qualityPushWhoLabel,
} from "../supabase/functions/_shared/push-copy.mjs";

function getAndroidChannelId(data = {}) {
  if (
    data.screen === "ValidacionPagos" ||
    data.type === "payment" ||
    data.type === "anthropic_credit"
  ) {
    return "waba-alerts";
  }
  if (data.type === "appointment_reference" || data.screen === "Agenda") {
    return "waba-appointments";
  }
  if (
    data.reason === "design_image" ||
    data.reason === "audio_message" ||
    data.reason === "paused_reply" ||
    data.reason === "client_chat" ||
    data.error_kind
  ) {
    return "waba-chat";
  }
  return "default";
}

const checks = [
  [
    "plantilla con etiqueta humana",
    formatQuotedPreview(
      "[plantilla:recordatorio_cita_zm] ADIARIS · 2:00 P. M.",
    ) === "Recordatorio de cita · ADIARIS · 2:00 P. M.",
  ],
  [
    "no altera imagen",
    formatQuotedPreview("[imagen] Builder Gel") === "[imagen] Builder Gel",
  ],
  [
    "sin respuesta",
    formatWaErrorPushCopy({
      kind: "skip_dispatch_lock_exhausted",
      phone: "51932531366",
      contactName: "Adiaris",
      fallbackSent: false,
      preview: "Cuánto cuesta el lifting?",
      rawError: "skip_dispatch_lock_exhausted",
    }).title === "WhatsApp · Conversación sin respuesta",
  ],
  [
    "sin respuesta muestra preview de clienta no nota técnica",
    formatWaErrorPushCopy({
      kind: "skip_dispatch_lock_exhausted",
      phone: "5193266235",
      contactName: null,
      fallbackSent: false,
      preview: "Cuánto cuesta el lifting?",
      rawError: "skip_dispatch_lock_exhausted",
    }).body.includes("Cuánto cuesta el lifting?") &&
      !/peer|lock|dispatch|coalesc/i.test(
        formatWaErrorPushCopy({
          kind: "skip_dispatch_lock_exhausted",
          phone: "5193266235",
          contactName: null,
          fallbackSent: false,
          preview: "Cuánto cuesta el lifting?",
          rawError: "skip_dispatch_lock_exhausted",
        }).body,
      ),
  ],
  [
    "seguimiento con fallback",
    formatWaErrorPushCopy({
      kind: "skip_dispatch_lock_exhausted",
      phone: "51932531366",
      contactName: "Adiaris",
      fallbackSent: true,
      preview: "Hola quiero agendar",
      rawError: "skip_dispatch_lock_exhausted",
    }).title === "WhatsApp · Atención requerida",
  ],
  [
    "error desconocido sin lenguaje técnico",
    !/peer|lock|dispatch|coalesc/i.test(
      formatWaErrorPushCopy({
        kind: "otro_error",
        phone: "51932531366",
        contactName: "Adiaris",
        fallbackSent: false,
        rawError: "Unhandled internal exception in pipeline",
      }).body,
    ),
  ],
  [
    "clienta nueva va a chats",
    getAndroidChannelId({ type: "waba_chat", reason: "client_chat" }) ===
      "waba-chat",
  ],
  [
    "respuesta pausada va a chats",
    getAndroidChannelId({ type: "waba_chat", reason: "paused_reply" }) ===
      "waba-chat",
  ],
  [
    "error WABA va a chats",
    getAndroidChannelId({ type: "waba_chat", error_kind: "timeout" }) ===
      "waba-chat",
  ],
  [
    "referencia va a citas",
    getAndroidChannelId({ type: "appointment_reference" }) ===
      "waba-appointments",
  ],
  [
    "quality push BSUID usa nombre no …3237",
    formatQualityPushCopy({
      firstName: "SOFI",
      waUsername: "sofia_og09",
      phone: "PE.1077621971473237",
      flags: ["client_confused"],
      summary: "menú tras Si",
      severity: "high",
    }).title === "WhatsApp · Revisar YA · SOFI",
  ],
  [
    "quality push BSUID sin nombre usa @user",
    qualityPushWhoLabel({
      firstName: null,
      waUsername: "sofia_og09",
      phone: "PE.1077621971473237",
    }) === "@sofia_og09",
  ],
  [
    "quality push BSUID sin ficha no usa sufijo PE",
    qualityPushWhoLabel({
      firstName: null,
      waUsername: null,
      phone: "PE.1077621971473237",
    }) === "Sin teléfono",
  ],
  [
    "quality body incluye nombre + flag",
    formatQualityPushCopy({
      firstName: "Sofi",
      waUsername: null,
      phone: "PE.1077621971473237",
      flags: ["client_confused", "cart_mismatch"],
      summary: "",
      severity: "medium",
    }).body.startsWith("Sofi · clienta confundida"),
  ],
];

for (const [name, passed] of checks) {
  assert.equal(passed, true, name);
  console.log(`  ✓ ${name}`);
}
console.log(`\n✅ ${checks.length} checks OK`);
