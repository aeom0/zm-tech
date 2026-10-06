/**
 * send-retouch-reengage — Envía plantilla `retoque_reenganche_zm` a una clienta.
 *
 * Manual (mobile Clientas → Reenganchar):
 *   POST { "clientId": "<uuid>" }  + JWT admin (dev|owner) o service_role
 *
 * QA / interno:
 *   POST { "clientId": "...", "bypassCooldown": true, "bypassInterval": true }
 *
 * Plantilla Meta (crear en Business Manager si aún no existe):
 *   name: retoque_reenganche_zm | lang: es_PE | UTILITY
 *   body params: {{1}} nombre, {{2}} servicio, {{3}} antigüedad
 *   buttons: Agendar | Otro servicio | Más adelante
 *
 * Deploy:
 *   SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy send-retouch-reengage \
 *     --project-ref udelxwwnyivknslueerr --no-verify-jwt
 */

import { createClient } from "@supabase/supabase-js";
import { sendRetouchOfferForClient } from "../_shared/retoque-offer.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function assertAdmin(req: Request): Promise<void> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  let isServiceRole = false;
  try {
    const payload = JSON.parse(atob(bearerToken.split(".")[1] ?? ""));
    isServiceRole = payload?.role === "service_role";
  } catch {
    /* ignore */
  }
  if (isServiceRole) return;

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && bearerToken === cronSecret) return;

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["dev", "owner"].includes(profile.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    await assertAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    clientId?: string;
    bypassCooldown?: boolean;
    bypassInterval?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientId = body.clientId?.trim();
  if (!clientId) {
    return new Response(
      JSON.stringify({ ok: false, error: "clientId_required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: clientTenant, error: clientTenantError } = await supabase
    .from("clients")
    .select("tenant_id")
    .eq("id", clientId)
    .maybeSingle();
  if (clientTenantError) {
    console.error(
      "[send-retouch-reengage] Error resolviendo tenant de la clienta:",
      clientTenantError.message,
    );
    return new Response(
      JSON.stringify({ ok: false, error: "client_lookup_failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const clientTenantId =
    typeof clientTenant?.tenant_id === "string"
      ? clientTenant.tenant_id.trim()
      : "";
  if (!clientTenantId) {
    return new Response(
      JSON.stringify({ ok: false, error: "client_not_found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const activeTenants = await getActiveWabaTenants(supabase);
  const tenant = activeTenants.find((t) => t.tenantId === clientTenantId);
  if (!tenant) {
    return new Response(
      JSON.stringify({ ok: false, error: "tenant_waba_inactive" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const creds = await getTenantWabaCredentials(supabase, tenant);
  if (!creds) {
    return new Response(
      JSON.stringify({ ok: false, error: "no_waba_credentials" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await sendRetouchOfferForClient(
    supabase,
    clientId,
    "manual",
    tenant.tenantId,
    creds,
    {
      bypassCooldown: Boolean(body.bypassCooldown),
      bypassInterval: Boolean(body.bypassInterval),
    },
  );

  const status = result.ok ? 200 : result.skipped ? 200 : 502;
  return new Response(JSON.stringify(result), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
