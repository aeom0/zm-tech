// whatsapp-webhook — Webhook Meta WABA. Entrada mínima: validación, extracción de mensaje y despacho.
// CRÍTICO: verify_jwt debe ser false (Meta no envía JWT). Ver docs/ops/EDGE_FUNCTIONS.md.

import {
  isWhatsAppPayload,
  parsePostBody,
  validateGetVerify,
} from "./lib/auth.ts";
import {
  getOrCreateClient,
  getSession,
  getSupabase,
  logMessage as logInMessage,
} from "./lib/supabase.ts";
import {
  claimInboundMessage,
  coalesceTextBurstWithRetry,
  isInboundAfterDispatchAnswered,
  isInboundAfterLeaderCoalesceCoverage,
  markDispatchAnsweredThrough,
  POST_WAIT_SKIP_LOOKBACK_MS,
  releaseDispatchTurn,
  shouldSkipDispatchPeerAlreadyHandled,
  waitAndClaimDispatchTurn,
} from "./lib/inbound-gate.ts";
import { initMessageLogger } from "./lib/message-logger.ts";
import { loadCatalog } from "./lib/services-catalog.ts";
import { loadWabaConfig } from "./lib/waba-config.ts";
import {
  extractPhoneNumberId,
  resolveTenantFromPhoneNumberId,
} from "./lib/tenant-resolver.ts";
import { runWithRequestTenantId } from "./lib/tenant.ts";
import { ensureSalonHolidaysLoaded } from "./lib/peru-holidays.ts";
import { ensureTenantWabaRulesLoaded } from "./lib/tenant-rules.ts";
import {
  getButtonReplyText,
  getInteractiveId,
  getInteractiveTitle,
  getMessageText,
  getReactionEmoji,
  getReferral,
  isFromAd,
} from "./lib/parse-message.ts";
import { persistInboundWaImage } from "./lib/inbound-image.ts";
import {
  enrichTextWithQuotedContent,
  formatInboundWithQuotePreview,
  getInboundReplyContext,
  resolveQuotedMessage,
  withNearbyImageCaption,
} from "./lib/reply-context.ts";
import { sendMessage } from "./wa-api.ts";
import { dispatch } from "./handlers/dispatcher.ts";
import { runAgent, shouldRunAgent } from "./agent/agent.ts";
import { handleLegacyPayload } from "./handlers/legacy.ts";
import { logWaError } from "./lib/error-log.ts";
import { preferClientDisplayName } from "./lib/client-address.ts";
import { isWaBsuid, waConversationKey } from "./lib/wa-recipient.mjs";

