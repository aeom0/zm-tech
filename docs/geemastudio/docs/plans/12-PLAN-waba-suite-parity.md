> **Ubicación canónica consolidada:** Plan 12. El archivo de origen se conserva temporalmente como referencia legacy.

# Plan 12 — Suite WABA y paridad conversacional

> **Responsabilidad documental:** este plan conserva el detalle de implementación y QA de la suite WABA. El estado ejecutivo de migración vive en Plan 04; el criterio de paridad y go-live del panel completo vive en Plan 13.

> Estado: **suite WABA panel cerrada para Track A** (22-sep-2026) — Fases 0–5 (salvo promos/reenganchar) + Simulador F4 ✅. Siguiente fuera de WABA panel: finanzas ejecutiva / runtime bot (Plan 13).
>
> **Complemento obligatorio:** la paridad del panel **completo** (finanzas ejecutiva, shell, clientes→WA, crons del bot, promo broadcast, tenant scoping) vive en [`13-PLAN-panel-parity-zm-lash.md`](13-PLAN-panel-parity-zm-lash.md). Este Plan 12 solo cubre la suite WABA + deuda; no alcanza solo para "panel Geema ≥ ZM".

## Contexto

GeemaStudio es la generalización multi-tenant de ZM Lash & Nails Beauty. Antes de migrar a Vanessa (ZM) como tenant real, el panel WABA de GeemaStudio debe ser igual o mejor que el de ZM Lash canónico — hoy no lo es: le faltan la mayoría de los editores de configuración del bot, el inbox es solo-lectura, no hay simulador ni analytics, y "Promos Masivas"/"Reenganchar" no existen en absoluto. Prioridad #1 marcada explícitamente por Alberto, junto con limpiar 3 items de deuda técnica ya identificados en una auditoría previa.

**Repriorización (20-sep, auditoría Plan 13):** en ZM, **Campañas** es la puerta de entrada del módulo WA (`AdminNav` → `/panel/waba/campanas`) e **Historial** es uso desktop diario — no tratarlos como "opcional nice-to-have". Tras Fases 2–3 de este plan, ejecutar campañas + historial **antes** de portafolio/promos; simulador sigue después de inbox (QA pre go-live). Detalle y scorecard en Plan 13.

Investigación (3 agentes Explore + lectura directa de `20260406_waba_multitenant.sql` y `useWabaStatus.ts`) confirmó además dos bloqueos reales no reportados antes:

1. **Bug de tipo `tenant_id`**: la migración declara `waba_config.tenant_id UUID NOT NULL REFERENCES tenant_settings(id)` (igual en `whatsapp_sessions`, `wa_messages`). El webhook real (`tenant-resolver.ts`) usa ese UUID consistentemente. Pero el panel web (`useWabaStatus.ts`, función `resolveTenantSlugForWrites()`) resuelve deliberadamente un **slug de texto** y lo usa como `tenant_id` al hacer `upsert` en `waba_config` — comentario en el propio código dice "usan tenant_id = slug (texto), no UUID", lo cual contradice la migración. Resultado: o el `upsert` del panel falla (`invalid input syntax for type uuid`), o si la columna real en prod ya fue alterada informalmente, el panel escribe filas que el bot nunca lee. Cualquiera de los dos escenarios es inaceptable para construir más UI encima.
2. **RLS bloqueante**: `waba_config`, `whatsapp_sessions`, `wa_messages` solo tienen policy `service_role_only` (`TO service_role USING (true)`), sin ninguna policy para `authenticated`. El panel usa el cliente browser con `NEXT_PUBLIC_SUPABASE_ANON_KEY` (rol `authenticated`/`anon`), así que las lecturas actuales del panel (`useHaikuConfig`, `useWabaMessages`) deberían estar denegadas por RLS en producción real — es un bloqueo funcional, no solo un riesgo teórico.

Ambos deben resolverse primero; todo lo demás en WABA se construye sobre estas dos tablas.

