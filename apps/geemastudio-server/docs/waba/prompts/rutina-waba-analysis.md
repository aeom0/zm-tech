# Rutina Claude Code — Análisis de calidad WABA (interdiaria, por tenant)

Método **común a todos los tenants**. Lo propio de cada negocio (decisiones de producto, teléfonos QA, tipos de fallo
específicos, rama de publicación) vive en `docs/waba/tenants/<slug>/contexto-analisis.md`. La rutina corre **una vez por
tenant**; cada corrida analiza solo las filas con `tenant_id = <TENANT_ID>` y escribe en
`docs/waba/tenants/<slug>/analysis/`.

## Parámetros

| Parámetro | Ejemplo (ZM Lash) | Fuente |
| --- | --- | --- |
| `TENANT_ID` | `zm-lash-nails` | columna `tenant_id` de `wa_messages`, `whatsapp_sessions`, `appointments`, `wa_error_log` |
| `TENANT_DIR` | `apps/geemastudio-server/docs/waba/tenants/zm-lash` | carpeta del tenant |
| `CONTEXTO_TENANT` | `<TENANT_DIR>/contexto-analisis.md` | decisiones de producto, QA phones, tipos de fallo propios |
| Rama de publicación | `claude/waba-analysis` (ZM) · `claude/waba-analysis-<slug>` (resto) | definida en el contexto del tenant |

Tenant nuevo: crear `tenants/<slug>/` con `contexto-analisis.md` (mismas secciones que el de ZM Lash), `analysis/README.md`
y `analysis/LECCIONES.md` vacío. La rama de cada tenant es distinta para que el reinicio con `--force-with-lease` no pise
el reporte de otro.

## Cómo correrlo en Claude Code (recomendado)

**No** mantengas una copia larga del prompt en la UI de Claude Code (se desactualiza).
En el scheduled task de cada tenant usa solo esto (cambia `<slug>` y `<TENANT_ID>`):

```
Lee y ejecuta al pie de la letra el prompt en:
apps/geemastudio-server/docs/waba/prompts/rutina-waba-analysis.md
(sección "Prompt (copiar y pegar en Claude Code)" — el bloque entre fences).
TENANT_ID=<TENANT_ID> · TENANT_DIR=apps/geemastudio-server/docs/waba/tenants/<slug>
Repo en main, sync antes de analizar. MCP Supabase del proyecto (udelxwwnyivknslueerr).
```

### Rutinas activas

| Tenant | Rutina (Claude Code, RemoteTrigger) | Frecuencia | Rama de reportes |
| --- | --- | --- | --- |
| ZM Lash (`zm-lash-nails`) | `WABA Haiku Analysis — ZM Lash & Nails` (`trig_019e6ruNMKxAAju55G4fKYyS`) | días impares, 11:00 UTC | `claude/waba-analysis` |

Al crear la rutina de un tenant nuevo, agrega su fila aquí. El prompt de la rutina debe llevar siempre `TENANT_ID` y
`TENANT_DIR`; sin ellos la corrida no sabe qué tenant analizar.

Tras cambiar este `.md` en `main`, la próxima corrida ya usa la versión nueva sin tocar la UI.

---

## Prompt (copiar y pegar en Claude Code)

> Solo si no puedes apuntar al archivo (p. ej. sesión sin repo). Preferir el método de arriba.

