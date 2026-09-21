# WABA — paridad de suite GeemaStudio vs. ZM Lash + deuda técnica

> Estado: **planificado** (20-sep-2026), pendiente de inicio de implementación.
>
> **Complemento obligatorio:** la paridad del panel **completo** (finanzas ejecutiva, shell, clientes→WA, crons del bot, promo broadcast, tenant scoping) vive en [`12-PLAN-panel-parity-zm-lash.md`](12-PLAN-panel-parity-zm-lash.md). Este Plan 11 solo cubre la suite WABA + deuda; no alcanza solo para "panel Geema ≥ ZM".

## Contexto

GeemaStudio es la generalización multi-tenant de ZM Lash & Nails Beauty. Antes de migrar a Vanessa (ZM) como tenant real, el panel WABA de GeemaStudio debe ser igual o mejor que el de ZM Lash canónico — hoy no lo es: le faltan la mayoría de los editores de configuración del bot, el inbox es solo-lectura, no hay simulador ni analytics, y "Promos Masivas"/"Reenganchar" no existen en absoluto. Prioridad #1 marcada explícitamente por Alberto, junto con limpiar 3 items de deuda técnica ya identificados en una auditoría previa.

**Repriorización (20-sep, auditoría Plan 12):** en ZM, **Campañas** es la puerta de entrada del módulo WA (`AdminNav` → `/panel/waba/campanas`) e **Historial** es uso desktop diario — no tratarlos como "opcional nice-to-have". Tras Fases 2–3 de este plan, ejecutar campañas + historial **antes** de portafolio/promos; simulador sigue después de inbox (QA pre go-live). Detalle y scorecard en Plan 12.

Investigación (3 agentes Explore + lectura directa de `20260406_waba_multitenant.sql` y `useWabaStatus.ts`) confirmó además dos bloqueos reales no reportados antes:

1. **Bug de tipo `tenant_id`**: la migración declara `waba_config.tenant_id UUID NOT NULL REFERENCES tenant_settings(id)` (igual en `whatsapp_sessions`, `wa_messages`). El webhook real (`tenant-resolver.ts`) usa ese UUID consistentemente. Pero el panel web (`useWabaStatus.ts`, función `resolveTenantSlugForWrites()`) resuelve deliberadamente un **slug de texto** y lo usa como `tenant_id` al hacer `upsert` en `waba_config` — comentario en el propio código dice "usan tenant_id = slug (texto), no UUID", lo cual contradice la migración. Resultado: o el `upsert` del panel falla (`invalid input syntax for type uuid`), o si la columna real en prod ya fue alterada informalmente, el panel escribe filas que el bot nunca lee. Cualquiera de los dos escenarios es inaceptable para construir más UI encima.
2. **RLS bloqueante**: `waba_config`, `whatsapp_sessions`, `wa_messages` solo tienen policy `service_role_only` (`TO service_role USING (true)`), sin ninguna policy para `authenticated`. El panel usa el cliente browser con `NEXT_PUBLIC_SUPABASE_ANON_KEY` (rol `authenticated`/`anon`), así que las lecturas actuales del panel (`useHaikuConfig`, `useWabaMessages`) deberían estar denegadas por RLS en producción real — es un bloqueo funcional, no solo un riesgo teórico.

Ambos deben resolverse primero; todo lo demás en WABA se construye sobre estas dos tablas.

> **Nota (21-sep-2026, port de Campañas):** al portar la pestaña Campañas (`/panel/waba/campanas`, ver Fase 5 más abajo) se verificó en vivo lo contrario a lo que asume este bloqueo: `resolveTenantSlugForWrites()` (slug de texto) **ya guarda correctamente** vía `useHaikuConfig.ts` en producción, y las lecturas `SELECT * FROM waba_config WHERE category = '...'` con la anon key **ya devuelven datos reales** (45 filas de `campanas` para `zm-lash-nails`) sin pasar por ninguna API route server-side. Es decir, ninguno de los dos bloqueos de Fase 1 se confirmó al construir sobre estas tablas — o ya fueron resueltos informalmente en prod, o el análisis original era incorrecto. No se investigó a fondo el porqué (posible RLS con policy adicional para `authenticated` no documentada aquí, o columna `tenant_id` ya en texto pese a lo que dice la migración versionada). Antes de invertir en la Fase 1 tal como está escrita (mover todo a API routes, migrar a UUID), confirmar con Alberto el estado real de la columna/policies — puede que ya no sea bloqueante.

