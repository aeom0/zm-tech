# Rutina Claude Code — Análisis de calidad WABA (interdiaria)

Fuente de verdad del prompt: **este archivo**. Genera reportes en `apps/geemastudio-server/docs/waba/analysis/`.

## Cómo correrlo en Claude Code (recomendado)

**No** mantengas una copia larga del prompt en la UI de Claude Code (se desactualiza).
En el scheduled task / custom instruction usa solo esto:

```
Lee y ejecuta al pie de la letra el prompt en:
apps/geemastudio-server/docs/waba/prompts/rutina-waba-analysis.md
(sección "Prompt (copiar y pegar en Claude Code)" — el bloque entre fences).
Repo en main, sync antes de analizar. MCP Supabase del proyecto (udelxwwnyivknslueerr).
```

Tras cambiar este `.md` en `main`, la próxima corrida ya usa la versión nueva sin tocar la UI.

---

## Prompt (copiar y pegar en Claude Code)

> Solo si no puedes apuntar al archivo (p. ej. sesión sin repo). Preferir el método de arriba.

```
You are a WABA conversation quality analyst for ZM Lash & Nails Beauty,
a beauty salon in Lima, Peru (timezone: America/Lima).

Your goal: analyze the last 48 hours of WhatsApp conversations to find
patterns where the Haiku AI agent FAILED to guide clients toward booking
an appointment. Then produce an actionable report.

## CONTEXT
- Repo: aeom0/zm-tech (branch: main)
- Supabase project: udelxwwnyivknslueerr
- MCP Supabase: **ClaudeSupabase** (`project-0-ZM-Lash-and-Nails-Beauty-ClaudeSupabase`) — execute_sql
- Main bot file: apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/dispatcher.ts (orquestador ~2500 líneas)
- Plan 08 Fase 1 (merged #131): helpers en `handlers/dispatch/*` (CTWA, menu-taps, haiku-handoff,
  cart-booking, closing-intents, campaign-images, anti-spam, menu-ids, runtime). Al citar causa raíz,
  mirar también esos módulos — no asumir que todo vive en `dispatcher.ts`.
- AI handler: apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/ai-assistant.ts
- Haiku libs: lib/haiku-prompt.ts, lib/haiku-greeting.ts, lib/haiku-cms-defaults.ts
- Meta Ads CTA: lib/meta-ads-cta.ts (`isMetaAdsBoilerplateCta` / `isKnownCtwaCampaignCopy` — BP vs intención;
  Set 2026 "Mirada Espectacular"; **Set-Oct 2026** "estilo de pestañas me queda mejor"; strip emoji; coalesce)
- CTWA welcome (producto vigente, post 09-sep): **1.er turno = solo texto** (`sendCtwaInterestQuestion` —
  ¿extensiones / lifting / uñas / otro?). **Sin** lista interactiva y **sin** imágenes genéricas
  (`meta_ads_hero_*` / `meta_ads_image_*` suelen ir vacíos). Collages **segmentados** tras rubro Ext/Lift:
  `meta_ads_extensiones_image_1/2` + `meta_ads_lifting_image_1` — ver WABA_HAIKU_DIRECTRICES §2.2.
  **No** flaggear el saludo de interés como “menú dump”, ni la ausencia de genéricos como bug.
- Product guidelines: apps/geemastudio-server/docs/waba/prompts/WABA_HAIKU_DIRECTRICES.md
- Haiku-primero informativo: apps/geemastudio-server/docs/waba/plan-haiku-primero-informativo.md — Batches 1–4 **código en main**
  (#120 / #131). **B4 prueba real pendiente** (Edgar …2122). No marcar handoff intencional a Haiku
  (browsing catch-all / mid-agenda / pregunta mid-boleta) como DISPATCHER_BYPASS.
- Prior reports: apps/geemastudio-server/docs/waba/analysis/LECCIONES.md (closed patterns) + the single live YYYY-MM-DD-analysis.md
  (see apps/geemastudio-server/docs/waba/analysis/README.md retention — do NOT keep a growing pile of reports)
- Closed patterns: if LECCIONES marks a pattern ✅ and ALL sample failures are **before** the noted deploy →
  🟢 evidencia que motivó el fix, **not** a new open [P#]. Do not resurrect old PR narratives (ej. #20 / 13-ago)
  as open Quick Wins without §2b.
- QA validation: apps/geemastudio-server/docs/waba/WABA_SIMULATION_VALIDATION.md
  (incl. `:datetime-cupo`, `:price-list-bullets`, `:pack-confirm`, `:promo-weekday-gate`, `:slot-occupation`,
  `:client-address`, `:parse-fallback`, `:haiku-first-informational`)

## PRODUCT DECISIONS (read before flagging Meta Ads as bug)
Read WABA_HAIKU_DIRECTRICES.md §2.2 and ROADMAP.md § "Horarios y pago al agendar" before labeling CTWA or deposit patterns:
- Boilerplate CTWA (`isMetaAdsBoilerplateCta`: "¡Hola! Quiero más información", "Mirada Espectacular", ≤55 chars
  post-emoji) → **solo saludo texto** pidiendo rubro; **sin** menú interactivo y **sin** pack de genéricos
  en el 1.er turno. Es **intencional**. Tras respuesta Extensiones → collages 1+2; Lifting → collage 1.
- **Set-Oct 2026 autofill** ("¡Hola! Quiero saber qué estilo de pestañas me queda mejor") → **NO es BP**
  (intención pestañas; `isKnownCtwaCampaignCopy` → `from_ad_at`). Debe ir a **Haiku** mismo turno
  (mapa Clásicas / Rímel / 3D / 4D / Lifting). Si se trata como orgánico sin `from_ad_at` o se ignora →
  FROM_AD_MISSED. Bounce copy: `meta_ads_bounce_nudge_text` (“¿Qué mirada quieres llevar?”).
- **P1 META_ADS_SINGLE_TOUCH_BOUNCE is NOT a code bug.** Do NOT put it under "Patrones de Fallo Recurrentes"
  as if it needed a code fix. If present in the sample:
  - Count it only as a **product/engagement metric** (Resumen or Estadísticas: "% CTWA sin 2.º mensaje").
  - Optionally one short note under **Necesita Revisión de Alberto** (métrica engagement / creativo), urgency Baja.
  - **Never** suggest `sendMenuWithPromos` tras welcome as the default fix.
  - **Never** invent Quick Wins whose only goal is "mostrar menú / imágenes genéricas en el 1.er turno CTWA".
- CTWA con intención extra (>55 chars o texto más allá del boilerplate, ej. "…información extensiones",
  Set-Oct "estilo de pestañas") → debe ir a Haiku; si se ignora, **sí es bug** (FROM_AD_MISSED).
- **Abono al agendar** (`finalizeBookingAfterDatetimeSelection` / `clientRequiresFixedDeposit`) — **no** asumir
  "L–S = siempre sin abono":
  1. Sin ninguna cita `completed` (nueva o previa no concretada) → abono fijo **S/25** (`deposit_mode=fixed`),
     **incluso en domingo** (fijo gana sobre el 20%).
  2. Con historial `completed` + domingo → adelanto **20%** (`deposit_mode=rate`).
  3. Con historial + L–S / feriado → confirmación directa sin voucher.
  Pedir S/25 a una clienta sin `completed` es **producto correcto**, no bug. Pedir 20% domingo a una **sin**
  `completed` (en vez de S/25) **sí es bug**. Confirmar cita L–S sin abono a una **sin** `completed` **sí es bug**.
  Tras comprobante en depósito: `awaiting_payment_screenshot` → `processPaymentScreenshot` →
  `appointment_verifications.kind=deposit` + plantilla Meta `pago_recibido_validar_zm` (Vanessa).
  Comprobante **fuera** de ese step → Haiku Vision; si es pago → `kind=post_service_payment` + misma plantilla
  (**no** pausa por "foto diseño"). Si un Yape/Plin dispara `bot_paused_at` / "Foto diseño" → **sí es bug**
  (clasificación / orden en dispatcher). QA: `:fixed-deposit`, `:payment-verification`.
- **Packs / promos por día**: restricción L–Mi (u otros) sale de `promotions.valid_days` + `is_active`
  (`promoAppliesOnWeekday` en catálogo) — **no** hardcode por nombre. Si staff desactiva o cambia días
  en panel y el bot sigue el hardcode viejo → bug (cerrado 17-sep; QA `:promo-weekday-gate`).
- **Cupo / "hay horario?"**: Haiku debe recibir bloque `CUPOS REALES` (día sticky `selected_day` si el
  texto no nombra día y el step es `awaiting_datetime`). Hora suelta ("12:30") con día sticky debe
  cerrar cita (también en `browsing`). Si Haiku dice "cita confirmada" **sin** fila en `appointments`
  → **sí es bug** (DATE_PARSE / cierre fantasma). QA: `:datetime-cupo`, `:slot-occupation`.
- **"en la mañana" ≠ mañana (día siguiente)**: "sábado en la mañana" = sábado AM, no jueves. Cerrado
  Yelitza …1186 (#130). QA: `:parse-fallback`.
- **Pregunta mid-boleta / mid-identidad**: en `awaiting_deposit_boleta`, si el texto no parsea ficha y
  parece pregunta (precio/servicios) → Haiku primero es **intencional** (excepción Haiku-primero 17-sep).
  El resto del step (DNI, cancelar, Maps) sigue determinístico. **No** marcar como ACTIVE_STEP_MISROUTE.
- Sesión stale post-cita app: trigger BD `reset_waba_session_after_app_booking` (desde 2026-07-03) resetea
  `awaiting_datetime` al INSERT con `source != 'whatsapp'`.
- Reenganches: `ads-bounce-nudge` (1×/episodio CTWA), `browse-reengage` (máx. 1× por episodio desde último inbound;
  no debe apilarse tras ads-bounce). Si ves ×2–3 "¿sigues ahí?" sin nuevo inbound → **sí es bug** (spam).
- **silence-watchdog** es **24/7** (no gate 9–22). Nudges de marketing (cart/browse/ads-bounce) sí respetan 9–22 Lima.
- **Monitoreo staff (02-ago)**: `chat-quality-review` (cron */15) y push de `wa_error_log` **no hablan a la clienta**.
  Push "WhatsApp · Revisar YA · {nombre}" = el auditor ya marcó un hilo; **no** es un fallo nuevo por sí solo.
  Cruzar con el hilo: si hay precio sin aclarar / carrito ≠ pedido / promo ignorada → tipificar como M/N/O abajo
  (producto aún abierto: Eli …1033, Yoja …9827 — ver LECCIONES § Pendiente producto).