> **Nota (21-sep-2026, port de Campañas):** al portar la pestaña Campañas (`/panel/waba/campanas`, ver Fase 5 más abajo) se verificó en vivo lo contrario a lo que asume este bloqueo: `resolveTenantSlugForWrites()` (slug de texto) **ya guarda correctamente** vía `useHaikuConfig.ts` en producción, y las lecturas `SELECT * FROM waba_config WHERE category = '...'` con la anon key **ya devuelven datos reales** (45 filas de `campanas` para `zm-lash-nails`) sin pasar por ninguna API route server-side. Es decir, ninguno de los dos bloqueos de Fase 1 se confirmó al construir sobre estas tablas — o ya fueron resueltos informalmente en prod, o el análisis original era incorrecto. No se investigó a fondo el porqué (posible RLS con policy adicional para `authenticated` no documentada aquí, o columna `tenant_id` ya en texto pese a lo que dice la migración versionada). Antes de invertir en la Fase 1 tal como está escrita (mover todo a API routes, migrar a UUID), confirmar con Alberto el estado real de la columna/policies — puede que ya no sea bloqueante.
>
> **Confirmado (21-sep-2026, `execute_sql` solo lectura sobre `udelxwwnyivknslueerr`):** ambos bloqueos de Fase 1 son inexistentes en prod hoy, la migración versionada `20260406_waba_multitenant.sql` no refleja el estado real de la BD.
> - `information_schema.columns` muestra `waba_config.tenant_id`, `wa_messages.tenant_id` y `whatsapp_sessions.tenant_id` como **`text`**, no `uuid` — coincide con lo que escribe `resolveTenantSlugForWrites()` (slug). No hay FK a `tenant_settings(id)` en ninguna de las tres tablas (`information_schema.table_constraints` solo devuelve `waba_config_updated_by_fkey`). El "bug de tipo" descrito arriba no existe en la BD real; probablemente la migración versionada quedó desactualizada respecto a un `ALTER TABLE` aplicado directo en el Dashboard.
> - `pg_policies` muestra políticas reales por tabla, no solo `service_role_only`: `waba_config_admin_only`, `admins_read_wa_messages`/`admins_delete_wa_messages`, `"Whatsapp sessions admin only"` — todas condicionadas a `profiles.role IN ('dev','owner')` (o `is_admin()`) **y** `tenant_id = current_tenant_id()`. `current_tenant_id()` lee el claim `tenant_id` del JWT (`auth.jwt() ->> 'tenant_id'`), es decir texto — coherente con el slug que usa el panel, no con UUID.
>
> **Conclusión:** Fase 1 tal como está redactada (migrar a UUID + mover todo a API routes) no aplica al estado actual de prod — haría **más** frágil el acceso (rompería el JWT claim `tenant_id` que ya funciona) sin resolver ningún bug real. Se cierra sin cambios de código. Si en el futuro se necesita mover a API routes (p. ej. por auditoría/logging), es una decisión de arquitectura nueva, no una corrección de bug.

**Fuera de alcance explícito**: el "go live" de ZM en GeemaStudio (DNS + activar fila real `zm-lash-nails`) — eso requiere aprobación aparte de Vanessa/Alberto y ya está documentado como pendiente en [`10-PLAN-mi-web-cms-fase2.md`](10-PLAN-mi-web-cms-fase2.md). Todo el trabajo de este plan se prueba con un tenant/teléfono de prueba dentro de GeemaStudio.

## Fase 0 — Deuda técnica (independiente de WABA, hacer primero)

