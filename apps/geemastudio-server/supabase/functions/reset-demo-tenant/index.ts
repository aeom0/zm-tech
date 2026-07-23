import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Mapa de tenant demo → prefijos de IDs del seed
const DEMO_TENANT_MAP: Record<
  string,
  {
    business_name: string;
    emp_prefix: string;
    cat_prefix: string;
    svc_prefix: string;
    cli_prefix: string;
    inv_prefix: string;
    apt_prefix: string;
    pay_prefix: string;
  }
> = {
  "725e6fcc-7372-4974-beea-7c78852ad609": {
    business_name: "Salón Glamour",
    emp_prefix: "emp-salon",
    cat_prefix: "cat-salon",
    svc_prefix: "svc-salon",
    cli_prefix: "cli-s",
    inv_prefix: "inv-s",
    apt_prefix: "apt-s",
    pay_prefix: "pay-s",
  },
  "700d07ae-da7c-4b36-8ad3-12c2a7b66f10": {
    business_name: "Nail & Glow Spa",
    emp_prefix: "emp-nails",
    cat_prefix: "cat-nails",
    svc_prefix: "svc-nails",
    cli_prefix: "cli-n",
    inv_prefix: "inv-n",
    apt_prefix: "apt-n",
    pay_prefix: "pay-n",
  },
  "bf5d84dd-a1b1-4fa4-9349-2c811fa269f0": {
    business_name: "The Sharp Cut",
    emp_prefix: "emp-barber",
    cat_prefix: "cat-barber",
    svc_prefix: "svc-barber",
    cli_prefix: "cli-b",
    inv_prefix: "inv-b",
    apt_prefix: "apt-b",
    pay_prefix: "pay-b",
  },
  "e6704e01-2f1a-4da1-8d6d-600a1c243d5a": {
    business_name: "Aura Estética",
    emp_prefix: "emp-est",
    cat_prefix: "cat-est",
    svc_prefix: "svc-est",
    cli_prefix: "cli-e",
    inv_prefix: "inv-e",
    apt_prefix: "apt-e",
    pay_prefix: "pay-e",
  },
};

Deno.serve(async (req: Request) => {
  // Solo POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verificar Authorization header (JWT del usuario)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cliente con JWT del usuario para verificar identidad
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tenantId = user.id;
  const tenant = DEMO_TENANT_MAP[tenantId];

  if (!tenant) {
    // No es un tenant demo — no hacer nada, responder OK
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Not a demo tenant, skipping reset",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Cliente service role para el reset (bypasa RLS)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Borrar en orden correcto respetando FKs
    const prefixes = tenant;

    await admin.from("payments").delete().like("id", `${prefixes.pay_prefix}%`);

    await admin
      .from("appointment_verifications")
      .delete()
      .like("appointment_id", `${prefixes.apt_prefix}%`);

    await admin
      .from("appointments")
      .delete()
      .like("id", `${prefixes.apt_prefix}%`);

    await admin.from("clients").delete().like("id", `${prefixes.cli_prefix}%`);

    await admin
      .from("inventory_items")
      .delete()
      .like("id", `${prefixes.inv_prefix}%`);

    await admin.from("services").delete().like("id", `${prefixes.svc_prefix}%`);

    await admin
      .from("service_categories")
      .delete()
      .like("id", `${prefixes.cat_prefix}%`);

    // 2. Re-insertar seed según negocio
    const { error: seedError } = await admin.rpc("seed_demo_tenant", {
      p_tenant_id: tenantId,
    });

    if (seedError) throw seedError;

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Demo tenant "${tenant.business_name}" reseteado correctamente`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[reset-demo-tenant] Error:", err);
    return new Response(
      JSON.stringify({ error: "Reset failed", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