**Fuera de alcance explícito**: el "go live" de ZM en GeemaStudio (DNS + activar fila real `zm-lash-nails`) — eso requiere aprobación aparte de Vanessa/Alberto y ya está documentado como pendiente en [`10-PLAN-mi-web-cms-fase2.md`](10-PLAN-mi-web-cms-fase2.md). Todo el trabajo de este plan se prueba con un tenant/teléfono de prueba dentro de GeemaStudio.

## Fase 0 — Deuda técnica (independiente de WABA, hacer primero)

1. **`apps/geemastudio-mobile/screens/finances/hooks/useFinancesData.ts:352-360`**: quitar `e.id === 'emp-vanessa'` y el fallback `.name.toLowerCase().includes('vanessa')`. Dejar solo `employeesList.find((e) => e.role === 'owner')`. El fallback por nombre es peligroso en multi-tenant (puede atribuir house-cut a un empleado que se llame "Vanessa" en otro tenant) y no protege el caso real que pretendía cubrir.
2. **`apps/geemastudio-web/src/app/finanzas/login/page.tsx:9-16`**: `DEMO_PASSWORD`/`DEMO_EMAILS` siempre activos sin gate de entorno. Gatear detrás de `process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === 'true'` (default false en prod). Confirmar antes con Alberto si el prefill demo es un tour de ventas intencional — si sí, documentar por qué se deja público en vez de gatear.
3. **`apps/geemastudio-web/src/app/panel/configuracion/page.tsx` (~línea 490)**: el copy "Informativo por ahora — Geema no enruta dominio custom aún" quedó stale desde que se implementó `middleware.ts` (commit `065f9c10`). Actualizar el texto para reflejar que el routing técnico ya existe y solo falta el paso operativo (DNS + flag) de activación.

Verificación: `pnpm lint`, `pnpm check:types` en `geemastudio-web`/`geemastudio-mobile`.

## Fase 1 — Fundaciones WABA (bloqueante para todo lo demás)

1. **Confirmar estado real en prod** (`udelxwwnyivknslueerr`) del tipo de `waba_config.tenant_id` y si ya existen filas — usar `mcp__SupabaseZMTech__execute_sql` (solo lectura) antes de asumir que el archivo de migración versionado refleja la realidad.
2. **Unificar en UUID** (el bot real, fuente de verdad activa, ya usa UUID): reemplazar `resolveTenantSlugForWrites()` en `apps/geemastudio-web/src/hooks/waba/useWabaStatus.ts` por resolución del UUID de `tenant_settings.id` (ya calculado como `tenantSettingsId` en `useWabaStatus()` — reusar esa fuente en vez del parseo manual de JWT). Si hay filas existentes con `tenant_id` de texto, backfill vía migración de datos aplicada por Dashboard SQL Editor o Management API (el pooler está bloqueado en WSL) — **marcar para confirmación explícita de Alberto antes de aplicar a prod**.
3. **Resolver RLS**: mover las lecturas/escrituras del panel detrás de API routes server-side de Next.js que usan `supabaseAdmin` y validan sesión + rol (`dev|owner|staff`) manualmente, en vez de exponer estas tablas a RLS por JWT claim (frágil, como ya demuestra el parseo actual). Crear:
   - `apps/geemastudio-web/src/app/api/waba/config/route.ts` (GET/PUT `waba_config`)
   - `apps/geemastudio-web/src/app/api/waba/messages/route.ts` (GET conversaciones/hilo)
   - Actualizar `useHaikuConfig.ts` y `useWabaMessages.ts` para llamar estas rutas en vez de `supabase.from(...)` directo desde el browser.
4. **Eliminar o documentar el webhook huérfano** `apps/geemastudio-web/src/app/api/waba/webhook/route.ts` (usa `waba_inbound_messages`, tabla inexistente en migraciones). Verificar primero con grep que nada en Meta Business Manager apunta a esta ruta antes de borrar; si no se puede confirmar, dejar TODO explícito en vez de eliminar a ciegas.

Verificación: `pnpm check:types`, `pnpm lint`; crear tenant de prueba con `features_waba=true` y un `waba_phone_number_id` sandbox; guardar un config desde el panel y confirmar por `execute_sql` (MCP, solo lectura) que la fila queda con el mismo `tenant_id` (UUID) que usa el webhook para ese `phone_number_id`. Confirmar también que un `fetch` directo del browser con la anon key contra `wa_messages`/`waba_config` sigue denegado (RLS intacto) y que solo las nuevas API routes tienen acceso.

## Fase 2 — Editor Haiku completo

