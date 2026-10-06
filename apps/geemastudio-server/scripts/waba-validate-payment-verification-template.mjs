#!/usr/bin/env node
/**
 * QA plantilla pago_recibido_validar_zm + clasificación:
 *  U) parseClassifyResult (unit)
 *  A) INSERT post_service_payment (simula handler tras Haiku) + ack path
 *  B) flag off en waba_config → imagen no crea verification post_service
 *  C) tap pay_verify_approve post_service → approved, appointments intacto, msg corto
 *  D) tap pay_verify_approve deposit → approved + notes cita + msgs confirmación
 *  E) image_classification_enabled=false restaura y verifica config
 *  F) tap pay_verify_approve desde un número que no es Vanessa ni QA → no aprueba
 *
 * Tel: 51999000978 (pati — cleanup al inicio/fin; no paralelizar).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildImagePayload,
  buildButtonPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000978";
/** Número real-looking fuera del rango QA: el tap no debe aprobar. */
const STRANGER_PHONE = "51911100001";
const POLY_GEL_ID = "e3d429cb-3387-45c2-b965-c94b28c81330";
const FAKE_IMAGE =
  "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/inbound-chat/51941701070/1786835594546_38818953276077.jpg";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Mismo contrato que image-classify.ts parseClassifyResult (unit sin Deno). */
function parseClassifyResult(raw) {
  const empty = { kind: null, extraction: null };
  try {
    const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned);
    const validKinds = ["comprobante_pago", "diseno_referencia", "otro"];
    if (!validKinds.includes(parsed?.kind)) return empty;
    return {
      kind: parsed.kind,
      extraction:
        parsed.kind === "comprobante_pago"
          ? (parsed.extraction ?? {
              app_origen: "No detectado",
              monto: "No detectado",
              fecha_hora_pago: "No detectado",
              destino: "No detectado",
              operacion_ultimos4: "No detectado",
            })
          : null,
    };
  } catch {
    return empty;
  }
}

function runUnitParse() {
  const fails = [];
  const a = parseClassifyResult(
    JSON.stringify({
      kind: "comprobante_pago",
      extraction: {
        app_origen: "Yape",
        monto: "60.00",
        fecha_hora_pago: "15 ago",
        destino: "Zm",
        operacion_ultimos4: "5531",
      },
    }),
  );
  if (a.kind !== "comprobante_pago" || a.extraction?.monto !== "60.00") {
    fails.push("U: comprobante_pago parse");
  }
  const b = parseClassifyResult('{"kind":"diseno_referencia","extraction":null}');
  if (b.kind !== "diseno_referencia" || b.extraction !== null) {
    fails.push("U: diseno_referencia parse");
  }
  const c = parseClassifyResult("not json");
  if (c.kind !== null) fails.push("U: invalid → null");
  return fails;
}

async function setImageClassificationEnabled(enabled) {
  const { error } = await supabase.from("waba_config").upsert(
    {
      config_key: "image_classification_enabled",
      label: "Clasificación de imágenes inbound (Haiku Vision)",
      category: "mensajes",
      config_value: { enabled },
      is_active: true,
      sort_order: 50,
      tenant_id: "zm-lash-nails",
    },
    { onConflict: "tenant_id,config_key" },
  );
  if (error) throw new Error(`waba_config upsert: ${error.message}`);
}

async function seedBrowsing() {
  await ensureQaClient(supabase, PHONE, "QA Pago Verify");
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    bot_paused_at: null,
    updated_at: new Date().toISOString(),
  });
}

