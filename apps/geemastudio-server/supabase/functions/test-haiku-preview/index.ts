// test-haiku-preview — Prueba del asistente Haiku desde el panel web (/panel/waba/haiku).
// Usa ANTHROPIC_API_KEY del proyecto (mismo secret que whatsapp-webhook). verify_jwt = true.
import { createClient } from "@supabase/supabase-js";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../whatsapp-webhook/lib/haiku-usage.ts";

const MODEL = "claude-haiku-4-5-20251001";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return json({ error: "No autorizado" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return json({ error: "No autorizado" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return json({ error: "No se pudo validar el rol" }, 500);
  }
  if (!profile || (profile.role !== "dev" && profile.role !== "owner")) {
    return json({ error: "Solo administración" }, 403);
  }

  let body: {
    systemPrompt?: string;
    userMessage?: string;
    maxTokens?: number;
    timeoutMs?: number;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const systemPrompt = (body.systemPrompt ?? "").trim();
  const userMessage = (body.userMessage ?? "").trim();
  if (!systemPrompt) return json({ error: "systemPrompt vacío" }, 400);
  if (!userMessage) return json({ error: "userMessage vacío" }, 400);

  const max_tokens = Math.min(800, Math.max(50, body.maxTokens ?? 350));
  const timeoutMs = Math.min(8000, Math.max(1000, body.timeoutMs ?? 8000));

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) {
    return json(
      {
        error:
          "ANTHROPIC_API_KEY no configurado en Supabase (secrets de Edge Functions)",
      },
      500,
    );
  }

  const started = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      void reportAnthropicApiFailure(service, {
        status: res.status,
        bodyText: text,
        source: "test_haiku_preview",
      });
      return json({ error: text || `Anthropic error ${res.status}` }, 502);
    }

    const anthropicJson = (await res.json()) as {
      content?: { text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    void clearAnthropicCreditExhaustedFlag(service);
    void logAIUsage(
      service,
      "test_haiku_preview",
      anthropicJson?.usage?.input_tokens ?? 0,
      anthropicJson?.usage?.output_tokens ?? 0,
    );
    const latencyMs = Date.now() - started;

    const text = (Array.isArray(anthropicJson?.content) &&
      anthropicJson.content
        .map((p) => p?.text)
        .filter(Boolean)
        .join("")) ||
      "";
    const inputTokens = typeof anthropicJson?.usage?.input_tokens === "number"
      ? anthropicJson.usage.input_tokens
      : null;
    const outputTokens = typeof anthropicJson?.usage?.output_tokens === "number"
      ? anthropicJson.usage.output_tokens
      : null;

    return json({ text, inputTokens, outputTokens, latencyMs }, 200);
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      return json({ error: "Timeout probando Haiku" }, 504);
    }
    console.error("[test-haiku-preview]", e);
    return json({ error: "Error probando Haiku" }, 500);
  } finally {
    clearTimeout(t);
  }
});