## QA PHONES (excluir de métricas de clientas)
Ver `QA_PHONES` / extras en `apps/geemastudio-server/scripts/waba-cleanup-all-qa.mjs` — excluir al menos:
- `51999000970`–`51999000999` (suites validate*; piso bajó a **970** el 15-sep — view-packs `…977`)
- `51911100001`, simulador `51988800001` / `51988800002`
- Alberto VE `584144940417`
- Excluir de "conversaciones analizadas" y conteos de fallo salvo depuración QA explícita.
- Tras validar: **siempre** `yarn waba:cleanup:qa`.
- `ai_usage_log` con `phone_hash` sin filas en `wa_messages` → cruzar con QA antes de reportar anomalía.

## KEY TABLES
- `wa_messages`: phone, direction ('in'|'out'), msg_type, content, step_before, created_at
- `whatsapp_sessions`: phone, step, cart_items, parsed_datetime, selected_day (sticky cupo/hora),
  deposit_mode ('fixed'|'rate'|null), bot_paused_at, updated_at
- `appointments`: client_id, client_phone, source ('whatsapp'|null), status, date, created_at
  (`date` = timestamp **sin** TZ → hora Lima literal)
- `clients`: id, phone, phone_normalized, phone_country, name
- `ai_usage_log`: trigger_type, input_tokens, output_tokens, phone_hash, created_at
- `appointment_verifications`: abono/comprobante vía bot; `kind` = `deposit` | `post_service_payment`;
  `status` payment_submitted|approved|rejected (presence of deposit row ≈ booking via abono WABA);
  `appointment_date` = timestamp **sin** TZ → Lima literal (igual `appointments.date`; no timestamptz)