> **Cerrada (21-sep-2026) — los 3 items ya estaban resueltos en el código actual, sin registro en este plan de cuándo/cómo.** Verificado por lectura directa, no se tocó código en esta revisión:
> 1. `useFinancesData.ts` — no queda ningún `emp-vanessa`/fallback por nombre; línea 353 usa solo `employeesList.find((e) => e.role === 'owner')`.
> 2. `finanzas/login/page.tsx` — no existe `DEMO_PASSWORD`/`DEMO_EMAILS` ni prefill demo; el archivo (147 líneas) es un login estándar con `useAuth().login(email, password)`.
> 3. `panel/configuracion/page.tsx` (~línea 490) — el copy ya dice "El routing técnico ya está listo — falta el paso operativo: apuntar el DNS de tu dominio a Geema y activarlo", no el texto stale original.

1. ~~**`apps/geemastudio-mobile/screens/finances/hooks/useFinancesData.ts:352-360`**: quitar `e.id === 'emp-vanessa'` y el fallback `.name.toLowerCase().includes('vanessa')`.~~
2. ~~**`apps/geemastudio-web/src/app/finanzas/login/page.tsx:9-16`**: gatear `DEMO_PASSWORD`/`DEMO_EMAILS`.~~
3. ~~**`apps/geemastudio-web/src/app/panel/configuracion/page.tsx` (~línea 490)**: actualizar copy de dominio custom stale.~~

Verificación: `pnpm lint`, `pnpm check:types` en `geemastudio-web`/`geemastudio-mobile`.

## Fase 1 — Fundaciones WABA (bloqueante para todo lo demás)

> **Cerrada (21-sep-2026) — items 1-3 no aplican al estado real de prod, confirmado por SQL de solo lectura (ver nota arriba). Item 4 sigue abierto, no investigado en esta revisión.**

1. ~~**Confirmar estado real en prod**~~ — hecho: `tenant_id` es `text` en las 3 tablas, sin FK a `tenant_settings`.
2. ~~**Unificar en UUID**~~ — no aplica: no hay bug, el panel y el bot ya coinciden en usar texto (slug) via el claim JWT `tenant_id`. Migrar a UUID *introduciría* una regresión, no la arreglaría.
3. ~~**Resolver RLS**~~ — no aplica: ya existen policies reales por tabla (`waba_config_admin_only`, `admins_read_wa_messages`, `admins_delete_wa_messages`, `"Whatsapp sessions admin only"`), todas con `role IN ('dev','owner')` + `tenant_id = current_tenant_id()`. No hay que mover nada a API routes para resolver un bloqueo — ese bloqueo no existe.
4. ~~**Eliminar o documentar el webhook huérfano**~~ — **eliminado (21-sep-2026)**. Confirmado por Graph API (`GET /{WABA_ID}/subscribed_apps` con `WHATSAPP_ACCESS_TOKEN` de zm-lash) que existe una única app de Meta suscrita a este WABA: `ZMLashNails_Oficial` (app_id `2508770349526249`) — Alberto confirmó que es la única app que ha creado. El bot real de ZM corre por la Edge Function `whatsapp-webhook` de Supabase, no por Next.js, así que esa app no puede estar apuntando a `apps/geemastudio-web`. Se borró `apps/geemastudio-web/src/app/api/waba/webhook/route.ts` (y la carpeta `api/waba/` que quedó vacía) más la sección "Webhook WABA (Meta)" de `docs/geemastudio/README.md`, que documentaba este endpoint nunca terminado (escribía a `public.waba_inbound_messages`, tabla inexistente en prod).

Verificación (histórica, ya no aplica a 1-3): ~~`pnpm check:types`, `pnpm lint`; crear tenant de prueba...~~

## Fase 2 — Editor Haiku completo

**Hecho (21-sep-2026).** Extendido `apps/geemastudio-web/src/app/panel/waba/haiku/page.tsx` (antes solo editaba `haiku_system_prompt`) a orquestador de 4 sub-secciones + panel de test, siguiendo el patrón de ZM (`ZM-Lash-and-Nails-Beauty/apps/web/src/app/panel/waba/haiku/_components/*`):

