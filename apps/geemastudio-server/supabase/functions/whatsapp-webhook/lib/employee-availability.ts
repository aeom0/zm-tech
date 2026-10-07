// lib/employee-availability.ts — Plan 18: disponibilidad por profesional (servicios, horarios,
// ausencias, coberturas) calculada en BD por get_day_slots_for_bot.
// Es una verificación ADICIONAL: si el negocio no la configuró o la consulta falla, no bloquea.

import type { SupabaseClient } from "./supabase.ts";
import { getRequestTenantId } from "./tenant.ts";

const CACHE_TTL_MS = 8_000;
const STEP_MINUTES = 15;

interface DaySlots {
  configured: boolean;
  slots: Set<string>;
}

const cache = new Map<string, { at: number; value: DaySlots | null }>();

/** Horarios (HH:MM, hora Lima) que el motor ofrece para el carrito ese día; null si no aplica. */
async function loadDaySlots(
  supabase: SupabaseClient,
  dateKey: string,
  serviceIds: string[],
  excludeAppointmentId?: string,
): Promise<DaySlots | null> {
  const tenantId = getRequestTenantId();
  const key = `${tenantId}|${dateKey}|${serviceIds.join(",")}|${
    excludeAppointmentId ?? ""
  }`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: DaySlots | null = null;
  try {
    const { data, error } = await supabase.rpc("get_day_slots_for_bot", {
      p_tenant_id: tenantId,
      p_service_ids: serviceIds,
      p_day: dateKey,
      p_step_minutes: STEP_MINUTES,
      p_exclude_appointment_id: excludeAppointmentId ?? null,
    });
    if (error) {
      console.warn("[AVAIL] get_day_slots_for_bot:", error.message);
    } else if (data && typeof data === "object") {
      const d = data as { configured?: boolean; slots?: string[] };
      value = {
        configured: d.configured === true,
        slots: new Set(Array.isArray(d.slots) ? d.slots : []),
      };
    }
  } catch (e) {
    console.warn("[AVAIL] excepcion:", e instanceof Error ? e.message : e);
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * ¿Las reglas por profesional permiten este inicio?
 * allow: el motor ya decidió el cupo (horarios, servicios, ausencias, días de aviso).
 * deny: el motor lo descarta.
 * legacy: no hay reglas, falló la consulta o el minuto no cae en la grilla de 15.
 */
export type EmployeeRulesDecision = "allow" | "deny" | "legacy";

export async function employeeRulesDecision(
  supabase: SupabaseClient,
  dateKey: string,
  hhmm: string,
  serviceIds: string[],
  excludeAppointmentId?: string,
): Promise<EmployeeRulesDecision> {
  if (serviceIds.length === 0) return "legacy";
  const minutes = Number(hhmm.slice(3, 5));
  if (!Number.isFinite(minutes) || minutes % STEP_MINUTES !== 0) {
    return "legacy";
  }
  const day = await loadDaySlots(
    supabase,
    dateKey,
    serviceIds,
    excludeAppointmentId,
  );
  if (!day || !day.configured) return "legacy";
  return day.slots.has(hhmm) ? "allow" : "deny";
}

/**
 * true si no hay reglas configuradas, si la consulta falla o si el inicio no cae en la grilla
 * de 15 min (el motor no lo evalúa). Solo devuelve false cuando el motor lo descarta.
 */
export async function employeeRulesAllowSlot(
  supabase: SupabaseClient,
  dateKey: string,
  hhmm: string,
  serviceIds: string[],
  excludeAppointmentId?: string,
): Promise<boolean> {
  return (await employeeRulesDecision(
    supabase,
    dateKey,
    hhmm,
    serviceIds,
    excludeAppointmentId,
  )) !== "deny";
}