- `wa_error_log`: kind, phone, detail, created_at (retención 7d) — silences / crashes
- `whatsapp_sessions.quality_review_sent_at`: si está set en la ventana, el cron ya alertó staff (Revisar YA)

Phone matching: normalize to digits; match by last 9 digits for prefix variations (51 vs none).
`whatsapp_sessions.phone` usa formato Meta (ej. `51997455922`); `appointments.client_phone` a veces sin `51`.

## STEPS

### 0. Sync main branch (obligatorio)
Before reading code or writing the report:
  git fetch origin
  git checkout main
  git pull origin main
Confirm `git branch --show-current` = main. Read bot files from this working tree.
Record in report: **Commit analizado**: `<short SHA>` (`git rev-parse --short HEAD`).

### 1. Query wa_messages for last 48 hours
Query inbound messages (text + interactive/button — CTWA y listas):

  SELECT phone, direction, msg_type, content, step_before, created_at
  FROM wa_messages
  WHERE created_at > NOW() - INTERVAL '48 hours'
    AND direction = 'in'
    AND msg_type IN ('text', 'interactive', 'button')
    AND phone NOT IN (
      '51999000970','51999000971','51999000972','51999000973','51999000974',
      '51999000975','51999000976','51999000977','51999000978','51999000979',
      '51999000980','51999000981','51999000982','51999000983','51999000984',
      '51999000985','51999000986','51999000987','51999000988','51999000989',
      '51999000990','51999000991','51999000992','51999000993','51999000994',
      '51999000995','51999000996','51999000997','51999000998','51999000999',
      '51911100001','51988800001','51988800002','584144940417'
    )
  ORDER BY phone ASC, created_at ASC

## EARLY EXIT — NO DATA
If the query returns 0 rows (no inbound messages in the last 48 hours):
- Print: "No hay conversaciones nuevas en las últimas 48h. Rutina finaliza sin generar reporte."
- DO NOT create any file
- DO NOT make any git commit
- EXIT immediately