- `_components/SystemPromptEditor.tsx` (extraído/adaptado de la page anterior; Cmd/Ctrl+S, contador de caracteres)
- `_components/TriggerKeywordsEditor.tsx` — key `haiku_trigger_keywords`, chips para `recommendation`/`free_question`/`blocked`
- `_components/WelcomeGreetingEditor.tsx` — key `haiku_settings` (incluye bloque avanzado JSON crudo para `welcome_slot_context`/`welcome_fallback_ad`/`welcome_fallback_organic`, como en ZM)
- `_components/BlockedNumbersEditor.tsx` — key `blocked_phone_numbers`, normalización `/\D+/g`, mínimo 8 dígitos; mismo shape (`{phones: string[]}`) y `sort_order: 4` que `useWabaModeration.ts`, invalida `['web_waba_blocked']` al guardar para no desincronizar con el bloqueo rápido de Mensajes
- `_lib/defaultHaikuConfig.ts` — copiado desde `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/haiku-cms-defaults.ts` (no hay import compartido cliente↔edge; comentario explícito de sincronización manual en el archivo). `blocked_phone_numbers` no tiene default: Geema no hereda la lista de spam de ZM, arranca vacía.
- `useHaikuConfig.ts` ampliado a un solo `SELECT ... .in('config_key', [4 keys])`, con `resolveTenantSlugForWrites()` (no `tenantIdFromAccessToken` como ZM) y queryKey `web_waba_haiku_config` (convención `web_waba_*` de Geema, no `['waba_config','haiku']` de ZM)

**Test de personalidad**: `_components/HaikuTestPanel.tsx` invoca `test-haiku-preview` — **no se creó una Edge Function nueva** (desviación deliberada del texto original de esta fase). Se descubrió que Geema y ZM comparten el mismo proyecto Supabase (`udelxwwnyivknslueerr`) y que la función `test-haiku-preview` de ZM ya está desplegada ahí con el mismo contrato (`{systemPrompt, userMessage, maxTokens, timeoutMs}` → `{text, inputTokens, outputTokens, latencyMs}`), gateada por rol `dev|owner` server-side. Reusarla evita un deploy a producción compartida sin necesidad. **Caveat conocido, no bloqueante**: esa función usa `AsyncLocalStorage` para resolver el tenant en `ai_usage_log` y por defecto cae a `"zm-lash-nails"` cuando se invoca fuera del request-wrapper de ZM — o sea, las pruebas disparadas desde el panel de Geema quedan registradas como si fueran de ZM en esa tabla de analítica. No afecta la respuesta del bot ni RLS de `waba_config`.

Verificación: `pnpm --filter geemastudio-web check:types` y `pnpm --filter geemastudio-web lint` limpios. Falta verificación manual en navegador (login admin, editar cada sub-sección, confirmar guardado y sync con Mensajes/bloqueo).

## Fase 3 — Inbox / mensajes: consola de staff (uso diario)

> Auditoría 20-sep-2026: el panel ZM no es “lista + burbujas”. Es una **consola de staff** (~2 000 líneas en `mensajes/_components` + hook) frente al MVP Geema (~190 líneas, solo lectura). Vanessa lo usa a diario: atender manual, pausar bot, mandar foto, bloquear. Portar al nivel ZM — no un composer mínimo.

**Ref canónica ZM** (`ZM-Lash-and-Nails-Beauty/apps/web/src/app/panel/waba/mensajes/`):

| Pieza | Path | Rol |
|-------|------|-----|
| Shell | `_components/WabaMensajesClient.tsx` | split lista/hilo, `?phone=`, mobile stack |
| Lista | `ConversationList` + `ConversationItem` | unread, pausado, BSUID, preview |
| Hilo | `MessageThread.tsx` (~856 líneas) | composer + acciones staff |
| Burbujas | `MessageBubble.tsx` | media, ticks, plantillas, quotes |
| Datos | `_hooks/useWabaMessages.tsx` | catálogo → labels, poll 10s |
| Labels | `templateLabels.ts`, `resolveWabaContent` | IDs bot / plantillas Meta legibles |