async function insertVerification(kind, opts = {}) {
  const now = new Date().toISOString();
  let appointmentId = opts.appointmentId ?? null;
  if (kind === "deposit" && !appointmentId) {
    const { data: appt, error: aErr } = await supabase
      .from("appointments")
      .insert({
        client_name: "QA Pago Verify",
        client_phone: PHONE,
        service_id: POLY_GEL_ID,
        date: now.replace("T", " ").slice(0, 19),
        status: "scheduled",
        price: "70.00",
        duration: 60,
        source: "whatsapp",
        whatsapp_phone: PHONE,
        notes: "QA deposit verify",
      })
      .select("id")
      .single();
    if (aErr) throw new Error(`appt insert: ${aErr.message}`);
    appointmentId = appt.id;
  }

  const { data: ver, error } = await supabase
    .from("appointment_verifications")
    .insert({
      appointment_id: appointmentId,
      client_phone: PHONE,
      client_name: "QA Pago Verify",
      service_name: kind === "deposit" ? "PolyGel" : "Pago recibido",
      appointment_date: now,
      amount_deposit: kind === "deposit" ? "14.00" : "0",
      amount_total: kind === "deposit" ? "70.00" : "60.00",
      payment_screenshot_url: FAKE_IMAGE,
      status: "payment_submitted",
      kind,
    })
    .select("id, appointment_id, status, kind")
    .single();
  if (error) throw new Error(`verification insert: ${error.message}`);
  return ver;
}

