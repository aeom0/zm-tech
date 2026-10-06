// lib/image-classify.ts — Haiku Vision: tipo de imagen + OCR de comprobante (1 llamada)

import type { SupabaseClient } from "./supabase.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "./haiku-usage.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8000;

export type ImageKind = "comprobante_pago" | "diseno_referencia" | "otro";

export type PaymentExtraction = {
  app_origen: string;
  monto: string;
  fecha_hora_pago: string;
  destino: string;
  operacion_ultimos4: string;
};

export type ClassifyImageResult = {
  kind: ImageKind | null;
  extraction: PaymentExtraction | null;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
};

export const EMPTY_PAYMENT_EXTRACTION: PaymentExtraction = {
  app_origen: "No detectado",
  monto: "No detectado",
  fecha_hora_pago: "No detectado",
  destino: "No detectado",
  operacion_ultimos4: "No detectado",
};

const PROMPT = `Analiza esta imagen enviada por una clienta a un bot de WhatsApp de un salón de belleza (ZM Lash & Nails, Perú).

PASO 1 - Clasifica en exactamente una categoría:
- "comprobante_pago": captura de Yape, Plin, transferencia bancaria o voucher, con monto y datos de la operación.
- "diseno_referencia": foto de manos/uñas/pestañas/cejas (propias o de inspiración), incluye capturas de video/redes mostrando un diseño.
- "otro": cualquier otra cosa (capturas de chat, memes, documentos sin relación).

PASO 2 - Solo si es "comprobante_pago", extrae ESTOS 5 campos exactos leyendo el texto de la imagen. Si un campo no aparece o no es legible, usa "No detectado" — NUNCA inventes ni asumas un valor.
- app_origen: "Yape", "Plin", "Transferencia" u otro nombre de app visible
- monto: solo el número, ej "60.00"
- fecha_hora_pago: fecha y hora que muestra el comprobante (no la de hoy)
- destino: cuenta/nombre destino tal como aparece (ej "Yape · Zm Bea***")
- operacion_ultimos4: SOLO los últimos 4 dígitos del número de operación/transacción

Responde ÚNICAMENTE con este JSON, sin texto adicional ni markdown:
{"kind": "comprobante_pago" | "diseno_referencia" | "otro", "extraction": null | {"app_origen": "...", "monto": "...", "fecha_hora_pago": "...", "destino": "...", "operacion_ultimos4": "..."}}

"extraction" debe ser null si kind no es "comprobante_pago".`;

function bytesToBase64(buf: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function normalizeExtraction(
  raw: Record<string, unknown> | null | undefined,
): PaymentExtraction | null {
  if (!raw || typeof raw !== "object") return null;
  const field = (k: keyof PaymentExtraction) => {
    const v = raw[k];
    return typeof v === "string" && v.trim() ? v.trim() : "No detectado";
  };
  return {
    app_origen: field("app_origen"),
    monto: field("monto"),
    fecha_hora_pago: field("fecha_hora_pago"),
    destino: field("destino"),
    operacion_ultimos4: field("operacion_ultimos4"),
  };
}

export function parseClassifyResult(raw: string): {
  kind: ImageKind | null;
  extraction: PaymentExtraction | null;
} {
  const empty = { kind: null as ImageKind | null, extraction: null };
  try {
    const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned);
    const validKinds = ["comprobante_pago", "diseno_referencia", "otro"];
    if (!validKinds.includes(parsed?.kind)) return empty;
    return {
      kind: parsed.kind as ImageKind,
      extraction:
        parsed.kind === "comprobante_pago"
          ? (normalizeExtraction(parsed.extraction) ?? EMPTY_PAYMENT_EXTRACTION)
          : null,
    };
  } catch {
    return empty;
  }
}

/** Descarga la imagen (URL pública Storage) y la clasifica con Haiku Vision. */
export async function classifyInboundImage(
  imageUrl: string,
  opts?: { supabase?: SupabaseClient; phoneNumber?: string },
): Promise<ClassifyImageResult> {
  const empty: ClassifyImageResult = {
    kind: null,
    extraction: null,
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
  };
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey || !imageUrl?.trim()) return empty;

  let base64: string;
  let mediaType: string;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return empty;
    mediaType = imgRes.headers.get("content-type") || "image/jpeg";
    if (!mediaType.startsWith("image/")) mediaType = "image/jpeg";
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    if (buf.length === 0) return empty;
    base64 = bytesToBase64(buf);
  } catch {
    return empty;
  }

  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - t0;

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        "[image-classify] Anthropic error:",
        response.status,
        errText.slice(0, 160),
      );
      if (opts?.supabase) {
        void reportAnthropicApiFailure(opts.supabase, {
          status: response.status,
          bodyText: errText,
          source: "image_classify",
          phoneNumber: opts.phoneNumber,
        });
      }
      return { ...empty, latencyMs };
    }

    const data = await response.json();
    const tokensIn = data?.usage?.input_tokens ?? 0;
    const tokensOut = data?.usage?.output_tokens ?? 0;
    if (opts?.supabase) {
      void clearAnthropicCreditExhaustedFlag(opts.supabase);
      void logAIUsage(
        opts.supabase,
        "image_classify",
        tokensIn,
        tokensOut,
        opts.phoneNumber,
      );
    }
    const rawText =
      data?.content?.find((b: { type: string }) => b.type === "text")?.text ??
      "";
    const { kind, extraction } = parseClassifyResult(rawText);
    console.log(
      `[image-classify] kind=${kind ?? "null"} ms=${latencyMs} in=${tokensIn} out=${tokensOut}`,
    );
    return { kind, extraction, latencyMs, tokensIn, tokensOut };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - t0;
    console.error("[image-classify] fail:", (err as Error)?.message ?? err);
    return { ...empty, latencyMs };
  }
}

/** Parsea monto OCR ("60.00") a decimal string o null. */
export function parseOcrMonto(monto: string | null | undefined): string | null {
  if (!monto || monto === "No detectado") return null;
  const cleaned = monto.replace(/[^\d.,]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

/** Convierte el nombre de la app detectada al método canónico de Finanzas. */
export function paymentMethodFromExtraction(
  appOrigen: string | null | undefined,
): "yape_plin" | "transfer" | null {
  const app = String(appOrigen ?? "").toLowerCase();
  if (app.includes("yape") || app.includes("plin")) return "yape_plin";
  if (app.includes("transfer")) return "transfer";
  return null;
}