```
You are a WABA conversation quality analyst for ONE tenant of GeemaStudio (name, city and timezone are in
CONTEXTO_TENANT; TENANT_ID and TENANT_DIR come from the task that launched you).

Your goal: analyze the last 48 hours of WhatsApp conversations of that tenant to find
patterns where the Haiku AI agent FAILED to guide clients toward booking
an appointment. Then produce an actionable report.

## TENANT SCOPE (obligatorio)
- Read `<TENANT_DIR>/contexto-analisis.md` BEFORE anything else: product decisions, QA phones, tenant-specific
  failure types and publish branch. What it says overrides generic assumptions in this file.
- Every query on `wa_messages`, `whatsapp_sessions`, `appointments`, `wa_error_log` MUST filter
  `tenant_id = '<TENANT_ID>'`. Never mix conversations from other tenants.
- Read product guidelines from `<TENANT_DIR>/directrices-haiku.md`, lessons from `<TENANT_DIR>/analysis/LECCIONES.md`.

## CONTEXT
- Repo: aeom0/zm-tech (branch: main)
- Supabase project: udelxwwnyivknslueerr
- MCP Supabase: **ClaudeSupabase** — execute_sql. Es la BD de GeemaStudio (multi-tenant), no de un tenant: sin el filtro `tenant_id` mezcla negocios.
- Main bot file: apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/dispatcher.ts (orquestador ~2500 líneas)
- Plan 08 Fase 1 (merged #131): helpers en `handlers/dispatch/*` (CTWA, menu-taps, haiku-handoff,
  cart-booking, closing-intents, campaign-images, anti-spam, menu-ids, runtime). Al citar causa raíz,
  mirar también esos módulos — no asumir que todo vive en `dispatcher.ts`.
- AI handler: apps/geemastudio-server/supabase/functions/whatsapp-webhook/handlers/ai-assistant.ts
- Haiku libs: lib/haiku-prompt.ts, lib/haiku-greeting.ts, lib/haiku-cms-defaults.ts
- Meta Ads CTA: lib/meta-ads-cta.ts (`isMetaAdsBoilerplateCta` / `isKnownCtwaCampaignCopy` — BP vs intención;
  Set 2026 "Mirada Espectacular"; **Set-Oct 2026** "estilo de pestañas me queda mejor"; strip emoji; coalesce)
- QA validation: apps/geemastudio-server/docs/waba/WABA_SIMULATION_VALIDATION.md
- Cutover agente Haiku 5.5: apps/geemastudio-server/docs/waba/plan-cutover-agente-haiku.md (Fase 1 / flag `agent_enabled`)
- Haiku-primero informativo (bot clásico / histórico): apps/geemastudio-server/docs/waba/plan-haiku-primero-informativo.md
- Prior reports: `<TENANT_DIR>/analysis/LECCIONES.md` (closed patterns) + the single live YYYY-MM-DD-analysis.md
  (see `<TENANT_DIR>/analysis/README.md` retention — do NOT keep a growing pile of reports)
- Closed patterns: if LECCIONES marks a pattern ✅ and ALL sample failures are **before** the noted deploy →
  🟢 evidencia que motivó el fix, **not** a new open [P#]. Do not resurrect old PR narratives as open Quick Wins without §2b.

## KEY TABLES
- `wa_messages`: tenant_id, phone, direction ('in'|'out'), msg_type, content, step_before, created_at
- `whatsapp_sessions`: tenant_id, phone, step, cart_items, parsed_datetime, selected_day (sticky cupo/hora),
  deposit_mode ('fixed'|'rate'|null), bot_paused_at, updated_at
- `appointments`: tenant_id, client_id, client_phone, source ('whatsapp'|null), status, date, created_at
  (`date` = timestamp **sin** TZ → hora Lima literal)
- `clients`: tenant_id, id, phone, phone_normalized, phone_country, name
- `ai_usage_log`: tenant_id, trigger_type, input_tokens, output_tokens, phone_hash, created_at
- `appointment_verifications`: tenant_id, abono/comprobante vía bot; `kind` = `deposit` | `post_service_payment`;
  `status` payment_submitted|approved|rejected (presence of deposit row ≈ booking via abono WABA);
  `appointment_date` = timestamp **sin** TZ → Lima literal (igual `appointments.date`; no timestamptz)
- `wa_error_log`: tenant_id, kind, phone, detail, created_at (retención 7d) — silences / crashes
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
Record in report: **Tenant**: `<TENANT_ID>`.
Record in report: **Commit analizado**: `<short SHA>` (`git rev-parse --short HEAD`).


### 1. Query wa_messages for last 48 hours
Query inbound messages (text + interactive/button — CTWA y listas):

  SELECT phone, direction, msg_type, content, step_before, created_at
  FROM wa_messages
  WHERE tenant_id = '<TENANT_ID>'
    AND created_at > NOW() - INTERVAL '48 hours'
    AND direction = 'in'
    AND msg_type IN ('text', 'interactive', 'button')
    AND phone NOT IN (<QA_PHONES del contexto del tenant>)
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
- <TENANT_DIR>/directrices-haiku.md
- apps/geemastudio-server/docs/waba/plan-cutover-agente-haiku.md (Fase 1; flag `agent_enabled`)
- apps/geemastudio-server/docs/waba/plan-haiku-primero-informativo.md (histórico / bot clásico.
  No marcar como DISPATCHER_BYPASS el handoff intencional a Haiku/agente)
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
  WHERE tenant_id = '<TENANT_ID>'
    AND phone IN (...active phones...)
    AND created_at > NOW() - INTERVAL '48 hours'
  ORDER BY phone ASC, created_at ASC

Also fetch session state:

  SELECT phone, step, cart_items, parsed_datetime, selected_day, deposit_mode, bot_paused_at, updated_at,
         quality_review_sent_at, watchdog_sent_at, from_ad_at
  FROM whatsapp_sessions
  WHERE tenant_id = '<TENANT_ID>'
    AND phone IN (...active phones...)

Also scan errors (last 48h):

  SELECT kind, phone, left(detail, 200) AS detail, created_at
  FROM wa_error_log
  WHERE tenant_id = '<TENANT_ID>'
    AND created_at > NOW() - INTERVAL '48 hours'
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
  WHERE a.tenant_id = '<TENANT_ID>'
    AND a.created_at > NOW() - INTERVAL '48 hours'
    AND a.status IN ('scheduled','pending','confirmed','completed')

Also scan recent verifications (deposit vs post_service), even if appointment_id is null:

  SELECT id, kind, status, client_phone, client_name, amount_total, created_at
  FROM appointment_verifications
  WHERE tenant_id = '<TENANT_ID>'
    AND created_at > NOW() - INTERVAL '48 hours'
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
**Tipos propios del tenant (J en adelante):** ver `<TENANT_DIR>/contexto-analisis.md`.
Usa solo esos nombres o `OTHER`.

Also flag **positive patterns** (lista en el contexto del tenant; mínimo: add_to_cart funcionó, cierre natural sin loop de menú).

### 6. Identify recurring patterns (2+ occurrences OR 2nd consecutive day)
Group by failure type and specific trigger. Note exact client phrases.
Compare with <TENANT_DIR>/analysis/LECCIONES.md and the current live report — mark REINCIDENCIA if same pattern persists.
Include table **Estado de fixes del análisis anterior** (🟢 fix aplicado | 🟡 reincidencia | 🔴 sin fix).
Apply §2b: never mark 🔴 if HEAD already contains the matcher/handler for that phrase and sample times are pre-deploy.

### 7. Commit report (retention)
Create file: <TENANT_DIR>/analysis/YYYY-MM-DD-analysis.md (today's date in the tenant timezone)

**Retention (mandatory)**:
1. If closed findings from the previous live report are not yet in LECCIONES.md, append short rows there.
2. Delete the previous `<TENANT_DIR>/analysis/*-analysis.md` (keep only the new file + README.md + LECCIONES.md).
3. Update pointers in `<TENANT_DIR>/analysis/README.md`.

Luego publicar **solo en la rama de publicación del tenant** (ver su contexto; nunca en `main`, ni docs-only):
  git fetch origin
  git checkout -B <RAMA_TENANT> origin/main   # lleva consigo los cambios sin commitear del paso anterior
  git add <TENANT_DIR>/analysis/
  git commit -m "docs(waba): análisis de conversaciones WABA <TENANT_ID> YYYY-MM-DD"
  git push --force-with-lease -u origin <RAMA_TENANT>

La rama se **reinicia desde `origin/main` en cada corrida**: contiene solo el último reporte vivo del tenant encima de main.
Si Alberto no mergeó el reporte anterior, el nuevo lo reemplaza (retención = 1 reporte vivo por tenant). No abrir PR ni mergear:
Alberto revisa la rama y la mergea cuando quiera. En el resumen final indicar el nombre de la rama y el SHA del commit.

Si la tanda incluye **código**, usar otra rama + PR (agrupar; no un PR por pasada); el código nunca va en la rama de análisis.

---

Report format:

# WABA Haiku Analysis — [TENANT_ID] — [DATE]

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

**Tipo**: uno de los tipos de §5 (genéricos A–I + los del contexto del tenant) | OTHER
(Respetar las exclusiones que declare el contexto del tenant: tipos que son métrica/producto y no [P#].)
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
Medium/High risk or product decisions.

## Estadísticas
- Horas más activas (Lima)
- Mensajes inbound promedio — hilos con/sin cita
- Tokens Haiku (ai_usage_log) si disponible
- Citas creadas en el período (WABA vs app)

---

## CONSTRAINTS
- DO NOT modify application source (TypeScript Edge Functions, apps) — only:
  `<TENANT_DIR>/analysis/**` y `apps/geemastudio-server/docs/waba/prompts/rutina-waba-analysis.md` (si la rutina misma necesita ajuste).
- DO NOT send any WhatsApp messages
- DO NOT expose full phone numbers — last 4 digits only
- NEVER push to `main` (ni código ni docs). El reporte (y README/LECCIONES si cambian) va a la rama de publicación del tenant; Alberto la mergea. El código va en otra rama + PR.
- **One PR per code batch** (Vercel Hobby): same incident → same branch until QA. See CLAUDE.md § Agrupar cambios.
- If Supabase query fails, log error and exit without creating a file
- Read `<TENANT_DIR>/directrices-haiku.md` to judge whether behavior violated product intent
- Always sync and analyze `main` — never report from a feature branch without noting it
- After writing the new report: append closed findings to LECCIONES.md; delete older `*-analysis.md`; keep only README + LECCIONES + the new report; actualiza el puntero «Último reporte» en `analysis/README.md`
- Before any 🔴 / Quick Win: §2b (git show in-window commits + rg matchers on HEAD + pre- vs post-deploy timestamps + LECCIONES «Cerrados post-reporte»)
- Un tenant por corrida. Si `<TENANT_DIR>/contexto-analisis.md` no existe, salir sin crear archivos.
```

---

## Frecuencia y ubicación

| Item       | Valor |
| ---------- | ----- |
| Frecuencia | Interdiaria (~cada 48 h), una corrida por tenant |
| Reportes   | `docs/waba/tenants/<slug>/analysis/` — **1** `YYYY-MM-DD-analysis.md` vivo + `LECCIONES.md` + `README.md` |
| Commit     | Reporte → rama de publicación del tenant (reset desde main + `--force-with-lease`), sin PR ni push a `main`. Si hay código: otra rama + PR ready (no draft), un PR por tanda |
| Sin datos  | No crear archivo ni commit |

## Relacionados

- Tenant ZM Lash: [contexto](../tenants/zm-lash/contexto-analisis.md) · [directrices](../tenants/zm-lash/directrices-haiku.md) · [análisis](../tenants/zm-lash/analysis/README.md)
- [EDGE_FUNCTIONS.md](../../ops/EDGE_FUNCTIONS.md) — arquitectura técnica del webhook
- [WABA_MULTITENANT_ARCHITECTURE.md](../../../../../docs/geemastudio/docs/WABA_MULTITENANT_ARCHITECTURE.md) — alta de WABA por tenant
