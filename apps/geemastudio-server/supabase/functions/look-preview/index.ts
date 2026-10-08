// look-preview — Preview virtual de looks (Plan 06/07) vía Vertex AI Gemini Image.
// Fase actual: scaffold + ping de auth. verify_jwt = true (panel / web autenticado).
import { createClient } from "@supabase/supabase-js";
import {
  getGoogleAccessToken,
  getGoogleProjectId,
  parseGoogleServiceAccount,
} from "../_shared/gcp-auth.ts";
import {
  buildLookPreviewPrompt,
  vertexGeminiImageEdit,
} from "../_shared/vertex-gemini-image.ts";

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

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return { error: json({ error: "No autorizado" }, 401) };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { error: json({ error: "No autorizado" }, 401) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "dev" && profile.role !== "owner")) {
    return { error: json({ error: "Solo administración" }, 403) };
  }

  return { user };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  if (req.method === "GET") {
    // Health / verificación de credenciales (sin llamar al modelo)
    try {
      const sa = parseGoogleServiceAccount();
      const projectId = getGoogleProjectId(sa);
      await getGoogleAccessToken();
      return json(
        {
          ok: true,
          service: "look-preview",
          projectId,
          location: Deno.env.get("GCP_LOCATION") ?? "global",
          model: Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-3.1-flash-image",
        },
        200,
      );
    } catch (e) {
      return json(
        {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        },
        500,
      );
    }
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  let body: {
    action?: string;
    style?: string;
    imageBase64?: string;
    mimeType?: string;
    referenceBase64?: string;
    referenceMimeType?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const action = (body.action ?? "preview").trim();

  if (action === "ping") {
    try {
      const sa = parseGoogleServiceAccount();
      await getGoogleAccessToken();
      return json(
        {
          ok: true,
          projectId: getGoogleProjectId(sa),
        },
        200,
      );
    } catch (e) {
      return json(
        {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        },
        500,
      );
    }
  }

  if (action === "preview") {
    const imageB64 = (body.imageBase64 ?? "").trim();
    if (!imageB64) {
      return json({ error: "imageBase64 requerido" }, 400);
    }

    const style = (body.style ?? "Anime").trim();
    const mimeType = body.mimeType ?? "image/jpeg";

    try {
      const imageBytes = Uint8Array.from(
        atob(imageB64),
        (c) => c.charCodeAt(0),
      );
      const referenceBytes = body.referenceBase64?.trim()
        ? Uint8Array.from(
          atob(body.referenceBase64.trim()),
          (c) => c.charCodeAt(0),
        )
        : undefined;

      const result = await vertexGeminiImageEdit({
        imageBytes,
        mimeType,
        prompt: buildLookPreviewPrompt(style),
        referenceImageBytes: referenceBytes,
        referenceMimeType: body.referenceMimeType ?? "image/jpeg",
      });

      return json(
        {
          ok: true,
          mimeType: result.mimeType,
          model: result.model,
          text: result.text ?? null,
          imageBase64: btoa(String.fromCharCode(...result.imageBytes)),
        },
        200,
      );
    } catch (e) {
      console.error("[look-preview]", e);
      return json(
        {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        },
        502,
      );
    }
  }

  return json({ error: `action desconocida: ${action}` }, 400);
});
