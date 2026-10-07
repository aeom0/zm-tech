# Análisis de calidad WABA

Reportes interdiarios (~48 h) de conversaciones WhatsApp → patrones donde el bot/Haiku no guía bien a agendar.

## Archivos vivos

| Archivo                                                | Rol                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[LECCIONES.md](./LECCIONES.md)**                     | Catálogo consolidado de patrones **cerrados** (may–ago 2026) + pendientes de producto/observación. Leer siempre antes de marcar reincidencia.                                                                                                                                                                                                                                                                                                                          |
| **[2026-10-06-analysis.md](./2026-10-06-analysis.md)** | Último reporte vivo (4-oct 10:05 → 5-oct 19:46 Lima). **27 clientas, 1 cita vía bot (`…4991`)**. [P1] Botón "Agendar" de retoque con servicio inactivo (`Pedicure Clásico`) → "tu servicio" + carrito vacío. [P2] Pack de 2 personas: "Hola" como nombre y re-pregunta del acompañante pegada a respuestas ajenas. Revisión Alberto: nudge ads-bounce con copy de pestañas a clientas de uñas. |
| Este README                                            | Política de retención + enlaces                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Retención (obligatoria)

1. **Máximo 1 reporte vivo** (`YYYY-MM-DD-analysis.md`).
2. Al generar uno nuevo:
   - Mover hallazgos **cerrados / no reincidencias** a `LECCIONES.md` (una fila o nota corta).
   - Borrar el reporte anterior.
   - Actualizar este README y los punteros en `docs/INDEX.md` + `.cursor/rules/waba-seguimiento.mdc`.
3. **No** acumular 20+ markdowns históricos: el valor queda en lecciones + código/QA.

## Cómo correr la rutina

Prompt completo: [`docs/waba/prompts/rutina-waba-analysis.md`](../../../prompts/rutina-waba-analysis.md).

Contexto producto: [`directrices-haiku.md`](../directrices-haiku.md) · abono S/25 / 20% domingo: [`ROADMAP.md`](../../../../../../../ROADMAP.md) § Horarios y pago.  
QA post-fix: [`WABA_SIMULATION_VALIDATION.md`](../../../WABA_SIMULATION_VALIDATION.md) (`:fixed-deposit`, `:payment-verification`, `:datetime-cupo`, `:price-list-bullets`, `:pack-confirm`, `:haiku-first-informational`).

## Capas de monitoreo (02-ago — no confundir con bugs de Haiku)

| Capa                    | Qué hace                                                                                                         | Habla a la clienta? |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------- |
| **silence-watchdog**    | Último msg = inbound sin respuesta 5–12 min → Haiku                                                              | Sí (24/7)           |
| **chat-quality-review** | Cron `*/15` audita hilos activos (precio / carrito ≠ pedido / promo / confundida) → push **Revisar YA · nombre** | **No** — solo staff |
| **wa_error_log → push** | Excepción / `missing_from_phone` / skip lock                                                                     | No                  |

Si en el período hay push “Revisar YA”, **cruzar** con el hilo: el push confirma que el auditor vio el problema; el fallo de producto sigue siendo el patrón en `wa_messages` (no reportar el push como bug).

## Estado 2026-09-27 (ventana 25-sep → 27-sep)

> **Ventana 25-sep 06:17 → 27-sep 06:17 Lima**: 53 hilos de salón (grueso de tráfico CTWA Set-Oct), **0 citas vía bot WABA**, 1 vía app/manual con hilo activo (Pamela `…1070`, sin relación a fallo), 9 near-conversions con carrito activo o handoff a asesora pendiente. **9 commits mergeados en `supabase/functions/` dentro de la ventana**, todos el 26-sep entre 06:48 y 19:49 Lima: `b5b7c83` (P1/P2 del reporte 25-sep), `1fc7826` (Carmen retoque), `26cb55e`/`14142fb` (Maribel cupo falso), `8b3c032` (Angelly voucher ack), `7ec64f0` (Romy "no quiero"), `33a1085` (derivar a asesora personalizada), `64d6740`/`3b5040c` (pagos/catálogo, no conversacionales). `wa_error_log`: 2 filas (1 lock skip recuperado solo, 1 error de descarga de imagen de Meta en un status de entrega).

| Hallazgo | Estado |
| -------- | ------ |
| **[P1] Sesión `awaiting_payment_screenshot` no se resetea tras cita manual** (reporte 25-sep) | 🟢 **fix aplicado, sin reincidencia** — migración `20260926115138` |
| **[P2] "Estaré ahí a las X" matchea como corrección de hora** (reporte 25-sep) | 🟢 **fix aplicado** (`b5b7c83`) — **variante nueva por ruta distinta** encontrada en Maribel `…6295` (`trySoftRescheduleFromText`), también cerrada el mismo día (`26cb55e`/`14142fb`); hilo de la muestra es evidencia pre-fix |
| **"No quiero mirada triste" → despedida prematura** (Romy `PE.…9719`) | 🟢 **cerrado el mismo día** (`7ec64f0`, 7 min después del hilo) |
| **[P1] Foto/CTA de portafolio no coincide con servicio cotizado** (Ivonne `…1911`, Naila `PE.…4104`, K.made `…6651`) | 🟢 **fix en código el 27-sep** — la línea con S/ gana sobre el pie de efecto; `Clásicas/Rímel` encuentra el retoque del catálogo. Unit `yarn waba:validate:portfolio-cta-match`. Chat real pendiente |
| Angelly `…7854` — reprogramación sin botones visibles | 🟡 **observación sin causa raíz confirmada** — requiere reproducir en vivo |
| Bounce CTWA de un solo toque | 49% (26/53) — dentro del rango histórico (25–62%) |

## Estado 2026-09-25 (ventana 23-sep → 25-sep)

