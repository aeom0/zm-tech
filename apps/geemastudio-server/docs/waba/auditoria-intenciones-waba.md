# Auditoría — Funciones de detección de intención (regex/keyword) en el bot WABA

> Generado 05-ago-2026 leyendo directo `dispatcher.ts`, `booking-flow.ts`, `pending-appointment.ts`, `promo-intent.ts` desde `aeom0/ZM-Lash-and-Nails-Beauty@main`.
> Complementado el mismo día con research de Cursor (grep repo + conteo de calls en `dispatcher.ts`) y tabla intent → handler (Claude).
> **Última sync:** 28-ago-2026 — bloque #25 extraído a `handlers/menu-remap.ts` + QA `yarn waba:validate:menu-remap`; prompt sombra endurecido (auditoría manual 7 desacuerdos 28-ago); decisión producto: **sin cutover Haiku-router** (regex conservador ganó 7/7 en prod). Sync previa 23-ago: fixes post-audit, métricas piloto sombra.
> **Sync 16-sep-2026:** plan complementario [`plan-haiku-primero-informativo.md`](plan-haiku-primero-informativo.md) — para los gates 🟡/🟢 informativos de esta lista (no los 5 🔴 críticos evaluados en el piloto sombra), cuando el regex no matchea limpio ya no se cae directo a boilerplate: se intenta Haiku primero (`tryHandOffUnrecognizedToHaiku`), boilerplate queda de respaldo. **Batches 1–2** ✅ (PR #120). **Batch 3** ✅ (carrito/ubicación si `!isMostly*`, QA B1–B3b). **Batch 4** ✅ catch-all `browsing` + `isMostlyAgendarNav` (Edgar …2122).
> Objetivo: mapa completo de "quién decide qué" antes de que Haiku participe, como insumo para diseñar el piloto de clasificación única (modo sombra).
> Relacionado: `ROADMAP.md` § Evaluación de arquitectura — clasificación de intención por Haiku · implementación sombra: `lib/intent-shadow.ts` · remapeo menú: `handlers/menu-remap.ts`.

## Resultado clave

El roadmap habla de "~20 funciones". El número real de **puntos de decisión independientes** es más alto — muchos viven como bloques `.some((k) => lower.includes(k))` **anónimos e inline dentro de `dispatch()`**, sin nombre de función, lo cual es en sí mismo parte del problema: ni siquiera están inventariados como unidades reusables/testeables.

| Conteo | Qué incluye |
| --- | --- |
| **39** (audit inicial) | 25 funciones nombradas/exportadas + ~14 bloques inline sin nombre |
| **44** (post-research Cursor) | 39 + 5 funciones nuevas (#35–39) + bloque inline `CANCEL_KEYWORDS` en `steps.ts` |
| **48** (sync 23-ago) | 44 + 4 puntos nuevos (#45–48): cierre natural, opt-out, CTA precio post-foto, step CTWA interés |

No todas las 48 son candidatas a Haiku: ver **Grupo A / Grupo B** más abajo.

---

## Clasificación por peligrosidad

### 🔴 CRÍTICO — tocan dinero/citas directamente (INSERT/UPDATE en `appointments`) o son el gate inmediato antes de eso

| # | Nombre | Archivo | Qué hace | Nota de riesgo |
|---|---|---|---|---|
| 1 | `tryCompleteBookingFromText` | `booking-flow.ts` | Crea la cita (INSERT) si detecta carrito + fecha/hora parseable en texto libre | Motor del bug de Lili (PR #45): `parseTimeSlot`/`parseDatetimeES` + `esNumeroSueltoEnMensajeLargo`. **7 calls** en `dispatcher.ts` (+ `staff-resume.ts`) — máxima superficie |
| 2 | `trySoftRescheduleFromText` → `finalizeRescheduleAppointment` | `booking-flow.ts` / `pending-appointment.ts` | UPDATE directo de fecha/hora sobre cita ya `scheduled`, sin pasar por menú "Mi cita" | Ejecuta cambio de cita real sin confirmación explícita — mismo patrón de riesgo que #1 |
| 3 | `matchesSoftRescheduleIntent` | `booking-flow.ts` | Gate que decide si el texto libre dispara #2 | Depende de `matchesDateCorrectionIntent` + `extractDateIntentFromText`. **0 calls** directos en dispatcher (vive dentro de #2) |
| 4 | `parseTimeSlot` / `parseTimeText` | `booking-flow.ts` | Parser de hora en texto libre (múltiples regex: am/pm, "3,30", "a las", número suelto) | No es booleano pero es la fuente de verdad de horario — mismo tipo de fallback agresivo que causó el bug original en `parseDatetimeES` |
| 5 | Bloque inline `confirmText` (REMINDER_TEXT_CONFIRM) | `dispatcher.ts` | Regex exacta `/^(sí\|ok\|dale\|va\|listo\|confirmo)/` **+** frase natural (`asistiré`, `ahí estaré`, `voy a ir`…) → confirma cita si hubo recordatorio reciente | PR #30 (step); PR #34 (`wasAppointmentReminderRecentlySent`); 06-ago Pilar (`phraseConfirm` sin `sí` suelto condicional). Espejo en `intent-shadow.ts` (`REMINDER_TEXT_CONFIRM_*_RE`) |
| 6 | Bloque inline `isConfirm/isNoShow/isReschedule/isLateArrival` (botones de plantilla) | `dispatcher.ts` | Clasifica el texto del botón tocado y ejecuta confirmar/reprogramar/no-show | Viene de botón estructurado (menos riesgo que texto libre), pero la clasificación del *título* sigue siendo `.includes()`. **Grupo B** (no texto libre de la clienta) |
| 7 | `matchesComplaintIntent` | `booking-flow.ts` | Detecta reclamo/garantía para **bloquear** booking y derivar al 932 | PR #45 Lili (keywords + `esNumeroSueltoEnMensajeLargo` en parser); 05-ago [P1] **gate global** con o sin carrito **antes** de `tryCompleteBookingFromText` y Haiku (`dispatcher.ts` ~2357); plurales en lista. **1 call** directo; alta fragilidad semántica de keywords |
| 38 | `extractDateIntentFromText` | `booking-flow.ts` | Extrae la última fecha/hora explícita del texto | Comparte riesgo con #3/#4 (mismo parser). Ver actualización Cursor abajo |

### 🟠 ALTO — modifican estado del carrito/sesión o bloquean flujo (reversible, pero rompe la experiencia si falla)

| # | Nombre | Archivo |
|---|---|---|
| 8 | `isDeclineIntent` | `dispatcher.ts` (local) — vacía el carrito completo |
| 9 | `matchesCartCorrectionIntent` | `booking-flow.ts` — resetea `selected_day`/`parsed_datetime` |
| 10 | `matchesServiceChangeIntent` | `booking-flow.ts` |
| 11 | `matchesThirdPartyBookingIntent` (+ `hasThirdPartyBookingSignals`, `hasSelfDateBookingIntent`) | `booking-flow.ts` — helpers internos: **0 calls** en dispatcher |
| 12 | `matchesClosingAgreementIntent` | `pending-appointment.ts` — cierra sesión en `step: completed` |
| 13 | `matchesCancelCitaIntent` | `pending-appointment.ts` |
| 14 | `matchesTimeCorrectionIntent` | `pending-appointment.ts` — incluye `era/iba a ser + hora` (quick win 19-ago, caso Pati …5951) |
| 15 | `shouldBlockAdditionalBooking` | `pending-appointment.ts` — **Grupo B** (chequeo BD, no texto libre) |
| 16 | `newBookingOverlapsExisting` | `pending-appointment.ts` — **Grupo B** (chequeo BD) |
| 35 | `detectAITrigger` | `ai-assistant.ts` — gate hacia Haiku; **9 calls** en dispatcher; el piloto lo vuelve obsoleto (no se reemplaza, se elimina) |
| 39 | `matchesDateCorrectionIntent` | `booking-flow.ts` — gate interno de soft-reschedule |

### 🟡 MEDIO — routing dentro del menú, cambia la experiencia pero no toca BD de citas

| # | Nombre | Archivo |
|---|---|---|
| 17 | `matchesFirstMessageBookingIntent` | `booking-flow.ts` |
| 18 | `matchesMiCitaIntent` | `pending-appointment.ts` |
| 19 | `textImpliesExistingAppointment` | `pending-appointment.ts` |
| 20 | `matchesHorariosAvailabilityQuery` | `booking-flow.ts` |
| 21 | `matchesCartSelectionQuestion` | `booking-flow.ts` |
| 22 | `matchesCartTotalQuestion` | `booking-flow.ts` |
| 23 | `matchesPurePromosNavigationIntent` | `promo-intent.ts` |
| 24 | `matchesFilteredPromosIntent` | `promo-intent.ts` — **viva** en `ai-assistant.ts` L1405 (suprime `show_promos` genérico); no en dispatcher |
| 25 | Bloque `remapeo_menu_generico` (~15 `.some()` anónimos: agregar, agendar ya, ver selección, vaciar, packs, ver servicios, afirmativas cortas…) | `handlers/menu-remap.ts` (`remapMenuTextUserInput`) — extraído de `dispatcher.ts` 28-ago | 🟡 MEDIO — **ahora testeable** (`yarn waba:validate:menu-remap`) |
| 26 | `promoOrPriceQuestion` / `asksOwnCartPrice` (inline, dentro de `awaiting_datetime`) | `dispatcher.ts` |
| 36 | `detectRetouchTemplateButton` | `retouch-reengage.ts` — **Grupo B** (título de botón de plantilla) |

### 🟢 BAJO — informativo, sin efecto en dinero/citas/carrito

| # | Nombre | Archivo |
|---|---|---|
| 27 | `matchesOpenHoursQuestion` | `booking-flow.ts` |
| 28 | `matchesLocationQuestion` / `isMostlyLocationQuestion` | `booking-flow.ts` |
| 29 | `matchesTardanzaIntent` | `dispatcher.ts` (local) |
| 30 | `isIdentityEscapeMessage` / `matchesAlreadyHaveDataIntent` / `looksLikeIdentityAttempt` | `client-identity.ts` (L309 / L18 / L38) |
| 31 | Echo detection (`isCategoryEcho`/`isServiceEcho`/`isPackEcho`) | `dispatcher.ts` (local) — **Grupo B** (anti-eco Meta) |
| 32 | `SALUDOS` / `isSaludoExact` / `isSaludoPuro` | `dispatcher.ts` (local) |
| 33 | `isReproInteractiveId` / `parseReproAppointmentId` | `pending-appointment.ts` — viene de botón, no texto libre (**Grupo B**) |
| 34 | `sessionHasCart` / `isSessionStale` | `booking-flow.ts` — utilitarias, no clasifican intención (**Grupo B**) |
| 37 | `detectLiftingCareReply` | `retouch-reengage.ts` — sí/no aceite de ricino; universo acotado (**Grupo B** en producción; ver notas) |
| 45 | `matchesNaturalClosingIntent` + `hasRecentOutboundPendingPrompt` | `dispatcher.ts` — cierre natural ("Nos vemos", "Gracias") sin Haiku→932; guard ~15s si OUT dejó pregunta/lista pendiente (Loren, PR #20) |
| 46 | rama `opt_out` en `detectAITrigger` | `ai-assistant.ts` — `STOP`/`baja`/unsubscribe determinístico (`matchesMarketingOptOut`); nunca pasa a Haiku; se evalúa en `dispatcher.ts` antes del saludo (6-oct) |
| 47 | `tryAcceptPendingPriceCta` | `dispatcher.ts` / `cart-booking.ts` — "Si"/"Ok" corto tras CTA foto proactiva (`pending_price_cta_*` en sesión; Zandry …0030, 07-ago) |
| 47b | `tryAcceptPendingPortfolioCta` | `dispatcher.ts` / `cart-booking.ts` — "Sii" corto tras oferta condicional de fotos (`pending_portfolio_cta_at`; Jacqueline …2438, PR #137) |
| 48 | step `awaiting_ctwa_interest` | `dispatcher.ts` — tap Extensiones/Lifting/Otro post-CTWA (PR #58–#61, 23-ago); mayormente IDs interactivos (**Grupo B**) |

**Fuera de tablas numeradas (mismo patrón de deuda que #25):** `handlers/steps.ts` L116–141 — `CANCEL_KEYWORDS.some(...)` vacía carrito → `browsing`. `handlers/menu.ts`: 0 funciones del patrón.

**Resiliencia booking (no clasificación, pero afecta handlers 🔴):** `insertAppointmentChecked` en `payment.ts` — no confirma cita si INSERT falla (21-jul). `formatAvailableHours` en `booking-flow.ts` — copy de cupo real, no horario completo del salón (PR #20 Pati).

---

## Lectura para el piloto de modo sombra

1. **No hace falta correr Haiku contra las 44 a la vez.** Empezar por el bloque 🔴 CRÍTICO del Grupo A (`crear_cita`, `reprogramar_cita_soft`, `confirmar_cita_texto_libre`, `reclamo_garantia`) — ahí viven Lili, PR #8 y PR #30.
2. **`tryCompleteBookingFromText` es el candidato #1 del piloto** (no solo `matchesComplaintIntent`): es 🔴 por lo que hace *y* por tener **7 puntos de entrada** en `dispatcher.ts` (+ `staff-resume.ts`). Cualquier discrepancia Haiku-vs-regex se multiplica por esas ramas.
3. ~~El bloque #25 (`remapeo_menu_generico`) es la peor deuda técnica del archivo~~ — **extraído 28-ago** a `menu-remap.ts` + QA unit; sigue siendo candidato a reemplazo Haiku a futuro, no cutover inmediato.
4. **`matchesComplaintIntent` es el caso de estudio de fragilidad de keywords** (singular vs plural, dos parches). Alta peligrosidad semántica con solo 1 call — el piloto debe medir **superficie** (#1) y **fragilidad** (#7) por separado.
5. **`matchesFilteredPromosIntent` no es código muerto** — vive en `ai-assistant.ts` (supresión de `show_promos`). Ya del lado Haiku: más fácil de fusionar que de reemplazar.
6. **Grupo B no entra al schema** — chequeos de BD, botones de plantilla, ecos Meta. Reemplazarlos no reduce el patrón "regex malinterpreta texto libre"; solo agrega latencia/costo.

---

## Actualización 05-ago-2026 — research de Cursor (solo lectura)

### Correcciones al audit original

- §24 `matchesFilteredPromosIntent`: **no es código muerto**. No la usa `dispatcher.ts`, pero sí `handlers/ai-assistant.ts` (línea 1405): cuando Haiku elige `show_promos` y el mensaje matchea el filtro, se **suprime** la lista genérica de promos.

### 5 puntos de decisión nuevos (fuera de los 39 originales)

| # | Nombre | Archivo | Línea | Qué hace | Peligrosidad |
|---|---|---|---|---|---|
| 35 | `detectAITrigger` | `handlers/ai-assistant.ts` | 195 | Gate principal hacia Haiku. **9 calls** en `dispatcher.ts` (969, 1161, 1197, 1754, 1835, 2011, 2289, 2510, 3187) | 🟠 ALTO — bisagra waterfall ↔ Haiku; con clasificación al inicio **desaparece** |
| 36 | `detectRetouchTemplateButton` | `handlers/retouch-reengage.ts` | 56 | Título botón plantilla `retoque_reenganche_zm` (agendar / otro / más adelante) | 🟡 → Grupo B |
| 37 | `detectLiftingCareReply` | `handlers/retouch-reengage.ts` | 74 | Sí/no aceite de ricino post-lifting | 🟢 → Grupo B |
| 38 | `extractDateIntentFromText` | `handlers/booking-flow.ts` | 578 | Extrae fecha/hora del texto — dependencia de soft-reschedule | 🔴 (con #3/#4) |
| 39 | `matchesDateCorrectionIntent` | `handlers/booking-flow.ts` | 605 | Gate ("mejor el 14", "prefiero viernes") | 🟠 ALTO |

Además: `steps.ts` `CANCEL_KEYWORDS` (L116–141). `menu.ts` y el resto de `client-identity.ts` no aportaron intents nuevos fuera de §30 (`isPlaceholderClientName` / `isNineDigitSenderPhone` son helpers de ficha, no clasificación de intención).

**Total: 39 → 44.**

### Superficie de invocación en `dispatcher.ts` (🔴 + 🟠)

Más puntos de entrada = más superficie donde un desacuerdo Haiku-vs-regex puede aparecer. (Excluye imports y la línea `function …`.)

> **Nota 23-ago:** líneas del audit original (05-ago) ya no coinciden; usar `rg` en `dispatcher.ts`. Conteos actualizados abajo.

| Función | Calls (23-ago) | Calls (05-ago audit) | Nota |
|---|---:|---:|---|
| **`tryCompleteBookingFromText`** | **7** | 6 | 2382, 2773, 3035, 3144, 3187, 3472, 4048 — +1 vs audit; además `staff-resume.ts` |
| `detectAITrigger` | **10** | 9 | Bisagra waterfall ↔ Haiku; el piloto lo vuelve obsoleto |
| `matchesServiceChangeIntent` | 3 | 3 | |
| `matchesCancelCitaIntent` | 3 | 3 | |
| `parseTimeSlot` | 3 | 3 | |
| `isDeclineIntent` | 2 | 2 | |
| `matchesCartCorrectionIntent` | 2 | 2 | |
| `matchesClosingAgreementIntent` | 2 | 2 | |
| `matchesTimeCorrectionIntent` | 2 | 2 | |
| `shouldBlockAdditionalBooking` | 2 | 2 | Grupo B (BD) |
| **`trySoftRescheduleFromText`** | **2** | 1 | 1899, 2331 — +1 vs audit |
| `finalizeRescheduleAppointment` | 1 | 1 | selector interactivo |
| `parseTimeText` | 1 | 1 | |
| bloque `confirmText` | 1 sitio | 1 sitio | ~1539+; exact + phrase |
| bloque botones plantilla (#6) | 1 sitio (4 ramas) | 1 sitio | |
| `matchesComplaintIntent` | 1 | 1 | ~2357 — gate global con/sin carrito |
| `matchesThirdPartyBookingIntent` | 1 | 1 | |
| `newBookingOverlapsExisting` | 1 | 1 | Grupo B |
| `matchesSoftRescheduleIntent` | 0 | 0 | Solo en `booking-flow.ts` |
| `hasThirdPartyBookingSignals` / `hasSelfDateBookingIntent` | 0 | 0 | Solo internas de #11 |

**No confundir:** `#15`/`#16` tienen calls en dispatcher pero son **Grupo B**. La tabla de superficie mide riesgo operativo hoy; la de intents mide qué entra al JSON de Haiku.

---

## Tabla intent → handler (mapeo de enrutamiento)

Antes de diseñar el JSON: no las 44 son candidatas a Haiku.

- **Grupo A — clasifican texto libre** → sí compiten con Haiku.
- **Grupo B — no clasifican texto libre** → estado de BD, título de botón de plantilla, o anti-eco técnico. Se quedan determinísticos.

### Grupo A — clasifican texto libre (candidatas al schema Haiku)

| Intent propuesto (enum) | Funciones/regex que reemplaza | Handler destino (sin cambios) | Peligrosidad | Nota |
|---|---|---|---|---|
| `crear_cita` | `tryCompleteBookingFromText`, `parseTimeSlot`/`parseTimeText`, `parseDatetimeES` | `booking-flow.ts` → INSERT | 🔴 | 7 entradas en dispatcher (+ staff-resume) |
| `reprogramar_cita_soft` | `trySoftRescheduleFromText`, `matchesSoftRescheduleIntent`, `matchesDateCorrectionIntent`, `extractDateIntentFromText` | `finalizeRescheduleAppointment` → UPDATE | 🔴 | 4 funciones → 1 intent |
| `confirmar_cita_texto_libre` | Bloque `confirmText` (REMINDER_TEXT_CONFIRM) | Confirmación fija | 🔴 | Guard `wasAppointmentReminderRecentlySent` **se mantiene** |
| `reclamo_garantia` | `matchesComplaintIntent` | `COMPLAINT_MESSAGE` → staff | 🔴 | Bloquea `crear_cita` si hay ambigüedad |
| `cancelar_cita` | `matchesCancelCitaIntent` | `sendMiCitaMenu` | 🟠 | |
| `cerrar_acuerdo` | `matchesClosingAgreementIntent` | `CLOSING_AGREEMENT_ACK` | 🟠 | Tono PE ("ya") |
| `despedida_rechazo` | `isDeclineIntent` (+ NEG) | `clearCart` + despedida | 🟠 | Hoy tiene 4 exclusiones internas |
| `corregir_carrito` | `matchesCartCorrectionIntent` | Reset día/hora + opciones carrito | 🟠 | |
| `cambiar_servicio` | `matchesServiceChangeIntent` | Ya redirige a Haiku | 🟠 | Fácil de colapsar |
| `reservar_terceros` | `matchesThirdPartyBookingIntent` + **`isMostlyPartyIntent`** | Party in-bot (tope 2) / Haiku si mixto | 🟢 | Haiku-primero: puro → party; mixto → Haiku |
| `corregir_hora_cita_existente` | `matchesTimeCorrectionIntent`, `textImpliesExistingAppointment` | `sendPendingAppointmentContext` | 🟠 | |
| `consultar_mi_cita` | `matchesMiCitaIntent` | `sendMiCitaMenu` | 🟡 | |
| `navegar_agendar` | `matchesFirstMessageBookingIntent` | Fast-lane / categorías | 🟡 | |
| `consultar_horarios_disponibilidad` | `matchesHorariosAvailabilityQuery` | `consultar_horarios` | 🟡 | Haiku-primero si `!isMostlyHorariosAvailabilityQuestion` (Batch 2) |
| `ver_seleccion_carrito` | `matchesCartSelectionQuestion`, `matchesCartTotalQuestion`, `isMostlyCartInspectQuestion` | `WA_IDS.VER_SELECCION` | 🟡 | Haiku-primero si `!isMostlyCartInspectQuestion` (Batch 3). PR #129: `matchesCartSelectionQuestion` **no** exige `hasCart` en `menu-remap.ts` (sí lo exige `matchesCartTotalQuestion`) — pregunta mixta con carrito vacío también pasa por Haiku (antes caía a "Tu selección está vacía"). Mejora emergente del patrón, no bug; anotado por si aparece en prod |
| `navegar_promos` | `matchesPurePromosNavigationIntent` | `ver_promos` | 🟡 | |
| `navegar_promos_filtradas` | `matchesFilteredPromosIntent` | Suprime lista en `ai-assistant.ts` | 🟡 | Ya del lado Haiku |
| `remapeo_menu_generico` | Bloque inline #25 (~15 ramas) | `WA_IDS.*` | 🟡 | Haiku-primero si `!isMostlyAgendarNav` (Batch 4); taps/agendar puro siguen remap |
| `pregunta_precio_o_promo_mid_agenda` | `promoOrPriceQuestion` / `asksOwnCartPrice` | Resumen o Haiku | 🟡 | |
| `preguntar_horario_apertura` | `matchesOpenHoursQuestion` | `horariosText` | 🟢 | Haiku-primero mid-`awaiting_datetime` si `!isMostlyOpenHoursQuestion` (Batch 2) |
| `preguntar_ubicacion` | `matchesLocationQuestion`, `isMostlyLocationQuestion` | `ubicacionText` | 🟢 | Haiku-primero si `!isMostlyLocationQuestion` (Batch 3); tap `ubicacion` y LION “dirección de la sede” siguen Maps |
| `avisar_tardanza_texto_libre` | `matchesTardanzaIntent` | `sendTardanzaPolicy` | 🟢 | |
| `escape_o_corregir_identidad` | `isIdentityEscapeMessage`, `matchesAlreadyHaveDataIntent`, `looksLikeIdentityAttempt` | `AWAITING_CLIENT_IDENTITY` | 🟢 | |
| `saludo` | `SALUDOS`, `isSaludoExact`, `isSaludoPuro` | Bienvenida + menú | 🟢 | |
| `cancelar_flujo_generico` | `CANCEL_KEYWORDS` en `steps.ts` L116–141 | `clearCart` → `browsing` | 🟠 | Mismo patrón de deuda que #25 |
| `cierre_natural` | `matchesNaturalClosingIntent`, `hasRecentOutboundPendingPrompt` | Ack corto / no Haiku→932 | 🟢 | Guard Loren PR #20 |
| `opt_out` | rama `opt_out` en `detectAITrigger` | Mensaje de baja determinístico | 🟢 | STOP/baja 19-ago |
| `aceptar_cta_precio_foto` | `tryAcceptPendingPriceCta` | `add_to_cart` servicio cotizado | 🟡 | TTL sesión; Zandry 07-ago |
| `ctwa_interes` | step `awaiting_ctwa_interest` | Creativos segmentados Ext/Lift | 🟡 | Grupo B (taps); PR #58–#61 |

Varios grupos de 3–4 funciones colapsan en 1 intent — ahí está la ganancia de mantenibilidad.

### Grupo B — fuera del schema Haiku (quedan determinísticos)

| Función | Archivo | Por qué NO entra |
|---|---|---|
| `shouldBlockAdditionalBooking` | `pending-appointment.ts` | ¿Ya hay cita `scheduled`? — BD |
| `newBookingOverlapsExisting` | `pending-appointment.ts` | Solape de horarios — BD |
| `countOverlappingAppointments` | `handlers/agenda.ts` | Cupo de slot (`overlapCapForCart`: 1 default / 2 especial) — ver `docs/waba/WABA_CAPACITY.md` |
| `sessionHasCart` / `isSessionStale` | `booking-flow.ts` | Estado de sesión |
| `isReproInteractiveId` / `parseReproAppointmentId` | `pending-appointment.ts` | ID de botón interactivo |
| `detectRetouchTemplateButton` | `retouch-reengage.ts` | Título de botón de plantilla (3 valores fijos) |
| `detectLiftingCareReply` | `retouch-reengage.ts` | Respuesta a pregunta cerrada; universo acotado |
| Bloque `isConfirm` / `isNoShow` / `isReschedule` / `isLateArrival` | `dispatcher.ts` | `button.text` de plantilla WA |
| Echo (`isCategoryEcho` / …) | `dispatcher.ts` | Anti-spam Meta, no intención |
| `detectAITrigger` | `ai-assistant.ts` | **Desaparece**: con clasificación al inicio ya no existe "¿le paso esto a Haiku?" |

---

## Notas extra (Cursor)

1. **Numeración:** `#1–34` = inventario inicial por peligrosidad; `#35–39` = hallazgos del grep posterior; `#45–48` = sync 23-ago. El total operativo es **48 puntos**, no "39 renumerados".
2. **Modo sombra — qué loguear primero:** para cada inbound de texto libre, persistir `{ phone, wamid, regex_intent, haiku_intent, step, has_cart, agreement: bool }` sin ejecutar la rama Haiku. Empezar midiendo solo `crear_cita` | `reclamo_garantia` | `reprogramar_cita_soft` | `confirmar_cita_texto_libre` | `otro` — cinco valores bastan para validar el patrón Lili/PR#30 antes de expandir el enum.
2b. **Prioridad regex en el espejo ≠ orden exacto del dispatcher:** el espejo usa confirm → reclamo → soft → crear; el bot real evalúa soft (solo sin carrito) **antes** que reclamo. Keywords casi disjuntas → overlap raro; si salen filas raras `reclamo_garantia` vs `reprogramar_cita_soft` en `waba_intent_shadow_log`, mirar `computeRegexShadowIntent` antes de culpar a Haiku. No vale la pena reordenar el piloto por esto.
2c. **Fix 20-ago (PR #47): el espejo de `reprogramar_cita_soft` exige cita pendiente real.** `computeRegexShadowIntent` etiquetaba `reprogramar_cita_soft` solo con `matchesSoftRescheduleIntent` + guard de carrito, sin verificar `getPendingAppointmentsForPhone` — a diferencia de `trySoftRescheduleFromText` en producción, que exige `pending.length === 1`. Clientas agendando por PRIMERA vez con hora suelta quedaban mal etiquetadas (caso Milagros Alcántara, 15-ago), contaminando la métrica de acuerdo vs Haiku sin riesgo real en producción (el bot real sí gateaba bien). `computeRegexShadowIntent` es ahora `async` (consulta BD antes de retornar `reprogramar_cita_soft`).
3. **`detectLiftingCareReply` borderline:** es texto libre, pero cerrado. En producción = Grupo B. Opcional en sombra como métrica secundaria (no en el enum de routing).
4. **Costo/latencia:** clasificación Haiku al inicio de *todo* mensaje libre ≠ el costo actual (Haiku solo vía `detectAITrigger`). El piloto sombra debe reportar tasa de acuerdo **y** tokens/latency p50/p95 antes de decidir cutover.
5. **Handlers no se reescriben:** el JSON solo elige *qué* handler corre; reglas de negocio (feriados, cupo, domingo 20%, `insertAppointmentChecked`) siguen 100% determinísticas — alineado con `ROADMAP.md`.
6. **Producto pendiente (no es regex):** política de garantía (¿retoque gratis? ¿ventana?) — hoy `reclamo_garantia` solo deriva al 932. Sin regla de negocio, Haiku clasifica bien pero el handler sigue siendo "pasar a staff".
7. **Modo sombra — alcance del hook:** `runIntentShadowLog` solo en `browsing` / `awaiting_datetime` (`dispatcher.ts` ~1340). **No** cubre `awaiting_ctwa_interest`, `awaiting_payment_screenshot`, identidad, etc. — acuerdo medido es subconjunto del tráfico total.
8. **Espejo regex `crear_cita`:** `wouldTryCompleteBookingFromText` en `intent-shadow.ts` predice si `tryCompleteBookingFromText` devolvería true; en tráfico real el regex del piloto casi nunca etiqueta `crear_cita` (cae en `otro`), mientras Haiku sí lo hace ~33 veces — el desacuerdo principal del piloto.

---

## Actualización 23-ago-2026 — fixes post-audit + estado piloto sombra

### Fixes de producción que cambian el mapa (desde 05-ago)

| Fecha | Fix | Impacto en auditoría |
|---|---|---|
| 05-ago | [P1] `matchesComplaintIntent` **antes** de Haiku y booking, con o sin carrito | Cierra el hueco Lili (Haiku `add_to_cart` sobre reclamo). #7 ya no es solo gate interno del carrito |
| 05-ago | Plurales en `matchesComplaintIntent` + regla anti-`add_to_cart` en `haiku-prompt.ts` | Keywords #7 más robustas |
| 06-ago | `phraseConfirm` en REMINDER_TEXT_CONFIRM (Pilar) | #5 ampliado; espejo sombra alineado |
| 14-ago | Piloto sombra en prod + skip QA/CTWA + QA `yarn waba:validate:intent-shadow` | Ver § Siguiente paso (pasos 1–3 ✅) |
| 14-ago | Coalesce burst, cierre natural Loren (`hasRecentOutboundPendingPrompt`) | #45 nuevo |
| 19-ago | `matchesTimeCorrectionIntent` + `era/iba a ser`; STOP/baja (`opt_out`) | #14, #46 |
| 20-ago | Espejo `reprogramar_cita_soft` exige 1 cita `scheduled` (PR #47, Milagros) | Nota 2c ✅ |
| 07-ago | `pending_price_cta_*` + `tryAcceptPendingPriceCta` ("Si" post-foto) | #47 nuevo |
| 21-jul | `insertAppointmentChecked` — no "cita confirmada" sin fila | Handler 🔴 más seguro (no es intent) |
| 23-ago | Step `awaiting_ctwa_interest` (PR #58–#61) | #48; fuera del hook sombra |

### Métricas piloto sombra (tráfico real, sin QA `51999000%`)

| Ventana | Filas | Acuerdo regex=Haiku |
|---|---:|---:|
| Últimos 7 días | 61 | **88.5%** |
| Últimas 48 h | 20 | **85.0%** |
| Desde 20-ago (post PR #47) | — | **80%** |
| Histórico total | 187 | **74.9%** (inflado por QA/CTWA temprano) |

**Costo/latencia (7d):** p50 ~673 ms, p95 ~924 ms, ~579 in / 14 out tokens por clasificación.

**Desacuerdo dominante (7d, 7 filas):** Haiku más agresivo que regex — `confirmar_cita_texto_libre` (4), `crear_cita` (2), `reclamo_garantia` (1). Auditoría manual 28-ago: **prod correcto en 7/7**; cutover por Haiku habría empeorado routing (falsos confirmar/llegada, reprogramar como crear, reclamo en asesoría).

**Intents críticos con muestra chica:** `reclamo_garantia` (2 real), `reprogramar_cita_soft` (1 real) — insuficiente para cutover de esos handlers.

---

## Actualización 28-ago-2026 — auditoría manual + refactor #25

### Cambios en código

| Cambio | Archivo | Notas |
|---|---|---|
| Prompt sombra anti falso positivo | `lib/intent-shadow.ts` | Reglas + 7 ejemplos reales (Patricia, Edith, Mell); solo afecta `waba_intent_shadow_log` |
| Extracción bloque #25 | `handlers/menu-remap.ts` | `remapMenuTextUserInput`, `isDeclineIntent`, `isShortAffirmativeText`; dispatcher sin cambio de comportamiento |
| QA unit remapeo | `scripts/waba-validate-menu-remap.ts` | `yarn waba:validate:menu-remap` — incluye los 7 mensajes auditados como `no_match` |
| QA sombra ampliado | `scripts/waba-validate-intent-shadow.ts` | 7 casos audit → espejo regex `otro` + check prompt 28-ago |

### Veredicto auditoría (7 desacuerdos, ventana 7d)

| Caso | Haiku | Prod | Ganador routing |
|---|---|---|---|
| Patricia — ¿turno 4pm? | `confirmar_cita` | Sin cita en BD | regex `otro` |
| Patricia — me confirmas | `confirmar_cita` | Pregunta, no afirmación | regex `otro` |
| Patricia — hoy 4pm pestañas | `crear_cita` | Flujo extensiones OK | empate (Haiku conv. ya resolvió) |
| Edith — podrá 5pm | `crear_cita` | Mi cita → reprogramó 5:30 | regex `otro` (era `reprogramar`) |
| Edith — uñas quebradizas | `reclamo` | Recomendación servicio | regex `otro` |
| Mell — 2 min / ya llegué | `confirmar_cita` | Bienvenida en local | regex `otro` |

**Decisión:** mantener arquitectura híbrida (regex + guards + Haiku conversacional). Piloto sombra sigue como termómetro; **cutover parcial no recomendado** con evidencia actual.

---

## Siguiente paso sugerido

1. ~~Fijar el **schema JSON mínimo** (5 intents 🔴 + `remapeo_menu_generico` + `otro`).~~ → piloto 5 intents en código (`lib/intent-shadow.ts`).
2. ~~Implementar **modo sombra** (log paralelo, cero cambio de comportamiento).~~ → tabla `waba_intent_shadow_log` + hook fire-and-forget en `dispatcher.ts`.
3. ~~Endurecer piloto (14-ago):~~ skip Haiku en teléfonos QA + copy CTWA/boilerplate (`shouldSkipIntentShadow`); prompt con ejemplos anti-`crear_cita` en prefill; QA unit `yarn waba:validate:intent-shadow`.
4. ~~Auditar manualmente desacuerdos recientes~~ — **cerrado 28-ago** (7/7 casos; ver tabla arriba). Prompt sombra endurecido con ejemplos negativos.
5. ~~Extraer bloque #25 a módulo testeable~~ — **cerrado 28-ago** (`menu-remap.ts` + `yarn waba:validate:menu-remap`).
6. ❌ **Cutover parcial** (Haiku como router de intents 🔴 o remapeo #25) — **no iniciado / no recomendado** con evidencia 28-ago. Reevaluar solo si regresan bugs tipo Lili con 2+ casos/ventana o política de garantía definida. Ver `ROADMAP.md` § Evaluación de arquitectura.

```sql
-- Monitoreo rápido (dev/owner vía SQL) — excluir QA
SELECT regex_intent, haiku_intent, agree, count(*)
FROM waba_intent_shadow_log
WHERE created_at > now() - interval '48 hours'
  AND haiku_intent IS NOT NULL
  AND regexp_replace(coalesce(phone,''),'\D','','g') NOT LIKE '51999000%'
GROUP BY 1, 2, 3
ORDER BY 4 DESC;

-- Resumen acuerdo 7d
SELECT
  count(*) AS n,
  round(100.0 * count(*) FILTER (WHERE agree) / NULLIF(count(*), 0), 1) AS pct_acuerdo,
  round(avg(haiku_latency_ms)) AS avg_ms,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY haiku_latency_ms)) AS p95_ms
FROM waba_intent_shadow_log
WHERE created_at > now() - interval '7 days'
  AND haiku_intent IS NOT NULL
  AND regexp_replace(coalesce(phone,''),'\D','','g') NOT LIKE '51999000%';
```
