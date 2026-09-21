# WABA — paridad de suite GeemaStudio vs. ZM Lash + deuda técnica

> Estado: **planificado** (20-sep-2026), pendiente de inicio de implementación.

## Contexto

GeemaStudio es la generalización multi-tenant de ZM Lash & Nails Beauty. Antes de migrar a Vanessa (ZM) como tenant real, el panel WABA de GeemaStudio debe ser igual o mejor que el de ZM Lash canónico — hoy no lo es: le faltan la mayoría de los editores de configuración del bot, el inbox es solo-lectura, no hay simulador ni analytics, y "Promos Masivas"/"Reenganchar" no existen en absoluto. Prioridad #1 marcada explícitamente por Alberto, junto con limpiar 3 items de deuda técnica ya identificados en una auditoría previa.

Investigación (3 agentes Explore + lectura directa de `20260406_waba_multitenant.sql` y `useWabaStatus.ts`) confirmó además dos bloqueos reales no reportados antes:

1. **Bug de tipo `tenant_id`**: la migración declara `waba_config.tenant_id UUID NOT NULL REFERENCES tenant_settings(id)` (igual en `whatsapp_sessions`, `wa_messages`). El webhook real (`tenant-resolver.ts`) usa ese UUID consistentemente. Pero el panel web (`useWabaStatus.ts`, función `resolveTenantSlugForWrites()`) resuelve deliberadamente un **slug de texto** y lo usa como `tenant_id` al hacer `upsert` en `waba_config` — comentario en el propio código dice "usan tenant_id = slug (texto), no UUID", lo cual contradice la migración. Resultado: o el `upsert` del panel falla (`invalid input syntax for type uuid`), o si la columna real en prod ya fue alterada informalmente, el panel escribe filas que el bot nunca lee. Cualquiera de los dos escenarios es inaceptable para construir más UI encima.
2. **RLS bloqueante**: `waba_config`, `whatsapp_sessions`, `wa_messages` solo tienen policy `service_role_only` (`TO service_role USING (true)`), sin ninguna policy para `authenticated`. El panel usa el cliente browser con `NEXT_PUBLIC_SUPABASE_ANON_KEY` (rol `authenticated`/`anon`), así que las lecturas actuales del panel (`useHaikuConfig`, `useWabaMessages`) deberían estar denegadas por RLS en producción real — es un bloqueo funcional, no solo un riesgo teórico.

Ambos deben resolverse primero; todo lo demás en WABA se construye sobre estas dos tablas.

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

## Fase 3 — Inbox / mensajes: consola de staff

Hoy `apps/geemastudio-web/src/app/panel/waba/mensajes/page.tsx` es solo lectura. Agregar:

- Edge Function `apps/geemastudio-server/supabase/functions/send-whatsapp-notification/` (genérica; hoy solo existe `notifyAdminPhonesWa()` interno) — `POST {phone, message|imageUrl, pauseBot}`, reusa envío ya existente en el webhook.
- Edge Function `apps/geemastudio-server/supabase/functions/waba-staff-session/` — `POST {phone, action: pause|resume|end}`, rol `dev|owner|staff`.
- `_components/MessageThread.tsx`: enviar texto/imagen manual, pausar/reactivar bot, bloquear/desbloquear número (misma key `blocked_phone_numbers` de Fase 2), eliminar conversación.
- Bucket `waba-images/staff-outbound/` (crear si no existe — marcar para confirmación antes de aplicar).
- Mantener polling (ya no aplica Realtime directo tras mover a API routes en Fase 1); bajar a 10s/10s para paridad con ZM.

## Fase 4 — Simulador de conversación (fase separada, mayor esfuerzo)

Portar el patrón de fidelidad total de ZM: Edge Function `apps/geemastudio-server/supabase/functions/waba-chat-simulator/` que construye un envelope Meta sintético, reserva 1-2 teléfonos QA por tenant, limpia estado antes de cada corrida (`wa_messages`, `whatsapp_sessions`, `appointment_services`, `appointments`, `payments` filtrados por `tenant_id`+teléfono QA) y llama al **mismo `dispatch()`** que usa `whatsapp-webhook` (verificar que Deno permite importar entre carpetas de functions del mismo proyecto Supabase). Frontend: `apps/geemastudio-web/src/app/panel/waba/simulador/page.tsx` con polling de `wa_messages` (3.5-5s) para burbujas.

Hacer esta fase solo después de que Fase 1-3 estén sólidas (el simulador amplifica cualquier bug de `tenant_id` restante, al compartir el dispatcher real). Si el tiempo aprieta, es el punto natural de corte — Alberto priorizó Haiku y deuda técnica explícitamente.

## Fase 5 — Historial/analytics, portafolio, campañas (opcional, confirmar antes de empezar)

- **Historial**: sin migración nueva — solo queries client-side sobre `wa_messages`/`ai_usage_log` (ya existen). Portar `useWabaHistorial.ts` y sub-componentes (`VolumeChart`, `SummaryStatsStrip`, `ActivityHeatmap`, `TopFlowsCard`, `HaikuUsageCard`) a `apps/geemastudio-web/src/app/panel/waba/historial/`.
- **Portafolio**: requiere migración nueva `service_portfolio_images` (`id, service_id, image_url, caption, sort_order CHECK(0..3)`) — marcar para confirmación antes de aplicar. Bucket `waba-images/portfolio/{serviceId}/{index+1}.jpg`.
- **Campañas/CTWA**: sin schema nuevo, solo más `config_key` bajo `category='campanas'` en `waba_config`.
- **Promos Masivas / Reenganchar**: confirmado que no existen en absoluto en GeemaStudio; son sistemas grandes en ZM (`promo_broadcasts`, `send-promo-whatsapp`, `send-retouch-reengage`). Proponer como fase completamente separada, no mezclar con este ciclo de WABA.

## Verificación transversal

- `pnpm lint` + `pnpm check:types` después de cada fase (web y, para Edge Functions, `deno check`/`deno lint` local si está disponible).
- Tenant de prueba dedicado dentro de GeemaStudio (`features_waba=true`, `waba_phone_number_id` de sandbox Meta) para probar todo el flujo sin tocar el número real de ZM.
- Cualquier migración SQL a `udelxwwnyivknslueerr` se presenta a Alberto explícitamente antes de ejecutarse (Dashboard SQL Editor o Management API — nunca asumir que `db:push`/`supabase db query --linked` funcionan en este WSL).

## Archivos críticos

- `apps/geemastudio-server/supabase/migrations/20260406_waba_multitenant.sql`
- `apps/geemastudio-web/src/hooks/waba/useWabaStatus.ts`
- `apps/geemastudio-web/src/hooks/waba/useHaikuConfig.ts`
- `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/waba-config.ts`
- `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/tenant-resolver.ts`
- `apps/geemastudio-web/src/app/api/waba/webhook/route.ts` (a eliminar/documentar)
- `ZM-Lash-and-Nails-Beauty/apps/web/src/app/panel/waba/haiku/_hooks/useHaikuConfig.ts` (referencia de patrón)
- `apps/geemastudio-mobile/screens/finances/hooks/useFinancesData.ts`
- `apps/geemastudio-web/src/app/finanzas/login/page.tsx`
- `apps/geemastudio-web/src/app/panel/configuracion/page.tsx`
