// waba-chat-simulator — Panel: chat WABA con fidelidad total (dispatch real).
// Auth: JWT usuario (dev/owner/staff) o service_role. verify_jwt gateway = false.
// Patrón: mismo esqueleto que waba-staff-session; importa dispatch del webhook.
import { createClient } from "@supabase/supabase-js";
import { dispatch } from "../whatsapp-webhook/handlers/dispatcher.ts";
import { preferClientDisplayName } from "../whatsapp-webhook/lib/client-address.ts";
import { claimInboundMessage } from "../whatsapp-webhook/lib/inbound-gate.ts";
import { initMessageLogger } from "../whatsapp-webhook/lib/message-logger.ts";
import { ensureSalonHolidaysLoaded } from "../whatsapp-webhook/lib/peru-holidays.ts";
import {
  digitsOnly,
  isSimulatorQaPhone,
  SIMULATOR_QA_PHONES,
} from "../whatsapp-webhook/lib/qa-phone.mjs";
import { loadCatalog } from "../whatsapp-webhook/lib/services-catalog.ts";
import {
  getOrCreateClient,
  getSupabase,
  type SupabaseClient,
} from "../whatsapp-webhook/lib/supabase.ts";
import { loadWabaConfig } from "../whatsapp-webhook/lib/waba-config.ts";
import { DEFAULT_TENANT_ID } from "../whatsapp-webhook/lib/tenant.ts";
import { waConversationKey } from "../_shared/wa-recipient.mjs";

// Misma lista que test-haiku-preview: supabase.functions.invoke manda apikey +
// x-client-info; sin eso el preflight del navegador falla con
// "Failed to send a request to the Edge Function".
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
/** Alias local — una sola fuente: whatsapp-webhook/lib/tenant.ts */
const TENANT_ID = DEFAULT_TENANT_ID;

/** Boilerplate CTWA activo (campaña Set 2026) — dispara awaiting_ctwa_interest. */
const DEFAULT_CTWA_BOILERPLATE_TEXT =
  "¡Hola! Quiero despertar con una Mirada Espectacular 💜";
const DEFAULT_CTWA_REFERRAL_HEADLINE = "Mirada Espectacular";

type SimulatorUser = "alberto" | "vanessa";
type SimulatorAction = "start_session" | "send_message" | "reset_session";

type SimReferral = {
  source_type: string;
  source_id: string;
  headline: string;
  ctwa_clid: string;
};

type OutBubble = {
  id: string;
  content: string;
  msg_type: string | null;
  image_url: string | null;
  created_at: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function contactNameForUser(user: SimulatorUser): string {
  return user === "vanessa" ? "Vanessa (Simulador)" : "Alberto (Simulador)";
}

function userForPhone(phone: string): SimulatorUser | null {
  const d = digitsOnly(phone);
  if (d === SIMULATOR_QA_PHONES.alberto) return "alberto";
  if (d === SIMULATOR_QA_PHONES.vanessa) return "vanessa";
  return null;
}

function newSimWamid(): string {
  return `wamid.sim.${Date.now()}.${crypto.randomUUID().slice(0, 8)}`;
}

function buildSimReferral(headline: string): SimReferral {
  return {
    source_type: "ad",
    source_id: `sim_ad_${Date.now()}`,
    headline,
    ctwa_clid: `sim_ctwa_${crypto.randomUUID().slice(0, 12)}`,
  };
}

/** Envelope Meta sintético — mismo shape que scripts/lib/waba-sim-payload.mjs. */
function buildTextEnvelope(
  phone: string,
  text: string,
  contactName: string,
  referral?: SimReferral | null,
): { body: Record<string, unknown>; message: Record<string, unknown> } {
  const message: Record<string, unknown> = {
    from: phone,
    id: newSimWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "text",
    text: { body: text },
  };
  if (referral) message.referral = referral;
  return { body: wrapEnvelope(phone, contactName, message), message };
}

function buildInteractiveEnvelope(
  phone: string,
  interactiveId: string,
  interactiveTitle: string,
  contactName: string,
): { body: Record<string, unknown>; message: Record<string, unknown> } {
  const title = interactiveTitle.trim() || interactiveId;
  const message: Record<string, unknown> = {
    from: phone,
    id: newSimWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "interactive",
    interactive: {
      type: "list_reply",
      list_reply: { id: interactiveId, title },
    },
  };
  return { body: wrapEnvelope(phone, contactName, message), message };
}

function wrapEnvelope(
  phone: string,
  contactName: string,
  message: Record<string, unknown>,
): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "51932535512" },
              contacts: [{ profile: { name: contactName }, wa_id: phone }],
              messages: [message],
            },
          },
        ],
      },
    ],
  };
}

