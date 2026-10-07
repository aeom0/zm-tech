# Edge Functions — Supabase

Documentación de las Edge Functions del salón (proyecto `udelxwwnyivknslueerr`).

> Desde el 6-oct-2026 el código vive en `apps/geemastudio-server/supabase/functions/` y el único deployer es `.github/workflows/edge-functions.yml` de zm-tech. Las menciones de este archivo a `ota-production.yml`, `apps/mobile` de ZM o `yarn deploy:*` son anteriores al traslado.

---

## Resumen

Los crons `pg_cron` que invocan Edge Functions **no** llevan el Bearer en `cron.job`: llaman `public.invoke_cron_edge_function('nombre')`, que lee Vault `cron_secret` (mismo valor que el secret de Edge `CRON_SECRET`). Los scripts QA siguen pegándole a la función con el `.env`.

| Función                           | Propósito                                                                                                                                                                                                 | Invocación                                                                 | Secrets / Auth                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **whatsapp-webhook**              | Webhook Meta WABA: menú, agenda, Haiku, pago; clasificación de imágenes + plantilla `pago_recibido_validar_zm`. | POST desde Meta (verify_jwt: false)                                        | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, **ANTHROPIC_API_KEY** (Haiku/Vision) |
| **send-notification**             | Push FCM v1 a la app móvil (tokens nativos FCM/APNs).                                                                                                                                                     | POST desde app o desde otras Edge Functions                                | FCM_SERVICE_ACCOUNT (JSON), verify_jwt: false                                  |
| **send-push-notification**        | Push vía Expo Push API (tokens ExponentPushToken[...]).                                                                                                                                                   | POST desde app o backend                                                   | Ninguno (solo Supabase URL/keys), verify_jwt: true                             |
| **send-whatsapp-notification**    | Enviar mensaje de texto y/o imagen de WhatsApp al cliente (ej. tras validar pago; incl. imagen Tardanzas).                                                                                                | POST desde la app (usuario autenticado)                                    | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, verify_jwt: false             |
| **send-appointment-reminder**     | Envía plantilla WABA `recordatorio_cita_zm` a un cliente (datos ya formateados).                                                                                                                          | POST interno desde `appointment-reminders`                                 | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, verify_jwt: false             |
| **appointment-reminders**         | Cron diario 9:00 Lima: busca citas de mañana sin recordatorio y llama a `send-appointment-reminder`.                                                                                                      | Cron `0 14 * * *` UTC                                                      | SUPABASE_SERVICE_ROLE_KEY, verify_jwt: false                                   |
| **send-same-day-reminder**        | Envía plantilla WABA `recordatorio_mismo_dia_zm` (3h antes; 4 params body).                                                                                                                               | POST interno desde `same-day-appointment-reminder`                         | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, verify_jwt: false             |
| **same-day-appointment-reminder** | Cron cada 15 min: citas sin `same_day_reminder_sent_at` en [now−2 min, now+3 h+15 min) Lima → `send-same-day-reminder`. Reintenta si el envío falló. Al reprogramar, el trigger `trg_reset_appointment_reminders_on_date_change` limpia los flags (ZM y Geema). | Cron `*/15`                                                                | SUPABASE_SERVICE_ROLE_KEY, verify_jwt: false                                   |
| **retouch-reminders**             | Cron: tip ricino ~día 10 + reenganche retoque (`retoque_reenganche_zm`, ciclo Botox/lifting).                                                                                                              | Cron / Scheduler Supabase                                                  | WHATSAPP_ACCESS_TOKEN, etc.; verify_jwt: false                                 |
| **send-retouch-reengage**         | Envío manual de oferta de retoque (botón Reenganchar en Clientas).                                                                                                                                        | POST desde app (service_role / JWT)                                        | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, verify_jwt: false             |
| **cart-nudge**                    | Recordatorio carrito abandonado (nudge1 ≥12 min, nudge2 ≥90 min tras nudge1; colchón 24h). Envío **9–22 Lima**; fuera de horario difiere (no pierde carrito). Si `awaiting_datetime`, reenvía calendario. | Cron cada ~30 min (`CRON_SECRET` o service_role)                           | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, verify_jwt: false             |
| **silence-watchdog**              | Último msg = inbound sin respuesta (5–12 min) + Haiku; con carrito adjunta calendario. **24/7** (sin gate 9–22). No solapa browse-reengage.                                                               | Cron `*/5` (`CRON_SECRET` o service_role)                                  | WHATSAPP_ACCESS_TOKEN, ANTHROPIC_API_KEY, verify_jwt: false                    |
| **ads-bounce-nudge**              | Reenganche CTWA Meta Ads ~2 h (90–150 min) si no hay 2.º inbound ni carrito. Incluye `awaiting_ctwa_interest`. Copy por rubro redactado por Haiku desde el hilo; `waba_config.meta_ads_bounce_nudge_text` solo si el hilo no muestra rubro; texto neutral si Haiku falla.                                      | Cron `*/30` (`CRON_SECRET` o service_role)                                 | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, verify_jwt: false             |
| **browse-reengage**               | Reenganche Haiku si último msg es **OUT**, browsing sin carrito, silencio ≥30 min (colchón 24h). **Máx. 1 nudge/episodio** (vs último inbound; no apilar tras ads-bounce/watchdog). Envío **9–22 Lima**.  | Cron `*/15` (`CRON_SECRET` o service_role)                                 | WHATSAPP_ACCESS_TOKEN, ANTHROPIC_API_KEY, verify_jwt: false                    |
| **chat-quality-review**           | Audita hilos activos (precio sin aclarar / carrito ≠ pedido / promo ignorada / clienta confundida). **Solo push** staff (`Revisar YA · nombre`); no envía WA a la clienta.                                | Cron `*/15` (`CRON_SECRET` o service_role)                                 | ANTHROPIC_API_KEY, FCM vía `send-notification`, verify_jwt: false              |
| **waba-staff-session**            | Panel: `resume_bot` o `haiku_finish_booking` tras pausa por foto diseño.                                                                                                                                  | POST JWT admin (dev/owner/staff)                                           | ANTHROPIC*API_KEY, WHATSAPP*\*, verify_jwt: false (auth interna)               |
| **sync-anthropic-billing**        | Costo USD del mes vía [Anthropic Cost Report](https://docs.anthropic.com/en/api/usage-cost-api) (organización). Cache ~12 min; escribe `anthropic_billing_snapshots`.                                     | POST con JWT usuario **dev/owner** (`supabase.functions.invoke` desde app) | **ANTHROPIC_ADMIN_API_KEY** (`sk-ant-admin…`, distinta de la API key normal)   |
| **generate-recurring-expenses**   | Gastos fijos del mes desde plantillas (`day_of_month` Lima; Sunat variable el día 1 con `amount` NULL). Idempotente.                                                                                      | Cron diario 6 AM Lima (`invoke_cron_edge_function` / Vault `cron_secret`)  | verify_jwt: false                                                              |
| **sync-meta-ads-spend**           | Insights diarios `act_2097809460557755` → `meta_ads_spend_daily`. Mismo token Graph que el agente Cursor (zm-bot). No Pipeboard / no MCP nativo. | Cron diario 4 AM Lima (`invoke_cron_edge_function` / Vault `cron_secret`)  | META_SYSTEM_USER_TOKEN (ads_read + ads_management), verify_jwt: false          |
| **held-slot-watch**               | Al crearse una cita `scheduled`, revisa carritos con esa hora en espera de abono. Si este cupo la cierra, Haiku explica el adelanto y manda el selector de horas reales. No asigna otra hora. | Trigger `trg_notify_held_slot` AFTER INSERT, pg_net, Vault `cron_secret` | CRON_SECRET o service_role, verify_jwt: false |
| **look-preview**                  | Preview virtual de looks (Plan 06/07) vía **Vertex Gemini Image** — scaffold: health, ping, preview admin. | POST JWT dev/owner (piloto); futuro `/probar-mirada` | `GCP_SERVICE_ACCOUNT_BASE64`, `GCP_LOCATION`, `GEMINI_IMAGE_MODEL`; verify_jwt: true |

---

## 1. whatsapp-webhook

- **Carpeta**: `supabase/functions/whatsapp-webhook/`
- **Deploy (recomendado)**: CLI reciente + token local. Desde la raíz del repo:

```bash
yarn deploy:whatsapp-webhook
```

Este comando ejecuta primero `yarn check:webhook` (`deno check`) y solo despliega
si el módulo puede arrancar. El workflow CI aplica el mismo guard para evitar
publicar una versión con `BOOT_ERROR`.

Equivalente manual:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx --yes supabase@latest functions deploy whatsapp-webhook --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

- **Si falla** con `Unsupported lockfile version '5'` al usar el binario global `supabase`: el `deno.lock` en `supabase/functions/` puede ser de Deno 2.x; **`npx supabase@latest`** (o actualizar el CLI) suele resolverlo. El workflow de GitHub usa `setup-cli@latest` y no depende de tu CLI local.
- **Importante**: Evitar deploy por MCP para `whatsapp-webhook` (archivo grande) porque puede fallar silenciosamente; usar CLI.
- **CRÍTICO**: `verify_jwt: false` — Meta no envía JWT; si está en true, responde 401 y el bot deja de recibir mensajes.
- **Healthcheck post-deploy**: un POST con `{ "object": "whatsapp_business_account", "entry": [] }` debe responder `200 ok`; `503 BOOT_ERROR` indica que el bundle se publicó pero el módulo no pudo arrancar.
- **Staff desde app WA Business (P3)**: el webhook maneja `smb_message_echoes` → log `wa_messages.source=staff_app` + `bot_paused_at` (nudges respetan pausa). En Meta App → WhatsApp → Configuration → Webhook fields: **suscribir `smb_message_echoes`** (además de `messages`). Sin esa suscripción, los ecos no llegan y la pausa solo aplica al panel.
- **`wa_messages.source`**: `bot` | `panel` | `nudge` | `staff_app` | `template` (histórico = null). SQL: `scripts/db/add-wa-messages-source.sql`.

Gestiona mensajes entrantes de WhatsApp: menú principal, promos, servicios, carrito, selector de fecha/hora (slots cada 30 min), resumen de pago y creación de citas/pagos/verificaciones. Notifica a admins vía **send-notification** (FCM).

### Identidad BSUID / Meta usernames (v3.5, ago 2026)

- CTWA a veces llega **sin** `message.from` y solo con BSUID `PE.…` (`message.from_user_id` o `contacts[].user_id`) + `profile.username`.
- Clave de hilo = E.164 **o** BSUID (`whatsapp_sessions.phone` / `wa_messages.phone`). Helpers: `_shared/wa-recipient.mjs`.
- Outbound: campo Cloud API **`recipient`** (omitir `to`) si es BSUID. Ficha: `clients.wa_user_id` + `wa_username`.
- Plantillas (`promo_zm_v1`, recordatorios, retoque): mismo `recipient` — `isWaSendableDest()` (E.164 **o** BSUID). Confirmado Meta 2026-08-03.
- Panel `/panel/waba/mensajes`: muestra `@username` + badge **Sin teléfono**. Plantillas/broadcasts: skip sin E.164.
- QA: `yarn waba:validate:bsuid`.

### Push a admins — chat en vivo (2026-06)

- **`notifyAdminsClientChat()`** (`lib/notify.ts`): tras cada mensaje entrante válido (post anti-spam), push FCM a perfiles `owner`/`dev` cuando:
  - clienta **nueva** (`isNew`);
  - entrada desde **Meta Ads** (`fromAd`);
  - **reenganche** tras ≥45 min sin mensajes `in` del mismo número.
- **Payload `data`**: `type=waba_chat`, `phone`, `client_name`, `preview`, `url` (`/panel/waba/mensajes?phone=…`).
- **Mobile**: tap en la notificación abre el panel web (`useNotifications` + `Linking.openURL`).
- Otros usos de **`notifyAdmins()`**: "Nuevo pago por validar", "Nueva cita agendada", "Cita reprogramada (WABA)".

### Selector de hora 30 min (2026-06)

- Horario **L–S**: slots `:00` y `:30` de 10:00 a 17:30 (`getSalonTimeSlots` en `lib/constants.ts` + `lib/peru-holidays.ts`).
- **Domingo**: 10:30–13:00; visible en selector de fecha. Tras elegir hora: si hay `completed` → adelanto 20%; si no → abono fijo S/25 (ver confirmación abajo).
- **Feriado nacional PE**: solo 10:00–12:00 (calendario 2026 en `peru-holidays.ts`).
- Lista interactiva partida en secciones **Mañana** / **Tarde** (máx. 10 filas por sección, límite Meta).
- IDs: `time_2026-06-03T1645` → dispatcher parsea hora + minutos Lima.

### Confirmación de cita (2026-06, actualizado ago 2026)

- **`finalizeBookingAfterDatetimeSelection()`** (`payment.ts`):
  1. `clientRequiresFixedDeposit` (sin `completed`) → `sendPaymentSummary({ fixedAmount })` + `deposit_mode=fixed` (default **S/25**, `waba_config.deposit_fixed_amount`).
  2. Else domingo → `sendPaymentSummary({ advanceRate: 0.2 })` + `deposit_mode=rate`.
  3. Else L–S/feriado → `sendConfirmedBookingSummary()` (cita `scheduled` sin voucher).
- **`insertAppointmentChecked` (21-jul)**: si el INSERT de `appointments` falla → `wa_error_log` + mensaje al 932; **no** envía “¡Tu cita está confirmada!” ni marca sesión `completed` (evita citas fantasma).
- **`handleAwaitingPaymentScreenshot`** (`steps.ts`): procesa comprobante → `processPaymentScreenshot` → verificación + pagos abono → `notifyAdmins` + plantilla `pago_recibido_validar_zm` → Validación de pagos (mismo chequeo de INSERT). QA: `yarn waba:validate:fixed-deposit`.

### Clasificación de imágenes + plantilla `pago_recibido_validar_zm` (16-ago)

Evita que un comprobante Yape/Plin **fuera** de `awaiting_payment_screenshot` se trate como foto de diseño (pausa + push equivocado). Notifica a Vanessa fuera de la ventana 24h vía plantilla Meta.

| Pieza | Rol |
| ----- | --- |
| `lib/image-classify.ts` | Haiku Vision: una llamada → `comprobante_pago` / `diseno_referencia` / `otro` + OCR 5 campos si es pago |
| `handlers/payment-screenshot-detected.ts` | Si `comprobante_pago` y no está en depósito → INSERT `appointment_verifications.kind=post_service_payment` + plantilla + ack a la clienta |
| `lib/payment-template.ts` | Envía `pago_recibido_validar_zm` (`es_PE`) a `ADMIN_PHONE` (932): header imagen + body `{{1}}`–`{{8}}` + quick-reply `pay_verify_approve:<id>` / `pay_verify_reject:<id>` |
| `handlers/payment-verification-button.ts` | Tap Aprobar/Rechazar; prod **solo** `ADMIN_PHONE` (932); suites `51999000978–999` (`isAuthorizedPaymentVerifyTap`). Extra `51911100001` no. |
| `processPaymentScreenshot` | Misma plantilla para `kind=deposit` (OCR del voucher; deja de usar texto plano Graph) |
| Flag | `waba_config.image_classification_enabled` → `{ "enabled": true }` (`getConfigBoolean`) |

**`kind` en `appointment_verifications`**:

- `deposit` — abono pre-cita (fijo S/25 o % domingo). Aprobar → cita + 4 WA (confirmación, políticas, consideraciones, Tardanzas), igual que ValidacionPagos.
- `post_service_payment` — comprobante fuera de flujo. Aprobar → solo status + mensaje corto a la clienta; **no** toca `appointments.status`.

Orden body plantilla (código = Meta): cliente, servicio, fecha cita, app, monto, fecha/hora pago, destino, últimos 4 de operación. Meta ID plantilla `1764113641267964` (estado: ver WhatsApp Manager). QA: `yarn waba:validate:payment-verification` (tel. `51999000978`).

### Coalesce / anti-ráfaga (actualizado 21-jul)

- Texto libre: `coalesceTextBurstWithRetry` (lock por teléfono + ventana 4.5s + trailing hasta `COALESCE_MAX_MS` 9s). Si el lock se agota → retorna `null` y el webhook **no despacha** (el peer ya coalesció) — evita Haiku duplicado mid-chat. Al cerrar la lectura, el líder marca `inbound_coalesce_covered` en `wa_action_debounce`; `shouldSkipDispatchPeerAlreadyHandled` **no** dropea un IN llegado *después* de ese snapshot (Smil …9843, gap ~9.2s). QA: `:smil-coalesce-skip` / `:coalesce-burst`.
- Haiku (`handleAIMessage`): historial de texto solo últimas **6 h**; corta contexto si hay gap **>2 h** entre mensajes.

### Mi cita, reprogramación y Haiku (2026-04, ampliado 2026-06)

- **Mi cita** (`mi_cita` en el menú interactivo): lista citas `scheduled` futuras del número/cliente y ofrece **Cambiar fecha/hora** sin crear una segunda fila en `appointments` (se guarda `whatsapp_sessions.reschedule_appointment_id` hasta elegir slot; luego `UPDATE` de `appointments.date`).
- **Texto libre** (ej. “reprogramar”, “No es a las 11”, “Es a las 4:45 PM”): si hay citas `scheduled` futuras, **`sendPendingAppointmentContext`** antes del saludo→menú o del mensaje “usa los botones” en `awaiting_datetime`.
- **Claude Haiku**: números fuera de `SPANISH_ONLY_CODES` reciben instrucción de respuesta **bilingüe** (español + idioma del país del prefijo); el contexto de sistema incluye citas pendientes cuando aplica. En **`awaiting_datetime`**, preguntas promo/precio/hoy/ambas pueden ir a Haiku sin abandonar el flujo de fecha. Archivos: `handlers/ai-assistant.ts`, `handlers/pending-appointment.ts`, `handlers/dispatcher.ts`, `handlers/booking-flow.ts` (`parseTimeSlot`).
- **Capacidad de horarios (solape)**: tope **1** cita/franja por defecto; tope **2** si el carrito entrante es 100 % especial (Vanessa). Ver [WABA_CAPACITY.md](WABA_CAPACITY.md) — `overlapCapForCart` + `countOverlappingAppointments` (selectores, texto, pago, `finalizeRescheduleAppointment`).
- **Migración BD** (si aún no está aplicada): `scripts/db/add-whatsapp-session-reschedule.sql` (`reschedule_appointment_id` en `whatsapp_sessions`).

### WABA CMS (configuración editable)

El bot puede cargar contenido editable desde la tabla `waba_config` (RLS: solo `dev/owner`). Esto permite cambiar imagen/textos de campañas sin tocar código ni hacer deploy.

- **Tabla**: `public.waba_config`
- **Carga en bot**: `loadWabaConfig()` (si falla → fallback hardcoded, nunca rompe el flujo)
- **Panel web**: `/panel/waba/campanas` (Meta Ads + imágenes tardanzas; **pendiente UI** para `horarios_text`, `tardanza_message_text`, `ubicacion_text`)
- **Panel Haiku**: `/panel/waba/haiku` — system prompt, saludos, keywords, números bloqueados, panel de prueba
- **Panel historial**: `/panel/waba/historial` — volumen, heatmap, uso Haiku
- **Monitor chats**: `/panel/waba/mensajes` — historial `wa_messages` + compositor (ventana 24h); plantillas con labels amigables (`Recordatorio mismo día`, no el slug `_zm`); mensajes `msg_type=image` con `image_url` poblado (ago 2026+) muestran miniatura clickeable + caption en `MessageBubble.tsx` (mensajes de imagen previos a ago 2026 no tienen `image_url` — caen al placeholder de cámara); **inbound** de clienta también persiste URL (bucket `waba-images`); si `bot_paused_at` → banner + botones Reactivar bot / Haiku agenda (`waba-staff-session`)

**Claves actuales** (seed / panel `/panel/waba/campanas`):

- `meta_ads_hero_image_url` / `meta_ads_hero_caption` → creativos **genéricos** (orgánico isNew + tap «Otro» en CTWA)
- `meta_ads_image_2_url` … `_4_url` (+ captions) → mismas genéricas (opcionales)
- `meta_ads_extensiones_image_1_url` / `_2_url` (+ captions) → creativos tras tap **Extensiones**
- `meta_ads_lifting_image_1_url` / `_2_url` (+ captions) → creativos tras tap **Lifting**
- `meta_ads_services_text` → `{ "text": "..." }` (placeholder `{nombre}`; se usa en camino «Otro»)
- `meta_ads_bounce_nudge_text` → reenganche ads-bounce
- `tardanza_image_url` / `tardanza_message_text` / `horarios_text` / `ubicacion_text`
- `image_classification_enabled` → `{ "enabled": true }` (apaga Haiku Vision sobre imágenes inbound sin redeploy)

### Flujo de bienvenida Meta Ads (Click-to-WhatsApp)

Cuando una clienta entra desde un anuncio Meta (`referral` / copy CTWA conocido) **nueva o con sesión stale**, el webhook distingue boilerplate vs intención:

**Boilerplate** (CTA vacío Meta — p. ej. «¡Hola! Quiero más información», «…Mirada Espectacular 💜» Set 2026; ver `lib/meta-ads-cta.ts`):

1. Texto de bienvenida: `¡Hola[, Nombre]! 💜 Bienvenida a ZM Lash & Nails Beauty.`
2. Lista interactiva «¿Qué te interesa hoy?» → Extensiones / Lifting / Uñas / Otro (`step=awaiting_ctwa_interest`)
3. **Sin** imágenes ni `meta_ads_services_text` en este turno
4. Tras el tap:
   - **Extensiones** → collages CMS `meta_ads_extensiones_*` + pregunta look (**sin** subcats)
   - **Lifting** → collage CMS `meta_ads_lifting_*` + pregunta pack (**sin** lista)
   - **Uñas** → pregunta Soft Gel / PolyGel / … (**sin** lista)
   - **Otro** → pregunta rubro en texto (**sin** lista categorías; **sin** 4 imgs genéricas)
   - Texto libre con intención (precio/servicio) en `awaiting_ctwa_interest` → Haiku (no se queda colgada)

**Intención específica** en el 1.er mensaje CTWA (no boilerplate): creativos genéricos (si hay URL) + **Haiku** en el mismo turno — **sin** pregunta de interés. Si Haiku falla → texto CTA + lista categorías/promos.

**Cierre sin menú del mismo rubro (Plan 04)**: si la clienta ya nombró un efecto concreto (ojo de gato, fox, etc.) y Haiku cotizó con `S/…`, el sistema manda collage + CTA (`pending_price_cta_*`) y **no** abre `show_category` del mismo rubro. **Excepción (JNKM …0611)**: reply corto «Precio» citando un collage multi-look **no** cuenta como efecto concreto — no se enriquece el quote hacia matchers; si Haiku no puso montos, no se suprime la lista.

**Orgánico** (`isNew`, sin `from_ad`): creativos genéricos + saludo Haiku + menú — **sin** pregunta CTWA (QA `:campaign-organic`).

**Anti-dup**: OUT CTWA reciente (~20 s) no reenvía welcome; `isMetaAdsBoilerplateCta` trata N líneas CTA idénticas pegadas por coalesce como boilerplate (no como intención).

QA: `yarn waba:validate:ctwa-interest` (A–H + I/J; tel `51999000998`). Helper visual: `lib/campaign-collage.ts`.

### Actualizar imágenes de Meta Ads

Opciones:

1. **Recomendado (sin deploy)**: panel `/panel/waba/campanas` — genéricas (1–4), Extensiones 1–2, Lifting 1–2 (Storage `waba-images/campanas/…`).

2. **Opcional (assets del repo)**:

- Reemplazar archivos locales en `assets/meta-ads/`
- Subir a Storage con:

```bash
yarn upload-meta-ads-images
```

Ese script hace `upsert` en `promo-images/meta-ads/*` (legado); el panel Campañas escribe en `waba-images` y `waba_config`.

---

## 2. send-notification (push FCM v1)

- **Carpeta**: `supabase/functions/send-notification/` (en repo; en Supabase puede estar desplegada desde dashboard).
- **Uso**: Enviar notificaciones push a la app móvil cuando el token guardado en `profiles.push_token` es un **token nativo** (FCM en Android, APNs en iOS).

### Contrato del body (POST)

```json
{
  "user_id": "uuid-opcional",
  "user_ids": ["uuid1", "uuid2"],
  "title": "Título",
  "body": "Cuerpo del mensaje",
  "data": { "screen": "Agenda", "appointmentId": "..." }
}
```

- Al menos uno de `user_id` o `user_ids` es obligatorio.
- `title` y `body` son obligatorios.
- `data` es opcional (objeto clave-valor string; útil para deep links).

### Comportamiento

1. Lee de `profiles` los `push_token` para los `user_id(s)` indicados.
2. Obtiene un access token OAuth2 con el JSON de la cuenta de servicio (JWT RS256).
3. Envía a cada token un mensaje FCM v1 (`projects/{project_id}/messages:send`).

### Secret requerido

- **FCM_SERVICE_ACCOUNT**: JSON completo de la cuenta de servicio de Firebase (incluye `client_email`, `private_key`, `project_id`).

### Quién la invoca

- **whatsapp-webhook**: `notifyAdmins()` — "Nuevo pago por validar", "Nueva cita agendada" y "Cita reprogramada (WABA)"; **`notifyAdminsClientChat()`** — clienta entra/retoma chat WA (`data.type=waba_chat`).
- **apps/mobile** (Agenda): al crear cita desde la app → "Nueva cita agendada".
- **apps/mobile** (Finanzas): al registrar pago → notificación a admins.

**Deep link chat WA** (payload `data`):

```json
{
  "type": "waba_chat",
  "phone": "51955587180",
  "client_name": "Keissy GUERRERO",
  "preview": "Hola, quisiera agendar…",
  "url": "https://zmlashnails.com/panel/waba/mensajes?phone=51955587180"
}
```

---

## 3. send-push-notification (Expo Push API)

- **Carpeta**: `supabase/functions/send-push-notification/`
- **Uso**: Enviar push cuando el token en `profiles.push_token` tiene formato **ExponentPushToken[...]** (obtenido con `getExpoPushTokenAsync()`).

### Contrato del body (POST)

```json
{
  "user_ids": ["uuid1", "uuid2"],
  "title": "Título",
  "body": "Cuerpo",
  "data": { "key": "value" }
}
```

### Comportamiento

1. Lee de `profiles` los `push_token` para los `user_ids`.
2. Filtra solo tokens que empiezan por `ExponentPushToken[`.
3. Envía a `https://exp.host/--/api/v2/push/send` (Expo Push API).

### Cuándo usarla

- Solo si la app guarda **Expo Push Tokens** (por ejemplo cambiando `useNotifications` a `getExpoPushTokenAsync()` y guardando ese valor en `profiles.push_token`).
- **Con la app actual** (que usa `getDevicePushTokenAsync()` y guarda el token FCM nativo), esta función **no** envía nada, porque no hay tokens `ExponentPushToken[...]`. Para la app actual se debe usar **send-notification**.

---

## 4. send-whatsapp-notification

- **Carpeta**: `supabase/functions/send-whatsapp-notification/`
- **Uso**: Enviar mensaje de texto y/o imagen de WhatsApp a un número (ej. al cliente tras validar pago).

### Contrato del body (POST)

- **phone** (obligatorio): número E.164 (ej. `51981234567`) **o** BSUID Meta (`PE.1704…`) cuando la clienta no tiene teléfono en el webhook. El envío usa `to` o `recipient` según el caso (`_shared/wa-recipient.mjs`).
- **message** (opcional): texto a enviar. Si solo se envía imagen, puede omitirse.
- **imageUrl** (opcional): URL pública de una imagen (ej. Supabase Storage). Se envía como mensaje tipo `image` en la API de WhatsApp.
- **imageCaption** (opcional): pie de foto para la imagen (máx. 1024 caracteres).
- **resumeBot** (opcional): `true` solo para reactivar `bot_paused_at` desde el panel (no al enviar texto normal).

Al menos uno de `message` o `imageUrl` debe estar presente. Si ambos se envían, primero se envía el texto y luego la imagen.

```json
{ "phone": "51981234567", "message": "Tu cita fue confirmada..." }
{ "phone": "51981234567", "imageUrl": "https://.../storage/v1/object/public/waba-images/campanas/tardanza-policy.jpg", "imageCaption": "Políticas por tardanzas" }
```

- **Authorization**: puede ser Bearer token de usuario (Supabase Auth). También puede ser invocada por automatizaciones internas (según la config actual del proyecto).

### Quién la invoca

- **ValidacionPagosScreen** (app móvil): tras aprobar un pago `kind=deposit` (abono 20% validado), invoca esta función para enviar: (1) confirmación de cita, (2) políticas de la cita, (3) consideraciones previas y (4) imagen de penalizaciones por tardanzas (`waba_config.tardanza_image_url`, objeto `waba-images/campanas/tardanza-policy.jpg`). Si `kind=post_service_payment`, solo mensaje corto de pago recibido (sin políticas de cita). Alternativa WA: botones de plantilla `pago_recibido_validar_zm` (mismo branching por `kind`). Para reemplazar la foto: `node scripts/upload-tardanzas-to-storage.mjs <ruta-a-jpeg>` (sube a `waba-images`, no crea otro bucket).
- **Agenda mobile — Referencia WA** (`ReferenceImageSection`): respuesta de staff a la clienta tras revisar foto de diseño/color vinculada a la cita; mismo número bot; JWT de sesión.
- **Panel web — Mensajes WABA** (`/panel/waba/mensajes`, `MessageThread.tsx`): envío manual de texto libre a la conversación seleccionada; JWT vía `supabase.auth.getSession()`; mensaje optimista en UI y refetch desde `wa_messages`. Solo tiene efecto dentro de la ventana de **24 h** de la API de Meta (WABA).
- **Panel web — Clientes** (`/clientes`, pestaña **Chat WA** en `ClientDetailSidebar.tsx`): mismo contrato (`phone` normalizado a dígitos, `message`); refetch local desde `wa_messages` tras éxito. Misma limitación de ventana 24 h.

---

## 5. appointment-reminders + send-appointment-reminder

Recordatorio automático **24h antes** de la cita vía plantilla `recordatorio_cita_zm`.

| Función                       | Carpeta                                         | Rol                                      |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------- |
| **appointment-reminders**     | `supabase/functions/appointment-reminders/`     | Cron orquestador (9:00 Lima = 14:00 UTC) |
| **send-appointment-reminder** | `supabase/functions/send-appointment-reminder/` | Envía plantilla a un número              |

### Estado (jun 2026)

- **Código**: listo en repo; botones "Confirmo mi cita" / "Necesito reprogramar" en `dispatcher.ts`.
- **Pendiente prod**: columna `reminder_sent_at` en `appointments` (migración + `shared-schema`), cron en Supabase Schedules, deploy ambas funciones con `--no-verify-jwt`.

### Deploy

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy appointment-reminders --project-ref udelxwwnyivknslueerr --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy send-appointment-reminder --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

Cron sugerido: `0 14 * * *` (14:00 UTC = 9:00 AM Lima).

---

## 5b. same-day reminder (3 h antes)

- **Carpetas**: `same-day-appointment-reminder/` (cron) + `send-same-day-reminder/` (envio plantilla).
- **SQL**: `scripts/db/add-same-day-reminder.sql` — `appointments.same_day_reminder_sent_at`, `no_show_reason`; cron `*/15`.
- **Plantilla Meta**: `recordatorio_mismo_dia_zm` / `es_PE` (UTILITY) — **APPROVED** + smoke QA ✅ (`scripts/waba-smoke-same-day.mjs`).
- **Ventana**: `[ahora−2 min, ahora+3 h+15 min)` hora Lima, solo si `same_day_reminder_sent_at` es null. Un fallo de Meta se reintenta en el tick siguiente. Al cambiar `appointments.date`, `trg_reset_appointment_reminders_on_date_change` limpia ese flag (y el de 24 h) en ZM y en Geema.
- **Botones**: "Voy a llegar tarde" (reusa `TARDANZA_KEYWORDS`) · "No podré asistir" → `handlers/no-show.ts` pregunta motivo → `sendMiCitaMenu`.
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy same-day-appointment-reminder \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy send-same-day-reminder \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

---

## 6. retouch-reminders + send-retouch-reengage

- **Carpetas**: `retouch-reminders/` (cron) + `send-retouch-reengage/` (manual desde Clientas).
- **Shared**:
  - `_shared/retouch-resolve.ts` — intervalos Vanessa: extensiones **15d**; post-lifting → ofrecer **Lash Botox** @30d; post-Botox → **lifting** @25d; mapeo 1B.
  - `_shared/retoque-offer.ts` — envío `retoque_reenganche_zm`. Guard `has_scheduled` con `limaNowTimestamp(2)`.
  - `_shared/lifting-ricino-nudge.ts` — tip cuidados ricino ventana **10–14d** post-lifting (`lifting_cuidados_ricino_zm`). Marca `appointments.lifting_ricino_nudge_sent_at` (no usa `retouch_offer_sent_at`).
- **Cron fases**: A = ricino · B = oferta retoque/ciclo.
- **Webhook**: `handlers/retouch-reengage.ts` — botones Agendar / Otro servicio / Más adelante → carrito + calendario directo (**sin** gate de aceite al Agendar).
- **SQL**: `scripts/db/add-retouch-offer-session-cols.sql`; `scripts/db/add-lifting-ricino-nudge.sql` / migración `20260826002447_add_lifting_ricino_nudge_sent_at`.
- **Plantillas Meta**:
  - `retoque_reenganche_zm` / `es_PE` (UTILITY) — **APPROVED** + smoke QA ✅.
  - `lifting_cuidados_ricino_zm` / `es_PE` — **creada**; Meta la reclasificó a **MARKETING** (sigue `PENDING` aprobación). 1 var `{{1}}` nombre. Copy: tip ricino ~día 10 (cuidado en casa, no servicio); sin botones de agenda. Hasta APPROVED el cron falla soft (skip + log).
- **Garantía**: quejas → 932 (staff); el bot no evalúa ventana 24 h.
- **QA**: `yarn waba:smoke:retouch` · `yarn waba:validate:retouch-reengage`.
- **Deploy** (también en `ota-production.yml`):

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy retouch-reminders \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy send-retouch-reengage \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
yarn deploy:whatsapp-webhook   # dispatcher + retouch-reengage handler
```

---

## 7. sync-anthropic-billing (costo oficial Anthropic — Finanzas mobile)

- **Carpeta**: `supabase/functions/sync-anthropic-billing/`
- **Config**: `supabase/config.toml` → `[functions.sync-anthropic-billing] verify_jwt = true`
- **Auth**: solo perfiles `dev` u `owner` (misma validación que `test-haiku-preview`).
- **Secret obligatorio**: **`ANTHROPIC_ADMIN_API_KEY`** — creada en [Admin API keys](https://platform.claude.com/settings/admin-keys) (prefijo `sk-ant-admin`). No reutilizar `ANTHROPIC_API_KEY`: esa es la clave estándar del modelo y **no** sirve para `/v1/organizations/cost_report`.
- **Dato mostrado**:
  - **Costo del mes** → Cost Report oficial (gasto USD).
  - **Saldo en hero** → `app_config.anthropic_wallet_usd` (manual: Anthropic **no** expone API de balance prepaid). No confundir Cost Report con “saldo”.
  - Cupo última recarga: `anthropic_credits_usd`.
- **Deploy**: función pequeña; se puede usar **Supabase CLI** (`npx supabase@latest functions deploy sync-anthropic-billing --project-ref udelxwwnyivknslueerr`) o MCP `deploy_edge_function` (evitar MCP solo para `whatsapp-webhook` por tamaño).
- **Migración BD**: tabla + RLS en el baseline `00000000000000_baseline_full_schema.sql` (histórico original: `supabase/migrations_backup/20260420120500_anthropic_billing_snapshots.sql`).

---

## 7b. waba-pricing-sync (costos Meta WABA — Finanzas mobile)

- **Carpeta**: `supabase/functions/waba-pricing-sync/` + shared `_shared/meta-pricing-client.ts`
- **Config**: `supabase/config.toml` → `[functions.waba-pricing-sync] verify_jwt = true`
- **Auth**: header **`X-Sync-Secret`** (`WABA_SYNC_SECRET`) además del gateway JWT. Cron usa `Authorization: Bearer <service_role>` + el mismo secret.
- **Secrets Edge** (Dashboard / CLI):
  - **`META_SYSTEM_USER_TOKEN`** — System User con `ads_read`/`ads_management` (+ permisos WABA si unificas tokens). **Puede diferir de `WHATSAPP_ACCESS_TOKEN`** en Supabase secrets.
  - **`WABA_ID`** — ID de la cuenta WABA (ej. `1271330085100222`).
  - **`WABA_SYNC_SECRET`** — string aleatorio (`openssl rand -hex 32`); también en **Supabase Vault** para el cron (ver abajo).
- **API Meta**: sub-endpoint `/{WABA_ID}/pricing_analytics` con `start`/`end` unix; lookback válido desde **1 dic 2025**. Field expansion anidado no soportado — usar sub-endpoint directo.
- **BD**:
  - **`waba_pricing_daily`** — upsert idempotente por `(waba_id, date, pricing_category, pricing_type, country_code)` (`NULLS NOT DISTINCT`).
  - **`waba_pricing_sync_log`** — auditoría de cada sync (filas, rango, errores).
  - RLS: SELECT solo `dev`/`owner`.
- **Cron**: `waba-pricing-sync-weekly-mon-6am-lima` — `0 11 * * 1` UTC (= lunes 6 AM Lima). Función SQL `invoke_waba_pricing_sync()` vía `pg_net` con **`timeout_milliseconds := 60000`** (pricing + `template_analytics` suele tardar ~10 s; el default ~5 s marcaba timeout falso en `net._http_response` aunque la Edge terminara OK).
- **Vault (prod)**: secrets `waba_pricing_sync_service_jwt` + `waba_pricing_sync_secret` en **Supabase Vault** (no en `app_config`). `REVOKE EXECUTE` de `invoke_waba_pricing_sync()` para `PUBLIC`/`anon`/`authenticated`.
- **Mobile**: `PricingBreakdownCard` en Finanzas (debajo de `AIUsageCard`, solo admin) — gasto mes actual, variación vs mes anterior, barras por categoría (`useWabaPricing` → `waba_pricing_daily`). Drill-down por plantilla: tabla `waba_template_analytics_daily` (sync en el mismo cron); UI en **Geema mobile** (S5C-7), no en `apps/mobile` ZM legacy.
- **Quirk Meta `template_analytics`**: Graph a veces devuelve `amount_spent.value` con `sent`/`delivered`/`read` en **0** el mismo día (ej. recordatorio / retoque). El sync guarda ambos campos tal cual — **no** inferir volumen desde el costo ni “corregir” a 0 el gasto. Si `amount_spent` viene **sin** `value`, se persiste `cost = NULL` (no `0.0000`). Unit: `yarn waba:validate:template-analytics-cost`.
- **Deploy** (sin `--no-verify-jwt`):

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy waba-pricing-sync \
  --project-ref udelxwwnyivknslueerr
```

- **Migraciones**: absorbidas en `00000000000000_baseline_full_schema.sql`; originales en `supabase/migrations_backup/2026072010*_waba_pricing_*.sql`. Fase 5: `20260919150754_add_waba_template_analytics_daily` (+ rename `read_count`, status `partial`, `20260919153042` timeout pg_net 60s).
- **Fase 5 (hecha backend)**: `template_analytics` → `waba_template_analytics_daily`; requiere `is_enabled_for_insights=true` en el WABA. UI Geema: `zm-tech/docs/geemastudio/docs/plans/04-geema-migration/07-PARIDAD-MOBILE-ZM.md` S5C-7.
---

## 7b. Panel ejecutivo — gastos + Meta Ads

- **Tablas**: `operational_expenses`, `recurring_expense_templates`, `meta_ads_spend_daily`, `meta_ads_sync_log`. RPC `get_monthly_financial_summary(p_tenant_id, p_from, p_to)` (GROUP BY mensual en Postgres).
- **tenant_id** desde día 1 (`zm-lash-nails`). RLS **admin-only** (`is_admin()`); sin aislamiento por tenant (Plan 02 tablas nuevas — pendiente Alberto).
- **`generate-recurring-expenses`**: cron `0 11 * * *` UTC = 6 AM Lima vía `invoke_cron_edge_function` (Vault `cron_secret`). Inserta plantillas cuyo `day_of_month` = hoy; variables (Sunat) el día 1 con `amount` NULL. `ON CONFLICT DO NOTHING`.
- **`sync-meta-ads-spend`**: cron `0 9 * * *` UTC = 4 AM Lima vía el mismo wrapper. Graph `/{act_2097809460557755}/insights` (ayer Lima). Usa secret **`META_SYSTEM_USER_TOKEN`** (no `WHATSAPP_ACCESS_TOKEN`). Errores de token/Graph se loguean y el cron sigue. **Verificado 24-ago-2026**: System User **zm-bot** tiene `ads_read` + `ads_management` y la cuenta asignada; `meta_ads_sync_log` en `success`. El mismo token en `.env` es el que el agente usa para listar/editar campañas vía Graph v22 (sin Pipeboard ni MCP nativo). Escrituras `ACTIVE` solo con confirmación de Alberto.
- **WhatsApp OCR Sunat**: PDF **solo** del 932 (`ADMIN_PHONE` / `isAuthorizedSunatNpsPhone`). QA 978–999 y `51911100001` suprimen push y se limpian, pero no registran Constancia NPS. Haiku extrae período AAAAMM + total → upsert `impuestos` / `Sunat` / mes de pago = mes siguiente al período. Si no es NPS, pide reenviar (no inventa).
- **Mobile**: Finanzas → segmented Resumen | Detalle. Resumen = KPIs + gráfico 6m/12m/Todo + lista de gastos. Detalle = vista de pagos previa.
- **QA**: `yarn validate:executive-finance` (A/B cron día 10, D gate no-admin, RPC 24 meses). Caso C (PDF real de Vanessa) es smoke manual.
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy generate-recurring-expenses \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy sync-meta-ads-spend \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

---

## 8. cart-nudge (carrito abandonado)

- **Carpeta**: `supabase/functions/cart-nudge/`
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy cart-nudge \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

- **verify_jwt**: `false` (invocación por cron con `CRON_SECRET` o `service_role`).
- **Cron**: cada ~30 min (`cart-nudge-every-30min`).
- **Ventanas**:
  - **Nudge 1**: ≥12 min desde `updated_at` sin `nudge1_sent_at` (colchón hasta **24 h** si se difiere de noche).
  - **Nudge 2**: ≥90 min desde **`nudge1_sent_at`** (colchón 24 h) — último aviso y vacía carrito (`step` → `browsing`).
- **Horario de envío Lima**: **9:00–22:00 todos los días** (como ads-bounce; independiente del salón). Fuera de horario → `skipped` con `candidates` contadas; **no pierde** el carrito (retoma al abrir ventana). Bypass QA: header `X-QA-Bypass-Hours: true`.
- **Comportamiento** (`awaiting_datetime`):
  - Tras el texto de nudge 1, **reenvía el selector de fecha u hora** importando `resendDatetimeSelectors()` del webhook (`handlers/booking-flow.ts`).
  - Si la clienta ya eligió día (`selected_day`), reenvía selector de **hora**.
  - Carrito en `browsing` u otro step: solo texto pidiendo escribir _agendar_.
- **Columnas usadas**: `cart_items`, `cart_service_ids`, `step`, `updated_at`, `nudge1_sent_at`, `nudge2_sent_at`.
- **Relacionado**: existe `abandoned-cart-reminders/` (legacy/alternativo); en prod se usa **`cart-nudge`**.

---

## 9. ads-bounce-nudge (reenganche Meta Ads)

- **Carpeta**: `supabase/functions/ads-bounce-nudge/`
- **SQL**: `scripts/db/add-ads-bounce-nudge.sql` — columnas `from_ad_at`, `ads_bounce_nudge_sent_at`; RPC `waba_find_ads_bounce_phones`; cron `ads-bounce-nudge-every-30min`; seed `waba_config.meta_ads_bounce_nudge_text`.
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy ads-bounce-nudge \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

- **Elegibilidad**: ≥90 min desde `from_ad_at` (welcome CTWA); colchón RPC hasta **24 h** para diferir madrugada → 9 AM (antes el tope 150 min descartaba el lead).
- **Condiciones**: carrito vacío, `step` en `browsing` / `awaiting_ctwa_interest` / null, ningún inbound posterior a `from_ad_at`, sin nudge previo para ese CTWA. **26-jul**: también excluye si `browse_reengage_sent_at` / `watchdog_sent_at` ≥ `from_ad_at` (guards recíprocos); re-lectura de sesión antes de enviar. **27-ago**: `awaiting_ctwa_interest` (lista CTWA) — antes solo `browsing` y el bounce no disparaba.
- **SQL endurecido**: `scripts/db/fix-reengage-no-double-nudge.sql` + migración `ads_bounce_include_ctwa_interest`.
- **Horario de envío Lima**: **9:00–22:00 todos los días** (independiente del salón; bypass QA: header `X-QA-Bypass-Hours: true`).
- **QA**: `yarn waba:validate:ads-bounce` (`51999000982`) — casos A/B + C madrugada + D gate horario + E `awaiting_ctwa_interest`.

---

## 9b. browse-reengage (Haiku post-respuesta)

- **Carpeta**: `supabase/functions/browse-reengage/`
- **SQL**: `scripts/db/add-browse-reengage.sql` — columna `browse_reengage_sent_at`; RPC `waba_find_idle_browse_phones`; cron `browse-reengage-every-15min`.
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy browse-reengage \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

- **Elegibilidad**: último `wa_messages` = **out**; `step=browsing`; carrito vacío; silencio ≥**30 min** (colchón RPC **24 h**); inbound en últimas 24 h.
- **1 nudge por episodio** (fix 19-jul; endurecido 26-jul): RPC compara `browse_reengage_sent_at` vs **último inbound** (no vs último OUT). Skip si ya hubo `ads_bounce_nudge` / `watchdog` en el mismo episodio. **CTWA** (`from_ad_at` ≥ último inbound) → excluida (deja ads-bounce). Guards recíprocos también en `waba_find_ads_bounce_phones`. **13-ago (Merillyn)**: skip si OUT reciente `panel`/`staff_app` (&lt;4 h) aunque `bot_paused_at` sea null (`loadRecentStaffOutboundPhoneSet` en `loadSilentPhoneSet`). SQL: `scripts/db/fix-reengage-no-double-nudge.sql`. Re-lectura de sesión antes de enviar (anti carrera 09:00). Ver [docs/waba/tenants/zm-lash/analysis/LECCIONES.md](../waba/analysis/LECCIONES.md).
- **Haiku**: decide skip (charla cerrada) o 1–2 líneas de reenganche; fallback genérico si API falla. Sin calendario ni lista. **Prohibido** apodos (`babe`/`baby`/`guapa`/…).
- **Invariante anti-loop**: tras enviar, `browse_reengage_sent_at` = `created_at` del INSERT en `wa_messages` (`.select("created_at")`), **nunca** un `nowIso` pre-Haiku.
- **Horario de envío Lima**: **9:00–22:00** (bypass QA: `X-QA-Bypass-Hours: true`).
- **QA**: `yarn waba:validate:browse-reengage` (`51999000979`, A–H). Caso H = OUT `panel` reciente no reengancha (Merillyn). Pendiente: caso bounce CTWA → **exactamente 1** nudge (browse o ads-bounce, no ambos).

---

## 9c. chat-quality-review (auditoría → push staff)

- **Carpeta**: `supabase/functions/chat-quality-review/`
- **SQL**: `scripts/db/add-chat-quality-review.sql` — `quality_review_sent_at`; RPC `waba_find_quality_review_candidates`; cron `chat-quality-review-every-15min`.
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy chat-quality-review \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

- **Qué hace**: Haiku clasifica hilos con actividad reciente; si hay flags (`unanswered_price`, `cart_mismatch`, `promo_ignored`, `client_confused`) → FCM owner/dev. **Nunca** escribe a la clienta.
- **Copy push**: título `WhatsApp · Revisar YA · {nombre}`; body corto con 1–2 flags (evita truncado en la barra).
- **QA phones**: `isQaWaPhone` suprime push (igual que otras alertas).
- **QA**: `yarn waba:validate:eli-yoja-quality` (`51999000986`) — casos A Eli / B Yoja / C control; luego `yarn waba:cleanup:qa`.
- **Motivación**: silence-watchdog no cubre “bot sí respondió pero mal” (Eli precio, Yoja carrito+promo).

---

## 9d. waba-staff-session (panel: reactivar bot / Haiku agenda)

- **Carpeta**: `supabase/functions/waba-staff-session/` + lógica en `whatsapp-webhook/handlers/staff-resume.ts`
- **SQL**: `scripts/db/add-bot-paused-at.sql` — `whatsapp_sessions.bot_paused_at`
- **Config**: `supabase/config.toml` → `verify_jwt = false` (auth JWT admin o service_role **interna**)
- **Deploy**:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy waba-staff-session \
  --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

- **Body**: `{ "phone": "51…", "action": "resume_bot" | "haiku_finish_booking" }`
- **`resume_bot`**: limpia `bot_paused_at` (sin mensaje a la clienta).
- **`haiku_finish_booking`**: unpause + Haiku lee ~20 msgs + catálogo; fail-soft — si hay carrito/servicio y fecha/hora parseable → `tryCompleteBookingFromText`; si no → reply + selector de días. Error Haiku → push staff + bot queda activo + fallback WA.
- **UI**: `/panel/waba/mensajes` banner cuando `bot_paused_at` (botones Reactivar / Haiku agenda).
- **Relacionado (webhook)**: foto diseño mid-funnel → `lib/inbound-image.ts` (persist `waba-images`, pausa, ack 7–21 Lima / off-hours, push); texto en pausa → `notifyAdminsPausedClientReply` (debounce 3 min). Crons: `loadSilentPhoneSet` = blocklist CMS + `bot_paused_at`.

---

## Tokens de push: qué usa la app

En **apps/mobile/hooks/useNotifications.ts** se usa:

```ts
const tokenData = await Notifications.getDevicePushTokenAsync();
```

Eso devuelve el **token nativo** (FCM en Android, APNs en iOS). Ese valor se guarda en `profiles.push_token`.

Por tanto:

- **send-notification** (FCM v1) es la función correcta para enviar push a la app tal como está hoy.
- **send-push-notification** (Expo Push) solo tendría efecto si la app pasara a usar `getExpoPushTokenAsync()` y guardara ese token en `profiles.push_token`.

---

## Tabla `profiles.push_token`

- Columna **push_token** (text, nullable) en la tabla **profiles**.
- La app la actualiza en login/registro de notificaciones.
- Las Edge Functions de push leen por `user_id(s)` con **SUPABASE_SERVICE_ROLE_KEY** para bypasear RLS y obtener los tokens.

---

## Deploy

- **CLI**: desde la raíz del repo, `supabase functions deploy <nombre> --project-ref udelxwwnyivknslueerr`. El CLI puede dar 403; en ese caso usar **MCP Supabase** > `deploy_edge_function` con el slug de la función.
- **Secrets**: configurar en Supabase Dashboard > Edge Functions > Secrets (`FCM_SERVICE_ACCOUNT`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ANTHROPIC_API_KEY` para Haiku en webhook, **`ANTHROPIC_ADMIN_API_KEY`** para `sync-anthropic-billing`, **`META_SYSTEM_USER_TOKEN`** / **`WABA_ID`** / **`WABA_SYNC_SECRET`** para `waba-pricing-sync`, etc.).
  - `WHATSAPP_ACCESS_TOKEN`: System User **permanente** (Business Settings → System Users). No el token 24 h de API Setup.
  - `WHATSAPP_PHONE_NUMBER_ID`: ID Meta del bot **+51 981 444 430** (no el staff **932 535 512**).
  - Rotación y validación: [DEPLOYMENT.md](DEPLOYMENT.md) § Secrets; plantilla de comentarios en `.env.example`.
- **verify_jwt**: para webhooks externos (p. ej. whatsapp-webhook) debe ser `false`; para invocaciones desde la app o desde otras funciones, normalmente `true`.

---

## Verify JWT — whatsapp-webhook (obligatorio)

Meta no envía JWT en las peticiones al webhook. Si `verify_jwt` está en `true`, Supabase responde 401 y el bot **deja de recibir mensajes**. Para que no vuelva a ocurrir:

1. **Config en repo**: `supabase/config.toml` define `[functions.whatsapp-webhook] verify_jwt = false`. Al hacer deploy con **Supabase CLI**, esta config se aplica y la función queda con JWT desactivado.
2. **Deploy con MCP**: al usar `deploy_edge_function` para `whatsapp-webhook`, **siempre** pasar `verify_jwt: false`. Si se pasa `true`, el deploy sobrescribe y el webhook deja de funcionar.
3. **Después de cualquier deploy**: en Supabase Dashboard → Edge Functions → whatsapp-webhook → Settings, comprobar que **Verify JWT** esté en **Off**. Si está en On, cambiarlo a Off manualmente (el último deploy puede haberlo dejado en true si no se usó config o MCP con `verify_jwt: false`).

### Dónde cambiar Verify JWT en el Dashboard

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) y abre el proyecto (ref: `udelxwwnyivknslueerr`).
2. En el menú izquierdo: **Edge Functions**.
3. Haz clic en la función **whatsapp-webhook**.
4. Pestaña o sección **Settings** (Configuración).
5. Busca la opción **Verify JWT** y ponla en **Off**.
6. Guarda si hace falta. Con eso Meta podrá llamar al webhook sin 401.