async function countPostServiceVerifications(sinceIso) {
  const { data, error } = await supabase
    .from("appointment_verifications")
    .select("id, kind, created_at")
    .eq("client_phone", PHONE)
    .eq("kind", "post_service_payment")
    .gte("created_at", sinceIso);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getAppointment(id) {
  const { data } = await supabase
    .from("appointments")
    .select("id, status, notes")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function wipePhoneArtifacts() {
  await supabase
    .from("appointment_verifications")
    .delete()
    .eq("client_phone", PHONE);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
}

async function main() {
  const results = [];
  console.log("=== waba:validate:payment-verification ===\n");
  console.log(`Teléfono: ${PHONE}\n`);

  const unitFails = runUnitParse();
  results.push({
    name: "U parseClassifyResult",
    pass: unitFails.length === 0,
    note: unitFails.length === 0 ? "ok" : unitFails.join("; "),
  });

  try {
    await wipePhoneArtifacts();
    await seedBrowsing();
    await setImageClassificationEnabled(true);

    // A) Simula fila post_service (handler tras Haiku) — assert kind
    {
      const ver = await insertVerification("post_service_payment");
      const pass = ver.kind === "post_service_payment";
      results.push({
        name: "A INSERT kind=post_service_payment",
        pass,
        note: pass ? "ok" : `got ${ver.kind}`,
      });
    }

    // B) flag off + imagen fake → no nueva verification post_service
    {
      await setImageClassificationEnabled(false);
      await seedBrowsing();
      const t0 = new Date().toISOString();
      await sleep(200);
      const status = await postWebhook(
        webhookUrl,
        buildImagePayload(PHONE, {
          wamid: newWamid(),
          contactName: "QA Pago",
        }),
      );
      await sleep(4000);
      const created = await countPostServiceVerifications(t0);
      const pass = status === 200 && created.length === 0;
      results.push({
        name: "B flag off → sin post_service",
        pass,
        note: pass
          ? "ok"
          : `status=${status} created=${created.length}`,
      });
      await setImageClassificationEnabled(true);
    }

    // C) approve post_service
    {
      await wipePhoneArtifacts();
      await seedBrowsing();
      const ver = await insertVerification("post_service_payment");
      const { data: appt } = await supabase
        .from("appointments")
        .insert({
          client_name: "QA Pago Verify",
          client_phone: PHONE,
          service_id: POLY_GEL_ID,
          date: new Date().toISOString().replace("T", " ").slice(0, 19),
          status: "completed",
          price: "70.00",
          duration: 60,
          source: "whatsapp",
          notes: "QA post_service MUST stay completed",
        })
        .select("id, status, notes")
        .single();
      if (appt?.id) {
        await supabase
          .from("appointment_verifications")
          .update({ appointment_id: appt.id })
          .eq("id", ver.id);
      }

      const t0 = new Date().toISOString();
      await sleep(200);
      const st = await postWebhook(
        webhookUrl,
        buildButtonPayload(PHONE, "Aprobar", {
          wamid: newWamid(),
          payload: `pay_verify_approve:${ver.id}`,
          contactName: "Vanessa QA",
        }),
      );
      const outs = await pollOutboundSince(supabase, PHONE, t0, {
        timeoutMs: 15000,
        minCount: 1,
      });
      const { data: verAfter } = await supabase
        .from("appointment_verifications")
        .select("status, kind")
        .eq("id", ver.id)
        .single();
      let note = "ok";
      let pass = true;
      if (st !== 200) {
        pass = false;
        note = `webhook ${st}`;
      } else if (verAfter?.status !== "approved") {
        pass = false;
        note = `status=${verAfter?.status}`;
      } else if (appt?.id) {
        const a2 = await getAppointment(appt.id);
        if (a2?.status !== "completed") {
          pass = false;
          note = `appt status=${a2?.status}`;
        } else if (!/MUST stay completed/.test(a2?.notes ?? "")) {
          pass = false;
          note = "notes pisadas";
        }
      }
      const shortAck = outs.some((m) =>
        /Confirmamos que recibimos tu pago/i.test(m.content ?? ""),
      );
      const vanessaAck = outs.some((m) =>
        /Marcado como aprobado/i.test(m.content ?? ""),
      );
      if (pass && !shortAck && !vanessaAck) {
        pass = false;
        note = `sin ack (outs=${outs.length})`;
      }
      results.push({
        name: "C approve post_service_payment",
        pass,
        note,
      });
    }

    // D) approve deposit
    {
      await wipePhoneArtifacts();
      await seedBrowsing();
      const ver = await insertVerification("deposit");
      const apptId = ver.appointment_id;
      const t0 = new Date().toISOString();
      await sleep(200);
      const st = await postWebhook(
        webhookUrl,
        buildButtonPayload(PHONE, "Aprobar", {
          wamid: newWamid(),
          payload: `pay_verify_approve:${ver.id}`,
          contactName: "Vanessa QA",
        }),
      );
      const outs = await pollOutboundSince(supabase, PHONE, t0, {
        timeoutMs: 20000,
        minCount: 2,
      });
      const { data: verAfter } = await supabase
        .from("appointment_verifications")
        .select("status, kind")
        .eq("id", ver.id)
        .single();
      let note = "ok";
      let pass = true;
      if (st !== 200) {
        pass = false;
        note = `webhook ${st}`;
      } else if (verAfter?.status !== "approved") {
        pass = false;
        note = `status=${verAfter?.status}`;
      } else if (apptId) {
        const a2 = await getAppointment(apptId);
        if (!/Pago validado/i.test(a2?.notes ?? "")) {
          pass = false;
          note = `notes=${a2?.notes}`;
        }
      }
      const confirmed = outs.some((m) =>
        /Tu cita ha sido confirmada/i.test(m.content ?? ""),
      );
      if (pass && !confirmed) {
        pass = false;
        note = "sin confirmación de cita";
      }
      results.push({
        name: "D approve deposit",
        pass,
        note,
      });
    }

    // E) config flag
    {
      await setImageClassificationEnabled(false);
      const { data } = await supabase
        .from("waba_config")
        .select("config_value")
        .eq("config_key", "image_classification_enabled")
        .maybeSingle();
      const pass = data?.config_value?.enabled === false;
      results.push({
        name: "E image_classification_enabled=false",
        pass,
        note: pass ? "ok" : JSON.stringify(data?.config_value),
      });
      await setImageClassificationEnabled(true);
    }

    // F) tap desde número no-admin / no-QA → no aprueba
    {
      await wipePhoneArtifacts();
      await seedBrowsing();
      const ver = await insertVerification("post_service_payment");
      const st = await postWebhook(
        webhookUrl,
        buildButtonPayload(STRANGER_PHONE, "Aprobar", {
          wamid: newWamid(),
          payload: `pay_verify_approve:${ver.id}`,
          contactName: "Intruso",
        }),
      );
      await sleep(3000);
      const { data: verAfter } = await supabase
        .from("appointment_verifications")
        .select("status")
        .eq("id", ver.id)
        .single();
      const pass = st === 200 && verAfter?.status === "payment_submitted";
      results.push({
        name: "F tap no-admin no aprueba",
        pass,
        note: pass ? "ok" : `status=${st} ver=${verAfter?.status}`,
      });
      await cleanupQaPhone(supabase, STRANGER_PHONE, { deleteClient: true });
    }
  } finally {
    await wipePhoneArtifacts();
    console.log("\nCleanup QA OK:", PHONE);
  }

  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