Hoy Geema: `apps/geemastudio-web/src/app/panel/waba/mensajes/page.tsx` + `hooks/waba/useWabaMessages.ts` — solo lectura, sin composer, sin EFs.

### Backend (prerequisito; alinear con Plan 13 Fase R1)

- EF `apps/geemastudio-server/supabase/functions/send-whatsapp-notification/` — `POST { phone, message | imageUrl, pauseBot }` (genérica; hoy solo `notifyAdminPhonesWa()` interno). Enviar texto/imagen **debe** poder pausar el bot (`pauseBot: true`), igual que ZM.
- EF `apps/geemastudio-server/supabase/functions/waba-staff-session/` — `POST { phone, action }` con acciones ZM reales:
  - `pause_bot` / `resume_bot`
  - `haiku_finish_booking` (bot retoma booking tras atención manual — **no** usar `end` genérico sin mapear)
  - Rol: `dev` \| `owner` \| `staff`
- Bucket Storage `waba-images/staff-outbound/{phone}/{timestamp}.{ext}` — crear si no existe (**confirmación Alberto** antes de aplicar).
- Tras Fase 1: lecturas/escrituras del panel vía API routes (anon directo a `wa_messages` / `whatsapp_sessions` / `waba_config` sigue denegado por RLS).
- Polling lista + hilo **10s / 10s** (ZM); Geema hoy 45s / 20s — subir al portar.

### Frontend — estructura a portar

Modularizar como ZM (no hinchar `page.tsx`):

```
panel/waba/mensajes/
  page.tsx                         # wrapper auth + WabaMensajesClient
  _components/
    WabaMensajesClient.tsx
    ConversationList.tsx
    ConversationItem.tsx
    MessageThread.tsx
    MessageBubble.tsx
    EmptyState.tsx
    templateLabels.ts              # generalizar: sin slugs _zm hardcodeados como única fuente
    time.ts
  _hooks/useWabaMessages.ts        # o reusar hooks/waba/ ampliado
```

Copy UI en español neutro (**sin voseo**): corregir el “Elegí una conversación” actual → “Elige una conversación”.

### Checklist Done — Mensajes (criterio Vanessa-usable)

> **Auditoría de código 21-sep-2026:** el doc estaba desactualizado — commits previos (`8f8f002e`, `0a224707`, `f1e5ff28`, `f0694b87`) ya habían cerrado la mayoría de P0/P1 sin reflejarlo aquí. Esta sesión verificó cada ítem contra el código real (no contra el plan) y cerró los 4 gaps que sí faltaban: **M10, M12, M14, M18**.

#### P0 — ops mínimo (bloqueante para cerrar Fase 3)

- [x] M1 — Enviar texto vía `send-whatsapp-notification` con `pauseBot: true` + optimistic UI + refetch
- [x] M2 — Pausar bot / Reactivar bot vía `waba-staff-session` (`pause_bot` / `resume_bot`)
- [x] M3 — Badge header “Bot activo” / “Bot en pausa” (lee `whatsapp_sessions.bot_paused_at`)
- [x] M4 — Banner ámbar cuando pausado (sin la frase de push — PR-09 P15 no confirmado, omitida como indica la nota)
- [x] M5 — Composer: Enter envía, Shift+Enter salto; aviso ventana **24h** Meta bajo el input
- [x] M6 — Polling lista + hilo 10s / 10s (ya no 45s/20s)
- [x] M7 — Split lista/hilo desktop; stack mobile con back

#### P1 — mismo día ops

