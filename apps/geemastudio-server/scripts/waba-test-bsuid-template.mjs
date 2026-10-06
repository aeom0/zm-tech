#!/usr/bin/env node
/**
 * Prueba manual (NO cron, NO producción): ¿acepta la Cloud API de Meta un
 * mensaje `type: "template"` dirigido por `recipient` (BSUID) en vez de `to`
 * (E.164)?
 *
 * Hoy `send-promo-whatsapp/index.ts` descarta cualquier destinatario BSUID
 * antes de intentarlo — es una decisión de código, nunca se confirmó contra
 * la API real. Este script solo imprime la respuesta cruda de Meta; no
 * cambia nada en la BD ni en producción.
 *
 * Uso:
 *   node scripts/waba-test-bsuid-template.mjs <BSUID>
 *   node scripts/waba-test-bsuid-template.mjs PE.1704503080781860
 *
 * Requiere WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env (raíz).
 * Usa la plantilla `recordatorio_cita_zm` (ya aprobada, bajo riesgo — no es
 * de marketing) con datos de relleno obviamente ficticios.
 *
 * Push a Vanessa/dev: si respondés desde ese BSUID, el webhook real procesa
 * la respuesta como una clienta nueva escribiendo y dispara
 * `notifyAdminsClientChat`. El guard QA (`isQaWaPhone`) solo suprime pushes
 * para BSUIDs con prefijo `PE.QA…` (convención de simulación) — un BSUID
 * personal real queda fuera a propósito, porque para el webhook es una
 * conversación real. Si no querés el push, avisá a Vanessa/dev de antemano
 * o hacé la prueba fuera de horario y silenciá la notificación manualmente.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isWaBsuid, metaRecipientFields } from "../supabase/functions/_shared/wa-recipient.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_NAME = "recordatorio_cita_zm";

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

function buildTemplatePayload(bsuid) {
  return {
    messaging_product: "whatsapp",
    ...metaRecipientFields(bsuid),
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: "es_PE" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Prueba" },
            { type: "text", text: "hoy 5:00 PM" },
            { type: "text", text: "Prueba BSUID (ignorar)" },
          ],
        },
      ],
    },
  };
}

async function main() {
  const bsuid = process.argv[2];
  if (!bsuid) {
    console.error(
      "Uso: node scripts/waba-test-bsuid-template.mjs <BSUID>\n" +
        "Ej:  node scripts/waba-test-bsuid-template.mjs PE.1704503080781860",
    );
    process.exit(1);
  }
  if (!isWaBsuid(bsuid)) {
    console.error(
      `"${bsuid}" no matchea el formato BSUID esperado (ej. PE.1704503080781860). Abortando.`,
    );
    process.exit(1);
  }

  const { accessToken, phoneNumberId } = loadEnvFromRoot();
  const payload = buildTemplatePayload(bsuid);

  console.log("── Payload enviado ──");
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
      "\n✅ Meta aceptó el mensaje. Confirmar entrega real en el teléfono del BSUID antes de dar por bueno el soporte.",
    );
  } else {
    console.log(
      "\n❌ Meta rechazó el mensaje. Ver `error.code` / `error.message` arriba.",
    );
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