async function resetSimulatorPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<{ ok: true; phone: string }> {
  // Mismo orden que scripts/lib/waba-sim-cleanup.mjs (hijo → padre).
  const last9 = phone.replace(/\D/g, "").slice(-9);

  const { data: clientsByNorm } = await supabase
    .from("clients")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("phone_country", "PE")
    .eq("phone_normalized", phone.slice(2));
  const { data: clientsByPhone } = await supabase
    .from("clients")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("phone", phone);

  const clientIdSet = new Set<string>();
  for (const c of [...(clientsByNorm ?? []), ...(clientsByPhone ?? [])]) {
    clientIdSet.add(c.id);
  }
  const clientIds = [...clientIdSet];

  let appointmentIds: string[] = [];
  if (clientIds.length) {
    const { data: byClient } = await supabase
      .from("appointments")
      .select("id")
      .eq("tenant_id", TENANT_ID)
      .in("client_id", clientIds);
    appointmentIds = (byClient ?? []).map((a: { id: string }) => a.id);
  }

  const { data: byPhoneAppts } = await supabase
    .from("appointments")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .ilike("client_phone", `%${last9}%`);
  for (const a of byPhoneAppts ?? []) {
    if (!appointmentIds.includes(a.id)) appointmentIds.push(a.id);
  }

  if (appointmentIds.length) {
    await supabase
      .from("appointment_services")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("appointment_id", appointmentIds);
    await supabase
      .from("appointment_verifications")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("appointment_id", appointmentIds);
    await supabase
      .from("payments")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("appointment_id", appointmentIds);
    await supabase
      .from("appointments")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("id", appointmentIds);
  }

  // Verificaciones huérfanas (cita ya borrada)
  const { data: orphanVerifications } = await supabase
    .from("appointment_verifications")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .ilike("client_phone", `%${last9}%`);
  const verificationIds = (orphanVerifications ?? []).map(
    (row: { id: string }) => row.id,
  );
  if (verificationIds.length) {
    await supabase
      .from("payments")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("verification_id", verificationIds);
    await supabase
      .from("appointment_verifications")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("id", verificationIds);
  }

  await supabase
    .from("wa_messages")
    .delete()
    .eq("tenant_id", TENANT_ID)
    .eq("phone", phone);
  await supabase
    .from("whatsapp_sessions")
    .delete()
    .eq("tenant_id", TENANT_ID)
    .eq("phone", phone);
  await supabase
    .from("wa_error_log")
    .delete()
    .eq("tenant_id", TENANT_ID)
    .eq("phone", phone);
  await supabase
    .from("wa_action_debounce")
    .delete()
    .eq("tenant_id", TENANT_ID)
    .eq("phone", phone);

  try {
    await supabase.rpc("waba_release_action_debounce", {
      p_phone: phone,
      p_kind: "inbound_coalesce",
      p_tenant_id: TENANT_ID,
    });
  } catch {
    /* RPC opcional */
  }

  if (clientIds.length) {
    await supabase
      .from("clients")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .in("id", clientIds);
  } else {
    await supabase
      .from("clients")
      .delete()
      .eq("tenant_id", TENANT_ID)
      .eq("phone_country", "PE")
      .eq("phone_normalized", phone.slice(2));
  }

  return { ok: true, phone };
}