- [x] M8 — Adjuntar / enviar imagen, audio y documento (clip → Storage → EF; pausa bot)
- [x] M9 — Bloquear / desbloquear número (`waba_config` key `blocked_phone_numbers`, misma que Haiku Fase 2)
- [x] M10 — Copiar nombre + número (+ `@username` si hay) al portapapeles — **cerrado 21-sep**: `MessageThread.tsx` solo copiaba el número; ahora arma `[displayName, displayPhone, "@username"]` y copia el string combinado
- [x] M11 — Deep link `?phone=` (`page.tsx`, `useEffect` sobre `searchParams`)
- [x] M12 — Preview lista: `resolveWabaContent` — **cerrado 21-sep**: no existía; agregado a `useWabaMessages.ts` con catálogo `services`/`packs`/`promotions`, aplicado a `lastMessage` (lista) y al hilo. Sin emojis Unicode (regla de UI del panel) — labels en texto plano (`"Promo: X"`, `"Pack: Y"`) en vez de los prefijos 🏷️/💅/📦 de la referencia ZM
- [x] M13 — Badge “Bot en pausa” + badge `N in · 24h` en ítem de lista

#### P1.5 — lectura rica (paridad burbujas)

- [x] M14 — Select hilo incluye `image_url`, `audio_url`, `document_url`, `delivery_status`, `delivery_error` (ya estaban) + `reply_image_url`, `reply_to_wamid` — **agregados 21-sep** (columnas ya existían en prod, confirmado por `execute_sql` contra `udelxwwnyivknslueerr`; solo faltaba el select/tipo) + render de `QuoteCard` en `MessageBubble.tsx`
- [x] M15 — Burbuja imagen (thumb + abrir); sticker no tiene tratamiento propio, cae en burbuja genérica
- [x] M16 — Burbuja audio (`<audio controls>`)
- [x] M17 — Ticks delivery outbound: `accepted`/`sent`/`delivered`/`read`/`failed` — **cerrado 21-sep**: `WabaDeliveryStatus` no incluía `'accepted'` en el tipo y `DeliveryTicks` colapsaba `accepted`/`sent` en el mismo ícono; ahora distingue los 5 estados con tooltip por estado (`title`), igual que ZM
- [x] M18 — Plantillas Meta: estilo distinto + label amigable — **cerrado 21-sep**: `templateLabels.ts` creado (generalizado, sin mapa `_zm` hardcodeado — solo fallback `friendlyTemplateName`/`formatTemplatePreview`); bubble violeta + ícono `FileText` en `MessageBubble.tsx`. Backend nota: el webhook de Geema aún no emite `[plantilla:slug]` en `content` (eso vive en `index.ts`/`booking-flow.ts` de ZM, no portado) — la UI está lista pero inactiva hasta que se porte esa parte del dispatcher
- [x] M19 — BSUID Meta (`^[A-Z]{2}\.`) + `wa_username` + badge “Sin teléfono”; match `clients.wa_user_id`

#### P2 — nice-to-have pre go-live

- [x] M20 — **Haiku agenda** (`haiku_finish_booking`) en banner de bot pausado — **cerrado 21-sep**: botón "Haiku agenda" agregado al banner ámbar de `MessageThread.tsx` (visible solo con `conversation.botPaused`), llama `useWabaStaffSession` con la nueva acción `haiku_finish_booking` (agregada a `StaffSessionAction` en `useWabaSend.ts`). Confirmado por `mcp__ClaudeSupabase__get_edge_function` que la función compartida `waba-staff-session` (mismo proyecto `udelxwwnyivknslueerr`, deploy de ZM) ya soporta esa acción — sin cambios de backend
- [x] M21 — Eliminar conversación (confirm → delete `wa_messages` + `whatsapp_sessions` del phone)
- [x] M22 — Reacciones emoji + quote/reply card (`↳` / `reply_image_url`) — quote card cerrado con M14; reacciones (`msg_type === 'reaction'`) **cerradas 21-sep**: burbuja emoji grande o "quitó su reacción" si viene vacía/con corchete, sin sufijo `· reaction` redundante en el footer
- [x] M23 — Interactive / button bubbles con ícono — **cerrado 21-sep**: `MessageBubble.tsx` distingue `msgType === 'interactive'` (ícono `List`) y `'button'` (ícono `MousePointerClick`, itálica), igual que ZM; ambos excluidos del sufijo `· <tipo>` redundante en el footer

