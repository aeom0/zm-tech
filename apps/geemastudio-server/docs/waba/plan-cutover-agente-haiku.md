# Plan: cutover del bot WABA a un agente Haiku 5.5 con herramientas

> Origen: pedido explícito de Alberto (8-oct-2026) tras otra tanda de fallas del bot.
> **Reemplaza** la decisión de *no cutover* de [`plan-haiku-primero-informativo.md`](plan-haiku-primero-informativo.md)
> y la sección histórica *Evaluación de arquitectura* (antes en ZM Lash `ROADMAP.md`; ya apunta acá).
>
> **Estado (8-oct-2026, noche):** Fases 1 y 2 desplegadas (PRs #77–#84). El agente atiende **todo el tráfico
> de ZM Lash** desde el 8-oct (allowlist vacía). Modelo `claude-haiku-5-5`, `effort: medium`. El dispatcher
> sigue como respaldo (falla del agente, party, curso, no-show, botones de plantilla) hasta la Fase 3, que
> se hace tras una semana estable.
> **Venta emocional CTWA:** se inyecta si `from_ad_at` (mismo CMS `haiku_emotional_selling_ctwa_ext_lift`
> + nota de tools del agente). Nudges/captions de `lib/emotional-selling.ts` siguen en el flujo clásico.

## Por qué

`dispatcher.ts` (~2900 líneas) enruta cada mensaje por ~48 regex/keyword antes de que Haiku
participe. Cada caso nuevo se resolvía agregando una palabra a un regex: 5 meses del mismo
parche. El bot es hoy un árbol de decisiones determinístico con Haiku como último recurso.
El objetivo es invertirlo: **Haiku decide, el código ejecuta y valida**.

## Qué cambió en Haiku (verificado 8-oct-2026)

Haiku 5.5 salió el 7-oct-2026. Fuente: documentación oficial de la plataforma (overview y migration guide).

| | Haiku 4.5 (hoy) | Haiku 5.5 |
|---|---|---|
| ID | `claude-haiku-4-5-20251001` | `claude-haiku-5-5` (sin fecha ni alias) |
| Precio entrada / salida por MTok | $1 / $5 | $0.10 / $0.50 hasta 100K de prompt ($0.50 / $2.50 sobre 100K) |
| Lectura de caché por MTok | $0.10 | $0.01 |
| Contexto / salida máx. | 200K / n.d. | 1M / 128K |
| Pensamiento | `budget_tokens` | adaptativo + `output_config.effort` (default `medium`) |
| Tokenizador | anterior | cuenta ~30% más tokens para el mismo texto |

Prueba en vivo (8-oct, key del tenant zm-lash, `tool_choice: auto`, 1 herramienta, `strict: true`):
5.5 eligió la herramienta correcta en 4 de 4 corridas, con 2.4 a 3.1 s en las corridas estables
(una de 7 s al inicio). Costo ~$0.00014 por turno sin el prompt completo.

Cambios de API que rompen el código actual al migrar:

- Quitar `temperature`, `top_p`, `top_k` (400 si llevan otro valor).
- `thinking: {type:"enabled", budget_tokens}` da 400. Usar `{type:"adaptive"}` o no enviarlo.
- Prefill (turno final del asistente) da 400: `messages` termina siempre en turno del usuario.
- El pensamiento cuenta dentro de `max_tokens`: subir el tope o la respuesta puede cortarse antes del texto.
- Leer bloques por `type`, nunca por posición (`content[0]`): ahora puede venir un bloque `thinking` primero.
- Los bloques `thinking` se devuelven sin modificar junto con los `tool_result`, y la conversación debe ser *append-only* (cambiar `system`/`tools`/mensajes previos entre requests invalida los bloques y da 400).
- `stop_reason: "refusal"` puede ocurrir y no hay fallback del lado del servidor: manejarlo.
- Sin Priority Tier.
- `tool_choice` forzado se acepta, pero entonces no hay pensamiento previo a la llamada. Usar `auto` y decir en el prompt cuándo usar cada herramienta.

## Arquitectura

### Un solo punto de corte

Todo lo previo a `dispatch({...})` en [`index.ts`](../../supabase/functions/whatsapp-webhook/index.ts)
se conserva tal cual: validación de Meta, deduplicación, coalescing de ráfagas, tenant, catálogo,
`waba_config`, pausas, bloqueados, takeover del staff, silencio, anti-spam, opt-out y log de mensajes.

```
index.ts → (todo el pre-procesamiento actual) → if (agentEnabled) runAgent(...) else dispatch(...)
```

Con el flag apagado todo queda idéntico. Rollback = apagar el flag.

### Módulo nuevo `whatsapp-webhook/agent/`

- `agent.ts`: `runAgent(opts)`. Bucle de tool use con la Messages API (`fetch`, como el resto del webhook): envía historial + mensaje, ejecuta las `tool_use`, devuelve los `tool_result` (todos en un solo mensaje de usuario), repite hasta `end_turn`. Tope de iteraciones (6) y de tiempo total; si se agota, degradar a un menú útil (nunca remitir al 932 por una falla transitoria).
- `tools.ts`: definiciones (`strict: true`, `additionalProperties: false`) y ejecutores. Cada ejecutor valida en código y devuelve datos estructurados o un error legible por el modelo.
- `prompt.ts`: system prompt del agente (ver abajo).
- `history.ts`: arma el historial desde `wa_messages` (reutiliza la lógica actual: 12 mensajes, ventana de 6 h, corte por huecos de 2 h, marca de mensajes del staff).
- `send.ts`: envía las burbujas de texto (máx. 4, con pausa corta) y las imágenes.

### Qué se reutiliza

`getClientContext`, `composeHaikuChatSystemBlocks` (catálogo con caché de 1 h), `getHaikuRuntimeSettings`,
`resolveChatSystemPromptBase` (el prompt base editable desde el panel), `logAIUsage` / `reportAnthropicApiFailure`,
`escalateToStaff`, `loadCatalog`, `checkAvailability` / `hasSlotCapacityForServices`, `employeeRulesAllowSlot`,
`occupiedMinutesForServices`, `resolveCartItemPrice`, políticas y textos de ubicación/estacionamiento.

### Qué NO se reutiliza

`FORMAT_INSTRUCTION` y `FINAL_FORMAT_REMINDER` (obligan al formato `<text>/<action>`), `parseAIResponse`,
`executeAIAction`, `detectAITrigger` y los 48 matchers. El prompt del agente declara el uso de herramientas
y elimina todas las reglas del tipo «usa action:none», «NO add_to_cart» y similares, que existen solo por el formato viejo.

## Herramientas

### Fase 1: lectura y baja consecuencia

| Herramienta | Qué hace |
|---|---|
| `buscar_servicios` | Servicios/packs/promos por categoría o texto, con precio y duración reales del catálogo |
| `ver_horarios` | Horas libres de un día para una lista de servicios (usa capacidad real, camas, empleadas, feriados) |
| `info_salon` | Ubicación, estacionamiento, horario de atención, políticas, adelanto |
| `info_negocio` | Ubicación/estacionamiento, políticas de la cita y recomendaciones previas del carrito (fuentes oficiales: `salon-location.ts`, `policies.ts`) |
| `ver_portafolio` | Envía imágenes del portafolio de un servicio o categoría |
| `ver_guia` | Envía las guías educativas (pelo a pelo, mapping, efectos) |
| `ver_mi_cita` | Citas pendientes/confirmadas de la clienta |
| `derivar_a_persona` | Escala al staff (reclamo, reembolso, falla del salón, asesoría personal) con motivo; reutiliza `escalateToStaff` |
| `buscar_servicios` | Busca servicios y packs por texto o categoría; devuelve id, precio vigente y duración |
| `ver_portafolio` | Envía fotos reales del portafolio (reutiliza `resolveAndSendPortfolio`) |
| `ver_carrito`, `agregar_al_carrito`, `quitar_del_carrito` | El agente arma el carrito; IDs validados contra el catálogo y precio puesto por el sistema |
| `consultar_dia` | Horarios libres del carrito, duración por servicio y bloque, quién atiende cada servicio (RPC `get_available_slots`), feriados/cierres, adelanto de domingo y ausencias/coberturas del personal |
| `consultar_equipo` | Personal activo, servicios que hace cada quien, horarios y ausencias |
| `reservar_horario` | Valida cupo y reglas y entrega a `finalizeBookingAfterDatetimeSelection` (adelanto fijo, 20 % domingo o cita directa). Sin selector de fecha/hora del flujo viejo |

### Fase 2: herramientas con consecuencias (reemplazan al híbrido)

| Herramienta | Validación en código antes de escribir |
|---|---|
| `crear_cita` | Servicios existen, slot libre (capacidad, empleadas, camas, feriados, 2 citas simultáneas), no solapa con otra cita de la clienta, precio recalculado en servidor |
| `reprogramar_cita` / `cancelar_cita` | Cita es de esa clienta, política de adelanto perdido por cambio tardío |
| `registrar_identidad` | Nombre + DNI/CE con `parseClientIdentity`; nunca inventar |
| `solicitar_adelanto` / `verificar_comprobante` | Monto del adelanto sale de la configuración, el comprobante lo valida el flujo existente (`processPaymentScreenshot`) |

Regla dura: **ninguna herramienta confía en lo que dice el modelo para precios, montos, disponibilidad o IDs**.
El modelo propone parámetros; el código los valida y responde con el resultado real. La cita solo existe
si `crear_cita` devolvió el ID de la fila. La guarda `fabricated-booking-guard` se conserva como respaldo.

## Híbrido temporal (Fase 1 en producción)

- Con el flag prendido, el agente atiende todo.
- El agente conduce todo hasta elegir día y hora; `reservar_horario` entrega solo el cobro/confirmación al flujo viejo (`awaiting_deposit_*`, `awaiting_payment_screenshot`, etc.) hasta la Fase 2.
- Mientras `session.step` esté en uno de esos pasos, `runAgent` **no corre** y el mensaje sigue por `dispatch` como hoy. Al volver a `browsing` o `null`, retoma el agente.
- La Fase 2 elimina este puente y el flujo viejo.

## Estado Fase 2 (8-oct-2026, desplegada)

- El agente atiende texto en `browsing`, `awaiting_datetime`, `awaiting_client_identity`, `awaiting_deposit_datos`, `awaiting_deposit_boleta` y `awaiting_payment_screenshot`.
- Herramientas nuevas: `reprogramar_cita` (reutiliza `finalizeRescheduleAppointment`), `cancelar_cita` (solo sin adelanto ni comprobante; si no, `escalar_a_humano`), `registrar_identidad` (valida con `parseClientIdentity`; en la boleta envía los datos del adelanto por código) y `descartar_reserva`.
- Comprobante, imágenes, audio y «Mi cita»: ver «Cierre antes de la Fase 3» (ya cubiertos).

## Cierre antes de la Fase 3 (8-oct-2026)

Decisiones y qué atiende ya el agente (`routeAgentInbound`). La Fase 3 (borrar el dispatcher) sigue en un PR aparte, después de una semana estable con tráfico real.

- **Comprobante por imagen.** No es una herramienta del modelo. Si el paso es `awaiting_payment_screenshot` (o `awaiting_screenshot`), el webhook llama a `handleAwaitingPaymentScreenshot` → `processPaymentScreenshot`. El monto y la cita los escribe ese flujo. Una imagen fuera de ese paso pasa primero por el clasificador y por la foto de referencia de una cita ya creada; si no aplica, el agente solo recibe el texto de la foto y no afirma haberla visto.
- **Fotos previas** (`awaiting_pre_service_photo` y `_2`). El flujo ya estaba apagado en el dispatcher. Se elimina: la sesión vuelve a `browsing` y la imagen sigue como cualquier otra foto.
- **Audio.** Se guarda en el panel y el agente pide que lo escriba. No pausa el bot ni avisa al equipo (pendiente: transcribir la nota y que el agente escale solo si hay un problema o pide hablar con una persona; la API de Mensajes no acepta audio, hace falta transcripción previa).
- **«Mi cita».** El tap `mi_cita` entra al agente y debe usar `consultar_mi_cita`. El resto de listas (categorías, día, hora) sigue en el dispatcher hasta la Fase 3.
- **Botones de verificación de pago** (`pay_verify_approve` / `pay_verify_reject`). Los atiende el mismo handler de Vanessa, antes del modelo. Los botones de plantilla (confirmo, no podré asistir, tardanza, retoque) siguen en el dispatcher.
- **`awaiting_payment_info` y `completed`.** Los absorbe el agente (texto).
- **Party, curso y no-show.** Se quedan en el dispatcher. No se eliminan: son máquinas de estado (acompañante, lead de curso, motivo de inasistencia).
- **Cancelar con adelanto.** Se queda en `escalar_a_humano`. El adelanto ya está cobrado; reembolso o pérdida lo decide una persona.
- **Latencia.** Un turno de QA midió 14–28 s. Unos 6 s son la agrupación (ventana 4.5 s + quietud 1.5 s), pensada para que el bot viejo no contestara un fragmento con un menú. Con el agente esa ventana base pasa a 1.5 s; la quietud de 1.5 s se mantiene para ráfagas cortas. El tiempo del modelo no cambia en este paso.
- **Simulador.** `waba-chat-simulator` entra al agente cuando `agent_enabled` está prendido, también en `51988800001` y `51988800002`, sin sacar la allowlist de las clientas. Los scripts `waba-validate-*` pegan al webhook real: en teléfonos `51999000978`–`999` ya pasan por el agente.
- **Tráfico real.** QA de comprobante, foto, nota de voz y «Mi cita» pasó el 8-oct. La allowlist se vació ese día (`agent_phone_allowlist.phones = []`): el agente atiende a todas las clientas de ZM Lash. La semana estable cuenta desde ahí. Rollback: `agent_enabled = false`.
- **Lecciones del primer día.** (1) El thinking cuenta en `max_tokens`: se subió a 4096, se reintenta ante `stop_reason: max_tokens` y se recorta a la última línea completa. (2) Cada promo muestra su vigencia en el catálogo y en `buscar_servicios`; «Solo Halloween» nombra la campaña, no limita el día. (3) Horas, días, servicios y precios van en viñetas, una por línea (🌸/⭐; el emoji de la promo, 🎃 en Halloween, para promos).

## Flag y despliegue

- Clave `agent_enabled` en `waba_config` (por tenant, caché de 60 s ya existente). Además `agent_phone_allowlist` (lista de teléfonos): vacía = todo el tenant; con teléfonos = solo esos (QA `51999000978` a `999`).
- Orden: QA → solo ZM Lash → resto de tenants.
- El webhook no tiene preview por PR: tras mergear, esperar el deploy del workflow `edge-functions.yml` antes de probar por WhatsApp.
- Migración de datos: ninguna en Fase 1 (solo filas de `waba_config`). Si se agrega alguna, respetar la regla 1:1 de migraciones.

## Modelo y parámetros

- `model: "claude-haiku-5-5"`, `thinking: {type:"adaptive"}`, `output_config: {effort:"medium"}` en una sola constante (`AGENT_EFFORT`), con opción de bajar a `low` en mensajes triviales.
- `tool_choice: {type:"auto"}`. Sin `temperature/top_p/top_k`.
- `max_tokens` holgado (≥ 2000) porque el pensamiento cuenta dentro del tope.
- Prompt caching: bloque estático (prompt base + reglas del agente) y bloque de catálogo con `cache_control` de 1 h; contexto de la clienta y fecha/hora de Lima fuera de caché. **Inyectar siempre la fecha y hora de Lima** (en la prueba el modelo asumió 2024/2025 sin ella).
- Cambiar `system`, `tools` o mensajes previos entre turnos de un mismo bucle invalida los bloques de pensamiento: el bucle es *append-only*.
- Resto de funciones que hoy usan `claude-haiku-4-5-20251001` (saludo, clasificador de imágenes, OCR de gastos, reenganches, watchdog, revisión de chats): migrar a 5.5 en un PR aparte, aplicando los cambios de API de arriba. No bloquea este plan.

## Prompt del agente (lineamientos)

- Tono y reglas de negocio: se conservan del prompt base editable en el panel (`resolveChatSystemPromptBase`) y de `emotional-selling` para leads de anuncios.
- Quitar todo lo ligado al formato `<text>/<action>` y a las listas interactivas.
- Instrucciones explícitas de cuándo usar cada herramienta (por qué `tool_choice` es `auto`).
- Español LATAM neutro, sin voseo, sin emojis Unicode salvo copy WABA ya existente, «Pack» y nunca «Combo».
- No prometer reembolsos (la guarda `containsRefundPromise` se mantiene sobre la salida).
- No confirmar una cita ni un precio que no vengan de un `tool_result`.

## Qué se elimina (PR aparte, después de validar en producción)

Dispatcher y matchers (`dispatcher.ts`, `dispatch/*`, `menu-remap.ts`, `intent-shadow.ts`), listas y menús interactivos
(`menu.ts`, `menu-taps.ts`, `menu-ids.ts`), flujo de agendado por listas (`booking-flow.ts`, `agenda.ts` selectores),
`parseAIResponse` y `executeAIAction`. Lo que sobreviva se reubica: lógica de disponibilidad en `lib/`, pagos y
estados de cita como funciones puras. Meta: ~15K de las ~36K líneas de `whatsapp-webhook`.

No se elimina: pre-procesamiento de entrada, `send-*` y crons de reenganche/recordatorios, `held-slot-watch`,
`silence-watchdog`, plantillas WABA, `waba-chat-simulator`.

## Pruebas

1. **Unitarias** (Deno): ejecutores de herramientas (precio, slot ocupado, servicio inexistente, solapamiento), armado de historial, bucle con respuestas simuladas, degradación por timeout/refusal.
2. **Simulador existente** (`waba-chat-simulator`, `docs/waba/WABA_SIMULATION_VALIDATION.md`): correr el conjunto de casos reales (casos Mila …9883, Edgar …2122, Mirta …8754, Gimena …5978, Yelitza, SAM, boleta duplicada) contra el agente antes de prender el flag.
3. **QA en vivo** con los teléfonos `51999000978` a `999`: saludo, catálogo, precio, horario, ubicación, foto de referencia, pregunta mezclada, derivación a persona, opt-out, entrega al flujo de agendado y retorno.
4. **Métricas en producción** (tabla de uso existente): latencia p50/p95, tokens, costo por conversación, tasa de `derivar_a_persona`, errores de herramienta, bloqueos por guarda. Comparar contra el bot viejo en la misma ventana usando la rutina `rutina-waba-analysis.md`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El modelo inventa cita/precio/horario | Fase 2: la cita solo existe con ID de fila devuelto por la herramienta; precios y slots siempre del servidor; guarda `fabricated-booking-guard` como respaldo |
| Latencia mayor por bucle de herramientas | Haiku 5.5 es el más rápido de la línea; tope de iteraciones; ejecutar `tool_use` en paralelo cuando sean independientes |
| Falla transitoria de la API | Reintentar una vez y degradar a un menú útil de texto; nunca remitir al 932 |
| `refusal` del clasificador | Manejar `stop_reason`, responder con mensaje neutro y derivar a persona |
| Prompt grande y costo | Caché de 1 h (lectura a $0.01/MTok); medir tokens con el tokenizador nuevo (+30%) |
| Puente híbrido deja estados colgados | Regla única: el agente corre solo cuando `step` es `browsing` o `null`; prueba de retorno en QA |
| Regresión en producción | Flag por tenant + allowlist de teléfonos; rollback inmediato apagando el flag |
| Regla de `AGENTS.md` «regex permitido para dinero/citas» | Se reemplaza por «las herramientas validan en código»; actualizar `AGENTS.md` al cerrar Fase 2 |

## Entregables por fase

- **Fase 0 (previa):** este plan aprobado; constante de modelo y helper común de llamada a la API con los cambios de Haiku 5.5.
- **Fase 1:** `agent/` + herramientas de lectura + tools de carrito, `consultar_dia`/`consultar_equipo` y `reservar_horario` + flag/allowlist + pruebas + QA. PR 1.
- **Fase 2:** herramientas de citas e identidad/pago, extraídas de `payment.ts`, `pending-appointment.ts` y `booking-flow.ts`. PR 2 (puede dividirse por herramienta).
- **Fase 3:** borrar el bot viejo. PR 3, solo cuando el agente lleve al menos una semana estable en ZM Lash.
- **Cierre:** actualizar `ROADMAP.md`, `plan-haiku-primero-informativo.md`, `AGENTS.md`, `auditoria-intenciones-waba.md` y la rutina de análisis.

## Ejecución aprobada (2026-10-08)

### Fase 0 — limpieza previa (primer commit)

- Eliminar `scripts/waba-smoke-prompt-cache.ts` (smoke local de prompt caching con Haiku 4.5, usa `FINAL_FORMAT_REMINDER`). No tiene otras referencias.
- Los otros `waba-smoke-*.mjs` (retouch-reengage, same-day) no son de Haiku y se mantienen.

### Verificación

- `pnpm lint` y `pnpm check:types` (corregir errores preexistentes).
- Tests unitarios del loop: tool_use, refusal, error/timeout con reintento y menú útil (nunca remitir al 932 por falla transitoria).
- Simulador con casos de fallas históricas del bot.
- QA por WhatsApp con teléfonos `51999000978`–`999` y flag solo en allowlist; revisar `ai_usage` (costo y latencia) y logs.

### Rollback

`agent_enabled=false` devuelve todo a `dispatch` sin deploy.
