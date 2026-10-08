# Plan: Haiku-primero para preguntas informativas del bot WABA (histórico)

> **Superseded (8-oct-2026):** el cutover al agente Haiku 5.5 con tools está en
> [`plan-cutover-agente-haiku.md`](plan-cutover-agente-haiku.md) (Fase 1: PR zm-tech #77).
> Este plan sigue describiendo el comportamiento del **bot clásico** (fallback cuando
> `agent_enabled=false` o steps de pago/identidad). No abrir PRs nuevos de regex
> informativos: el camino es el agente.
>
> Origen: pedido explícito de Alberto (13-sep-2026) tras el caso "Y anime tienen o wispy"
> (boilerplate genérico + spam del selector de fecha). En su momento complementaba la
> decisión de **no cutover** del piloto sombra (ago-2026); esa decisión quedó anulada
> por el plan de cutover al agente.
>
> **Estado Batches 1–4 (18-sep-2026):** ✅ en el bot clásico (PR #120 / #131; B4 validado
> en tráfico real 17-sep). Pago/identidad siguen determinísticos en el híbrido Fase 1.

## Contexto

`dispatcher.ts` (~2500 líneas tras Plan 08 Fase 1; destino orquestador) enruta cada mensaje con ~48 funciones regex/keyword
independientes antes de que Haiku participe (inventario completo:
[`auditoria-intenciones-waba.md`](auditoria-intenciones-waba.md)). En agosto corrió en
producción un piloto "modo sombra" que comparó regex vs Haiku **solo en los 5 intents
🔴 críticos** de dinero/citas (crear cita, reprogramar, confirmar, reclamo). Ahí el
regex ganó 7/7 en auditoría manual, y la decisión entonces fue **no hacer cutover**.
Esa decisión quedó anulada el 8-oct-2026 por el agente con tools; este texto describe
el fallback clásico.

El problema real, confirmado en vivo el 13-sep (Alberto VE …0417): los gates 🟡/🟢
(informativos/navegación, ej. `matchesMidAgendaBrowseOrAddIntent`,
`matchesOpenHoursQuestion`, `matchesCartSelectionQuestion`) **nunca fueron parte de ese
piloto** y, cuando no matchean, caen directo a un boilerplate estático sin intentar
Haiku nunca. Cada frase nueva ("Y anime tienen o wispy") se resolvía agregando una
palabra más a un regex — parche sobre parche, mismo patrón desde hace 5 meses.

**Objetivo**: para el subconjunto de preguntas simples/informativas (no dinero, no
cita, no identidad), Haiku responde **primero** cuando el regex no da un match limpio
— el boilerplate estático pasa a ser el último recurso (si Haiku falla/timeout), no el
único recurso. Extensión acotada de un patrón que ya existe en el código
(`tryHandOffUnrecognizedToHaiku` en `handlers/dispatch/haiku-handoff.ts`), no una reescritura del
dispatcher ni un router nuevo.

## Qué queda fuera (explícito, por pedido de Alberto)

Estos siguen determinísticos primero, Haiku no interviene en su ejecución:

- **Creación/edición de cita**: `tryCompleteBookingFromText`, `trySoftRescheduleFromText`,
  confirmación de cita texto libre (REMINDER_TEXT_CONFIRM), `matchesComplaintIntent` —
  los 5 intents 🔴 ya evaluados y rechazados para cutover.
- **Registro de identidad del cliente**: step `AWAITING_CLIENT_IDENTITY`.
- **Pago/abono**: steps `awaiting_payment_info`, `awaiting_payment_screenshot`,
  `awaiting_deposit_datos`, `awaiting_pre_service_photo(_2)`. **Excepción acotada
  (17-sep, pedido explícito de Alberto)**: en `awaiting_deposit_boleta`, si el texto
  del cliente **no matchea nombre+DNI** (`parseClientIdentity` devuelve `null`) y
  parece pregunta suelta (contiene `?`, ej. "Y extensiones qué tienen"), Haiku
  responde antes del copy estático de "no pude leer los datos" — el resto del step
  (parseo de identidad, cancelar, ubicación/horario/FAQ) sigue 100% determinístico.
  `handleFixedDepositSteps` (`steps.ts`) recibe `tryHaikuOnUnmatchedIdentity` desde
  `dispatcher.ts` (mismo `tryHandOffUnrecognizedToHaiku`). Tras Haiku, se reenvía el
  pedido de nombre/DNI (no se asume que Haiku recuerde el step de boleta).

## Mecanismo (ya existía, no se inventó nada nuevo)

`tryHandOffUnrecognizedToHaiku(opts)` (`handlers/dispatch/haiku-handoff.ts`): si `detectAITrigger` no
da trigger, arma uno `{type:"fallback", originalMessage: text}`, chequea rate-limit,
llama `handleAIMessage(ctx, trigger, wabaConfig)` → `boolean`. Si `true`, Haiku ya
respondió y el caller hace `return`; si `false`, el caller cae a su propio fallback
estático. `handleAIMessage` no tiene guard interno de step — el step-gating de hoy es
decisión del *caller*, no una limitación de Haiku.

## Batches (uno por PR/rama, en orden — cada uno se prueba en vivo antes del siguiente)

- **Batch 1 — mid-agenda catalog mismatch** ✅ implementado y validado en vivo
  (13-sep-2026, PR #120). Guard `mentionsConflictingCatalogMidCart` +
  `matchesMidAgendaBrowseOrAddIntent === false` en `booking-flow.ts` / `dispatcher.ts`
  (`awaiting_datetime`). Antes: boilerplate directo. Ahora:
  `tryHandOffUnrecognizedToHaiku` antes del boilerplate. Tras Haiku OK **no** se
  reenvía el selector de fecha/hora (los botones previos siguen activos). QA:
  `yarn waba:validate:haiku-first-informational` (caso B1).
- **Batch 2 — horarios/disponibilidad** ✅ implementado y validado en vivo
  (13-sep-2026, PR #120). `matchesOpenHoursQuestion` (mid-`awaiting_datetime`) y
  `matchesHorariosAvailabilityQuery` (remapeo texto libre → `consultar_horarios`)
  antes siempre disparaban `horariosText` estático. Helpers
  `isMostlyOpenHoursQuestion` / `isMostlyHorariosAvailabilityQuestion`
  (`booking-flow.ts`, mismo patrón que `isMostlyLocationQuestion`): si tras quitar
  la fraseología típica de horario queda texto real, se intenta Haiku antes del
  estático. Tap interactivo `horarios` y preguntas puramente genéricas siguen
  estáticos. QA: caso B2 (mensaje **sin** palabras de fecha tipo "mañana", para no
  colisionar con `tryCompleteBookingFromText` P0).
- **Batch 3 — selección de carrito y ubicación** ✅ implementado, desplegado y
  QA (16-sep-2026). `isMostlyCartInspectQuestion` + `isMostlyLocationQuestion`
  (ya existía): taps (`ver_seleccion` / `ubicacion`) y preguntas puras siguen
  el dump estático / Maps. Si tras quitar la fraseología queda texto real
  ("cuánto sería el total si le agrego lifting", "dónde queda y atienden
  lifting") → `tryHandOffUnrecognizedToHaiku` antes del estático.
  Pago/identidad no se tocan (`steps.ts`). QA: casos B3a / B3b + gates unit.
  Referencia de tono CTWA en vivo: Maheli Inga Silva `…2911` (pregunta, sin
  abrir catálogo).
- **Batch 4 — catch-all de `browsing`** ✅ implementado, mergeado (PR #131,
  16-sep) y validado en tráfico real. El bloque
  `if (!session?.step || session.step === "browsing")` ya no deja pasar
  `detectAITrigger === null` al menú genérico: se fuerza `fallback` y
  Haiku responde primero. Además, `remapMenuTextUserInput` no remapea
  "agendar"/"reservar" si `!isMostlyAgendarNav` (fecha, "semana que
  viene", servicio). Packs: mismo patrón (`isMostlyPacksNav`) — "ver packs"
  sigue la lista; "el pack" / cotización no remapean. En `awaiting_datetime`,
  `isMostlyTimeChoice`: "3" / "a las 3" cierran cita; "2 veces" / "la 3D"
  van a Haiku (el parser de hora ya no gana a ciegas). Pago/identidad no se
  ejecutan por Haiku.
  **Validado**: análisis de rutina 17-sep (19 hilos, ventana 15→17-sep) sin
  bugs nuevos atribuibles a este batch — ver `docs/waba/tenants/zm-lash/analysis/2026-09-17-analysis.md`.

### Notas de revisión Batch 3 (cerradas en Batch 4)

- **Umbrales `isMostly*`:** se **documentan**, no se unifican. `<= 2`
  horarios / ubicación / disponibilidad / agendar-nav (el strip ya se
  come la frase); `<= 8` carrito (frases nav más largas); `<= 12` retiro.
  Comentario en `booking-flow.ts` junto a `isMostlyOpenHoursQuestion`.
- **Helper de ubicación:** extraído a `handleLocationQuestion()` en
  `handlers/dispatch/haiku-handoff.ts` (Plan 08 Fase 1).

## Verificación por batch

1. `deno check index.ts` en `supabase/functions/whatsapp-webhook/` tras cada edit.
2. Prueba empírica de regex/gate con script Deno desechable (casos reales + bordes, sin
   falsos positivos sobre los steps excluidos).
3. QA suite: `yarn waba:validate:haiku-first-informational`
   (`scripts/waba-validate-haiku-first-informational.mjs`, tel `51999000981`) — un caso
   por batch; cleanup con `yarn waba:cleanup:qa`.
4. Deploy manual `whatsapp-webhook` (`--no-verify-jwt`); verificar `wa_error_log`
   post-deploy sin errores nuevos.
5. Monitoreo 24–48h en tráfico real por batch antes de encarar el siguiente.
6. Cerrar cada batch con entrada en `CHANGELOG.md` § `[Unreleased]` y marcar el intent
   correspondiente en [`auditoria-intenciones-waba.md`](auditoria-intenciones-waba.md)
   como "Haiku-primero" en vez de "cae a boilerplate".

## Relación con la decisión de no-cutover

Este plan **no reabre** la evaluación de arquitectura de `ROADMAP.md` — esa decisión
cubre únicamente los 5 intents 🔴 críticos (dinero/citas) y sigue vigente sin cambios.
Este plan cubre un conjunto disjunto: preguntas 🟡/🟢 informativas que ese piloto nunca
evaluó porque nunca compitieron con Haiku en primer lugar.