**Fase 3 P0 + P1 + P1.5 + P2 están ✅ cerrados.** Ninguno de los ítems pendientes bloquea uso diario del inbox. Sigue pendiente, aparte del checklist: decidir si vale la pena portar el formateo de quotes/plantillas del dispatcher de ZM a Geema para que M14/M18 tengan datos reales en producción (hoy la UI está lista pero el webhook de Geema no emite `[plantilla:slug]` ni el marcador `↳` todavía).

### Fuera de alcance de Fase 3

- Simulador (Fase 4), campañas/historial (Fase 5), promo broadcast (Plan 13 R5).
- Realtime Supabase (ZM usa polling; mantener polling).

## Fase 4 — Simulador de conversación (fase separada, mayor esfuerzo)

> **Hecho (22-sep-2026) — solo frontend.** Reutiliza la EF `waba-chat-simulator` ya desplegada en `udelx…` (repo ZM); no se copió a `geemastudio-server`. UI: `/panel/waba/simulador` + tab nav. Misma API que ZM (`start_session` / `send_message` / `reset_session`, phones QA `51988800001`/`002`). Caveat: el dispatch del simulador usa el webhook ZM en prod (tenant `zm-lash-nails`); adecuado para validar el bot del tenant #1 antes del cutover Vanessa.

~~Portar el patrón de fidelidad total de ZM: Edge Function `apps/geemastudio-server/supabase/functions/waba-chat-simulator/`…~~

## Fase 5 — Campañas, historial, portafolio (repriorizado 20-sep)

> Antes: "opcional". Tras auditoría Plan 13: **campañas + historial = P1** post Fases 2–3; portafolio = P2 pre go-live si el bot sirve portfolio; promos/reenganchar → Plan 13 Fase R.

Orden sugerido dentro de esta fase:

1. ~~**Campañas/CTWA** (P1): sin schema nuevo, `config_key` bajo `category='campanas'` en `waba_config`. Port mínimo de `CampanasClient.tsx` + secciones de contenido bot. En ZM es la entrada del módulo WA.~~ **Hecho (21-sep-2026).** Portado `CampanasClient.tsx` (17 config keys: hero, servicios, extensiones, lifting, tardanza, emotional CTWA) + `useCampanasConfig.ts` + `ConfigImageCard`/`ConfigTextCard` (tema oscuro, no el light de ZM) + `useImageUpload.ts`, todos con `resolveTenantSlugForWrites()` ya existente (sin cambios a Fase 1). Gate admin propio (`useIsAdmin()` local en el componente, no `useAuth()` — ver nota abajo). Tab "Campañas" agregado a `WabaNav.tsx`. **No portado** (fuera de alcance de esta iteración): `ContenidoBotSection.tsx` (categoría `mensajes`). `pnpm check:types`/`pnpm lint` limpios en `geemastudio-web`. Falta verificación manual en navegador (login admin `zm-lash-nails`, editar 1 campo, confirmar `updated_at`).
   - **Gap descubierto:** `useAuth()`/`AuthContext` (con `isAdmin`) solo está envuelto en `/finanzas`, no en `/panel/*` — cualquier gate de admin bajo `/panel/waba/*` debe resolver el rol por su cuenta (memoria: `project_geemastudio_web_panel_no_authcontext.md`). Ninguna otra pestaña de `/panel/waba/*` (`haiku`, `mensajes`) tiene gate de admin hoy; confían en RLS silenciosamente.
