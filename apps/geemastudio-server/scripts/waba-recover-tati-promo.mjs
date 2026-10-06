#!/usr/bin/env node
/**
 * Recuperación puntual + prueba real: enviar la promo "Manos y Pies 15% dscto
 * L-Mi" a Tati (BSUID PE.1028831263081314) vía plantilla `promo_zm_v1` con
 * `recipient` en vez de `to`.
 *
 * Doble propósito, explícito y documentado:
 * 1. Recuperar un lead pagado real que quedó fuera de la ventana de 24h por
 *    el bug de BSUID (v3.5, ver CLAUDE.md) antes del fix.
 * 2. Confirmar si Meta Cloud API acepta `type:"template"` con `recipient`
 *    para BSUID — hoy `send-promo-whatsapp/index.ts` lo descarta sin
 *    intentarlo (`isE164WaPhone` guard). Este script SÍ lo intenta.
 *
 * NO toca `send-promo-whatsapp`, `promo_broadcasts` ni `promo_broadcast_items`
 * — es intencionalmente un script aislado, de un solo uso, fuera del flujo
 * de producción hasta que el resultado esté confirmado.
 *
 * Uso:
 *   node scripts/waba-recover-tati-promo.mjs
 *
 * Requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env (raíz).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { metaRecipientFields } from "../supabase/functions/_shared/wa-recipient.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TATI_BSUID = "PE.1028831263081314";
const TATI_CLIENT_NAME = "Tati";
const TEMPLATE_NAME = "promo_zm_v1";
const IMAGE_URL =
  "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/campanas/meta-ads-image-2.jpg";
const PROMO_BODY_TEXT =
  "🌸 Luce tus manos y pies en este verano largo 💅🏼 anda arreglada para todo tipo de ocasiones 🪻Aprovecha nuestro 15% de Dscto ✨ de Lunes a Miércoles";

function loadEnvFromRoot() {
  const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en .env",
    );
  }
  return { accessToken, phoneNumberId };
}

async function uploadImageToWhatsApp(accessToken, phoneNumberId, imageUrl) {
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error(
      `No se pudo descargar la imagen: ${imageRes.status} ${await imageRes.text()}`,
    );
  }
  const blob = await imageRes.blob();
  const contentType = blob.type || "image/jpeg";

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", contentType);
  form.append("file", blob, "promo-tati.jpg");

  const res = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );
  const data = await res.json();
  console.log("── Respuesta Media API ──");
  console.log(JSON.stringify(data, null, 2));
  if (!res.ok || data.error || !data.id) {
    throw new Error("Error subiendo imagen a WhatsApp Media API");
  }
  return data.id;
}

function buildTemplatePayload(bsuid, waMediaId) {
  return {
    messaging_product: "whatsapp",
    ...metaRecipientFields(bsuid),
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: "es_PE" },
      components: [
        {
          type: "header",
          parameters: [{ type: "image", image: { id: waMediaId } }],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: TATI_CLIENT_NAME },
            { type: "text", text: PROMO_BODY_TEXT },
          ],
        },
      ],
    },
  };
}

async function main() {
  const { accessToken, phoneNumberId } = loadEnvFromRoot();

  console.log(`Subiendo imagen de la promo (${IMAGE_URL})...`);
  const waMediaId = await uploadImageToWhatsApp(
    accessToken,
    phoneNumberId,
    IMAGE_URL,
  );
  console.log(`Media ID obtenido: ${waMediaId}\n`);

  const payload = buildTemplatePayload(TATI_BSUID, waMediaId);
  console.log("── Payload enviado a Tati ──");
  console.log(JSON.stringify(payload, null, 2));

  const res = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const data = await res.json().catch(() => null);

  console.log(`\n── Respuesta Meta (status ${res.status}) ──`);
  console.log(JSON.stringify(data, null, 2));

  if (res.ok && !data?.error) {
    console.log(
      "\n✅ Meta aceptó el mensaje. Confirmar con Tati (o en el panel /panel/waba/mensajes) que le llegó de verdad antes de dar por bueno el soporte de recipient+template para BSUID.",
    );
  } else {
    console.log(
      "\n❌ Meta rechazó el mensaje. Revisar error.code / error.message arriba — esto confirma que templates NO soportan recipient para BSUID (al menos con esta plantilla/número).",
    );
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
