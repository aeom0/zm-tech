/**
 * Webhooks Meta `statuses` (sent / delivered / read / failed).
 * Actualiza wa_messages por wamid para que el panel no confunda API-accept con entrega.
 */
import type { SupabaseClient } from "../lib/supabase.ts";
import { notifyAdmins } from "../lib/notify.ts";
import { getRequestTenantId } from "../lib/tenant.ts";

const STATUS_RANK: Record<string, number> = {
  accepted: 0,
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

const KNOWN = new Set(Object.keys(STATUS_RANK));

/** Debounce 6h: un solo push por ráfaga de plantillas caídas por billing. */
const BILLING_ALERT_DEBOUNCE_SECONDS = 6 * 60 * 60;

const BILLING_HUB_URL =
  "https://business.facebook.com/billing_hub/accounts/details/?business_id=27203859089260280&asset_id=1271330085100222";

function isBillingUnsettledError(errText: string | null): boolean {
  if (!errText) return false;
  return (
    errText.includes("131042") ||
    /unsettled payments/i.test(errText) ||
    /Business eligibility payment issue/i.test(errText)
  );
}

/**
 * Alerta account-level (no por clienta): plantillas/recordatorios fallan por
 * billing Meta #131042. Sin esto, message-statuses solo insertaba wa_error_log
 * y el staff no recibía push (caso 18-sep-2026: 30 retoques failed en 1 min).
 */
async function maybeAlertBillingUnsettled(
  supabase: SupabaseClient,
  errText: string,
): Promise<void> {
  try {
    const { data: claimed, error: claimErr } = await supabase.rpc(
      "waba_claim_action_debounce",
      {
        p_phone: "waba:meta_billing",
        p_kind: "error_alert:billing_131042",
        p_window_seconds: BILLING_ALERT_DEBOUNCE_SECONDS,
        p_tenant_id: getRequestTenantId(),
      },
    );
    if (claimErr) {
      // Fail-closed: sin confirmación de claim no hay garantía de debounce,
      // así que no se envía push (riesgo de ráfaga de ~30 pushes sin freno).
      console.error("[WABA] billing_131042 claim:", claimErr.message);
      return;
    }
    if (claimed !== true) {
      console.log("[WABA] skip billing_131042 push (debounce 6h)");
      return;
    }

    await notifyAdmins(
      supabase,
      "⚠️ WABA billing #131042",
      "Plantillas/recordatorios/reenganche fallan: Meta reporta pagos sin liquidar (unsettled payments). Revisar Billing Hub aunque el saldo se vea al día.",
      {
        type: "waba_ops",
        reason: "billing_131042",
        error_kind: "billing_131042",
        url: BILLING_HUB_URL,
      },
    );
    console.log(
      "[WABA] billing_131042 push enviado:",
      errText.slice(0, 80),
    );
  } catch (e) {
    console.error("[WABA] maybeAlertBillingUnsettled:", e);
  }
}

function rank(status: string | null | undefined): number {
  if (!status) return -1;
  return STATUS_RANK[status] ?? -1;
}

function parseMetaTs(raw: unknown): string {
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const ms = Number(raw) * 1000;
    if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

function formatDeliveryError(errors: unknown): string | null {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first = errors[0] as Record<string, unknown>;
  const code = first?.code != null ? String(first.code) : "";
  const title =
    typeof first?.title === "string"
      ? first.title
      : typeof first?.message === "string"
        ? first.message
        : "";
  const detail =
    typeof first?.error_data === "object" &&
    first.error_data &&
    typeof (first.error_data as { details?: string }).details === "string"
      ? (first.error_data as { details: string }).details
      : "";
  const parts = [code && `#${code}`, title, detail].filter(Boolean);
  return parts.length ? parts.join(" — ").slice(0, 500) : null;
}

export function isMessageStatusesPayload(
  value: Record<string, unknown> | null | undefined,
): boolean {
  return (
    Array.isArray(value?.statuses) && (value!.statuses as unknown[]).length > 0
  );
}

/**
 * Aplica statuses Meta a wa_messages. No hace downgrade
 * (p. ej. no pisa `read` con `delivered`), salvo `failed`.
 */
export async function handleMessageStatuses(
  supabase: SupabaseClient,
  value: Record<string, unknown>,
): Promise<number> {
  const statuses = value.statuses as Array<Record<string, unknown>>;
  let updated = 0;
  let billingAlertChecked = false;

  for (const st of statuses) {
    const wamid = typeof st.id === "string" ? st.id : null;
    const statusRaw =
      typeof st.status === "string" ? st.status.toLowerCase() : "";
    if (
      !wamid ||
      !KNOWN.has(statusRaw) ||
      statusRaw === "accepted" ||
      statusRaw === "pending"
    ) {
      if (wamid && statusRaw && !KNOWN.has(statusRaw)) {
        console.warn("[WABA] status desconocido:", statusRaw, wamid.slice(-12));
      }
      continue;
    }

    const at = parseMetaTs(st.timestamp);
    const errText =
      statusRaw === "failed" ? formatDeliveryError(st.errors) : null;

    const { data: row, error: selErr } = await supabase
      .from("wa_messages")
      .select("id, delivery_status")
      .eq("wamid", wamid)
      .eq("direction", "out")
      .maybeSingle();

    if (selErr) {
      console.error("[WABA] statuses select:", selErr.message);
      continue;
    }
    if (!row?.id) {
      // Eco de plantilla enviada desde otro canal / aún no logueada
      console.log(
        `[WABA] status ${statusRaw} sin fila wa_messages wamid=…${wamid.slice(-16)}`,
      );
      continue;
    }

    const current = (row.delivery_status as string | null) ?? null;
    // failed siempre gana sobre otros estados, pero un failed repetido (reentrega
    // Meta at-least-once) no debe reprocesarse: duplicaría filas en wa_error_log.
    if (statusRaw === "failed" && current === "failed") {
      continue;
    }
    if (statusRaw !== "failed" && rank(statusRaw) <= rank(current)) {
      continue;
    }

    const patch: Record<string, unknown> = {
      delivery_status: statusRaw,
      delivery_status_at: at,
    };
    if (statusRaw === "failed") {
      patch.delivery_error = errText;
    }

    const { error: updErr } = await supabase
      .from("wa_messages")
      .update(patch)
      .eq("id", row.id);

    if (updErr) {
      console.error("[WABA] statuses update:", updErr.message);
      continue;
    }
    updated += 1;

    if (statusRaw === "failed") {
      const recipient =
        typeof st.recipient_id === "string" ? st.recipient_id : null;
      try {
        await supabase.from("wa_error_log").insert({
          phone: recipient,
          step: "delivery_status",
          msg_type: "status",
          error_message: errText ?? "Meta delivery failed",
          context: {
            wamid,
            status: statusRaw,
            errors: st.errors ?? null,
          },
          fallback_sent: false,
        });
      } catch (e) {
        console.error("[WABA] wa_error_log delivery_failed:", e);
      }
      if (!billingAlertChecked && isBillingUnsettledError(errText)) {
        billingAlertChecked = true;
        await maybeAlertBillingUnsettled(supabase, errText ?? "Meta #131042");
      }
    }
  }

  return updated;
}