> **Ventana 23-sep 06:15 → 25-sep 06:15 Lima**: 16 hilos de salón, **1 cita vía bot WABA** (Angelly `…7854`, Lifting+Depil+Lamina, abono S/25 fijo), 3 vía app/manual con hilo activo (Edith `…7323`, Nélida `…6566`, Estrella `…6469`). **3 commits mergeados en `supabase/functions/` dentro de la ventana**: `26d2c87` (PR #143, 23-sep 15:23 Lima) y `e38c05b`/`23e9615` (multi-cita/terceros in-bot, 24-sep 18:24/18:36 Lima). `wa_error_log`: 0 filas.

| Hallazgo | Estado |
| -------- | ------ |
| **[P1] `appointment_verifications` no se inserta** (reporte 23-sep) | 🟢 **fix confirmado en código** (PR #143) — chequeo de error + `wa_error_log` + aviso a staff; única verificación de la ventana insertó sin error |
| **[P2] Doble dispatch Haiku CTWA + follow-up rápido** (reporte 23-sep) | 🟢 **fix confirmado en código, sin reincidencia en la muestra** (PR #143) — taps interactivos también esperan turno de dispatch |
| **Hora puntual cuelga el chat** (Valeria `…9022`) | 🟢 **evidencia pre-fix confirmada** (PR #143, deploy 23-sep 15:23 Lima, hilo 10:36 Lima el mismo día) |
| **[P1 nuevo] Sesión `awaiting_payment_screenshot` no se resetea tras cita manual** (Estrella `…6469`) | 🟢 **cerrado 26-sep** — migración `20260926115138` |
| **[P2 nuevo] "Estaré ahí a las X" matchea como corrección de hora** (Nélida `…6566`) | 🟢 **cerrado 26-sep** — causa real en `trySoftRescheduleFromText`; ver corrección en el reporte |
| Carmen `…6325` (retoque: "oferta venció" + "autocorrección" 3 min después) | 🟢 **cerrado 26-sep** — el 2.º mensaje era staff (`panel`); copy `expired` corregido |
| Party-booking / multi-cita in-bot (`e38c05b`) | ⚪ **sin tráfico en la ventana** que ejerza el flujo — vigilar próxima ventana |
| Bounce CTWA de un solo toque | 57% (4/7 con `from_ad_at` fresco) — dentro del rango histórico (25–62%) |

## Estado 2026-09-23 (ventana 21-sep → 23-sep)

> **Ventana 21-sep 06:22 → 23-sep 06:22 Lima**: 19 hilos de salón, **2 citas vía bot WABA** (Sofía `…8962` retoque sin abono por historial; Brenda `PE.…1068` retiro S/20 pago completo), 0 vía app/manual en la muestra. **4 commits mergeados en `supabase/functions/` dentro de la ventana**; el único con evidencia directa de esta muestra es `010b240` (PR #141, "hoy" vs día explícito + doble respuesta) — el hilo de Maribel `…6295` que lo motivó cae dentro de esta ventana pero es evidencia **pre-fix** (merge horas después). `wa_error_log`: 1 fila, teléfono QA.

| Hallazgo | Estado |
| -------- | ------ |
| **[P1] `appointment_verifications` no se inserta** (Brenda `PE.…1068`) | 🔴 **nuevo, HIGH** — estructural: 0 filas en la tabla desde 2026-08-19 (>1 mes), no solo esta ventana. `payment.ts:1200-1220` sin chequeo de error en el insert. Auditoría manual de pagos recomendada. |
| **[P2] Doble dispatch Haiku CTWA + follow-up rápido** (`…5482`, `…4575`, `…8203`, variante `…3450`) | 🟡 **reincidencia, variante nueva** — no cubierta por PR #141 (ese fix ataca un redespacho del mismo texto ya respondido; aquí son 2 llamadas `free_question` genuinamente distintas). Requiere logs en vivo, no solo lectura de código. |
| **PR #141** ("hoy" vs día explícito + doble respuesta, Maribel `…6295`) | 🟢 **fix confirmado** — el hilo que lo motivó es evidencia pre-fix, sin reincidencia del síntoma original |
| `chat_quality_review` — alto índice de alerta | 🔴 **100%** (19/19 hilos) — 3.ª+ ventana consecutiva en 100% |
| Bounce CTWA de un solo toque | 31% (4/13 con `from_ad_at` fresco) — dentro del rango histórico (25–62%) |

## Estado 2026-09-21 (ventana 19-sep → 21-sep)

> **Ventana 19-sep 06:15 → 21-sep 06:15 Lima**: 14 hilos de salón, **0 citas vía bot ni vía app/manual** (0 filas en `appointments` y en `appointment_verifications` en toda la ventana) — ventana en cero total de conversión, volumen normal de conversaciones. **5 commits mergeados en `supabase/functions/` dentro de la ventana**; el único con evidencia directa de esta muestra es `62f5e45` (serializa dispatch Haiku por teléfono — el hilo de Cami `…6725` es la evidencia pre-fix). `wa_error_log`: 0 filas.

| Hallazgo | Estado |
| -------- | ------ |
| **[P2] Honorífico duplicado "Srta.," / [P3] oferta portafolio** (PR #137, 19-sep) | 🟢 **sin reincidencia** |
| **Corte de facturación `#131042`** | 🟢 **confirmado cerrado** — 0 filas nuevas |
| **Cami `…6725`** (ráfaga → dispatch paralelo) | 🟢 **evidencia pre-fix confirmada** — hilo anterior al deploy `62f5e45` el mismo día |
| **Haiku sin respuesta a copy Set-Oct** (`…7952`) | 🟡 **observación nueva, 1×** — cayó al fallback diseñado, sin fila en `ai_usage_log`/`wa_error_log`; coincide con pendiente ya trackeado en `.cursor/rules/waba-seguimiento.mdc` |
| **`from_ad_at` no marcado con copy reconocible** (`PE.…0027` Rocío) | 🟡 **observación nueva, 1×** — conversación funcionó bien, solo afecta atribución/métricas |
| `chat_quality_review` — alto índice de alerta | 🔴 **100%** (14/14 hilos), 0 con hallazgo real de producto detrás — empeora vs 67% (19-sep) |
| Bounce CTWA de un solo toque | 🟡 45% (5/11 con `from_ad_at`) — sube desde 22%, dentro del rango histórico (25–62%) |

## Estado 2026-09-17 (ventana 15-sep → 17-sep)

> **Ventana 15-sep 06:10 → 17-sep 06:10 Lima**: 19 hilos de salón, todos con `from_ad_at` (CTWA), **0 citas vía bot** (1 cita creada, `source=manual`, Yelitza `…1186` — staff rescató un booking-flow bug de capacidad/parseo de fecha, ya corregido el mismo día por `36ec857`, ~50 min después del hilo) — racha consecutiva en cero se mantiene. 23 commits mergeados en `supabase/functions/` dentro de la ventana; el único con evidencia directa de esta muestra es `36ec857` (Yelitza). `wa_error_log`: 0 crashes — solo 2 filas de billing Meta (`#131042`, ver Necesita Revisión).

| Hallazgo                                                           | Estado                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1] Ubicación mid-abono** (Cielo, PR #119)                      | 🟢 **se mantiene cerrado** — sin sesiones de abono en esta ventana                                                                                |
| **Lead sin reenganche** (`…9921`, reporte 15-sep)                  | ⚪ **sin tráfico equivalente** — movido a LECCIONES § Pendiente producto                                                                          |
| **Yelitza `…1186`** (cupo sábado fantasma + "en la mañana"→jueves) | 🟢 **evidencia pre-fix, cerrada el mismo día** (`36ec857`)                                                                                        |
| **Jerita `PE.…8523`** (laberinto de listas vía taps, reincidencia) | 🟡 **observación, 1×** — mismo teléfono del caso histórico citado en directrices, mecanismo distinto (taps, no texto); staff resolvió manualmente |
| **Billing WhatsApp Business `#131042`**                            | 🔴 **urgente, no-código** — revisar Meta Business Manager                                                                                         |
| `chat_quality_review` — posible falso-positivo alto                | 🟡 **continúa** — ~95% de hilos marcados (18/19), 0 con error real de producto confirmado al auditar a mano                                       |
| Bounce CTWA de un solo toque                                       | 53% (10/19) — dentro del rango histórico (25–62%)                                                                                                 |

## Estado 2026-09-15 (ventana 13-sep → 15-sep)

> **Ventana 13-sep 06:04 → 15-sep 06:04 Lima**: **1 hilo de salón real** (`…9921`) + 1 broadcast B2B ajeno excluido (`…2821`, spam/número equivocado, bot correctamente pausado desde 15-ago) — volumen atípicamente bajo vs 10-26 hilos de ventanas previas, sin evidencia de causa técnica (`wa_error_log`: 0 filas). **0 citas vía bot** (1 cita creada en el período, `source=manual`, sin relación telefónica con la muestra) — racha consecutiva en cero se mantiene. **4 commits mergeados en `supabase/functions/` dentro de la ventana** (`e31314d` 13-sep 19:13 UTC — ya reflejado como cerrado en el reporte anterior; `901a56b`/`6ccfa26` Haiku-primero informativo Batch 1–2; `8a94528` docs) — sin tráfico de esta muestra para confirmarlos o refutarlos.

| Hallazgo                                                        | Estado                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1] Ubicación mid-abono** (reporte 13-sep, Cielo `PE.…5683`) | 🟢 **se mantiene cerrado** — `e31314d`/PR #119 confirmado en HEAD, sin sesiones de abono en esta ventana para re-ejercerlo                                                |
| **Lead con intención explícita sin reenganche** (`…9921`)       | 🟡 **observación nueva, 1×** — `browse-reengage` decidió `should_send=false` tras pregunta abierta sin respuesta; no es bug de código confirmado, vigilar próxima ventana |
| Bounce CTWA de un solo toque                                    | Sin datos — 0 leads CTWA en la muestra                                                                                                                                    |

## Estado 2026-09-13 (ventana 11-sep → 13-sep)

> **Ventana 11-sep 06:05 → 13-sep 06:05 Lima**: 15 hilos de salón, **0 citas vía bot** (1 cita creada en el período, `source=manual`, sin relación telefónica con la muestra) — racha consecutiva en cero se mantiene. **4 commits mergeados en `supabase/functions/` dentro de la ventana** (`57a95a9`, `97dfd6a` 11-sep 21:33/21:44 Lima; `be83fcf`, `19d4bb3` 12-sep 13:13/17:11 Lima) — todos confirmados con evidencia directa de esta muestra o de la anterior, ninguno reabre un hallazgo previo. `wa_error_log`: 0 filas. `appointment_verifications`: 0 filas.

| Hallazgo                                                                                               | Estado                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1] Nudges ignoran `bot_paused_at`** (reporte 11-sep)                                               | 🟢 **cerrado 11-sep** — causa real distinta (fail-open ante 504 de PostgREST, no falta de filtro), corregido a fail-closed (`57a95a9`, PR #113)                   |
| **[P2] `browse_reengage` re-evalúa en loop** (reporte 11-sep)                                          | 🟢 **cerrado y confirmado con datos** — `97dfd6a` (PR #114); llamadas bajaron de 124 (3 sesiones concentrando 115) a 14 totales (máx. 4/teléfono) en esta ventana |
| **Copy `cart-nudge` "falta el día" con el día ya elegido** (Doris `…8088`)                             | 🟢 **evidencia pre-fix, cerrado same-day** — `19d4bb3` (12-sep 17:11 Lima), incidente 15:30 Lima el mismo día                                                     |
| **Portafolio sin imagen al cotizar efecto en texto libre** (Mirian `…1781`)                            | 🟢 **evidencia pre-fix, cerrado same-day** — `19d4bb3` (12-sep 17:11 Lima), incidente 10:17 Lima el mismo día                                                     |
| **[P1] nuevo: ubicación mid-`awaiting_deposit_datos` no retoma el pedido de datos** (Cielo `PE.…5683`) | 🔴 **nuevo, sin fix** — 1.ª ocurrencia, `steps.ts:205-225`; Quick Win propuesto, sin aplicar                                                                      |
| Bounce CTWA de un solo toque                                                                           | 🟡 33% (5/15) — dentro del rango histórico (25–62%)                                                                                                               |

## Estado 2026-09-11 (ventana 09-sep → 11-sep)

> **Ventana 09-sep 06:15 → 11-sep 06:15 Lima**: 23 hilos de salón, **0 citas vía bot** (5 citas creadas en el período, todas `source=manual`, ningún teléfono coincide con la muestra) — racha consecutiva en cero se mantiene. **4 commits mergeados en `supabase/functions/` dentro de la ventana** (`cdfacb6` 09-sep 12:41 Lima, `f9e660f` 09-sep 21:13 Lima, `ec4fdb4`+`8dbbf23` 10-sep 18:51/20:48 Lima) — los 4 fixes están **motivados por hilos de esta misma muestra** y confirmados pre/post-fix con evidencia directa (ver LECCIONES). `wa_error_log`: 0 filas.

| Hallazgo                                                                                                 | Estado                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fecha NL `hoy` / mes→día / "N o N"** (LYM `…5765`, María `…6497`)                                      | 🟢 **evidencia pre-fix confirmada** — ambos hilos anteriores a `ec4fdb4`/`8dbbf23` (10-sep tarde/noche); LYM incluyó "hoy es domingo" falso + traspaso a staff que tampoco cerró la venta |
| **CTWA lista inicial** (`f9e660f`)                                                                       | 🟢 **confirmado en tráfico real, 100% de consistencia** — 13/13 hilos pre-deploy con lista, 7/7 post-deploy solo texto                                                                    |
| **[P1] Nudges (`cart-nudge`/`browse-reengage`) ignoran `bot_paused_at`** (María `…6497`, Sayuri `…5474`) | 🔴 **nuevo, sin fix** — `ads-bounce-nudge` ya filtra por `bot_paused_at`, los otros 2 crons no; Quick Win propuesto                                                                       |
| **[P2] `browse_reengage` re-evalúa sesión stale en loop** (~15 min, 3 sesiones con 35-43 llamadas c/u)   | 🟡 **reincidencia a mayor escala** de "Vigilar" 15→17-ago (antes 3×, ahora 35-43×) — costo Haiku, sin spam visible a clienta                                                              |
| Honorativo duplicado / curso-lead / domingo 20% (`cdfacb6`)                                              | 🟢 **sin reincidencia**, código verificado en HEAD                                                                                                                                        |
| "la 3D" SLOT_TAKEN fantasma (Sayuri)                                                                     | 🟢 **misma evidencia pre-fix ya consolidada 09-sep**, no una ocurrencia nueva                                                                                                             |
| `bot_paused_at` sin gatillo visible de imagen de clienta (Danae, María, Sayuri)                          | ⚪ **sin causa raíz confirmada** — Necesita Revisión de Alberto                                                                                                                           |

## Estado 2026-09-09 (ventana 07-sep → 09-sep)

> **Ventana 07-sep 06:05 → 09-sep 06:05 Lima**: 11 hilos de salón, **0 citas vía bot** (6 citas creadas en el período, todas `source=manual`; solo 1 teléfono coincide con la muestra — Sofia `…8962`) — racha consecutiva en cero se mantiene. **1 commit mergeado en `supabase/functions/` dentro de la ventana** (`ec86e8a`, 08-sep 22:34 Lima 17:34 — corrige copy del push `skip_dispatch_lock_exhausted`; la única fila de ese tipo en la muestra es ~40 min anterior al deploy).

| Hallazgo                                                                                  | Estado                                                                             |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **[P1] Honorativo duplicado "Srta. X, ..., Srta. X"** (Luciana `…3400`, Vania `PE.…8129`) | 🟢 **cerrado 09-sep** — `client-address.ts` dedupe mid-frase                       |
| **[P2] Mensaje contradictorio "reservado" + "confirmado"** (Sofia `…8962`)                | 🟢 **cerrado 09-sep** — `wasSlotTakenRecentlySent` salta Haiku 45s                 |
| **[P1] Lead de curso: `raw.length >= 6`** (07-sep)                                        | 🟢 **cerrado 09-sep** — `looksLikeCursoLeadData`                                   |
| **[P1] Aviso "Domingo — solo 20%" ignora historial** (04-sep)                             | 🟢 **cerrado 09-sep** — copy neutro si `clientRequiresFixedDeposit`                |
| **"la 3D" → SLOT_TAKEN fantasma** (Sayuri …5474, post-ventana)                            | 🟢 **cerrado 09-sep** — `(?!\w)` en `parse-datetime-es.ts`                         |
| **[P3] 2.º turno repite duración salón** (Luz …6235)                                      | 🟢 **cerrado 09-sep** — prompt: retención sin reañadir minutos                     |
| Bounce CTWA de un solo toque                                                              | 🟢 0% (0/11) — mejor que el rango histórico (25–62%), pero 0/11 cerró cita vía bot |

## Estado 2026-09-05 (ventana 03-sep → 05-sep)

> **Ventana 03-sep 06:07 → 05-sep 06:07 Lima**: 12 hilos de salón, **0 citas vía bot** (3 citas creadas, todas `source=manual`, ningún teléfono coincide con la muestra) — 11.ª+ ventana consecutiva en cero. **7 commits mergeados en `supabase/functions/` dentro de la ventana**, incluidos 3 fixes "Jessi" (#96–#98) y 1 fix "Cindy" (`a6c1b25`, #100) cuyos hilos de origen reaparecen en esta muestra como evidencia pre-fix.

| Hallazgo                                                                               | Estado                                                                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **[P1] Aviso "Domingo — solo 20%" ignora historial `completed`** (Estrella `PE.…5896`) | 🔴 **nuevo, sin fix** — `agenda.ts:651-658` no distingue nueva vs con historial antes de nombrar "20%"; Quick Win propuesto |
| **Tap svc/pack lista vieja + conflicto categoría mid-agenda** (Jessi …6106)            | 🟢 **evidencia pre-fix confirmada** — mismo hilo consolidado 04-sep (#96/#97), deploy horas después                         |
| **Efectos Rímel/ojo de gato + diseños mid-técnica** (Cindy …8039)                      | 🟢 **evidencia pre-fix confirmada** — mismo hilo citado en `a6c1b25` ("QA Cindy"), deploy ~4h después                       |
| `chat-quality-review` — posible falso-positivo alto                                    | 🔴 **9.ª+ ventana consecutiva** — 9/12 hilos, 0 con error real de producto al auditar a mano                                |
| Bounce CTWA de un solo toque                                                           | 🟡 25% (3/12) — extremo bajo del rango histórico, coincide con baseline post-`awaiting_ctwa_interest`                       |

## Estado 2026-09-01 (ventana 30-ago → 01-sep)

> **Ventana 30-ago 08:20 → 01-sep 08:20 Lima**: 13 hilos de salón, **0 citas vía bot** (1 cita creada, `source=manual`, teléfono fuera de la muestra) — 8.ª ventana consecutiva en cero. **0 commits mergeados en `supabase/functions/` dentro de la ventana.**

| Hallazgo                                                                                    | Estado                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fecha por solo nombre de día ("Domingo") no parsea en `awaiting_datetime`** (`PE.…8419`)  | 🟢 **causa raíz confirmada, 1.ª ocurrencia** — `parse-datetime-es.ts`/`booking-flow.ts` solo reconocen día de semana con prefijo "el/este/próximo" o con número; Quick Win propuesto, sin aplicar |
| **[P1] `from_ad_at` — "Mirada Espectacular" ausente de `isKnownCtwaCampaignCopy`** (31-ago) | 🔴 **sigue sin aplicar** — sin nueva ocurrencia esta ventana (los 9 leads CTWA trajeron `referral`), pero el gap de código persiste                                                               |
| `chat-quality-review` — posible falso-positivo alto                                         | 🔴 **7.ª ventana consecutiva, 100%** (13/13 hilos, incluida 1 confirmación de recordatorio sin ambigüedad)                                                                                        |
| Confirmación de recordatorio (Mónica)                                                       | 🟢 correcta, sin fallos                                                                                                                                                                           |
| Reenganche de retoque declinado (María)                                                     | 🟢 correcto, sin fricción                                                                                                                                                                         |
| Asesoría con foto → traspaso a staff (Violeta)                                              | 🟢 funcionando como se diseñó                                                                                                                                                                     |
| Bounce CTWA de un solo toque                                                                | 🟡 **sube a 67%** (6/9 con referral) — extremo alto del rango histórico (25–62%), muestra chica                                                                                                   |

## Estado post 2026-07-21 → 27 (Cursor + Alberto)

Ver historial en commits / LECCIONES. Resumen: cita fantasma, Haiku burst, historial stale, REENGAGE_SPAM browse↔ads-bounce, Confirmo cita, TZ retoque, CE identidad — todos ✅.

## Estado post 2026-07-29 / 31 → 02-ago

| Hallazgo                                                    | Estado                                               |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| Producto Patricia mid-repro + debounce tardanza (`fc19b63`) | ✅ LECCIONES                                         |
| LOCK_DROP_SILENCE log + TARDANZA_RACE claim atómico         | ✅ 31-jul                                            |
| LOCK_ORPHAN advisory → phone-lock por fila (`a9efb10`)      | ✅ 02-ago (Eli …1033)                                |
| [P1] BROWSE_MIDFUNNEL_FALSE_POS (Patricia …9451)            | ✅ 01-ago                                            |
| P0 `from_user_id` + push `wa_error_log`                     | ✅ 02-ago                                            |
| P1 `chat-quality-review` (Eli precio / Yoja carrito+promo)  | ✅ monitoreo; **producto carrito/promo aún abierto** |
| Volumen bajo                                                | 🟡 Observación                                       |

Última consolidación de carpeta: **2026-08-31** (vivo).

## Estado 2026-08-31 (ventana 29-ago → 31-ago)

> **Ventana 29-ago 08:08 → 31-ago 08:08 Lima**: 10 hilos de salón, **0 citas vía bot** (1 cita creada, `source=manual`) — 6.ª ventana consecutiva en cero. Ventana más chica de la serie. 4 commits mergeados dentro de la propia ventana (`c141990`, `43cfbcb`, `54a8832` — incidente Star `…6469`, evidencia de esta misma muestra; `48bb188` infra multi-tenant sin tráfico que lo ejerza).

| Hallazgo                                                                                                  | Estado                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **[P1] `from_ad_at` — "Mirada Espectacular" ausente de `isKnownCtwaCampaignCopy`** (Jharmette `PE.…4400`) | 🔴 **causa raíz confirmada** — 3.ª ocurrencia tras Cath/Lisbeth (29-ago); Quick Win de 1 línea propuesto, sin aplicar |
| **Star `…6469`** (S/? literal + ubicación duplicada)                                                      | 🟢 **evidencia pre-fix confirmada** de los PRs #85–#87 (ad-hoc 29-ago), ya cerrados en LECCIONES                      |
| `chat-quality-review` — posible falso-positivo alto                                                       | 🔴 **6.ª ventana consecutiva, ahora 100%** (10/10 hilos, incluidas 3 confirmaciones sin ambigüedad)                   |
| Confirmaciones de recordatorio (Luz, Pilar, Mónica)                                                       | 🟢 3/3 correctas, sin fallos                                                                                          |
| Reenganche de retoque declinado (María)                                                                   | 🟢 correcto, sin fricción                                                                                             |
| Engagement CTWA sin cierre (Anette, Valeria)                                                              | ⚪ drop-off de funnel, sin bug identificado                                                                           |
| Objeción de distancia (Distribuciones `…5255`)                                                            | ⚪ retirado del seguimiento activo — 2.ª ventana sin tráfico                                                          |

## Estado 2026-08-29 (ventana 27-ago → 29-ago)

> **Ventana 27-ago 08:12 → 29-ago 08:12 Lima**: 22 hilos de salón (+ 1 lead de curso + 1 spam B2B excluidos), **0 citas vía bot** (0 citas creadas, ninguna fuente) — 4.ª ventana consecutiva en cero. **0 hallazgos nuevos de código con 2+ ocurrencias.** 14 commits mergeados dentro de la propia ventana (`supabase/functions/`); 4 resuelven hilos de la muestra el mismo día que ocurrieron — evidencia pre-fix, no hallazgos abiertos.

| Hallazgo                                                          | Estado                                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **FAQ mid-pago ignorada** (Lizbeth …3315)                         | 🟢 **cerrado el mismo día** (`cd4bab0`, 2h20 después de la pregunta)                                  |
| **Precio sin `add_to_cart` + lista CTWA stale** (Sofi `PE.…7237`) | 🟢 **cerrado el mismo día** (`64e190d`, 6h20 después)                                                 |
| **Venta emocional CTWA — casi-cierre** (Moreliamm …8474)          | 🟢 **motivó la feature nueva** (`f460d86`+`949ba7f`) — el decline en sí ya se manejaba bien           |
| **Lead de curso sin flujo propio** (Johanna …9981)                | 🟢 **cerrado el mismo día** (`c4e3166`)                                                               |
| Bounce CTWA un solo toque                                         | 🟢 **baja a ~20%** (4/20) desde 40% (27-ago) — extremo bajo del rango histórico                       |
| `chat-quality-review` — posible falso-positivo alto               | 🟡 **5.ª ventana consecutiva** — 20/22 hilos marcados, 0 con error real de producto al auditar a mano |
| `from_ad_at` no marcado en copy reconocible (Cath, Lisbeth)       | 🟡 **2.ª reincidencia post-13-ago** — bajo impacto, monitorear                                        |
| **[P5] del 19-ago** (2.º servicio confirmado sin agendar)         | ⚪ **sin tráfico** — sigue como decisión de producto pendiente                                        |

## Estado 2026-08-27 (ventana 25-ago → 27-ago)

> **Ventana 25-ago 08:14 → 27-ago 08:14 Lima**: 26 hilos, **0 citas vía bot** (2 citas creadas en la BD, ambas `source=manual`, sin relación con la muestra). **0 hallazgos de código con 2+ ocurrencias.** Deploy en vivo dentro de la ventana de `5d679a3` (CTWA post-tap sin listas + Uñas en interés, 25-ago 21:42 Lima) y `3f48dec` (no agrupar Clásicas/Rímel, 26-ago 10:07 Lima) — ambos confirmados/cerrados con la propia muestra como evidencia.

| Hallazgo                                            | Estado                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1]–[P4] del 19-ago**                            | 🟢 **cerrados** — sin reincidencia                                                                                                    |
| **CTWA post-tap sin listas** (`5d679a3`)            | 🟢 **confirmado en tráfico real, 1.ª ventana** — 6 hilos post-deploy sin la lista de subcategoría antigua                             |
| **"Clásicas o Rímel" agrupados** (`3f48dec`)        | 🟢 **cerrado el mismo día** — Elsie `PE.…8979` es la evidencia que motivó el fix (2h51 antes del deploy)                              |
| Bounce CTWA un solo toque                           | 🟡 **sube a 40%** (10/25) desde 25% (25-ago) — vuelve al rango histórico 39–62%, no confirma nuevo baseline todavía                   |
| `chat-quality-review` — posible falso-positivo alto | 🟡 **4.ª ventana consecutiva** — ~1 alerta por hilo activo, 0 con error real de producto al auditar a mano                            |
| Efecto nombrado sin `add_to_cart` (Alem …3329)      | 🟡 **observación nueva, 1×** — mismo guion que Xio pero Haiku no cerró el carrito en el flujo nuevo `5d679a3`; monitorear             |
| `show_menu` de más tras precio (Leslie `PE.…8348`)  | 🟡 **observación nueva, 1×** — ráfaga de 3 msgs + `skip_dispatch_lock_exhausted` sin pérdida real, seguido de un menú genérico de más |

## Estado 2026-08-25 (ventana 23-ago → 25-ago)

> **Ventana 23-ago 08:15 → 25-ago 08:15 Lima**: 24 hilos, **0 citas vía bot** (1 cita creada en la BD, `source=manual`, sin relación con la muestra). **0 hallazgos nuevos de código.** Primera ventana completa con el flujo `awaiting_ctwa_interest` (CTWA con pregunta de interés, PR #58–#61) activo de punta a punta — confirmado en tráfico real.

| Hallazgo                                                                                   | Estado                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1]–[P4] del 19-ago** (identidad corrupta, hora +5h app, STOP/IA-talk, fallback diseño) | 🟢 **cerrados** — sin reincidencia (sin tráfico directo para P1–P3; el caso de foto de diseño sin categoría previa lo manejó correctamente el flujo actual) |
| **[P5] del 19-ago** (2.º servicio confirmado, nunca agendado)                              | ⚪ **sin tráfico** — sigue como decisión de producto pendiente                                                                                              |
| **CTWA con pregunta de interés** (`awaiting_ctwa_interest`)                                | 🟢 **confirmado en tráfico real** — 15/20 leads con boilerplate puro recibieron saludo personalizado + lista corta (no las 4 imágenes genéricas viejas)     |
| Bounce CTWA un solo toque                                                                  | 🟢 **baja a 25%** (5/20) desde 62.5% (23-ago) — coincide con el despliegue del nuevo flujo                                                                  |
| `chat-quality-review` — posible falso-positivo alto                                        | 🟡 **3.ª ventana consecutiva** — 22 alertas / 24 hilos, 0 con error real de producto al auditar a mano                                                      |
| Near-conversion más avanzada de la serie                                                   | Jhoa `PE.…8373` llegó al paso de identidad/boleta (post-selección de hora) sin cerrar — un paso más adelante que Erikita …2683 (23-ago)                     |

## Estado 2026-08-23 (ventana 21-ago → 23-ago)

> **Ventana 21-ago → 23-ago 08:05 Lima**: 15 hilos, **0 citas vía bot** (5 citas creadas en la BD, todas `source=manual`). **0 hallazgos nuevos de código.** Los 4 fixes del reporte del 19-ago (`29c3d20`) confirmados en `main` sin reincidencia; [P5] de esa ventana (2.º servicio confirmado sin agendar) sigue sin tráfico para re-probarlo.

| Hallazgo                                                                                   | Estado                                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **[P1]–[P4] del 19-ago** (identidad corrupta, hora +5h app, STOP/IA-talk, fallback diseño) | 🟢 **cerrados** — código confirmado en `3e68c29`, sin reincidencia                                            |
| **[P5] del 19-ago** (2.º servicio confirmado, nunca agendado)                              | ⚪ **sin tráfico** — nadie intentó un 2.º servicio en la ventana; sigue como decisión de producto pendiente   |
| `chat-quality-review` — posible falso-positivo alto                                        | 🟡 **observación nueva** — 13 alertas / 15 hilos, 0 confirmados como error real de producto al auditar a mano |
| Nota de voz sin rastro de respuesta post-pausa (Luz …2357)                                 | 🟡 **observación nueva** — sin evidencia suficiente para confirmar bug                                        |
| Bounce CTWA un solo toque                                                                  | 🟡 62.5% (5/8) — extremo alto del rango histórico (39–62%)                                                    |

## Estado 2026-08-19 (ventana 17-ago → 19-ago)

> **Ventana 17-ago → 19-ago 08:19 Lima**: 2 citas vía bot (Ámbar, Mell). 3 hilos con fallos — 5 hallazgos, todos primera aparición (sin reincidencia de LECCIONES ni del reporte 13-ago). 2 de los 5 son bugs de datos silenciosos (🔴 HIGH): nombre de clienta corrompido y hora +5h en confirmación de cita aprobada desde la app.

| Hallazgo                                                                                                                              | Estado                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **[P1] `clients.name` corrompido** (Mell …9414: reenvió la plantilla de reserva completa, `parseClientIdentity` sin cota de longitud) | 🔴 HIGH, sin fix — `client-identity.ts:212-231`                                                                              |
| **[P2] Hora +5h en confirmación desde la app** (Mell: "4:30 PM" en vez de 11:30 a.m.)                                                 | 🔴 HIGH, sin fix — `apps/mobile/utils/format.ts:104-110` (atajo "literal" de `formatTime` no excluye strings con `Z`/offset) |
| **[P3] "STOP" → Haiku revela IA-talk** (Carmen Rosa …2861)                                                                            | 🔴 HIGH, sin fix — `ai-assistant.ts` sin ruta de opt-out; `haiku-prompt.ts` sin guard anti-inyección                         |
| **[P4] Fallback genérico ante diseño/efecto sin categoría** (Tatiana …0219, Vanessa interviene)                                       | 🟡 MEDIUM, mitigado por staff                                                                                                |
| **[P5] Bot promete 2.º servicio que nunca se agenda** (Mell: Retiro de Pestañas)                                                      | 🟡 MEDIUM — Necesita Revisión de Alberto (decisión de producto)                                                              |
| Avalancha multi-flujo / `from_ad_at` (cerrados PR #20, 13-ago)                                                                        | 🟢 sin reincidencia                                                                                                          |
| Bounce CTWA un solo toque                                                                                                             | 53% (9/17 con `from_ad_at`/copy reconocible)                                                                                 |

## Estado 2026-08-13 (ventana 11-ago → 13-ago) — consolidado en LECCIONES

> **Ventana 11-ago → 13-ago 08:21 Lima**: 0 citas bot; 1 near-conversion (Milagros). **Post-reporte PR #20** (webhook prod 13-ago noche): [P1] avalancha + [P2] `from_ad_at` + Pati/Merillyn/LION cerrados — no reabrir en la próxima rutina.

| Hallazgo                                                                                                                  | Estado                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **[P1] Avalancha multi-flujo** (Loren …4648: ráfaga de 3 msgs en 6 s → pregunta duplicada + "¡Nos vemos!" contradictorio) | 🟢 **cerrado PR #20** — trailing quiet + skip peer; QA `:coalesce-burst` / `:natural-closing`. Hilo = evidencia pre-fix    |
| **[P2] `from_ad_at` inconsistente** (Milagros `PE.…5190`, BSUID)                                                          | 🟢 **cerrado PR #20** — `isKnownCtwaCampaignCopy`; QA `:p2` P2-D. Solo reabrir si copy conocido queda NULL **post**-deploy |
| **Pati / Merillyn / LION** (tarde 13-ago, fuera de esta muestra)                                                          | 🟢 **cerrado PR #20** — ver LECCIONES § post-reporte 13-ago (`:pati` A–H, `:browse-reengage` H, `:identity` F)             |
| **Foto diseño → pausa staff** (Greys …2873, Vanessa responde en vivo)                                                     | 🟢 funcionando en producción                                                                                               |
| **Pregunta compuesta (ubicación+precio) en un turno** (…7109)                                                             | 🟢 positivo, sigue la directriz de `haiku-prompt.ts`                                                                       |
| **Selección de pack obligatoria antes de calendario** (producto)                                                          | 🟡 reincidencia — Kela/Sabrina/Milagros exploran 2–3 subcategorías antes de fijar ítem                                     |
| Dead-end 932 catálogo/sede/mid-pago (`ddc80a3`)                                                                           | 🟢 sin reincidencia (código sin cambios, sin tráfico que lo ejercite mal)                                                  |
| Bounce CTWA un solo toque                                                                                                 | 🟡 60% (3/5 con `from_ad_at`)                                                                                              |

## Estado 2026-08-11 (ventana 09-ago → 11-ago) — consolidado en LECCIONES

> **0 citas nuevas vía bot**, pero **1 commit mergeado durante la propia ventana** (`ddc80a3`, PR #17) cierra dead-end 932 de **catálogo + sede/ubicación + mid-pago**, confirmado con deploy verde.

| Hallazgo                                                                  | Estado                                                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Dead-end 932 catálogo tras CTWA** (Fanny/Karim/Alejandra)               | 🟢 **cerrado en `ddc80a3`** — evidencia pre-fix                                                |
| **Dead-end 932 sede/ubicación** (Tania/Karina) + **[P1 09-ago] mid-pago** | 🟢 **cerrado en el mismo `ddc80a3`** — `matchesLocationQuestion` + `steps.ts`; no reincidencia |
| **[P1] Precio explícito tras boilerplate CTWA sin respuesta** (Alejandra) | 🟡 **abierto** — probable coalesce; señal de compra más clara de la muestra                    |
| **Conversión manual fuera del bot** (Alejandra)                           | 🟢 positivo mixto                                                                              |
| **Selección de pack obligatoria** (producto)                              | ⚪ sin tráfico esta ventana                                                                    |
| **`from_ad_at` inconsistente**                                            | 🟡 reincidencia LECCIONES (1/11, lado Meta)                                                    |
| BSUID / foto diseño / quality-review / watchdog                           | 🟢 1 `skip_dispatch_lock_exhausted` aislado, sin mensaje perdido                               |
| Bounce CTWA un solo toque                                                 | 🟡 55% (6/11) — extremo alto histórico                                                         |
| Haiku sin crédito (`api_error_credit`)                                    | 🟢 motivó alerta en `ddc80a3`                                                                  |

## Estado 2026-08-09 (ventana 07-ago → 09-ago) — consolidado en LECCIONES

> **0 citas nuevas**, pero **2 commits mergeados durante la propia ventana analizada** (`589b6d3` 07-ago 19:57 Lima, `0ccc60d` 08-ago 13:06 Lima — HEAD de ese reporte) ya resuelven 5 fallas reales presentes en la muestra, confirmado con deploy verde en `ota-production.yml`.

| Hallazgo                                                                                                     | Estado                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| **Acrílico / tardanza / "Nos vemos" / clases / referencias → dead-end 932** (Ana María, Gabriela, Cris, Luz) | 🟢 **resuelto en el propio commit analizado**                 |
| **[P1] Pregunta ignorada en `awaiting_payment_screenshot`** (…7373, "Ubicación?")                            | 🟢 **cerrado en `ddc80a3` (11-ago)**                          |
| **[P2] `free_question` sin respuesta de Haiku → menú genérico**                                              | 🟢 **cerrado para catálogo + sede en `ddc80a3`**              |
| **Selección de pack obligatoria antes de calendario** (producto)                                             | 🟡 reincidencia del 07-ago — sin decisión de Alberto aún      |
| **`from_ad_at` inconsistente en el mismo copy**                                                              | 🟡 reincidencia de LECCIONES 04-ago                           |
| BSUID CTWA / foto diseño / `chat-quality-review` / `silence-watchdog`                                        | 🟢 sin incidentes — 0 filas en `wa_error_log`                 |
| Bounce CTWA de un solo toque                                                                                 | 🟡 33% (3 de 9 con `from_ad_at`) — dentro del rango histórico |

## Estado 2026-08-07 (ventana 05-ago → 07-ago) — consolidado en LECCIONES

> **0 citas vía bot solo esta ventana** — corta la racha del 05-ago. Las 3 citas movidas en la BD (…3568 nueva, …4563 reprogramada, …8187 confirmada) las cerró staff vía panel, no el bot. El caso más claro: …0030 (Zandry) dijo _"Si"_ a la CTA directa "¿Te agendo el servicio ahora?" y el bot le devolvió el menú genérico — el "Si" nunca tocó el carrito.

| Hallazgo                                                                                             | Estado                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1]–[P4] del 05-ago** (reclamo→carrito, dead-end sin referral, listas duplicadas, oferta vencida) | 🟢 **sin reincidencia** — los 4 fixes de `f11b2f3` se sostienen en esta ventana → LECCIONES                                                                                                                         |
| **[P1] "Si" corto tras CTA de foto → menú genérico**                                                 | 🟢 **nuevo** — `detectAITrigger` (`ai-assistant.ts:207`) descarta mensajes ≤3 chars sin saber que el bot acaba de hacer una pregunta de sí/no (…0030)                                                               |
| **[P2] Avalancha multi-flujo, forma más leve**                                                       | 🟡 **reincidencia parcial** del viejo [P3] — ya no son listas duplicadas, es un saludo genérico en paralelo a "Mi cita" cuando el gap entre 2 inbounds supera `COALESCE_WINDOW_MS` (…4563); staff absorbió el ruido |
| REMINDER_TEXT_CONFIRM (`deee050`)                                                                    | 🟡 sin tráfico post-fix en la ventana para validar (el único caso fue 53 min antes del merge)                                                                                                                       |
| BSUID CTWA / foto diseño / `chat-quality-review` / `silence-watchdog`                                | 🟢 sin incidentes — 0 filas en `wa_error_log`                                                                                                                                                                       |
| Bounce CTWA de un solo toque                                                                         | 🟡 60% (3 de 5, muestra chica)                                                                                                                                                                                      |
| **Selección de pack obligatoria antes de calendario** (producto)                                     | 🟡 3 de 5 hilos del creativo "15% manos y pies" se frenan ahí — pendiente decisión de Alberto → LECCIONES                                                                                                           |

## Estado 2026-08-05 (ventana 03-ago → 05-ago) — consolidado en LECCIONES

> **Primera cita creada por el bot en 5 ventanas** (…4563, `source='whatsapp'`) — y, en la misma ventana, el peor fallo de la serie: un reclamo de garantía convertido en venta (…2810).

| Hallazgo                                              | Estado                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[P1] Reclamo de garantía → `add_to_cart` + cita**   | 🔴 al cierre de ventana → **✅ cerrado 05-ago** (gate global `matchesComplaintIntent` + plurales + regla prompt; QA `:lili-complaint`) → LECCIONES       |
| **[P2] Copy de campaña sin referral CTWA**            | 🔴 **reincidencia sin fix** — `2023b73` vive dentro de la rama Meta Ads; sin `from_ad_at` el mismo copy muere en texto estático (…7462, …0370, PE.…4523) |
| **[P3] Listas interactivas duplicadas**               | 🟡 **reincidencia post-fix** — …8367 con 3 listas "Uñas" en 40 s; el debounce de PR #30 no cubre listas y vive en memoria del isolate                    |
| **[P4] «Esa oferta ya venció» pisa el saludo**        | 🔴 **reincidencia del [P5] del 04-ago** — el saludo de retoque se envía antes de evaluar `safeCtx.expired` (…4563)                                       |
| QW #1–2 precios de promo / pack fuera de promo        | 🟢 **cerrados** → LECCIONES (5 cotizaciones exactas vs BD)                                                                                               |
| [P2]/[P3]/[P4] del 04-ago (nudges cruzados, clásicos) | 🟢 **cerrados** → LECCIONES (sin reincidencia; clásicos off es decisión de producto)                                                                     |
| BSUID CTWA v3.5                                       | 🟢 **3.ª ventana limpia** — 5 hilos BSUID de punta a punta, 0 crashes                                                                                    |
| `wa_error_log`                                        | 🟢 **1 evento** (WhatsApp API 400 sin teléfono); 0 crashes, 0 `skip_dispatch_lock_exhausted`                                                             |
| Citas creadas                                         | 🟢 **4 en 48 h — 1 vía bot** (…4563, viernes 7-ago 11:00, S/60)                                                                                          |
| % bounce CTWA de un solo toque                        | 🟡 **42 %** (5 de 12) — sube desde 39 %, sigue bajo el 47 %/62 % iniciales                                                                               |

## Estado 2026-08-04 (ventana 02-ago → 04-ago) — consolidado en LECCIONES

> La ventana se parte en dos: los **8 Quick Wins del 03-ago entraron a `main` entre 15:05 y 15:55 UTC** de ese día. Todo lo anterior es tráfico pre-fix ya descrito en el reporte borrado; las ~11 h posteriores sirven de validación en producción.

| Hallazgo                                                 | Estado                                                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **QW #1–2 precios de promo** (`55d890b`)                 | ✅ **validado con tráfico real** — …7852 recibió los 4 packs con full→promo exactos; `grep "S/115"` = 0 líneas → LECCIONES    |
| **QW #4 CTWA dead-end** (PR #27)                         | ✅ **validado con tráfico real** — 3 CTWA post-deploy llegaron a Haiku en el 1.er turno → LECCIONES                           |
| **QW #6 lock agotado** (PR #30)                          | ✅ **cerrado** — 2 ventanas consecutivas con 0 eventos nuevos en `wa_error_log` → LECCIONES                                   |
| QW #3 decline / #5 precio mid-carrito / #7 auto-reply    | ✅ aplicados; sin ocurrencia post-fix que los ejercite todavía                                                                |
| **[P1] Listas interactivas duplicadas**                  | 🟡 **fix parcial** — el debounce de PR #30 solo cubre `sendMessage` (texto). PE.…3618 recibió 4 listas idénticas en 61 s      |
| **[P2] cart-nudge ↔ browse-reengage sin guard cruzado** | 🟢 **nuevo** — `browse-reengage` no consulta `nudge1/2_sent_at`. …1321 recibió 2 reenganches en 45 min sin inbound intermedio |
| **[P3] Nudges sobre takeover de staff**                  | 🟡 la pausa de PR #29 depende del canal (panel); staff en la app de WA Business no pausa nada                                 |
| **[P4] “Clásico” cotizado en gel**                       | 🟡 **fix parcial** — pack reactivado (PR #31), pero `Manicure/Pedicure Clásico` sueltos siguen `is_active=false`              |
| **[P5] Contexto de retoque perdido**                     | 🟢 **nuevo** — la plantilla nombra el servicio y el bot lo olvida (…0370). Es la audiencia con mejor tasa de respuesta        |
| BSUID CTWA v3.5 / foto diseño v3.4                       | ✅ 2.ª ventana sin crashes; 3 hilos BSUID de punta a punta                                                                    |
| `chat-quality-review` + `silence-watchdog`               | ✅ 15 de 23 hilos marcados / 12 evaluaciones de watchdog                                                                      |
| Citas creadas                                            | 🟡 **1 en 48 h** (…0370, `source='manual'`) — corta la racha de 3 ventanas en cero, pero **0 vía bot**                        |
| % bounce CTWA de un solo toque                           | 🟢 **39 %** (7 de 18) — baja sostenida desde 47 % (03-ago) y 62 % (02-ago) con el mismo creativo                              |
