// send-push-notification — Push vía Expo Push API (solo tokens ExponentPushToken[...]).
// La app actual usa getDevicePushTokenAsync() (token FCM nativo) → no usa esta función; usar send-notification.
// Usar esta función solo si la app guardara getExpoPushTokenAsync() en profiles.push_token.
// Ver docs/ops/EDGE_FUNCTIONS.md. Body: user_ids, title, body, data?.

import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { user_ids, title, body, data } = (await req.json()) as {
      user_ids: string[];
      title: string;
      body: string;
      data?: Record<string, string>;
    };

    if (!user_ids?.length || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros requeridos" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, push_token")
      .in("id", user_ids)
      .not("push_token", "is", null);

    if (error) {
      console.error(
        "[send-push-notification] Error leyendo perfiles:",
        error.message,
      );
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Solo tokens Expo (ExponentPushToken[...]); FCM nativos van con send-notification
    const tokens = (profiles ?? [])
      .map((p: { push_token: string }) => p.push_token)
      .filter((t: string) => t?.startsWith("ExponentPushToken["));

    if (!tokens.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: "Sin tokens Expo válidos" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const messages = tokens.map((token: string) => ({
      to: token,
      title,
      body,
      sound: "default",
      ...(data ? { data } : {}),
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoData = await expoRes.json();
    if (!expoRes.ok) {
      console.error("[send-push-notification] Expo API error:", expoData);
    }

    return new Response(
      JSON.stringify({ sent: tokens.length, expo: expoData }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[send-push-notification] Error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
