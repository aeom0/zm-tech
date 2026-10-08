# ZM Lash & Nails Beauty — contexto de la rutina de análisis WABA

Tenant: `tenant_id = 'zm-lash-nails'` · salón de belleza en Lima, Perú (`America/Lima`).
Este archivo lo carga [`rutina-waba-analysis.md`](../../prompts/rutina-waba-analysis.md) como `CONTEXTO_TENANT`.
Contiene lo que **solo aplica a ZM Lash**: decisiones de producto, teléfonos QA, tipos de fallo propios y qué es un patrón positivo.
Directrices del bot: [directrices-haiku.md](./directrices-haiku.md) · lecciones: [analysis/LECCIONES.md](./analysis/LECCIONES.md).

## Identidad y rutas

- Reportes: `apps/geemastudio-server/docs/waba/tenants/zm-lash/analysis/` (1 `YYYY-MM-DD-analysis.md` vivo + `LECCIONES.md` + `README.md`).
- Rama de publicación: `claude/waba-analysis` (heredada de cuando ZM era el único tenant).
- Directrices de producto: `apps/geemastudio-server/docs/waba/tenants/zm-lash/directrices-haiku.md`.
- Derivación humana: Vanessa **932 535 512**. Plantilla Meta de pago: `pago_recibido_validar_zm`.

## Contexto específico
- CTWA welcome (producto vigente, post 09-sep): **1.er turno = solo texto** (`sendCtwaInterestQuestion` —
  ¿extensiones / lifting / uñas / otro?). **Sin** lista interactiva y **sin** imágenes genéricas
  (`meta_ads_hero_*` / `meta_ads_image_*` suelen ir vacíos). Collages **segmentados** tras rubro Ext/Lift:
  `meta_ads_extensiones_image_1/2` + `meta_ads_lifting_image_1` — ver directrices-haiku §2.2.
  **No** flaggear el saludo de interés como “menú dump”, ni la ausencia de genéricos como bug.
- Cutover agente: apps/geemastudio-server/docs/waba/plan-cutover-agente-haiku.md — con `agent_enabled`,
  texto libre en browsing lo atiende el agente (tools). Fallback = bot clásico. Venta emocional CTWA
  sigue (prompt CMS + nudges). No marcar handoff intencional a Haiku/agente como DISPATCHER_BYPASS.
- Haiku-primero (histórico / bot clásico): plan-haiku-primero-informativo.md — Batches 1–4 en main.
- Prior reports: apps/geemastudio-server/docs/waba/tenants/zm-lash/analysis/LECCIONES.md (closed patterns) + the single live YYYY-MM-DD-analysis.md
  (see apps/geemastudio-server/docs/waba/tenants/zm-lash/analysis/README.md retention — do NOT keep a growing pile of reports)
- Closed patterns: if LECCIONES marks a pattern ✅ and ALL sample failures are **before** the noted deploy →
  🟢 evidencia que motivó el fix, **not** a new open [P#]. Do not resurrect old PR narratives (ej. #20 / 13-ago)
  as open Quick Wins without §2b.
- QA validation: apps/geemastudio-server/docs/waba/WABA_SIMULATION_VALIDATION.md
  (incl. `:datetime-cupo`, `:price-list-bullets`, `:pack-confirm`, `:promo-weekday-gate`, `:slot-occupation`,
  `:client-address`, `:parse-fallback`, `:haiku-first-informational`)


## Decisiones de producto (leer antes de marcar Meta Ads o abono como bug)
Read directrices-haiku.md §2.2 and ROADMAP.md § "Horarios y pago al agendar" before labeling CTWA or deposit patterns:
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


## Teléfonos QA (excluir de métricas de clientas)
Ver `QA_PHONES` / extras en `apps/geemastudio-server/scripts/waba-cleanup-all-qa.mjs` — excluir al menos:
- `51999000970`–`51999000999` (suites validate*; piso bajó a **970** el 15-sep — view-packs `…977`)
- `51911100001`, simulador `51988800001` / `51988800002`
- Alberto VE `584144940417`
- Excluir de "conversaciones analizadas" y conteos de fallo salvo depuración QA explícita.
- Tras validar: **siempre** `yarn waba:cleanup:qa`.
- `ai_usage_log` con `phone_hash` sin filas en `wa_messages` → cruzar con QA antes de reportar anomalía.

## Tipos de fallo propios de ZM Lash (se suman a los genéricos A–I de la rutina)

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
