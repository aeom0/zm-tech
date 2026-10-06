/**
 * Limpieza de datos QA tras simulación WABA (orden FK).
 */

/** Elimina citas y dependencias por sufijo de teléfono o client.wa_user_id (BSUID). */
export async function deleteAppointmentsByPhone(supabase, testPhone) {
  let ids = [];

  if (/^[A-Z]{2}\./.test(testPhone)) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("wa_user_id", testPhone)
      .maybeSingle();
    if (client?.id) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id")
        .eq("client_id", client.id);
      ids = (appts ?? []).map((a) => a.id);
    }
  } else {
    const last9 = testPhone.replace(/\D/g, "").slice(-9);
    const { data: appts } = await supabase
      .from("appointments")
      .select("id")
      .ilike("client_phone", `%${last9}%`);
    ids = (appts ?? []).map((a) => a.id);
  }

  if (!ids.length) return 0;

  await supabase
    .from("appointment_services")
    .delete()
    .in("appointment_id", ids);
  await supabase
    .from("appointment_verifications")
    .delete()
    .in("appointment_id", ids);
  await supabase.from("payments").delete().in("appointment_id", ids);
  await supabase.from("appointments").delete().in("id", ids);
  return ids.length;
}

/** Libera lock de teléfono (idempotente).
 * Legacy: `waba_release_phone_lock` (advisory; webhook ya no lo usa desde a9efb10).
 * El phone-lock actual es fila en `wa_action_debounce` (kind inbound_coalesce);
 * `cleanupQaPhone` también hace DELETE por phone en esa tabla.
 */
export async function releasePhoneLockRpc(supabase, testPhone) {
  const { error: legacyErr } = await supabase.rpc("waba_release_phone_lock", {
    p_phone: testPhone,
  });
  if (legacyErr)
    console.warn("  release phone lock (legacy):", legacyErr.message);
  const { error } = await supabase.rpc("waba_release_action_debounce", {
    p_phone: testPhone,
    p_kind: "inbound_coalesce",
    p_tenant_id: "zm-lash-nails",
  });
  if (error) console.warn("  release action debounce:", error.message);
}

/** Limpieza estándar para un teléfono QA de simulación WABA. */
export async function cleanupQaPhone(supabase, testPhone, opts = {}) {
  const { deleteClient = false } = opts;
  await releasePhoneLockRpc(supabase, testPhone);
  await deleteAppointmentsByPhone(supabase, testPhone);

  // Algunas suites antiguas dejaron la cita borrada antes que su verificación.
  // En ese caso la búsqueda por appointments no puede alcanzar la card huérfana
  // que todavía aparece en Validación de Pagos.
  const phoneFilter = /^[A-Z]{2}\./.test(testPhone)
    ? { method: "eq", value: testPhone }
    : { method: "ilike", value: `%${testPhone.replace(/\D/g, "").slice(-9)}%` };
  let verificationQuery = supabase
    .from("appointment_verifications")
    .select("id")
    .eq("client_phone", phoneFilter.value);
  if (phoneFilter.method === "ilike") {
    verificationQuery = supabase
      .from("appointment_verifications")
      .select("id")
      .ilike("client_phone", phoneFilter.value);
  }
  const { data: orphanVerifications } = await verificationQuery;
  const verificationIds = (orphanVerifications ?? []).map((row) => row.id);
  if (verificationIds.length) {
    await supabase
      .from("payments")
      .delete()
      .in("verification_id", verificationIds);
    await supabase
      .from("appointment_verifications")
      .delete()
      .in("id", verificationIds);
  }

  await supabase.from("wa_messages").delete().eq("phone", testPhone);
  await supabase.from("whatsapp_sessions").delete().eq("phone", testPhone);
  // Errores provocados a propósito por las suites (ej. INSERT fantasma)
  await supabase.from("wa_error_log").delete().eq("phone", testPhone);
  // Claims de debounce (tardanza, etc.) — no dejar filas QA en wa_action_debounce
  await supabase.from("wa_action_debounce").delete().eq("phone", testPhone);

  if (deleteClient && /^[A-Z]{2}\./.test(testPhone)) {
    await supabase.from("clients").delete().eq("wa_user_id", testPhone);
  } else if (
    deleteClient &&
    testPhone.startsWith("51") &&
    testPhone.length === 11
  ) {
    await supabase
      .from("clients")
      .delete()
      .eq("phone_country", "PE")
      .eq("phone_normalized", testPhone.slice(2));
  }
}
