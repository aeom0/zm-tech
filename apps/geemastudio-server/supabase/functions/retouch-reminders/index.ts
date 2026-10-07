/**
 * retouch-reminders — Cron:
 *   Fase A: tip ricino ~día 10 post-lifting (lifting_cuidados_ricino_zm).
 *   Fase B: reenganche retoque (retoque_reenganche_zm) por intervalo de servicio.
 *
 * Auth: Bearer CRON_SECRET o service_role.
 * Deploy: --no-verify-jwt (invocado por pg_cron / scheduler).
 */

import { createClient } from "@supabase/supabase-js";
import { maxRetouchIntervalDays } from "../_shared/retouch-resolve.ts";
import { sendRetouchOfferForClient } from "../_shared/retoque-offer.ts";
import { sendLiftingRicinoNudgeForClient } from "../_shared/lifting-ricino-nudge.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const isCron = Boolean(CRON_SECRET && bearer === CRON_SECRET);
  const isService = bearer === SERVICE_KEY;
  if (!isCron && !isService) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();

  // Lookback amplio: max intervalo retoque + colchón (cubre también ventana ricino 10–14)
  const lookbackDays = maxRetouchIntervalDays() + 14;
  const since = new Date(now);
  since.setDate(since.getDate() - lookbackDays);
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

  const activeTenants = await getActiveWabaTenants(supabase);
  let totalCandidates = 0;
  let ricinoSent = 0;
  let ricinoSkipped = 0;
  const ricinoReasons: Record<string, number> = {};
  const ricinoErrors: string[] = [];
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const reasons: Record<string, number> = {};

  for (const tenant of activeTenants) {
    const creds = await getTenantWabaCredentials(supabase, tenant);
    if (!creds) continue;

    await runWithRequestTenantId(
      tenant.tenantId,
      () => processTenantRetouch(tenant.tenantId, creds),
    );
  }

  async function processTenantRetouch(
    tenantId: string,
    creds: TenantWabaCredentials,
  ): Promise<void> {
    const { data: completed, error } = await supabase
      .from("appointments")
      .select("id, client_id, date, status")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .not("client_id", "is", null)
      .gte("date", sinceStr)
      .order("date", { ascending: false });

    if (error) {
      errors.push(`${tenantId}: ${error.message}`);
      return;
    }

    const latestByClient = new Map<string, { id: string; date: string }>();
    for (const apt of completed ?? []) {
      const cid = apt.client_id as string;
      if (!cid || latestByClient.has(cid)) continue;
      latestByClient.set(cid, { id: apt.id, date: String(apt.date) });
    }
    totalCandidates += latestByClient.size;

    // Fase A — tip ricino (~día 10)
    for (const [clientId] of latestByClient) {
      try {
        const result = await sendLiftingRicinoNudgeForClient(
          supabase,
          clientId,
          tenantId,
          creds,
        );
        if (result.ok) {
          ricinoSent++;
          await new Promise((r) => setTimeout(r, 200));
        } else {
          ricinoSkipped++;
          const key = result.reason ?? result.error ?? "unknown";
          ricinoReasons[key] = (ricinoReasons[key] ?? 0) + 1;
          if (result.error) ricinoErrors.push(`${clientId}: ${result.error}`);
        }
      } catch (err) {
        ricinoErrors.push(`${clientId}: ${err}`);
      }
    }

    // Fase B — oferta retoque / ciclo Botox-lifting
    for (const [clientId] of latestByClient) {
      try {
        const result = await sendRetouchOfferForClient(
          supabase,
          clientId,
          "cron",
          tenantId,
          creds,
        );
        if (result.ok) {
          sent++;
          await new Promise((r) => setTimeout(r, 250));
        } else {
          skipped++;
          const key = result.reason ?? result.error ?? "unknown";
          reasons[key] = (reasons[key] ?? 0) + 1;
          if (result.error) errors.push(`${clientId}: ${result.error}`);
        }
      } catch (err) {
        errors.push(`${clientId}: ${err}`);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      candidates: totalCandidates,
      ricino: {
        sent: ricinoSent,
        skipped: ricinoSkipped,
        reasons: ricinoReasons,
        errors: ricinoErrors.length ? ricinoErrors.slice(0, 20) : undefined,
      },
      retouch: {
        sent,
        skipped,
        reasons,
        errors: errors.length ? errors.slice(0, 20) : undefined,
      },
      // Compat campos planos (monitoreo previo)
      sent,
      skipped,
      reasons,
      errors: errors.length ? errors.slice(0, 20) : undefined,
      intervalHint: maxRetouchIntervalDays(),
      timestamp: now.toISOString(),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