2. ~~**Historial/analytics** (P1.5): sin migración nueva — queries sobre `wa_messages`/`ai_usage_log`. Portar `useWabaHistorial.ts` y sub-componentes (`VolumeChart`, `SummaryStatsStrip`, `ActivityHeatmap`, `TopFlowsCard`, `HaikuUsageCard`) a `apps/geemastudio-web/src/app/panel/waba/historial/`.~~ **Hecho (22-sep-2026).** Ruta `/panel/waba/historial` + tab en `WabaNav`. Hook y cards portados con tema oscuro Geema (`--tenant-primary`), deps `recharts` + `date-fns-tz`. Copy multi-vertical ("Clientes únicos"). RLS `admins_read_wa_messages` / `ai_usage_log_admin_select` filtra por `current_tenant_id()` (sin `.eq` explícito, igual que ZM). Verificación: `pnpm --filter geemastudio-web check:types`.
3. ~~**Portafolio** (P2): requiere migración `service_portfolio_images` (`id, service_id, image_url, caption, sort_order CHECK(0..3)`) — confirmación antes de aplicar. Bucket `waba-images/portfolio/{serviceId}/{index+1}.jpg`.~~ **Hecho (22-sep-2026).** **Sin migración nueva**: tabla + RLS + bucket `waba-images` ya existen en prod (`udelx…`). Port: `usePortfolioConfig.ts` (hooks/waba) + `/panel/waba/portafolio` + tab nav. Upsert escribe `tenant_id` vía `resolveTenantSlugForWrites()` (mejora vs ZM que confía en default). Gate admin local (mismo patrón Campañas). Reusa `ConfigImageCard` + `useImageUpload`. Verificación: `pnpm check:types` / `lint`.
4. **Promos Masivas / Reenganchar**: no mezclar aquí — ver Plan 13 Fase R (`send-promo-whatsapp`, `send-retouch-reengage` + UI stepper).

## Verificación transversal

- `pnpm lint` + `pnpm check:types` después de cada fase (web y, para Edge Functions, `deno check`/`deno lint` local si está disponible).
- Tenant de prueba dedicado dentro de GeemaStudio (`features_waba=true`, `waba_phone_number_id` de sandbox Meta) para probar todo el flujo sin tocar el número real de ZM.
- Cualquier migración SQL a `udelxwwnyivknslueerr` se presenta a Alberto explícitamente antes de ejecutarse (Dashboard SQL Editor o Management API — nunca asumir que `db:push`/`supabase db query --linked` funcionan en este WSL).

## Archivos críticos

- `apps/geemastudio-server/supabase/migrations/20260406_waba_multitenant.sql`
- `apps/geemastudio-web/src/hooks/waba/useWabaStatus.ts`
- `apps/geemastudio-web/src/hooks/waba/useHaikuConfig.ts`
- `apps/geemastudio-web/src/hooks/waba/useWabaMessages.ts` (MVP RO → ampliar en Fase 3)
- `apps/geemastudio-web/src/app/panel/waba/mensajes/page.tsx` (reemplazar por shell modular)
- `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/waba-config.ts`
- `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/tenant-resolver.ts`
- `apps/geemastudio-web/src/app/api/waba/webhook/route.ts` (a eliminar/documentar)
- **Ref inbox ZM:** `.../panel/waba/mensajes/_components/MessageThread.tsx`, `MessageBubble.tsx`, `_hooks/useWabaMessages.tsx`
- **Ref EFs ZM:** `.../supabase/functions/send-whatsapp-notification/`, `waba-staff-session/`
- `ZM-Lash-and-Nails-Beauty/apps/web/src/app/panel/waba/haiku/_hooks/useHaikuConfig.ts` (referencia de patrón)
- `apps/geemastudio-mobile/screens/finances/hooks/useFinancesData.ts`
- `apps/geemastudio-web/src/app/finanzas/login/page.tsx`
- `apps/geemastudio-web/src/app/panel/configuracion/page.tsx`

Paridad panel completa (finanzas, shell, crons): [`13-PLAN-panel-parity-zm-lash.md`](13-PLAN-panel-parity-zm-lash.md).
