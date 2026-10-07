// send-notification — Push FCM v1 a la app móvil (tokens nativos en profiles.push_token).
// La app guarda el token con getDevicePushTokenAsync() → usar esta función para enviar push.
// send-push-notification es para tokens ExponentPushToken[...] (Expo Push API). Ver docs/ops/EDGE_FUNCTIONS.md.
// Requiere secret FCM_SERVICE_ACCOUNT (JSON cuenta de servicio Firebase).
// Body: user_id o user_ids, title, body, data? (data para deep links).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT");

interface FCMServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

async function getFCMAccessToken(): Promise<string> {
  if (!FCM_SERVICE_ACCOUNT_JSON) {
    throw new Error("FCM_SERVICE_ACCOUNT no configurado");
  }
  const sa: FCMServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };
  const encoder = new TextEncoder();
  const b64url = (data: string) =>
    btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const toSign = b64url(JSON.stringify(header)) + "." +
    b64url(JSON.stringify(payload));
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(toSign),
  );
  const jwt = toSign + "." +
    b64url(String.fromCharCode(...new Uint8Array(signature)));
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`FCM token error: ${tokenRes.status} ${err}`);
  }
  const tokenData = await tokenRes.json();
  return tokenData.access_token as string;
}

function getProjectId(sa: FCMServiceAccount): string {
  if (sa.project_id) return sa.project_id;
  const match = (sa.client_email || "").match(
    /@([^.]+)\.iam\.gserviceaccount\.com/,
  );
  return match ? match[1] : "";
}

function getAndroidChannelId(data?: Record<string, string>): string {
  if (
    data?.screen === "ValidacionPagos" ||
    data?.type === "payment" ||
    data?.type === "anthropic_credit"
  ) {
    return "waba-alerts";
  }
  if (data?.type === "appointment_reference" || data?.screen === "Agenda") {
    return "waba-appointments";
  }
  if (
    data?.reason === "design_image" ||
    data?.reason === "audio_message" ||
    data?.reason === "paused_reply" ||
    data?.reason === "client_chat" ||
    data?.error_kind
  ) {
    return "waba-chat";
  }
  return "default";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let user_ids: string[];
  let title: string;
  let body: string;
  let data: Record<string, string> | undefined;
  try {
    const parsed = await req.json();
    user_ids = Array.isArray(parsed.user_ids) ? parsed.user_ids : [];
    title = typeof parsed.title === "string" ? parsed.title : "Notificación";
    body = typeof parsed.body === "string" ? parsed.body : "";
    data = parsed.data &&
        typeof parsed.data === "object" &&
        !Array.isArray(parsed.data)
      ? Object.fromEntries(
        Object.entries(parsed.data).filter(
          (e): e is [string, string] =>
            typeof e[0] === "string" && typeof e[1] === "string",
        ),
      )
      : undefined;
  } catch {
    return new Response(
      JSON.stringify({ error: "Body JSON inválido (user_ids, title, body)" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (user_ids.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "Sin user_ids" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, push_token")
    .in("id", user_ids);

  if (profileError) {
    console.error("[send-notification] profiles error:", profileError);
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = (profiles ?? [])
    .map((p: { push_token?: string | null }) => p?.push_token)
    .filter((t): t is string => typeof t === "string" && t.length > 0);

  if (tokens.length === 0) {
    return new Response(
      JSON.stringify({
        sent: 0,
        message: "Ningún perfil con push_token para los user_ids indicados",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let accessToken: string;
  let projectId: string;
  try {
    const sa: FCMServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON!);
    projectId = getProjectId(sa);
    accessToken = await getFCMAccessToken();
  } catch (e) {
    console.error("[send-notification] FCM auth error:", e);
    return new Response(
      JSON.stringify({
        error: "FCM no configurado o token inválido",
        detail: e instanceof Error ? e.message : String(e),
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url =
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  let sent = 0;
  const errors: string[] = [];

  for (const token of tokens) {
    const payload = {
      message: {
        token,
        notification: { title, body },
        ...(data && Object.keys(data).length > 0 ? { data } : {}),
        android: {
          priority: "high",
          notification: { channel_id: getAndroidChannelId(data) },
        },
      },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      sent++;
    } else {
      const errText = await res.text();
      errors.push(`${token.slice(0, 20)}...: ${res.status} ${errText}`);
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      total_tokens: tokens.length,
      ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {}),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
