// Plan 19 W13 — Alta de negocio self-service desde la web (y la app).
// Pública (sin JWT): crea el usuario dueño confirmado y llama a
// create_tenant_for_owner. Si la RPC falla, borra el usuario para no dejar
// cuentas sin tenant (el hook de JWT las rechazaría al iniciar sesión).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Límite anti-abuso: altas por IP por hora y por correo por día.
const MAX_PER_IP_HOUR = 3;
const MAX_PER_EMAIL_DAY = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface SignupBody {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  businessName?: unknown;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") || "unknown";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Método no permitido" });
  }

  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Solicitud inválida" });
  }

  const fullName = text(body.fullName);
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const businessName = text(body.businessName);

  if (fullName.length < 2 || fullName.length > 80) {
    return json(400, { error: "Ingresa tu nombre" });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: "Ingresa un correo válido" });
  }
  if (password.length < 8 || password.length > 72) {
    return json(400, {
      error: "La contraseña debe tener entre 8 y 72 caracteres",
    });
  }
  if (businessName.length < 2 || businessName.length > 80) {
    return json(400, { error: "Ingresa el nombre de tu negocio" });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ipHash = await sha256(clientIp(req));
  const emailHash = await sha256(email);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [byIp, byEmail] = await Promise.all([
    admin.from("signup_attempts").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", hourAgo),
    admin.from("signup_attempts").select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash).gte("created_at", dayAgo),
  ]);
  if (byIp.error || byEmail.error) {
    console.error("[signup-tenant] rate limit:", byIp.error ?? byEmail.error);
    return json(500, { error: "No pudimos crear tu cuenta. Intenta de nuevo." });
  }
  if ((byIp.count ?? 0) >= MAX_PER_IP_HOUR || (byEmail.count ?? 0) >= MAX_PER_EMAIL_DAY) {
    return json(429, {
      error: "Demasiados intentos. Espera un rato y vuelve a intentar.",
    });
  }

  const { error: attemptError } = await admin.from("signup_attempts").insert({
    ip_hash: ipHash,
    email_hash: emailHash,
  });
  if (attemptError) {
    console.error("[signup-tenant] attempt insert:", attemptError);
    return json(500, { error: "No pudimos crear tu cuenta. Intenta de nuevo." });
  }

  // Confirmado para Auth para que pueda entrar ya; la confirmación real del
  // correo es tenants.owner_email_verified_at (código OTP desde el panel).
  const { data: created, error: createError } = await admin.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError || !created?.user) {
    const msg = createError?.message ?? "";
    if (/already|registered|exists/i.test(msg)) {
      return json(409, {
        error: "Ya existe una cuenta con ese correo. Inicia sesión.",
      });
    }
    if (/password/i.test(msg)) {
      return json(400, { error: "Elige una contraseña más segura" });
    }
    console.error("[signup-tenant] createUser:", createError);
    return json(500, { error: "No pudimos crear tu cuenta. Intenta de nuevo." });
  }

  const userId = created.user.id;
  const { data: tenantSlug, error: rpcError } = await admin.rpc(
    "create_tenant_for_owner",
    {
      p_user_id: userId,
      p_full_name: fullName,
      p_business_name: businessName,
    },
  );

  if (rpcError || typeof tenantSlug !== "string") {
    console.error("[signup-tenant] create_tenant_for_owner:", rpcError);
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[signup-tenant] rollback deleteUser:", deleteError);
    }
    return json(500, { error: "No pudimos crear tu negocio. Intenta de nuevo." });
  }

  return json(200, { tenantSlug });
});