Extender `apps/geemastudio-web/src/app/panel/waba/haiku/page.tsx` (hoy solo edita `haiku_system_prompt`) a 4 sub-secciones, siguiendo el patrón de ZM (`ZM-Lash-and-Nails-Beauty/apps/web/src/app/panel/waba/haiku/_components/*`):

- `_components/SystemPromptEditor.tsx` (extraído de la page actual)
- `_components/TriggerKeywordsEditor.tsx` — key `haiku_trigger_keywords`, chips para `recommendation`/`free_question`/`blocked`
- `_components/WelcomeGreetingEditor.tsx` — key `haiku_settings` (incluye bloque avanzado JSON crudo, como en ZM)
- `_components/BlockedNumbersEditor.tsx` — key `blocked_phone_numbers`, normalización `/\D+/g`, mínimo 8 dígitos
- `_lib/defaultHaikuConfig.ts` — copiar literalmente los defaults de `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/haiku-cms-defaults.ts` (no hay import compartido cliente↔edge; dejar comentario explícito de la obligación de mantenerlos sincronizados a mano, igual que hace ZM)
- Ampliar `useHaikuConfig.ts` a un solo `SELECT ... .in('config_key', [4 keys])` en vez de un hook por key

**Test de personalidad** (barato, independiente del simulador completo — hacerlo aquí): nueva Edge Function `apps/geemastudio-server/supabase/functions/test-haiku-preview/` (invoca Anthropic directo con el prompt en edición, exige rol `dev|owner`, loguea en `ai_usage_log`) + componente `_components/HaikuTestPanel.tsx`.

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

### Backend (prerequisito; alinear con Plan 12 Fase R1)

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

#### P0 — ops mínimo (bloqueante para cerrar Fase 3)

- [ ] M1 — Enviar texto vía `send-whatsapp-notification` con `pauseBot: true` + optimistic UI + refetch
- [ ] M2 — Pausar bot / Reactivar bot vía `waba-staff-session` (`pause_bot` / `resume_bot`)
- [ ] M3 — Badge header “Bot activo” / “Bot en pausa” (lee `whatsapp_sessions.bot_paused_at`)
- [ ] M4 — Banner ámbar cuando pausado (copy: puedes escribir; “te avisamos por push si responde” solo si PR-09 **P15** está listo — si no, omitir esa frase; ver Plan 12 Fase X)
- [ ] M5 — Composer: Enter envía, Shift+Enter salto; aviso ventana **24h** Meta bajo el input
- [ ] M6 — Polling lista + hilo ~10s
- [ ] M7 — Split lista/hilo desktop; stack mobile con back

#### P1 — mismo día ops

- [ ] M8 — Adjuntar / enviar imagen (clip → Storage staff-outbound → EF; pausa bot)
- [ ] M9 — Bloquear / desbloquear número (`waba_config` key `blocked_phone_numbers`, misma que Haiku Fase 2)
- [ ] M10 — Copiar nombre + número (+ `@username` si hay) al portapapeles
- [ ] M11 — Deep link `?phone=` (desde `/panel/clientes` — ver Plan 12 P3; normalización igual que ZM)
- [ ] M12 — Preview lista: `resolveWabaContent` (IDs `svc-`/`pack_`/`promo_`/`date_`/`time_`/… → labels vía catálogo services/packs/promotions)
- [ ] M13 — Badge “Pausado” en ítem de lista; unread ≈ inbound 24h

#### P1.5 — lectura rica (paridad burbujas)

- [ ] M14 — Select hilo incluye `image_url`, `audio_url`, `reply_image_url`, `reply_to_wamid`, `delivery_status`, `delivery_error`
- [ ] M15 — Burbuja imagen/sticker (thumb + abrir)
- [ ] M16 — Burbuja audio (`<audio controls>`)
- [ ] M17 — Ticks delivery outbound: accepted/sent/delivered/read/failed
- [ ] M18 — Plantillas Meta: estilo distinto + label amigable (`templateLabels`; presets por tenant, no solo slugs `_zm`)
- [ ] M19 — BSUID Meta (`^[A-Z]{2}\.`) + `wa_username` + badge “Sin teléfono”; match `clients.wa_user_id`

#### P2 — nice-to-have pre go-live

- [ ] M20 — **Haiku agenda** (`haiku_finish_booking`) en banner de bot pausado
- [ ] M21 — Eliminar conversación (confirm → delete `wa_messages` + `whatsapp_sessions` del phone)
- [ ] M22 — Reacciones emoji + quote/reply card (`↳` / `reply_image_url`)
- [ ] M23 — Interactive / button bubbles con ícono

