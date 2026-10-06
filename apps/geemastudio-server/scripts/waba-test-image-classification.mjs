#!/usr/bin/env node
/**
 * Prueba manual (NO cron, NO producción): ¿Haiku vision distingue
 * comprobante_pago / diseno_referencia / otro sobre imágenes REALES ya
 * recibidas por el bot? Este script no escribe nada en BD ni cambia
 * comportamiento del webhook — solo llama a la API de Anthropic y compara
 * contra el label esperado (armado a mano leyendo los chats reales).
 *
 * Casos (wa_messages, agosto 2026):
 *   - Pamela Illich   (51941701070): comprobante Plin→Yape S/60 — SIN caption
 *   - Pati Cavana     (51998165951): captura del propio chat del bot con un
 *                                    botón circulado a mano ("Ver opciones")
 *   - Merillyn        (51933247296): 2 imágenes — sus manos ("Se me acaban
 *                                    de caer mis uñas Rubber") y una captura
 *                                    de video con el diseño que quiere
 *
 * Uso:
 *   node scripts/waba-test-image-classification.mjs
 *
 * Requiere ANTHROPIC_API_KEY en .env (raíz).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "claude-haiku-4-5-20251001";

const VALID_LABELS = ["comprobante_pago", "diseno_referencia", "otro"];

// Mismo prompt que iría en producción — clasificación pura, sin describir
// el diseño (evita que Haiku "invente" detalles del contenido visual).
const CLASSIFICATION_PROMPT = `Clasifica esta imagen enviada por una clienta a un bot de WhatsApp de un salón de belleza (ZM Lash & Nails).

Elige EXACTAMENTE una de estas 3 categorías:
- "comprobante_pago": captura de una app de pagos (Yape, Plin, transferencia bancaria, voucher) mostrando un monto, cuenta destino, número de operación, etc.
- "diseno_referencia": foto de manos/uñas/pestañas/cejas (propias, dañadas, o de otra persona como inspiración), incluyendo capturas de video/redes sociales mostrando un diseño.
- "otro": cualquier otra cosa — capturas de chat, memes, documentos, fotos sin relación con pago o diseño de uñas/pestañas.

No describas el contenido de la imagen. No expliques tu razonamiento.
Responde ÚNICAMENTE con este JSON, sin texto adicional ni markdown:
{"tipo_imagen": "comprobante_pago" | "diseno_referencia" | "otro"}`;

const CASES = [
  {
    name: "Pamela Illich — comprobante Plin→Yape S/60 (sin caption)",
    phone: "51941701070",
    url: "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/inbound-chat/51941701070/1786835594546_38818953276077.jpg",
    expected: "comprobante_pago",
  },
  {
    name: "Pati Cavana — captura del propio chat, botón circulado a mano",
    phone: "51998165951",
    url: "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/inbound-chat/51998165951/1786665241366_97269738744521.jpg",
    expected: "otro",
  },
  {
    name: "Merillyn (1/2) — sus manos, 'se me cayeron mis uñas Rubber'",
    phone: "51933247296",
    url: "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/inbound-chat/51933247296/1786650108434_91575562702498.jpg",
    expected: "diseno_referencia",
  },
  {
    name: "Merillyn (2/2) — captura de video con el diseño que quiere",
    phone: "51933247296",
    url: "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/inbound-chat/51933247296/1786651313484_60546986222581.jpg",
    expected: "diseno_referencia",
  },
];

function loadEnvFromRoot() {
  const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta ANTHROPIC_API_KEY en .env");
  }
  return { apiKey };
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No pude descargar ${url}: ${res.status}`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mediaType: contentType };
}

async function classifyImage(apiKey, imageUrl) {
  const { base64, mediaType } = await fetchImageAsBase64(imageUrl);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: CLASSIFICATION_PROMPT },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data?.error?.message ?? `HTTP ${res.status}`, raw: data };
  }

  const textBlock = data?.content?.find((b) => b.type === "text");
  const rawText = textBlock?.text?.trim() ?? "";

  let parsed = null;
  try {
    // Tolerar si Haiku envuelve en ```json pese a la instrucción
    const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "");
    parsed = JSON.parse(cleaned);
  } catch {
    // deja parsed=null, se reporta como fallo de formato
  }

  return {
    rawText,
    label: parsed?.tipo_imagen ?? null,
    validLabel: VALID_LABELS.includes(parsed?.tipo_imagen),
    usage: data?.usage,
  };
}

async function main() {
  const { apiKey } = loadEnvFromRoot();

  console.log("\n=== QA manual: clasificación de imágenes con Haiku vision ===\n");
  console.log(`Modelo: ${MODEL}\n`);

  let passCount = 0;

  for (const c of CASES) {
    process.stdout.write(`→ ${c.name}\n  esperado: ${c.expected} ... `);
    try {
      const result = await classifyImage(apiKey, c.url);
      if (result.error) {
        console.log(`❌ ERROR API: ${result.error}`);
        continue;
      }
      if (!result.validLabel) {
        console.log(`❌ FORMATO INVÁLIDO — respuesta cruda: "${result.rawText}"`);
        continue;
      }
      const pass = result.label === c.expected;
      if (pass) passCount++;
      console.log(
        `${pass ? "✅" : "❌"} obtenido: ${result.label}` +
          (result.usage
            ? ` (in=${result.usage.input_tokens} out=${result.usage.output_tokens})`
            : ""),
      );
    } catch (err) {
      console.log(`❌ EXCEPCIÓN: ${err.message}`);
    }
  }

  console.log(`\n${passCount}/${CASES.length} casos correctos.\n`);
  if (passCount < CASES.length) {
    console.log(
      "⚠️  No todos los casos pasaron — revisar el prompt de clasificación antes de integrarlo a dispatcher.ts.",
    );
    process.exit(1);
  }
  console.log("✅ Los 3 chats reales se clasificaron correctamente. Listo para diseñar el modo sombra de imágenes.");
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
