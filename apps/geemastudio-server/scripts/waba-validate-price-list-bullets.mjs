#!/usr/bin/env node
/**
 * Recrea el caso María Elena (+51 977 816 497, 09-sep-2026): al pedir dos
 * categorías a la vez ("pestañas y uñas") Haiku mandaba un párrafo corrido
 * con nombres y precios separados por comas en una sola burbuja por
 * categoría. Valida que ahora use viñetas "•" (una por línea) en vez de
 * ese formato.
 *
 * Usa un teléfono QA, nunca el número real de la clienta.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { buildTextPayload, postWebhook } from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient, seedOutboundAt } from "./lib/waba-sim-seed.mjs";
import {
  fetchHaikuSince,
  finishAndExit,
  pollOutboundSince,
} from "./lib/waba-sim-assert.mjs";

// Rango reservado 51999000970–999 (ver qa-phone.mjs): isQaWaPhone() suprime
// el push a admins solo dentro de este rango — cualquier otro número dispara
// una notificación real (aprendido en carne propia: 51999000901 le llegó a
// Alberto como "💬 Nueva clienta" real).
const PHONE = "51999000982";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsing() {
  await ensureQaClient(supabase, PHONE, "María QA Bullets");
  const { error } = await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`whatsapp_sessions: ${error.message}`);

  // Contexto previo (saludo + lista) para que "pestañas y uñas" llegue a Haiku
  // como pregunta de texto libre, igual que en el caso real.
  await seedOutboundAt(
    supabase,
    PHONE,
    [
      {
        msg_type: "text",
        content:
          "¡Hola, María! 💜 Bienvenida a ZM Lash & Nails Beauty.\n¿Qué servicio te interesa hoy: extensiones, lifting, uñas u otro? Toca una opción abajo para seguir 👇",
      },
      {
        msg_type: "interactive",
        content:
          "[lista] ✨ ZM Lash & Nails: Toca una categoría de la lista para continuar",
      },
    ],
    5 * 60 * 1000,
  );
}

async function askBothCategories() {
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Pestañas y uñas", { contactName: "María QA Bullets" }),
  );
  if (status !== 200) throw new Error(`inbound HTTP ${status}`);
  // 2 categorías = al menos 2 burbujas (perfecto + 1 por categoría);
  // Haiku puede tardar varios segundos en enviar todas.
  return pollOutboundSince(supabase, PHONE, since, {
    timeoutMs: 45000,
    intervalMs: 2000,
    minCount: 3,
  });
}

async function main() {
  const results = [];
  console.log("=== waba:validate:price-list-bullets ===\n");
  console.log(`Teléfono QA: ${PHONE}`);

  try {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
    await seedBrowsing();

    const outbound = await askBothCategories();
    const haiku = await fetchHaikuSince(
      supabase,
      PHONE,
      new Date(Date.now() - 60000).toISOString(),
    );
    const text = outbound.map((m) => m.content ?? "").join("\n");

    console.log(`\nOUT: ${outbound.length} · Haiku: ${haiku.length}`);
    for (const m of outbound) console.log(`  · ${(m.content ?? "").replace(/\n/g, " ⏎ ").slice(0, 160)}`);

    // Firma exacta del bug (caso María Elena): 2+ "Nombre (S/xx)" separados
    // por coma en el mismo párrafo. Esto NUNCA debe volver a aparecer.
    const bugPattern =
      /\(S\/\s?\d+\),\s*[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ. ]*\(S\/\s?\d+\)/;
    const hasBug = bugPattern.test(text);

    // Cuando Haiku sí lista 3+ precios en la respuesta, deben venir en
    // viñetas — no exigimos que SIEMPRE liste todo de una (puede optar por
    // preguntar antes), solo que si lo hace, use el formato correcto.
    const priceCount = (text.match(/S\/\s?\d+/g) ?? []).length;
    // El prompt exige 🌸/⭐ (nunca "•" ni "-") como viñeta — ver haiku-prompt.ts.
    const usedBullets = /[•🌸⭐]/.test(text);
    const bulletsOkWhenListing = priceCount < 3 || usedBullets;

    const pass = !hasBug && bulletsOkWhenListing && outbound.length > 0;
    results.push({
      name: "Sin párrafo de precios con comas (bug María Elena)",
      pass: !hasBug,
      note: hasBug
        ? "reapareció el patrón 'Nombre (S/xx), Nombre (S/xx)'"
        : "no se detectó el patrón del bug",
    });
    results.push({
      name: "Viñetas cuando lista 3+ precios",
      pass: bulletsOkWhenListing,
      note: bulletsOkWhenListing
        ? priceCount >= 3
          ? "listó varios precios y usó viñetas"
          : "no listó 3+ precios en esta corrida (respuesta válida de Haiku, no aplica)"
        : `listó ${priceCount} precios sin viñetas`,
    });
    if (!pass && outbound.length === 0) {
      results.push({
        name: "Respuesta recibida",
        pass: false,
        note: "no llegó ningún mensaje OUT dentro del timeout",
      });
    }
  } catch (error) {
    results.push({
      name: "Ejecución del chat",
      pass: false,
      note: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }

  finishAndExit(results);
}

await main();
