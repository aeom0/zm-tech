import { createClient } from "@supabase/supabase-js";
import {
  formatTemplateLogContent,
  logWaOutboundMessage,
} from "../_shared/wa-outbound-log.ts";
import {
  isWaSendableDest,
  normalizeBlockedDestination,
} from "../_shared/wa-recipient.mjs";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PromoBroadcastItemRow {
  id: string;
  client_name: string;
  phone: string;
}

async function assertAdmin(req: Request): Promise<void> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Permitir llamadas internas con service_role key (sin usuario)
  let isServiceRole = false;
  try {
    const payload = JSON.parse(atob(bearerToken.split(".")[1] ?? ""));
    isServiceRole = payload?.role === "service_role";
  } catch {
    // token no es un JWT válido; se trata como llamada normal
  }
  if (isServiceRole) return;

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[send-promo-whatsapp] profile error:", profileError);
    throw new Response("Error verificando rol", { status: 500 });
  }

  if (!profile || !["dev", "owner"].includes(profile.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

async function uploadImageToWhatsApp(
  creds: TenantWabaCredentials,
  imageUrl: string,
): Promise<string> {
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error(
      `No se pudo descargar la imagen desde Storage: ${imageRes.status} ${await imageRes.text()}`,
    );
  }
  const blob = await imageRes.blob();
  const contentType = blob.type || "image/jpeg";

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", contentType);
  form.append("file", blob, "promo.jpg");

  const res = await fetch(
    `https://graph.facebook.com/v22.0/${creds.phoneNumberId}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: form,
    },
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    console.error(
      "[send-promo-whatsapp] Error subiendo media a WhatsApp:",
      JSON.stringify(data.error ?? data),
    );
    throw new Error("Error subiendo imagen a WhatsApp Media API");
  }

  const mediaId = data.id as string | undefined;
  if (!mediaId) {
    throw new Error("WhatsApp Media API no devolvió un id");
  }
  return mediaId;
}

async function sendTemplateMessage(
  creds: TenantWabaCredentials,
  to: string,
  templateName: string,
  waMediaId: string,
  clientName: string,
  bodyText: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await sendWhatsAppMessage(creds, to, {
    type: "template",
    template: {
      name: templateName,
      language: { code: "es_PE" },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { id: waMediaId },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: clientName },
            { type: "text", text: bodyText },
          ],
        },
      ],
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = JSON.stringify(data.error ?? data);
    console.error("[send-promo-whatsapp] Error enviando mensaje:", msg);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    await assertAdmin(req);
  } catch (resp) {
    if (resp instanceof Response) return resp;
    console.error("[send-promo-whatsapp] Error en assertAdmin:", resp);
    return new Response("Error de autenticación", { status: 500 });
  }

  let broadcastId: string | undefined;
  try {
    const body = await req.json();
    broadcastId = body.broadcast_id;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (!broadcastId || typeof broadcastId !== "string") {
    return new Response("Missing broadcast_id", { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: broadcastTenant, error: broadcastTenantError } =
    await supabaseAdmin
      .from("promo_broadcasts")
      .select("tenant_id")
      .eq("id", broadcastId)
      .maybeSingle();
  if (broadcastTenantError) {
    console.error(
      "[send-promo-whatsapp] Error resolviendo tenant del broadcast:",
      broadcastTenantError,
    );
    return new Response("Error cargando broadcast", { status: 500 });
  }
  const broadcastTenantId =
    typeof broadcastTenant?.tenant_id === "string"
      ? broadcastTenant.tenant_id.trim()
      : "";
  if (!broadcastTenantId) {
    return new Response("Broadcast not found", { status: 404 });
  }

  const activeTenants = await getActiveWabaTenants(supabaseAdmin);
  const tenant = activeTenants.find((t) => t.tenantId === broadcastTenantId);
  if (!tenant) {
    return new Response("No hay tenant WABA activo para este broadcast", {
      status: 503,
    });
  }
  const creds = await getTenantWabaCredentials(supabaseAdmin, tenant);
  if (!creds) {
    return new Response("Sin credenciales WABA para el tenant", {
      status: 503,
    });
  }
  const tenantId = tenant.tenantId;

  const { data: blockedConfig } = await supabaseAdmin
    .from("waba_config")
    .select("config_value")
    .eq("tenant_id", tenantId)
    .eq("config_key", "blocked_phone_numbers")
    .eq("is_active", true)
    .maybeSingle();
  const blockedPhones = new Set(
    Array.isArray(
      (blockedConfig?.config_value as { phones?: unknown[] })?.phones,
    )
      ? (blockedConfig?.config_value as { phones: unknown[] }).phones
          .filter((phone): phone is string => typeof phone === "string")
          .map(normalizeBlockedDestination)
      : [],
  );

  const { data: broadcast, error: broadcastError } = await supabaseAdmin
    .from("promo_broadcasts")
    .select("id, title, template, body_text, image_url, wa_media_id, status")
    .eq("id", broadcastId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (broadcastError) {
    console.error(
      "[send-promo-whatsapp] Error cargando broadcast:",
      broadcastError,
    );
    return new Response("Error cargando broadcast", { status: 500 });
  }
  if (!broadcast) {
    return new Response("Broadcast not found", { status: 404 });
  }

  let waMediaId = broadcast.wa_media_id;

  // 1) Subir imagen a WhatsApp Media API si hace falta
  if (broadcast.image_url && !waMediaId) {
    try {
      waMediaId = await uploadImageToWhatsApp(creds, broadcast.image_url);
      const { error: updateMediaError } = await supabaseAdmin
        .from("promo_broadcasts")
        .update({ wa_media_id: waMediaId })
        .eq("id", broadcast.id);
      if (updateMediaError) {
        console.error(
          "[send-promo-whatsapp] Error guardando wa_media_id:",
          updateMediaError,
        );
      }
    } catch (err) {
      console.error("[send-promo-whatsapp] Error subiendo imagen:", err);
      await supabaseAdmin
        .from("promo_broadcasts")
        .update({ status: "failed" })
        .eq("id", broadcast.id);
      return new Response("No se pudo subir la imagen a WhatsApp", {
        status: 500,
      });
    }
  }

  if (!waMediaId) {
    await supabaseAdmin
      .from("promo_broadcasts")
      .update({ status: "failed" })
      .eq("id", broadcast.id);
    return new Response("Broadcast sin imagen válida (wa_media_id)", {
      status: 400,
    });
  }

  // 2) Marcar broadcast como "sending"
  const { error: statusError } = await supabaseAdmin
    .from("promo_broadcasts")
    .update({ status: "sending" })
    .eq("id", broadcast.id);
  if (statusError) {
    console.error(
      "[send-promo-whatsapp] Error actualizando status=sending:",
      statusError,
    );
  }

  // 3) Cargar items pendientes
  const { data: items, error: itemsError } = await supabaseAdmin
    .from("promo_broadcast_items")
    .select("id, client_name, phone")
    .eq("broadcast_id", broadcast.id)
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (itemsError) {
    console.error("[send-promo-whatsapp] Error cargando items:", itemsError);
    await supabaseAdmin
      .from("promo_broadcasts")
      .update({ status: "failed" })
      .eq("id", broadcast.id);
    return new Response("Error cargando destinatarias", { status: 500 });
  }

  const list = (items ?? []) as PromoBroadcastItemRow[];

  let sentCount = 0;
  let failedCount = 0;

  for (const item of list) {
    const phone = item.phone?.toString().trim();
    if (phone && blockedPhones.has(normalizeBlockedDestination(phone))) {
      failedCount++;
      await supabaseAdmin
        .from("promo_broadcast_items")
        .update({
          status: "failed",
          error_msg: "Destinataria bloqueada para campañas WA",
          sent_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      continue;
    }
    if (!phone || !isWaSendableDest(phone)) {
      failedCount++;
      await supabaseAdmin
        .from("promo_broadcast_items")
        .update({
          status: "failed",
          error_msg:
            "Cliente sin destino WA válido (teléfono E.164 o BSUID PE.…)",
          sent_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      continue;
    }

    const result = await sendTemplateMessage(
      creds,
      phone,
      broadcast.template,
      waMediaId,
      item.client_name,
      broadcast.body_text,
    );

    if (result.ok) {
      sentCount++;
      await supabaseAdmin
        .from("promo_broadcast_items")
        .update({
          status: "sent",
          error_msg: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      await logWaOutboundMessage(supabaseAdmin, {
        phone,
        tenantId: creds.tenantId,
        msgType: "template",
        content: formatTemplateLogContent(broadcast.template, [
          item.client_name,
          broadcast.body_text?.slice(0, 80) ?? "",
        ]),
      });
    } else {
      failedCount++;
      await supabaseAdmin
        .from("promo_broadcast_items")
        .update({
          status: "failed",
          error_msg: result.error?.slice(0, 500) ?? "Error desconocido",
          sent_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }

    // Delay 100ms entre mensajes para evitar rate limits agresivos
    // deno-lint-ignore no-await-in-loop
    await new Promise((r) => setTimeout(r, 100));
  }

  // 4) Recontar totales desde la BD para asegurar consistencia
  const { data: allItems, error: allItemsError } = await supabaseAdmin
    .from("promo_broadcast_items")
    .select("status")
    .eq("broadcast_id", broadcast.id);

  if (!allItemsError && allItems) {
    sentCount = allItems.filter((i) => i.status === "sent").length;
    failedCount = allItems.filter((i) => i.status === "failed").length;
  }

  const finalStatus = failedCount > 0 && sentCount === 0 ? "failed" : "done";

  const { error: finalUpdateError } = await supabaseAdmin
    .from("promo_broadcasts")
    .update({
      status: finalStatus,
      total_sent: sentCount,
      total_failed: failedCount,
      sent_at: new Date().toISOString(),
    })
    .eq("id", broadcast.id);

  if (finalUpdateError) {
    console.error(
      "[send-promo-whatsapp] Error actualizando totales:",
      finalUpdateError,
    );
  }

  return new Response(
    JSON.stringify({
      broadcast_id: broadcast.id,
      total_sent: sentCount,
      total_failed: failedCount,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});

// Deploy:
// SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy send-promo-whatsapp --project-ref udelxwwnyivknslueerr
