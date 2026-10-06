// handlers/expense-ocr.ts — Vanessa reenvía Constancia NPS (PDF) → OCR Haiku → operational_expenses
// Gate: SOLO ADMIN_PHONE (932 535 512). QA suprime push, no autoriza OCR.

import { sendMessage } from "../wa-api.ts";
import { formatSoles } from "../format.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import {
  expenseMonthFromPeriod,
  isAuthorizedSunatNpsPhone,
  isPdfDocumentMessage,
  parseSunatNpsJson,
} from "../lib/sunat-nps.mjs";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../lib/haiku-usage.ts";

import { getRequestTenantId } from "../lib/tenant.ts";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 20000;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

const NPS_PROMPT = `Eres un extractor de Constancia NPS (Sunat, Perú). El documento adjunto es un PDF.

Tarea: si ES una Constancia NPS con tributos del período, extrae:
- periodo: AAAAMM del período tributario (ej. julio 2026 → "202607"). No uses la fecha de emisión si el período es otro.
- total: suma de los montos de la columna "Pago" del día 1 (el proyectado SIN intereses ni recargos). Número decimal con punto.
- tributos: array {codigo, monto} de cada fila de tributo con su código Sunat si aparece.

Si el PDF NO es una Constancia NPS, está borroso, cortado o no puedes leer período + total con certeza, responde ok=false. NUNCA inventes ni asumas un total.

Responde ÚNICAMENTE JSON, sin markdown:
{"ok": true, "periodo": "AAAAMM", "total": 123.45, "tributos": [{"codigo": "3111", "monto": 10.00}]}
o
{"ok": false, "reason": "not_nps"}`;

const RESEND_COPY =
  "No pude leer la Constancia NPS. Reenvía el PDF de Sunat (el que muestra el total a pagar del período), completo y sin recortes.";

function bytesToBase64(buf: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function downloadWaPdfBytes(
  mediaId: string,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!token || !mediaId) return null;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meta = (await metaRes.json()) as {
      url?: string;
      mime_type?: string;
    };
    if (!meta.url) return null;
    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) return null;
    const buf = new Uint8Array(await fileRes.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_PDF_BYTES) return null;
    const mime = (meta.mime_type || "application/pdf").split(";")[0].trim();
    return { bytes: buf, mime: mime || "application/pdf" };
  } catch (err) {
    console.error("[expense-ocr] download:", (err as Error)?.message ?? err);
    return null;
  }
}

async function extractNpsFromPdf(
  pdfBase64: string,
  opts: { supabase: SupabaseClient; phoneNumber: string },
): Promise<ReturnType<typeof parseSunatNpsJson>> {
  const empty = parseSunatNpsJson("");
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return empty;

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
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              { type: "text", text: NPS_PROMPT },
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
        "[expense-ocr] Anthropic:",
        response.status,
        errText.slice(0, 200),
      );
      void reportAnthropicApiFailure(opts.supabase, {
        status: response.status,
        bodyText: errText,
        source: "sunat_nps_ocr",
        phoneNumber: opts.phoneNumber,
      });
      return empty;
    }

    const data = await response.json();
    const tokensIn = data?.usage?.input_tokens ?? 0;
    const tokensOut = data?.usage?.output_tokens ?? 0;
    void clearAnthropicCreditExhaustedFlag(opts.supabase);
    void logAIUsage(
      opts.supabase,
      "sunat_nps_ocr",
      tokensIn,
      tokensOut,
      opts.phoneNumber,
    );
    const rawText =
      data?.content?.find((b: { type: string }) => b.type === "text")?.text ??
      "";
    const parsed = parseSunatNpsJson(rawText);
    console.log(
      `[expense-ocr] ok=${parsed.ok} periodo=${parsed.periodo ?? "n/a"} ms=${latencyMs}`,
    );
    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[expense-ocr] Haiku:", (err as Error)?.message ?? err);
    return empty;
  }
}

/**
 * PDF NPS desde el 932 (staff). false = no era para este flujo (dispatcher sigue).
 */
export async function tryHandleSunatNpsOcr(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  message: Record<string, unknown>;
}): Promise<boolean> {
  const { supabase, phoneNumber, message } = opts;

  if (!isPdfDocumentMessage(message)) return false;
  if (!isAuthorizedSunatNpsPhone(phoneNumber)) {
    console.log(
      "[expense-ocr] PDF ignorado (no es 932 staff):",
      phoneNumber.slice(-4),
    );
    return false;
  }

  const doc = message.document as Record<string, string> | undefined;
  const mediaId = doc?.id;
  const wamid = typeof message.id === "string" ? message.id : null;
  if (!mediaId) {
    await sendMessage(phoneNumber, RESEND_COPY);
    return true;
  }

  const downloaded = await downloadWaPdfBytes(mediaId);
  if (!downloaded) {
    await sendMessage(phoneNumber, RESEND_COPY);
    return true;
  }

  const parsed = await extractNpsFromPdf(bytesToBase64(downloaded.bytes), {
    supabase,
    phoneNumber,
  });
  const expenseMonth =
    parsed.ok && parsed.periodo ? expenseMonthFromPeriod(parsed.periodo) : null;

  if (!parsed.ok || parsed.total == null || !expenseMonth) {
    await sendMessage(phoneNumber, RESEND_COPY);
    return true;
  }

  const limaToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { error } = await supabase.from("operational_expenses").upsert(
    {
      tenant_id: getRequestTenantId(),
      category: "impuestos",
      label: "Sunat",
      amount: parsed.total.toFixed(2),
      expense_month: expenseMonth,
      expense_date: limaToday,
      is_estimated: false,
      source: "whatsapp_ocr",
      source_ref: wamid,
    },
    { onConflict: "tenant_id,category,label,expense_month" },
  );

  if (error) {
    console.error("[expense-ocr] upsert:", error.message);
    await sendMessage(
      phoneNumber,
      "Leí el PDF pero no pude guardar el gasto. Reenvía en un rato o cárgalo a mano en Finanzas.",
    );
    return true;
  }

  await sendMessage(
    phoneNumber,
    `Sunat período ${parsed.periodo} registrado: S/ ${formatSoles(parsed.total)}`,
  );
  return true;
}
