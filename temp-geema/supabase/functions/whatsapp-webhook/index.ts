// whatsapp-webhook — Meta WABA multi-tenant (verify_jwt: false). Ver docs/EDGE_FUNCTIONS.md.

import {
  validateGetVerify,
  parsePostBody,
  isWhatsAppPayload,
  extractPhoneNumberId,
} from "./lib/auth.ts";
import {
  getSupabase,
  getOrCreateClient,
  logMessage as logInMessage,
} from "./lib/supabase.ts";
import { initMessageLogger } from "./lib/message-logger.ts";
import { loadCatalog } from "./lib/services-catalog.ts";
import { loadWabaConfig } from "./lib/waba-config.ts";
import {
  getMessageText,
  getInteractiveId,
  getInteractiveTitle,
  getReferral,
} from "./lib/parse-message.ts";
import { sendMessage } from "./wa-api.ts";
import { dispatch } from "./handlers/dispatcher.ts";
import { handleLegacyPayload } from "./handlers/legacy.ts";
import {
  resolveTenantFromPhoneNumberId,
  type TenantWabaRecord,
} from "./lib/tenant-resolver.ts";
import { waConfigFromTenant } from "./lib/tenant-config.ts";

async function processWebhook(
  body: Record<string, unknown>,
  tenantRecord: TenantWabaRecord,
): Promise<void> {
  const wa = waConfigFromTenant(tenantRecord);
  try {
    const entry = (body.entry as unknown[])?.[0] as Record<string, unknown>;
    const value = (
      (entry?.changes as unknown[])?.[0] as Record<string, unknown>
    )?.value as Record<string, unknown>;
    if (!value?.messages) {
      if (value && typeof value === "object") {
        console.log(
          "[WABA] no value.messages — keys:",
          Object.keys(value as object),
        );
      }
      return;
    }

    const message = (value.messages as unknown[])[0] as Record<string, unknown>;
    const phoneNumber = message.from as string;

    const messageText = getMessageText(message);
    const referral = getReferral(message);
    const fromAd = referral?.source_type === "ad";
    const referralHeadline = referral?.headline ?? null;
    const contact = (value.contacts as unknown[])?.[0] as Record<
      string,
      unknown
    >;
    const contactName =
      (contact?.profile as Record<string, string>)?.name ?? "Cliente WhatsApp";

    const supabase = getSupabase();
    initMessageLogger(supabase, tenantRecord.id);
    const [catalog, wabaConfig, { isNew }] = await Promise.all([
      loadCatalog(supabase, tenantRecord.id),
      loadWabaConfig(supabase, tenantRecord.id),
      getOrCreateClient(supabase, tenantRecord.id, phoneNumber, contactName),
    ]);

    const msgType = (message.type as string) ?? "other";
    const interactiveId = getInteractiveId(message);
    const interactiveTitle = getInteractiveTitle(message);
    const inContent =
      interactiveTitle ?? messageText ?? interactiveId ?? `[${msgType}]`;
    logInMessage(supabase, tenantRecord.id, phoneNumber, "in", inContent, {
      msg_type: msgType,
    });

    await dispatch({
      body,
      message,
      phoneNumber,
      contactName,
      messageText,
      isNew,
      supabase,
      tenantId: tenantRecord.id,
      tenantRecord,
      wa,
      catalog,
      wabaConfig,
      fromAd,
      referralHeadline,
    });
  } catch (err) {
    console.error("[WABA] Error en webhook WhatsApp:", err);
    try {
      const entry = (body?.entry as unknown[])?.[0] as Record<string, unknown>;
      const value = (entry?.changes as unknown[])?.[0] as Record<
        string,
        unknown
      >;
      const val = value?.value as Record<string, unknown>;
      const msg = (val?.messages as unknown[])?.[0] as Record<string, unknown>;
      const to = msg?.from as string;
      if (to) {
        await sendMessage(
          to,
          "Algo falló del lado nuestro. Escribí *menu* para reintentar.",
          wa,
        );
      }
    } catch {
      // ignorar fallo al notificar
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const supabase = getSupabase();
    const result = await validateGetVerify(req, supabase);
    if (result) return new Response(result.challenge, { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await parsePostBody(req);
  if (!body) {
    return new Response("Bad request", { status: 400 });
  }

  if (!isWhatsAppPayload(body)) {
    return handleLegacyPayload(body as Record<string, string>);
  }

  const phoneNumberId = extractPhoneNumberId(body);
  if (!phoneNumberId) {
    console.warn("[WABA] POST sin phone_number_id en metadata");
    return new Response("ok", { status: 200 });
  }

  const supabase = getSupabase();
  const tenantRecord = await resolveTenantFromPhoneNumberId(
    supabase,
    phoneNumberId,
  );
  if (!tenantRecord) {
    console.warn(
      "[WABA] Sin tenant activo para phone_number_id:",
      phoneNumberId,
    );
    return new Response("ok", { status: 200 });
  }

  const promise = processWebhook(body, tenantRecord);
  try {
    const g = globalThis as unknown as {
      EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void };
    };
    if (typeof g?.EdgeRuntime?.waitUntil === "function") {
      g.EdgeRuntime.waitUntil(promise);
    } else {
      void promise.catch((e) =>
        console.error("[WABA] processWebhook error:", e),
      );
    }
  } catch {
    void promise.catch((e) => console.error("[WABA] processWebhook error:", e));
  }

  return new Response("ok", { status: 200 });
});