async function fetchOutboundSince(
  supabase: SupabaseClient,
  phone: string,
  sinceIso: string,
): Promise<OutBubble[]> {
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id, content, msg_type, image_url, created_at")
    .eq("tenant_id", TENANT_ID)
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[waba-chat-simulator] fetch out:", error.message);
    return [];
  }
  return (data ?? []) as OutBubble[];
}

/** logOutMessage es fire-and-forget — poll corto hasta que aparezcan burbujas. */
async function pollOutboundBubbles(
  supabase: SupabaseClient,
  phone: string,
  sinceIso: string,
  opts: { timeoutMs?: number; minCount?: number } = {},
): Promise<OutBubble[]> {
  const timeoutMs = opts.timeoutMs ?? 3500;
  const minCount = opts.minCount ?? 1;
  const deadline = Date.now() + timeoutMs;
  let bubbles: OutBubble[] = [];
  while (Date.now() < deadline) {
    bubbles = await fetchOutboundSince(supabase, phone, sinceIso);
    if (bubbles.length >= minCount) return bubbles;
    await new Promise((r) => setTimeout(r, 200));
  }
  return bubbles;
}

async function runSendMessage(
  supabase: SupabaseClient,
  phone: string,
  opts: {
    text?: string;
    interactiveId?: string;
    interactiveTitle?: string;
    fromAdSimulated?: boolean;
    referralHeadline?: string | null;
  },
): Promise<{
  ok: boolean;
  phone: string;
  inboundPreview: string;
  fromAd: boolean;
  bubbles: OutBubble[];
  detail?: string;
}> {
  const simUser = userForPhone(phone);
  if (!simUser) {
    return {
      ok: false,
      phone,
      inboundPreview: "",
      fromAd: false,
      bubbles: [],
      detail: "Teléfono no autorizado para el simulador",
    };
  }
  const contactName = contactNameForUser(simUser);
  const fromAdSimulated = opts.fromAdSimulated === true;
  const headline =
    (opts.referralHeadline ?? "").trim() || DEFAULT_CTWA_REFERRAL_HEADLINE;
  const interactiveId = (opts.interactiveId ?? "").trim();
  const interactiveTitle = (opts.interactiveTitle ?? "").trim();

  // CTWA sin texto → boilerplate Set 2026 (igual que el CTA del creativo).
  let text = (opts.text ?? "").trim();
  if (!text && !interactiveId && fromAdSimulated) {
    text = DEFAULT_CTWA_BOILERPLATE_TEXT;
  }

  if (!text && !interactiveId) {
    return {
      ok: false,
      phone,
      inboundPreview: "",
      fromAd: false,
      bubbles: [],
      detail: "Falta text o interactiveId",
    };
  }

  // Referral solo en texto (primer msg CTWA). Un tap interactivo no lleva referral.
  const referral =
    fromAdSimulated && !interactiveId ? buildSimReferral(headline) : null;

  const built = interactiveId
    ? buildInteractiveEnvelope(
        phone,
        interactiveId,
        interactiveTitle || interactiveId,
        contactName,
      )
    : buildTextEnvelope(phone, text, contactName, referral);

  const { body, message } = built;
  const msgType = String(message.type ?? "text");
  const wamid = typeof message.id === "string" ? message.id : newSimWamid();
  const inboundPreview = interactiveId
    ? interactiveTitle || interactiveId
    : text;

  initMessageLogger(supabase);

  const claimed = await claimInboundMessage(supabase, {
    phone,
    wamid,
    content: inboundPreview,
    msg_type: msgType,
  });
  if (!claimed) {
    return {
      ok: false,
      phone,
      inboundPreview,
      fromAd: fromAdSimulated,
      bubbles: [],
      detail: "wamid duplicado (reintento)",
    };
  }

  const sinceIso = new Date().toISOString();
  const inboundReceivedAt = Date.now();

  const [catalog, wabaConfig, { client, isNew }] = await Promise.all([
    loadCatalog(supabase),
    loadWabaConfig(supabase),
    getOrCreateClient(supabase, phone, contactName),
    ensureSalonHolidaysLoaded(supabase),
  ]);

  const displayName = preferClientDisplayName(client?.name, contactName);
  // Igual que processMessage: texto libre vacío en taps de lista; el ID va en `message`.
  const messageText = interactiveId ? "" : text;
  const fromAd = fromAdSimulated && !interactiveId;
  const referralHeadline = fromAd ? headline : null;

  try {
    await dispatch({
      body,
      message,
      phoneNumber: phone,
      contactName: displayName,
      messageText,
      isNew,
      supabase,
      catalog,
      wabaConfig,
      fromAd,
      referralHeadline,
      phoneCountry: client?.phone_country ?? "PE",
      messagePreview: inboundPreview,
      inboundReceivedAt,
    });
  } catch (err) {
    // Meta suele fallar/aceptar QA; el dispatcher puede lanzar si sendMessage
    // revienta — igual devolvemos lo que sí se haya logueado en wa_messages.
    console.error("[waba-chat-simulator] dispatch:", err);
  }

  // CTWA puede emitir saludo + lista (+ imágenes en taps); dar un poco más de margen.
  const bubbles = await pollOutboundBubbles(supabase, phone, sinceIso, {
    timeoutMs: fromAd ? 5000 : 3500,
  });
  return { ok: true, phone, inboundPreview, fromAd, bubbles };
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

  let action: SimulatorAction | "" = "";
  let userKey: SimulatorUser | "" = "";
  let phoneRaw = "";
  let text = "";
  let interactiveId = "";
  let interactiveTitle = "";
  let fromAdSimulated = false;
  let referralHeadline: string | null = null;
  try {
    const body = await req.json();
    action = body.action as SimulatorAction;
    userKey = body.user as SimulatorUser;
    phoneRaw = String(body.phone ?? "");
    text = String(body.text ?? "");
    interactiveId = String(body.interactiveId ?? "");
    interactiveTitle = String(body.interactiveTitle ?? "");
    fromAdSimulated = body.fromAdSimulated === true;
    referralHeadline =
      body.referralHeadline == null ? null : String(body.referralHeadline);
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  if (
    action !== "start_session" &&
    action !== "send_message" &&
    action !== "reset_session"
  ) {
    return json(
      {
        error:
          'action must be "start_session" | "send_message" | "reset_session"',
      },
      400,
    );
  }

  const supabase = getSupabase();

  try {
    if (action === "start_session") {
      if (userKey !== "alberto" && userKey !== "vanessa") {
        return json({ error: 'user must be "alberto" | "vanessa"' }, 400);
      }
      const phone = SIMULATOR_QA_PHONES[userKey];
      await resetSimulatorPhone(supabase, phone);
      return json({
        ok: true,
        action,
        user: userKey,
        phone,
        contactName: contactNameForUser(userKey),
      });
    }

    const phone = waConversationKey(digitsOnly(phoneRaw) || phoneRaw);
    if (!phone || !isSimulatorQaPhone(phone)) {
      return json(
        {
          error:
            "phone debe ser un teléfono del simulador (51988800001 / 51988800002)",
        },
        400,
      );
    }

    if (action === "reset_session") {
      const result = await resetSimulatorPhone(supabase, phone);
      return json({ action, ...result });
    }

    // send_message
    const result = await runSendMessage(supabase, phone, {
      text,
      interactiveId,
      interactiveTitle,
      fromAdSimulated,
      referralHeadline,
    });
    return json({ action, ...result }, result.ok ? 200 : 400);
  } catch (err) {
    console.error("[waba-chat-simulator]", err);
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
