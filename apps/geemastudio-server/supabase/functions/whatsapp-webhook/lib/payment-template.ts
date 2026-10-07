// lib/payment-template.ts — Plantilla Meta pago_recibido_validar_zm → Vanessa

import { ADMIN_PHONE } from "./constants.ts";
import { logOutMessage } from "./message-logger.ts";
import type { PaymentExtraction } from "./image-classify.ts";
import { EMPTY_PAYMENT_EXTRACTION } from "./image-classify.ts";

const TEMPLATE_NAME = "pago_recibido_validar_zm";
const GRAPH_VERSION = "v22.0";

export type SendPaymentVerificationTemplateOpts = {
  verificationId: string;
  imageUrl: string;
  clientName: string;
  serviceName: string;
  appointmentDateLabel: string;
  extraction: PaymentExtraction | null;
};

function textParam(value: string): { type: "text"; text: string } {
  const t = (value || "—").trim() || "—";
  // Meta rechaza params vacíos; tope práctico por variable
  return { type: "text", text: t.slice(0, 60) };
}

/**
 * Envía plantilla a ADMIN_PHONE con header imagen + 8 body vars + 2 quick replies.
 * Orden propuesto {{1}}–{{8}}: clienta, servicio, fecha cita, app, monto, fecha pago, destino, últimos4.
 * Ajustar si Meta aprueba otro orden.
 */
export async function sendPaymentVerificationTemplate(
  opts: SendPaymentVerificationTemplateOpts,
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) {
    console.error("[payment-template] faltan WHATSAPP_* secrets");
    return { ok: false, error: "missing_secrets" };
  }
  if (!opts.imageUrl?.trim()) {
    console.error("[payment-template] sin imageUrl");
    return { ok: false, error: "missing_image" };
  }

  const ex = opts.extraction ?? EMPTY_PAYMENT_EXTRACTION;
  const payload = {
    messaging_product: "whatsapp",
    to: ADMIN_PHONE,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: "es_PE" },
      components: [
        {
          type: "header",
          parameters: [{ type: "image", image: { link: opts.imageUrl } }],
        },
        {
          type: "body",
          parameters: [
            textParam(opts.clientName),
            textParam(opts.serviceName),
            textParam(opts.appointmentDateLabel),
            textParam(ex.app_origen),
            textParam(ex.monto),
            textParam(ex.fecha_hora_pago),
            textParam(ex.destino),
            textParam(ex.operacion_ultimos4),
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [
            {
              type: "payload",
              payload: `pay_verify_approve:${opts.verificationId}`,
            },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [
            {
              type: "payload",
              payload: `pay_verify_reject:${opts.verificationId}`,
            },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      const errMsg = JSON.stringify(data?.error ?? data ?? {}).slice(0, 400);
      console.error("[payment-template] Meta error:", res.status, errMsg);
      return { ok: false, error: errMsg };
    }
    const wamid =
      data?.messages?.[0]?.id && typeof data.messages[0].id === "string"
        ? data.messages[0].id
        : null;
    await logOutMessage(
      ADMIN_PHONE,
      `[plantilla] ${TEMPLATE_NAME} · ${opts.clientName} · ${opts.serviceName} · ver=${
        opts.verificationId.slice(0, 8)
      }`,
      "text",
      opts.imageUrl,
      "template",
      wamid,
    );
    return { ok: true };
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    console.error("[payment-template] fail:", msg);
    return { ok: false, error: msg };
  }
}
