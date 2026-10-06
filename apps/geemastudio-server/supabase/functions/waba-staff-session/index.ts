// waba-staff-session — Panel: reactivar bot o Haiku termina agenda tras pausa por diseño.
// Auth: JWT usuario (dev/owner/staff admin) o service_role. verify_jwt gateway = false.
import { createClient } from "@supabase/supabase-js";
import {
  haikuFinishBookingForPhone,
  pauseBotForPhone,
  resumeBotForPhone,
  type StaffSessionAction,
} from "../whatsapp-webhook/handlers/staff-resume.ts";
import { initMessageLogger } from "../whatsapp-webhook/lib/message-logger.ts";
import { getSupabase } from "../whatsapp-webhook/lib/supabase.ts";
import { isWaBsuid, waConversationKey } from "../_shared/wa-recipient.mjs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  let isServiceRole = false;
  try {
    const payload = JSON.parse(atob(bearerToken.split(".")[1]));
    isServiceRole = payload?.role === "service_role";
  } catch {
    /* no JWT */
  }

  if (!isServiceRole) {
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role as string | undefined;
    if (role !== "dev" && role !== "owner" && role !== "staff") {
      return json({ error: "Forbidden" }, 403);
    }
  }

  let phone = "";
  let action: StaffSessionAction | "" = "";
  try {
    const body = await req.json();
    phone = waConversationKey(String(body.phone ?? ""));
    action = body.action as StaffSessionAction;
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  if (!phone || (!isWaBsuid(phone) && phone.length < 8)) {
    return json({ error: "Missing phone" }, 400);
  }
  if (
    action !== "resume_bot" &&
    action !== "pause_bot" &&
    action !== "haiku_finish_booking"
  ) {
    return json(
      {
        error:
          'action must be "resume_bot" | "pause_bot" | "haiku_finish_booking"',
      },
      400,
    );
  }

  const supabase = getSupabase();
  initMessageLogger(supabase);

  try {
    if (action === "resume_bot") {
      const result = await resumeBotForPhone(supabase, phone);
      return json(result, result.ok ? 200 : 500);
    }
    if (action === "pause_bot") {
      const result = await pauseBotForPhone(supabase, phone);
      return json(result, result.ok ? 200 : 500);
    }
    const result = await haikuFinishBookingForPhone(supabase, phone);
    return json(result, result.ok ? 200 : 500);
  } catch (err) {
    console.error("[waba-staff-session]", err);
    return json(
      {
        ok: false,
        action,
        detail: err instanceof Error ? err.message : "Error interno",
      },
      500,
    );
  }
});