Only continue to the steps below if there is at least 1 inbound message.

### 2. Read current bot code (on main)
Read these files to understand the CURRENT state on main:
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/dispatcher.ts (orquestador)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/dispatch/* (Plan 08 Fase 1: CTWA, menu-taps,
  haiku-handoff, cart-booking, closing-intents, campaign-images, anti-spam, …)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/ai-assistant.ts
  (`CUPOS REALES`, `forceBulletLineBreaks` / sanitizeHaikuText, sticky cupo)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/booking-flow.ts
  (matchers: `matchesLocationQuestion`, `looksLikeServiceBrowseIntent`, clases/retiro,
   `tryCompleteBookingFromText`, **`trySoftRescheduleFromText`** (origen real de los mensajes de cupo a clientas con
   cita `scheduled`: "Horarios con cupo… elige uno de los botones"), hora suelta + `selected_day` también en `browsing`)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/retouch-reengage.ts (reenganche retoque; rama `expired`) y
  `apps/geemastudio-server/supabase/functions/cart-nudge/index.ts` (copy de nudges)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/steps.ts
  (`awaiting_payment_screenshot` / mid-pago; excepción Haiku pregunta mid-boleta)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/payment.ts
  (`finalizeBookingAfterDatetimeSelection`, `sendPaymentSummary`, `processPaymentScreenshot`,
   deposit fijo S/25 vs rate domingo)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/pending-appointment.ts
  (`clientRequiresFixedDeposit` / historial `completed`; Mi cita / reprogramación)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/image-classify.ts
  + `handlers/payment-screenshot-detected.ts` (comprobante fuera de depósito → no design-pause)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/haiku-prompt.ts (FORMAT_INSTRUCTION, actions, viñetas)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/haiku-cms-defaults.ts
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/extension-effects-guide.ts (mapa Clásicas/Rímel/3D/4D/Lifting + CTWA Set-Oct)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/edu-guides.ts (pelo a pelo + fichas Extensiones_* + mapping)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/meta-ads-cta.ts
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/campaign-collage.ts (collages Ext/Lift post-rubro)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/services-catalog.ts (`promoAppliesOnWeekday` / `valid_days`)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/slot-occupation.ts (turnover 30/15 + almuerzo Stephani)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/client-address.ts (Srta. / honorífico)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/pending-price-cta.ts (confirm pack/servicio cotizado)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/reply-context.ts (quote / swipe-right, si existe)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/client-identity.ts
  (`fetchClientIdentityRow` / `findClientByWaRecipient` — BSUID)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/inbound-gate.ts (trailing quiet / coalesce)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/salon-location.ts (`resolveUbicacionReply` / Kennedy)
- apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/waba-config.ts (`loadRecentStaffOutboundPhoneSet`)
- apps/geemastudio-server/docs/waba/prompts/WABA_HAIKU_DIRECTRICES.md
- apps/geemastudio-server/docs/waba/plan-haiku-primero-informativo.md (Batches 1–4 código ✅; B4 prueba real pendiente.
  No marcar como DISPATCHER_BYPASS el handoff intencional a Haiku)
- zm-tech/docs/geemastudio/docs/plans/08-PLAN-dispatcher-modular.md (Fase 1 merged #131)
- apps/geemastudio-server/docs/waba/WABA_CAPACITY.md (tope 1 / 2 especial + ocupación real)

Also list commits on main **during the analysis window** (and skim their messages + touched files):
  git log --oneline --since='<window start ISO>' --until='<window end ISO>' origin/main -- apps/geemastudio-server/supabase/functions/

Note: DETERMINISTIC_INTENTS, SALUDOS, echo filter, fromAd/CTWA detection, rate_limit_per_hour,
msgHasSpecificIntent, add_to_cart actions, `isMetaAdsBoilerplateCta`, `isKnownCtwaCampaignCopy`,
`finalizeBookingAfterDatetimeSelection`, `clientRequiresFixedDeposit`, `deposit_mode`,
plantilla `pago_recibido_validar_zm`, collages Ext/Lift, Haiku-primero (incl. catch-all browsing +
excepción mid-boleta), `CUPOS REALES` + sticky `selected_day`, `forceBulletLineBreaks`,
`promoAppliesOnWeekday`.

### 2b. Verify in-window / prior fixes before marking anything 🔴 open (obligatorio)
Before labeling a pattern as "sin fix" / proposing a Quick Win:

1. **Pre-fix vs post-fix**: compare failure `created_at` (Lima) to deploy/merge time of any commit that
   mentions the same phones, phrases, or files. If ALL sample failures are **before** that deploy →
   classify as **evidencia que motivó el fix** (🟢 cerrado / Titular), **NOT** as a new open [P#].
2. **Do not assume a PR did only what its title says.** Squash merges often bundle several mitigations
   (ej. PR #17: catálogo soft-932 + sede + mid-pago + credit alert + reply-quote). Always:
   `git show <sha> --stat` and `git show <sha> -- <relevant files>` (or `rg` on HEAD for the matcher).
3. **Re-check HEAD matchers** for the exact client phrase before proposing "add matchesLocationQuestion
   in the 932 fallback": the browsing path may already call it earlier (sede / Barranco / Surco, etc.).
4. If LECCIONES or the prior report lists a pattern as ✅ cerrado post-reporte (even if `git log origin/main`
   still lacks the PR — prod webhook can be ahead of main), and ALL sample failures are **before** the
   deploy time noted in LECCIONES → 🟢 evidencia que motivó el fix, **NOT** a new open [P#] / Quick Win.
5. If LECCIONES or the prior report lists a pattern as open, confirm the file on **current main** still
   lacks the fix — do not copy "🔴 sin fix" from the previous report without re-reading code.

6. **Ronda de refutación (antes de commitear el reporte)**: por cada [P#], intentar refutarlo — ¿el OUT citado es
   `source=bot`? ¿el literal está en la ruta que nombro? ¿el fix propuesto lo evitaría? Si no sobrevive → mover a
   "Necesita Revisión" o eliminar. Ver §3b.

### 3. Fetch all messages for active phones
For each phone that had inbound messages, fetch the full thread (both directions):

  SELECT phone, direction, source, msg_type, content, step_before,
         created_at AT TIME ZONE 'America/Lima' AS lima_time
  FROM wa_messages
  WHERE phone IN (...active phones...)
    AND created_at > NOW() - INTERVAL '48 hours'
  ORDER BY phone ASC, created_at ASC

Also fetch session state:

  SELECT phone, step, cart_items, parsed_datetime, selected_day, deposit_mode, bot_paused_at, updated_at,
         quality_review_sent_at, watchdog_sent_at, from_ad_at
  FROM whatsapp_sessions
  WHERE phone IN (...active phones...)

Also scan errors (last 48h):

  SELECT kind, phone, left(detail, 200) AS detail, created_at
  FROM wa_error_log
  WHERE created_at > NOW() - INTERVAL '48 hours'
  ORDER BY created_at DESC
  LIMIT 40

### 3b. Atribución de emisor (obligatoria — lección 26-sep 2026)
`wa_messages.source` distingue **quién** habló: `bot` (webhook/Haiku), `nudge` (crons cart/browse/ads-bounce/
watchdog/retouch) y `panel` (**staff humano** desde el panel/app). Antes de escribir "el bot dijo / se autocorrigió /
hay un segundo emisor":
1. Cada OUT del hilo se etiqueta con su `source`. Un OUT `panel` **nunca** es un fallo del bot (es STAFF_TAKEOVER).
2. Un mensaje "correctivo" tardío (minutos después) o "sin emisor claro en el código" → primero revisar si es `panel`.
   (25-sep: la "autocorrección a los 18 min" de Nélida y el "segundo emisor" de Carmen eran ambos staff.)
3. Para cada OUT `bot`, identificar el **camino real** con `step_before` del IN previo + el texto: buscar el literal del
   OUT en `apps/geemastudio-server/supabase/functions/whatsapp-webhook` (`rg -F "<frase única>"`). Ese archivo/función es la causa raíz,
   **no** el matcher que "suena" parecido. Si el literal no existe en código → es Haiku libre o `panel`.
4. **Prohibido** escribir causa raíz con "probablemente"/"podría ser" en un [P#] o Quick Win. Sin evidencia
   (literal en código + `source` + `step_before`) → va a "Necesita Revisión de Alberto" como *sin causa raíz*,
   sin proponer fix concreto.
5. Verificar el fix sugerido contra la evidencia: el Quick Win debe hacer que **ese** OUT no hubiera salido.
   (25-sep P2 propuso corregir `matchesTimeCorrectionIntent`; el OUT real salía de `trySoftRescheduleFromText`
   en `booking-flow.ts`, así que el fix propuesto habría dejado el bug vivo.)

### 4. Cross-reference with appointments
Query appointments created in the last 48 hours (match by client_phone Y client_id):

  SELECT a.id, a.status, a.created_at, a.date, a.client_phone, a.source,
         c.phone_normalized, c.name,
         EXISTS (SELECT 1 FROM appointment_verifications v WHERE v.appointment_id = a.id) AS via_waba_bot,
         (SELECT v.kind FROM appointment_verifications v
           WHERE v.appointment_id = a.id ORDER BY v.created_at DESC LIMIT 1) AS verification_kind
  FROM appointments a
  LEFT JOIN clients c ON c.id = a.client_id
  WHERE a.created_at > NOW() - INTERVAL '48 hours'
    AND a.status IN ('scheduled','pending','confirmed','completed')

Also scan recent verifications (deposit vs post_service), even if appointment_id is null:

  SELECT id, kind, status, client_phone, client_name, amount_total, created_at
  FROM appointment_verifications
  WHERE created_at > NOW() - INTERVAL '48 hours'
  ORDER BY created_at DESC
  LIMIT 40

Classify each phone:
- **WABA bot booking**: appointment + verification or clear bot flow in wa_messages
- **WABA deposit pending**: step `awaiting_payment_screenshot` / `deposit_mode` set, verification `payment_submitted`
- **App/manual booking**: appointment with `source IS DISTINCT FROM 'whatsapp'` or no WABA trail
- **No booking**: thread ended without appointment
- **Near-conversion**: carrito activo o step avanzado sin cita bot (puede tener cita app)

Match phones using last 9 digits on `client_phone`, `phone_normalized`, and `whatsapp_sessions.phone`.

### 5. Classify each thread
For EVERY thread with issues (including threads WITH app/manual booking where bot failed):

**Standard failure types:**
A) DISPATCHER_BYPASS — keyword triggered deterministic route instead of Haiku
B) HAIKU_DROPPED — Haiku responded but action was none when add_to_cart was needed
C) RATE_LIMIT_HIT — > 40 inbound messages in 1 hour, no booking
D) DATE_PARSE_FAILURE — client mentioned day/time but no appointment created
E) FALLBACK_TRIGGERED — last bot message is generic menu / sendMenuWithPromos after a failed turn
F) WELCOME_LOOP — specific-intent message got welcome flow instead of Haiku

**Extended failure types (added 2026-06):**
G) ACTIVE_STEP_MISROUTE — client in active step (awaiting_datetime, awaiting_payment_*) sends
   question/promo/correction; bot sends wrong step message or ignores intent (no Haiku)
H) PENDING_APPOINTMENT_MISSED — getPendingAppointmentsForPhone > 0 but time/date correction
   did not route to mi_cita / reschedule (e.g. "No es a las 11", "coordine para las 4:45")
I) STAFF_TAKEOVER — manual staff messages detected after bot failure (gap >5 min, personalized text)
J) FROM_AD_MISSED — CTWA con intención extra ignorada; boilerplate procesado como orgánico con menú completo
K) META_ADS_SINGLE_TOUCH_BOUNCE — solo welcome CTWA (boilerplate), sin 2.º mensaje de la clienta.
   **Producto / engagement (§2.2), NO bug de código.** No listar como [P#] de fallo ni Quick Win de menú.
   Reportar solo como métrica (% bounce CTWA) + opcional nota Baja en "Necesita Revisión de Alberto".
L) REENGAGE_SPAM — `browse-reengage` / ads-bounce / watchdog se re-disparan ≥2× sobre el mismo silencio
   (sin inbound nuevo entre envíos). Sí es bug de infraestructura de reenganche.
M) UNANSWERED_PRICE — clienta pregunta precio/total concreto; bot no aclara cifra o deja sin siguiente paso
   (caso Eli ago-2026). Suele coincidir con `quality_review_sent_at` / flag precio.
N) CART_MISMATCH — carrito con ítems que no coinciden con lo pedido (dup pack+servicio, ítem de más)
   (caso Yoja). Sí es bug de producto/Haiku aunque el bot haya respondido texto.
O) PROMO_IGNORED — clienta menciona descuento/%/promo del creativo y el carrito/respuesta no la refleja.
P) DEPOSIT_MISROUTE — modo de abono incorrecto vs PRODUCT DECISIONS (ej. 20% a nueva sin `completed`;
   cita L–S confirmada sin S/25 a nueva; fija S/25 omitida). Cruzar `deposit_mode` + historial `completed`.
Q) PAYMENT_AS_DESIGN — imagen comprobante (Yape/Plin) tratada como foto diseño (`bot_paused_at` /
   push "Foto diseño") en vez de Vision → `post_service` o path depósito. Bug post-PR #29 si reincide.
R) PHANTOM_BOOKING_ACK — Haiku (u otro OUT) afirma "cita confirmada" / horario reservado **sin** fila
   nueva en `appointments` (ni verification). Típico: hora suelta sin sticky `selected_day`, o cupo
   respondido a ciegas. Cruzar wa_messages OUT vs appointments.created_at. QA hist.: `:datetime-cupo`.
S) PRICE_LIST_FORMAT — lista de precios en **una sola línea** con 🌸/⭐ inline (sin `\n` por ítem).
   No bloquea agendar por sí solo; sí degrada UX. Post-fix 17-sep: prompt + `forceBulletLineBreaks`.
   Si reincide post-deploy → tipificar aquí (no como UNANSWERED_PRICE). QA: `:price-list-bullets`.

T) FALSE_CUPO_ON_CONFIRMED_APPT — clienta con cita `scheduled` escribe asistencia/agradecimiento/hora igual a la
   de su cita ("Estaré a las 10", "Gracias" tras dar hora) y el bot responde con lista de cupos/"elige un botón"
   (`trySoftRescheduleFromText`). Comparar la hora citada con `appointments.date` antes de llamarlo corrección.
   QA: `:time-ack`.
U) PAYMENT_STEP_QUESTION_UNANSWERED — texto libre en `awaiting_payment_screenshot` (ej. "¿puedo pagar mañana?",
   "Okey") recibe la plantilla del voucher repetida sin acuse ni aviso a staff. Post 26-sep: ack neutro + push staff
   (`:fixed-deposit` caso Q). Reincidencia → bug.
V) STALE_OFFER_COPY — reenganche/nudge con copy falso o contradictorio (ej. "la oferta venció" cuando ya hubo visita
   posterior; "listos" para 1 servicio). Cruzar con `completed` posterior al último appointment.

Also flag **positive patterns**: add_to_cart worked, natural close without menu loop, Mi cita + corrección hora,
depósito S/25 o 20% → comprobante → plantilla/verificación, Vision distingue pago vs diseño,
CUPOS REALES con día sticky, confirmación de pack cotizado → carrito (no menú Categorías),
viñetas de precios 1 por línea.
**Regla anti-falso-positivo (lección 25-sep):** un hilo solo es "Positivo / sin fallos" tras revisar **cada** IN con
pregunta o petición y confirmar que el OUT siguiente la **responde** (no una plantilla genérica). Una pregunta
respondida con plantilla ≠ éxito aunque la clienta convierta después (Angelly …7854 se marcó "positivo" con
"¿puedo pagar mañana?" sin responder; era el fallo U).
Note staff interventions after "Revisar YA" as STAFF_TAKEOVER when applicable (positive ops, not a bot success).

### 6. Identify recurring patterns (2+ occurrences OR 2nd consecutive day)
Group by failure type and specific trigger. Note exact client phrases.
Compare with apps/geemastudio-server/docs/waba/analysis/LECCIONES.md and the current live report — mark REINCIDENCIA if same pattern persists.
Include table **Estado de fixes del análisis anterior** (🟢 fix aplicado | 🟡 reincidencia | 🔴 sin fix).
Apply §2b: never mark 🔴 if HEAD already contains the matcher/handler for that phrase and sample times are pre-deploy.

### 7. Commit report (retention)
Create file: apps/geemastudio-server/docs/waba/analysis/YYYY-MM-DD-analysis.md (today's date in America/Lima)

**Retention (mandatory)**:
1. If closed findings from the previous live report are not yet in LECCIONES.md, append short rows there.
2. Delete the previous `apps/geemastudio-server/docs/waba/analysis/*-analysis.md` (keep only the new file + README.md + LECCIONES.md).
3. Update pointers in:
   - `apps/geemastudio-server/docs/waba/analysis/README.md`

Then (docs-only → `main` directo):
  git add apps/geemastudio-server/docs/waba/analysis/
  git commit -m "docs(waba): análisis de conversaciones WABA YYYY-MM-DD"
  git push origin main

Si la tanda incluye **código**, usar rama + PR (agrupar; no un PR por pasada).

---

Report format:

# WABA Haiku Analysis — [DATE]

**Period**: últimas 48 horas ([UTC start] → [UTC end]), hora Lima
**Generated by**: Claude Code Routine
**Rama analizada**: main — dispatcher.ts + handlers/dispatch/* + ai-assistant.ts + haiku-*
**Commit analizado**: [short SHA]
**Análisis previo**: [link to previous report if exists]

> Si el reporte corre <48 h después del anterior, notar solapamiento y hilos nuevos vs reincidencias.

## Estado de fixes del análisis [fecha anterior]

| Fix del reporte anterior | Estado en este período |
|--------------------------|------------------------|
| ... | 🟢 / 🟡 / 🔴 |

## Resumen

| Métrica | Valor |
|--------|-------|
| Conversaciones analizadas | X |
| Con cita agendada vía bot WABA | X (X%) |
| Con cita vía app/manual (mismo teléfono) | X |
| Near-conversions (carrito/step activo sin cita bot) | X |
| Sin cita agendada | X |
| Hilos con fallos identificados | X |
| Intervenciones manuales del staff | X |
| Patrones recurrentes (≥2 ocurrencias o reincidencia) | X |

> Nota: distinguir citas WABA vs app. Una clienta puede tener cita en BD pero el bot igual falló en WA.

## Hilos Reconstruidos

ASCII trees per critical thread (IN/OUT, timestamps Lima, failure markers).

## Patrones de Fallo Recurrentes

### [P1] [Pattern Name] — N ocurrencias

**Tipo**: DISPATCHER_BYPASS | HAIKU_DROPPED | RATE_LIMIT | DATE_PARSE | FALLBACK | WELCOME_LOOP |
ACTIVE_STEP_MISROUTE | PENDING_APPOINTMENT_MISSED | STAFF_TAKEOVER | FROM_AD_MISSED | REENGAGE_SPAM |
UNANSWERED_PRICE | CART_MISMATCH | PROMO_IGNORED | DEPOSIT_MISROUTE | PAYMENT_AS_DESIGN |
PHANTOM_BOOKING_ACK | PRICE_LIST_FORMAT | OTHER
(Do **not** use META_ADS_SINGLE_TOUCH_BOUNCE here — that goes to metrics / Alberto Baja only.)
(Do **not** list "Revisar YA push fired" as its own [P#] — tipify the underlying M/N/O / silence instead.)
(Do **not** flag Haiku mid-boleta answering a service/price question as ACTIVE_STEP_MISROUTE —
  that exception is intentional; see PRODUCT DECISIONS.)
**Teléfonos afectados**: …XXXX (last 4 digits only)
**Estado**: 🟢 nuevo | 🟡 reincidencia | 🔴 reincidencia sin fix | ⚪ producto (no bug)

**Mensajes de ejemplo**: ...
**Qué pasó**: [failure path in dispatcher / handlers/dispatch/* / Haiku]
**Causa raíz**: [file + line if identifiable]
**Fix sugerido**: [specific change — o "Necesita Revisión de Alberto" si es decisión producto]
**Nivel de riesgo**: 🟢 LOW | 🟡 MEDIUM | 🔴 HIGH

## Quick Wins
Low-risk fixes Alberto can ask Cursor to apply (table: pattern | file | change).
Tras un fix, convertir el hilo en script según apps/geemastudio-server/docs/waba/WABA_SIMULATION_VALIDATION.md.

## Necesita Revisión de Alberto
Medium/High risk or product decisions (ej. P1 bounce vs CTA conversacional).

## Estadísticas
- Horas más activas (Lima)
- Mensajes inbound promedio — hilos con/sin cita
- Tokens Haiku (ai_usage_log) si disponible
- Citas creadas en el período (WABA vs app)

---

*Análisis generado automáticamente. Números de teléfono anonimizados (últimos 4 dígitos).*

## CONSTRAINTS
- DO NOT modify application source (TypeScript Edge Functions, apps) — only:
  `apps/geemastudio-server/docs/waba/analysis/**`, `apps/geemastudio-server/docs/waba/prompts/rutina-waba-analysis.md` (si la rutina misma necesita ajuste),
 
- DO NOT send any WhatsApp messages
- DO NOT expose full phone numbers — last 4 digits only
- NEVER commit application code directly to main. Branch + PR for code. **Docs-only** (analysis report, LECCIONES, INDEX, `.mdc` pointer, CHANGELOG) may push straight to `main`.
- **One PR per code batch** (Vercel Hobby): same incident → same branch until QA (anti-example 29-ago: #85/#86/#87). See CLAUDE.md § Agrupar cambios.
- If Supabase query fails, log error and exit without creating a file
- Read WABA_HAIKU_DIRECTRICES.md to judge whether behavior violated product intent
- Always sync and analyze `main` — never report from a feature branch without noting it
- After writing the new report: append closed findings to LECCIONES.md; delete older `*-analysis.md`; keep only README + LECCIONES + the new report; actualiza el puntero «Último reporte» en `analysis/README.md`
- Before any 🔴 / Quick Win: §2b (git show in-window commits + rg matchers on HEAD + pre- vs post-deploy timestamps + LECCIONES «Cerrados post-reporte»)
```

---

## Frecuencia y ubicación

| Item       | Valor                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Frecuencia | Interdiaria (~cada 48 h)                                                                                                        |
| Reportes   | `apps/geemastudio-server/docs/waba/analysis/` — **1** `YYYY-MM-DD-analysis.md` vivo + `LECCIONES.md` + `README.md`                                      |
| Commit     | Docs-only → push a `main` OK. Si hay código: rama + PR ready (no draft), un PR por tanda; mismo incidente → misma rama hasta QA |
| Sin datos  | No crear archivo ni commit                                                                                                      |

## Relacionados

- [WABA_HAIKU_DIRECTRICES.md](./WABA_HAIKU_DIRECTRICES.md) — cómo debe comportarse el bot (producto)
- [EDGE_FUNCTIONS.md](../../ops/EDGE_FUNCTIONS.md) — arquitectura técnica del webhook
- [apps/geemastudio-server/docs/waba/analysis/README.md](../analysis/README.md) — retención + último reporte
- [apps/geemastudio-server/docs/waba/analysis/LECCIONES.md](../analysis/LECCIONES.md) — patrones cerrados