async function processMessage(body: Record<string, unknown>): Promise<void> {
  try {
    const entry = (body.entry as unknown[])?.[0] as Record<string, unknown>;
    const change = (entry?.changes as unknown[])?.[0] as Record<
      string,
      unknown
    >;
    const value = change?.value as Record<string, unknown>;

    const supabaseEarly = getSupabase();
    const phoneNumberId = extractPhoneNumberId(value);
    const tenantId = await resolveTenantFromPhoneNumberId(
      supabaseEarly,
      phoneNumberId,
    );

    await runWithRequestTenantId(tenantId, async () => {
      // Eventos de cuenta/número (display name, calidad, account_update).
      // Requiere suscripción en Meta App → WhatsApp → Webhook fields.
      const { isWabaAccountEventField, handleWabaAccountEvent } = await import(
        "./handlers/waba-account-events.ts"
      );
      if (isWabaAccountEventField(change?.field)) {
        const supabase = getSupabase();
        await handleWabaAccountEvent(supabase, {
          tenantId,
          field: String(change.field),
          value: value ?? null,
          phoneNumberId,
          wabaId: (typeof entry?.id === "string" && entry.id !== ""
            ? entry.id
            : null) ??
            Deno.env.get("WABA_ID") ??
            Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID") ??
            null,
        });
        return;
      }

      // Ecos de mensajes enviados desde la app WhatsApp Business (coexistencia).
      // Requiere suscripción al campo `smb_message_echoes` en el panel Meta.
      const { isSmbMessageEchoesChange, handleStaffMessageEchoes } =
        await import("./handlers/staff-echo.ts");
      if (isSmbMessageEchoesChange(change) && value) {
        const supabase = getSupabase();
        initMessageLogger(supabase);
        const n = await handleStaffMessageEchoes(supabase, value);
        console.log(`[WABA] smb_message_echoes handled=${n}`);
        return;
      }

      // Statuses de entrega Meta (sent/delivered/read/failed) — no son mensajes.
      // Pueden venir solos o (raro) junto a messages; siempre aplicarlos.
      const { isMessageStatusesPayload, handleMessageStatuses } = await import(
        "./handlers/message-statuses.ts"
      );
      if (value && isMessageStatusesPayload(value)) {
        const supabase = getSupabase();
        const n = await handleMessageStatuses(supabase, value);
        console.log(`[WABA] message statuses applied=${n}`);
        if (!value.messages) return;
      }

      if (!value?.messages) {
        if (value && typeof value === "object") {
          console.log(
            "[WABA] no value.messages – value keys:",
            Object.keys(value),
            "field:",
            change?.field,
          );
        }
        return;
      }

      const message = (value.messages as unknown[])[0] as Record<
        string,
        unknown
      >;
      const contact = (value.contacts as unknown[])?.[0] as Record<
        string,
        unknown
      >;
      const contactName = (contact?.profile as Record<string, string>)?.name ??
        "Cliente WhatsApp";
      const contactUsernameRaw = (contact?.profile as Record<string, string>)
        ?.username;
      const contactUsername =
        typeof contactUsernameRaw === "string" && contactUsernameRaw.trim()
          ? contactUsernameRaw.trim()
          : null;

      // Clave de hilo: teléfono E.164 o BSUID (PE.xxx) si Meta oculta el número.
      const fromPhone =
        typeof message.from === "string" && message.from.length > 0
          ? message.from
          : null;
      const fromUserIdRaw =
        (typeof message.from_user_id === "string" && message.from_user_id) ||
        (typeof contact?.user_id === "string" && contact.user_id) ||
        null;
      const fromUserId =
        typeof fromUserIdRaw === "string" && isWaBsuid(fromUserIdRaw)
          ? fromUserIdRaw
          : null;
      let phoneNumber = waConversationKey(fromPhone || fromUserId || "");
      // Meta a veces manda el número y a veces solo el BSUID del mismo cliente:
      // si ya existe el hilo BSUID, seguir ahí en vez de abrir un segundo hilo
      // (Ana Paula …5112, 4-oct: comprobante final quedó en un chat aparte).
      if (fromPhone && fromUserId && phoneNumber !== fromUserId) {
        const { data: bsuidThread } = await getSupabase()
          .from("whatsapp_sessions")
          .select("phone")
          .eq("phone", fromUserId)
          .maybeSingle();
        if (bsuidThread) phoneNumber = fromUserId;
      }

      const messageText = getMessageText(message);
      const referral = getReferral(message);
      const fromAd = isFromAd(message);
      const referralHeadline = referral?.headline ?? null;

      const supabase = getSupabase();
      initMessageLogger(supabase);

      const msgType = (message.type as string) ?? "other";
      const interactiveId = getInteractiveId(message);
      const interactiveTitle = getInteractiveTitle(message);
      const buttonReplyText = getButtonReplyText(message);
      const reactionEmoji = getReactionEmoji(message);
      const wamid = typeof message.id === "string" ? message.id : undefined;
      // Meta media id (image/audio/document/sticker/video) — rescate ~30d
      const mediaPayload = message[msgType] as
        | Record<string, unknown>
        | undefined;
      const mediaId = mediaPayload && typeof mediaPayload.id === "string"
        ? mediaPayload.id
        : null;
      // Preferir el título legible sobre el ID interno para el log (panel web-waba-mensajes).
      // Usar || (no ??) para que un messageText vacío (mensajes button/image) no
      // corte la cadena y caiga al siguiente valor legible.
      // reactionEmoji: emoji real de "reaction" (Meta) en vez del literal "[reaction]".
      const inContent = interactiveTitle ||
        buttonReplyText ||
        messageText ||
        interactiveId ||
        reactionEmoji ||
        `[${msgType}]`;

      if (!phoneNumber) {
        console.warn(
          "[WABA] missing message.from y BSUID — contact=",
          contactName,
        );
        await logWaError(supabase, {
          phone: null,
          step: null,
          msgType,
          error: "missing_from_phone",
          context: {
            from_user_id: fromUserId,
            contact_name: contactName,
            wamid: wamid ?? null,
            preview: inContent.slice(0, 200),
            from_ad: fromAd,
          },
          fallbackSent: false,
        });
        return;
      }

      // Deduplicar por wamid (reintentos Meta + webhooks duplicados).
      // step_before = step de sesión ANTES del dispatch (no después).
      const sessionBeforeInbound = await getSession(supabase, phoneNumber);
      const stepBefore = sessionBeforeInbound?.step ?? null;
      if (wamid) {
        const claimed = await claimInboundMessage(supabase, {
          phone: phoneNumber,
          wamid,
          content: inContent,
          msg_type: msgType,
          media_id: mediaId,
          step_before: stepBefore,
        });
        if (!claimed) {
          console.log("[WABA] wamid ya procesado, skip:", wamid.slice(0, 24));
          return;
        }
      } else {
        logInMessage(supabase, phoneNumber, "in", inContent, {
          msg_type: msgType,
          media_id: mediaId,
          step_before: stepBefore ?? undefined,
        });
      }

      // Sticker: descargar de Meta y persistir en Storage para poder verlo en el
      // panel (antes solo quedaba el media_id sin descargar nada). Fire-and-forget,
      // después de insertar la fila (update por media_id necesita que la fila ya
      // exista) — no bloquea el dispatch ni depende de su resultado.
      // Audio NO se persiste aquí: `tryHandleAudioTakeover` (dispatcher.ts) lo hace
      // como parte de la pausa de bot + aviso a staff, para no duplicar el upload.
      if (mediaId && msgType === "sticker") {
        void persistInboundWaImage(supabase, {
          phone: phoneNumber,
          mediaId,
          caption: null,
        }).catch((err: unknown) =>
          console.error("[WABA] persist sticker:", err)
        );
      }

      const inboundReceivedAt = Date.now();

      const isTextBurst = !interactiveId && msgType === "text" &&
        messageText.length > 0;

      // Para respuestas de botón de plantilla (quick reply), pasar el texto del
      // botón al dispatcher como si fuera texto libre (p. ej. "Confirmar").
      let effectiveText = messageText || buttonReplyText || "";
      let effectivePreview = inContent;
      let coveredThroughIso: string | null = null;

      if (isTextBurst) {
        // Reintentar lock: no dropear follow-ups CTWA (~5s) si el peer ya soltó.
        // null = lock agotado → peer coalesció la ráfaga; no despachar Haiku otra vez.
        const burst = await coalesceTextBurstWithRetry(
          supabase,
          phoneNumber,
        );
        const combined = burst?.text ?? null;
        coveredThroughIso = burst?.coveredThroughIso ?? null;
        if (combined === null) {
          // Smil …9843: lock agotado pero el IN llegó *después* del coalesce del
          // líder → despachar este texto solo (no dropear ubicación/pregunta).
          if (
            await isInboundAfterLeaderCoalesceCoverage(supabase, phoneNumber)
          ) {
            console.log(
              "[WABA] lock exhausted — inbound uncovered, dispatch solo:",
              phoneNumber.slice(-4),
            );
            effectiveText = messageText;
            effectivePreview = inContent;
          } else {
            // Visibilidad forense (29-jul Patricia …5300): antes solo console.log.
            // En ráfaga sana el peer coalesció; si el lock quedó huérfano, esto deja rastro en SQL.
            console.log(
              "[WABA] skip dispatch — ráfaga cubierta por peer:",
              phoneNumber.slice(-4),
            );

            // Pamela …4782 (2-oct): el lock se agotó, el líder ya había soltado
            // y nadie contestó. "Un segundo ya te respondo" dejaba el texto
            // ("Tb vi promocion" / la hora) sin despachar. Si el peer sigue
            // en el lock o ya respondió, no duplicar. Si no, despachar este texto.
            let peerAlreadyResponded = false;
            let lockStillHeld = false;
            try {
              const { data: lockRow } = await supabase
                .from("wa_action_debounce")
                .select("claimed_at")
                .eq("phone", phoneNumber)
                .eq("kind", "inbound_coalesce")
                .maybeSingle();
              lockStillHeld = Boolean(lockRow);
              const sinceIso = new Date(Date.now() - 15_000).toISOString();
              const { data: recentOut } = await supabase
                .from("wa_messages")
                .select("id")
                .eq("phone", phoneNumber)
                .eq("direction", "out")
                .gte("created_at", sinceIso)
                .limit(1);
              peerAlreadyResponded = Boolean(recentOut?.length);
            } catch (softErr) {
              console.error("[WABA] lock fail-soft:", softErr);
            }

            const inboundUncovered = peerAlreadyResponded
              ? await isInboundAfterDispatchAnswered(supabase, phoneNumber)
              : false;
            if (!lockStillHeld && (!peerAlreadyResponded || inboundUncovered)) {
              console.log(
                "[WABA] lock exhausted — sin respuesta del peer, dispatch solo:",
                phoneNumber.slice(-4),
              );
              effectiveText = messageText;
              effectivePreview = inContent;
              coveredThroughIso = new Date().toISOString();
            } else {
              if (!peerAlreadyResponded) {
                await logWaError(supabase, {
                  phone: phoneNumber,
                  step: null,
                  msgType: "text",
                  error: "skip_dispatch_lock_exhausted",
                  context: {
                    reason: "coalesce_lock_exhausted",
                    note: "peer aún tiene el lock; no se llamó dispatch",
                    preview: effectivePreview.slice(0, 200),
                    fallbackSent: false,
                  },
                  fallbackSent: false,
                });
              } else {
                console.log(
                  "[WABA] skip error log — peer ya respondió:",
                  phoneNumber.slice(-4),
                );
              }
              return;
            }
          }
        } else if (combined) {
          effectiveText = combined;
          effectivePreview = combined;
        }
        // Avalancha multi-flujo (Loren): si el líder ya respondió tras incluir
        // el burst (trailing-edge), no re-despachar. CTWA+precio queda dentro
        // del coalesce del líder (quietud 1.5s post-ventana).
        if (await shouldSkipDispatchPeerAlreadyHandled(supabase, phoneNumber)) {
          return;
        }
      }

      // Reply con quote (deslizar → comentar): enriquecer SOLO replies cortos
      // ("Si" / "este") para que matchers/Haiku vean el creativo. Preguntas largas
      // no concatenan el quote — evita que ubicación/horarios del mensaje citado
      // disparen matchers (TRANSCAM …5337).
      // Imágenes: persiste reply_to_wamid + reply_image_url (panel miniatura) y
      // caption cercano si el OUT era solo `[imagen]` (Angui / staff foto+etiqueta).
      const replyCtx = getInboundReplyContext(message);
      if (replyCtx?.id) {
        let quoted = await resolveQuotedMessage(
          supabase,
          phoneNumber,
          replyCtx.id,
          { replyText: effectiveText },
        );
        if (quoted) {
          quoted = await withNearbyImageCaption(supabase, phoneNumber, quoted);
        }
        if (quoted?.content || quoted?.image_url) {
          const quoteLabel = quoted.content || "[imagen]";
          effectiveText = enrichTextWithQuotedContent(
            effectiveText,
            quoteLabel,
          );
          // Preview panel siempre con ↳ (humano); matchers usan effectiveText ya filtrado
          effectivePreview = formatInboundWithQuotePreview(
            effectivePreview,
            quoteLabel,
          );
          if (wamid) {
            void supabase
              .from("wa_messages")
              .update({
                content: effectivePreview.slice(0, 2000),
                reply_to_wamid: replyCtx.id,
                ...(quoted.image_url
                  ? { reply_image_url: quoted.image_url }
                  : {}),
              })
              .eq("wamid", wamid)
              .then(
                () => {},
                () => {},
              );
          }
        }
      }

      const [catalog, wabaConfig, { client, isNew }] = await Promise.all([
        loadCatalog(supabase, tenantId),
        loadWabaConfig(supabase, tenantId),
        getOrCreateClient(supabase, phoneNumber, contactName, {
          username: contactUsername,
        }),
        ensureSalonHolidaysLoaded(supabase, tenantId),
        ensureTenantWabaRulesLoaded(supabase, tenantId),
      ]);

      // Ficha clients.name > display name WA (Pati: "Gatohockey" vs "PATI CAVANA")
      const displayName = preferClientDisplayName(client?.name, contactName);

      // Turno secuencial (caso Cami …6725, 19-sep-2026): si otra ráfaga del
      // mismo teléfono todavía tiene un dispatch Haiku/menú en vuelo, esperar
      // a que termine antes de abrir un segundo round-trip en paralelo. El
      // phone-lock de coalescing (arriba) ya se soltó; sin este segundo guard,
      // dos leaders separados por >COALESCE_MAX_MS pueden despachar Haiku al
      // mismo tiempo y la clienta ve una respuesta y, sin haberla contestado,
      // el menú genérico encima — mata la venta emocional.
      // Los taps interactivos también esperan turno (Margarita …3450, 23-sep-2026):
      // sin esto, un tap corría en paralelo con el free_question del texto previo.
      // Botones de plantilla (msgType "button", ej. retoque_reenganche_zm) llegan
      // como `message.button`, no `message.interactive` — `interactiveId` queda
      // undefined y el tap NUNCA esperaba turno. Caso Melisa …9414 (27-sep-2026):
      // tocó "Agendar" del recordatorio de retoque a los ~6s de escribir "Buenos
      // dias" + "Una cita para mañana"; ese texto seguía coalesciendo/despachando
      // en paralelo y ambos flujos pisaron la misma sesión/carrito (menú de
      // Depilación, foto de Cejas y un "no hay cupo" con la fecha de su cita
      // completada anterior, todo ajeno a lo que había pedido).
      const isTemplateButtonReply = msgType === "button";
      const heldDispatchTurn =
        isTextBurst || interactiveId || isTemplateButtonReply
          ? await waitAndClaimDispatchTurn(supabase, phoneNumber)
          : false;

      // Re-chequeo POST-espera (Maribel Merino …6295, 21-sep-2026): el check
      // de la línea de arriba corre ANTES de esperar el turno — si el peer
      // (leader A) aún no había respondido en ese instante, no evitaba nada.
      // Caso real: A coalesció el burst y Haiku hizo timeout (5s) → fallback
      // genérico enviado. B esperó su turno (guard de arriba, correcto) y
      // recién AL TERMINAR de esperar, A ya había contestado — pero nadie
      // volvía a mirar eso, así que B despachaba Haiku de nuevo y mandaba
      // una segunda respuesta contradictoria 7s después. Repetir el check
      // acá, ya con el turno en mano, evita ese doble mensaje.
      if (
        isTextBurst &&
        (await shouldSkipDispatchPeerAlreadyHandled(
          supabase,
          phoneNumber,
          POST_WAIT_SKIP_LOOKBACK_MS,
        ))
      ) {
        if (heldDispatchTurn) await releaseDispatchTurn(supabase, phoneNumber);
        return;
      }

      if (isTextBurst && coveredThroughIso) {
        await markDispatchAnsweredThrough(
          supabase,
          phoneNumber,
          coveredThroughIso,
        );
      }

      try {
        // Cutover agente Haiku 5.5: solo texto libre, con flag por tenant y
        // allowlist. Si el agente falla sin haber respondido, cae al dispatch.
        const agentHandled = await shouldRunAgent({
          supabase,
          wabaConfig,
          phoneNumber,
          isPlainText: !interactiveId && msgType === "text" &&
            effectiveText.trim().length > 0,
        }) && await runAgent({
          supabase,
          phoneNumber,
          contactName: displayName,
          catalog,
          wabaConfig,
          phoneCountry: client?.phone_country ?? null,
          messageText: effectiveText,
        });
        if (agentHandled) return;
        await dispatch({
          body,
          message,
          phoneNumber,
          contactName: displayName,
          messageText: effectiveText,
          isNew,
          supabase,
          catalog,
          wabaConfig,
          tenantId,
          fromAd,
          referralHeadline,
          phoneCountry: client?.phone_country ?? null,
          messagePreview: effectivePreview,
          inboundReceivedAt,
        });
      } finally {
        if (heldDispatchTurn) await releaseDispatchTurn(supabase, phoneNumber);
      }
    });
  } catch (err) {
    console.error("[WABA] Error en webhook WhatsApp:", err);
    let to: string | undefined;
    let fromUserId: string | undefined;
    let contactName: string | undefined;
    let msgType: string | undefined;
    let step: string | null = null;
    let fallbackSent = false;
    try {
      const entry = (body?.entry as unknown[])?.[0] as Record<string, unknown>;
      const value = (entry?.changes as unknown[])?.[0] as Record<
        string,
        unknown
      >;
      const val = value?.value as Record<string, unknown>;
      const msg = (val?.messages as unknown[])?.[0] as Record<string, unknown>;
      const contact = (val?.contacts as unknown[])?.[0] as
        | Record<string, unknown>
        | undefined;
      const fromPhone = typeof msg?.from === "string" && msg.from.length > 0
        ? msg.from
        : undefined;
      const fromUserIdRaw =
        (typeof msg?.from_user_id === "string" && msg.from_user_id) ||
        (typeof contact?.user_id === "string" && contact.user_id) ||
        undefined;
      fromUserId = typeof fromUserIdRaw === "string" && isWaBsuid(fromUserIdRaw)
        ? fromUserIdRaw
        : undefined;
      // Misma clave de hilo que el happy path (E.164 o BSUID).
      to = waConversationKey(fromPhone || fromUserId || "") || undefined;
      contactName = (contact?.profile as Record<string, string> | undefined)
        ?.name;
      msgType = msg?.type as string;
      // Fallback texto solo si hay E.164 (BSUID inventado de QA falla Meta 400).
      if (to && !isWaBsuid(to)) {
        await sendMessage(to, "Algo falló. Escribe *menu* para reintentar.");
        fallbackSent = true;
      }
    } catch {
      // ignore — se registra abajo con fallbackSent=false
    }

    try {
      const supabase = getSupabase();
      if (to) {
        const { data: session } = await supabase
          .from("whatsapp_sessions")
          .select("step")
          .eq("phone", to)
          .maybeSingle();
        step = session?.step ?? null;
      }
      await logWaError(supabase, {
        phone: to ?? null,
        step,
        msgType,
        error: err,
        context: {
          body,
          ...(fromUserId ? { from_user_id: fromUserId } : {}),
          ...(contactName ? { contact_name: contactName } : {}),
        },
        fallbackSent,
      });
    } catch {
      // ignore — no bloquear el webhook por un fallo de logging
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    const result = validateGetVerify(req);
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
    const res = await handleLegacyPayload(body as Record<string, string>);
    return res;
  }

  // Responder 200 OK a Meta de inmediato; procesamiento en segundo plano (EdgeRuntime.waitUntil si existe).
  const promise = processMessage(body);
  try {
    const g = globalThis as unknown as {
      EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void };
    };
    if (typeof g?.EdgeRuntime?.waitUntil === "function") {
      g.EdgeRuntime.waitUntil(promise);
    } else {
      void promise.catch((e) =>
        console.error("[WABA] processMessage error:", e)
      );
    }
  } catch {
    void promise.catch((e) => console.error("[WABA] processMessage error:", e));
  }

  return new Response("ok", { status: 200 });
});