**Fase 3 se considera cerrada** cuando P0 + P1 están ✅ en tenant sandbox. P1.5/P2 pueden solaparse con Sprint D sin bloquear campañas, pero **go-live ZM como tenant** no debería pasar sin M14–M19 si el tráfico real incluye fotos de pago y plantillas.

### Fuera de alcance de Fase 3

- Simulador (Fase 4), campañas/historial (Fase 5), promo broadcast (Plan 12 R5).
- Realtime Supabase (ZM usa polling; mantener polling).

## Fase 4 — Simulador de conversación (fase separada, mayor esfuerzo)

Portar el patrón de fidelidad total de ZM: Edge Function `apps/geemastudio-server/supabase/functions/waba-chat-simulator/` que construye un envelope Meta sintético, reserva 1-2 teléfonos QA por tenant, limpia estado antes de cada corrida (`wa_messages`, `whatsapp_sessions`, `appointment_services`, `appointments`, `payments` filtrados por `tenant_id`+teléfono QA) y llama al **mismo `dispatch()`** que usa `whatsapp-webhook` (verificar que Deno permite importar entre carpetas de functions del mismo proyecto Supabase). Frontend: `apps/geemastudio-web/src/app/panel/waba/simulador/page.tsx` con polling de `wa_messages` (3.5-5s) para burbujas.

Hacer esta fase solo después de que Fase 1-3 estén sólidas (el simulador amplifica cualquier bug de `tenant_id` restante, al compartir el dispatcher real). Si el tiempo aprieta, es el punto natural de corte — Alberto priorizó Haiku y deuda técnica explícitamente.

## Fase 5 — Campañas, historial, portafolio (repriorizado 20-sep)

> Antes: "opcional". Tras auditoría Plan 12: **campañas + historial = P1** post Fases 2–3; portafolio = P2 pre go-live si el bot sirve portfolio; promos/reenganchar → Plan 12 Fase R.

Orden sugerido dentro de esta fase:

1. ~~**Campañas/CTWA** (P1): sin schema nuevo, `config_key` bajo `category='campanas'` en `waba_config`. Port mínimo de `CampanasClient.tsx` + secciones de contenido bot. En ZM es la entrada del módulo WA.~~ **Hecho (21-sep-2026).** Portado `CampanasClient.tsx` (17 config keys: hero, servicios, extensiones, lifting, tardanza, emotional CTWA) + `useCampanasConfig.ts` + `ConfigImageCard`/`ConfigTextCard` (tema oscuro, no el light de ZM) + `useImageUpload.ts`, todos con `resolveTenantSlugForWrites()` ya existente (sin cambios a Fase 1). Gate admin propio (`useIsAdmin()` local en el componente, no `useAuth()` — ver nota abajo). Tab "Campañas" agregado a `WabaNav.tsx`. **No portado** (fuera de alcance de esta iteración): `ContenidoBotSection.tsx` (categoría `mensajes`). `pnpm check:types`/`pnpm lint` limpios en `geemastudio-web`. Falta verificación manual en navegador (login admin `zm-lash-nails`, editar 1 campo, confirmar `updated_at`).
   - **Gap descubierto:** `useAuth()`/`AuthContext` (con `isAdmin`) solo está envuelto en `/finanzas`, no en `/panel/*` — cualquier gate de admin bajo `/panel/waba/*` debe resolver el rol por su cuenta (memoria: `project_geemastudio_web_panel_no_authcontext.md`). Ninguna otra pestaña de `/panel/waba/*` (`haiku`, `mensajes`) tiene gate de admin hoy; confían en RLS silenciosamente.
2. **Historial/analytics** (P1.5): sin migración nueva — queries sobre `wa_messages`/`ai_usage_log`. Portar `useWabaHistorial.ts` y sub-componentes (`VolumeChart`, `SummaryStatsStrip`, `ActivityHeatmap`, `TopFlowsCard`, `HaikuUsageCard`) a `apps/geemastudio-web/src/app/panel/waba/historial/`.
3. **Portafolio** (P2): requiere migración `service_portfolio_images` (`id, service_id, image_url, caption, sort_order CHECK(0..3)`) — confirmación antes de aplicar. Bucket `waba-images/portfolio/{serviceId}/{index+1}.jpg`.
4. **Promos Masivas / Reenganchar**: no mezclar aquí — ver Plan 12 Fase R (`send-promo-whatsapp`, `send-retouch-reengage` + UI stepper).

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

Paridad panel completa (finanzas, shell, crons): [`12-PLAN-panel-parity-zm-lash.md`](12-PLAN-panel-parity-zm-lash.md).
