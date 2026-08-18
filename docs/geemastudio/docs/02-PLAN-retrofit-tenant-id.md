# Plan 02 — Retrofit `tenant_id`: de ZM Lash & Nails a GeemaStudio multi-tenant

> Documento de contexto técnico. Súbelo tal cual a project knowledge de **ZM Lash & Nails** y de **GeemaStudio**. Si eres una IA o dev retomando este trabajo, lee esto completo antes de tocar cualquier migración o código relacionado con `tenant_id`.

**Última actualización:** 2026-08-07
**Autor del plan:** Alberto Orta (Founder & CTO, ZM Tech)
**Estado general:** Fase A ✅ + Fase B ✅ en prod. Fase C (RLS por `tenant_id`) no iniciada.

---

## 1. Qué problema resuelve esto

La base de datos de Supabase `udelxwwnyivknslueerr` nació como la base de **un solo negocio**: ZM Lash & Nails Beauty, el salón real de Vanessa (hermana de Alberto), en producción con clientas y citas activas todos los días.

**GeemaStudio** es el producto SaaS multi-tenant que ZM Tech está construyendo para vender a otros salones, barberías y spas — pero hoy, a nivel de base de datos, GeemaStudio **es literalmente la misma base que ZM Lash**. No existe una base separada `geema_*`. El código de la app multi-tenant vive en el monorepo (`apps/geemastudio-web`, `geemastudio-mobile`, `geemastudio-server`), pero la base de datos detrás sigue siendo single-tenant.

Este plan transforma esa base **de single-tenant a multi-tenant**, para que ZM Lash pase a ser el tenant #1 de GeemaStudio en lugar de ser "la única razón de ser" de la base.

---

## 2. Cómo funciona el aislamiento (y por qué NO es un prefijo de tabla)

Es importante no confundir esto con el otro patrón de aislamiento que ya existe en ZM Tech:

| Patrón                                         | Para qué sirve                                                                                              | Ejemplo                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Prefijo de tabla** (`odental_*`, `repmax_*`) | Aislar **verticales de negocio distintas** que comparten un mismo Supabase project (`llacowjutjfefboqgfnj`) | Dental vs autopartes vs landing, todo en el mismo proyecto   |
| **Columna `tenant_id`** (este plan)            | Aislar **clientes distintos dentro de la misma vertical** (belleza) que usan el mismo producto GeemaStudio  | Salón A vs Salón B vs Salón C, todos en las mismas 27 tablas |

No se crean tablas nuevas por cliente. Cada una de las 27 tablas tenant-scoped gana una columna `tenant_id text`, y cada fila queda "etiquetada" con el dueño del dato. Las RLS policies (Fase C) son las que hacen cumplir el aislamiento — sin ellas, la columna existe pero no aísla nada.

Hoy, todas las filas existentes tienen `tenant_id = 'zm-lash-nails'` porque es el único tenant. El día que entre un segundo salón, sus datos entran con otro `tenant_id`, en esas mismas tablas.

---

## 3. Qué NO se copió ni se tocó

Un malentendido común (y válido, vale la pena aclararlo por escrito): en ningún momento se copiaron datos reales de clientas a ningún entorno de prueba.

- `supabase db dump --linked` extrajo solo el **esquema** (29 tablas, 68 policies, 17 funciones) — ninguna fila de datos reales.
- Ese esquema se cargó en un Postgres local vía Docker (`supabase start`), donde las 27 tablas están vacías.
- Todas las pruebas del retrofit (`supabase db reset` + migraciones) se corrieron ahí, no contra producción.

**Producción (`udelxwwnyivknslueerr`) — estado 2026-08-07:** Fase A (`tenant_id` + backfill) y Fase B (PK compuesta `whatsapp_sessions` + upserts Edge) **ya aplicadas**. Ver §10.

**Regla permanente para este proyecto:** cualquier migración contra `udelxwwnyivknslueerr` requiere mostrar el SQL exacto antes de aplicar, y solo migraciones aditivas/reversibles (sin `DROP`, sin `NOT NULL` sin default) salvo excepción documentada y aprobada explícitamente (la PK de `whatsapp_sessions` fue esa excepción, ya ejecutada).

---

## 4. Las 29 tablas: cuáles llevan `tenant_id` y cuáles no

**27 tablas tenant-scoped** (reciben `tenant_id text not null default 'zm-lash-nails'` + índice):

`appointments`, `clients`, `employees`, `profiles`, `appointment_services`, `appointment_verifications`, `payments`, `push_tokens`, `service_categories`, `services`, `service_portfolio_images`, `inventory_items`, `promotions`, `promotion_items`, `packs`, `promo_broadcasts`, `promo_broadcast_items`, `salon_holidays`, `wa_messages`, `wa_error_log`, `wa_action_debounce`, `waba_config`, `waba_pricing_daily`, `waba_pricing_sync_log`, `waba_intent_shadow_log`, `ai_usage_log`, `whatsapp_sessions`

**2 tablas globales** (NO llevan `tenant_id`, confirmado con datos reales, no por inferencia):

- `app_config` — config de billing de la **agencia** ZM Tech (créditos/wallet Anthropic), no del tenant.
- `anthropic_billing_snapshots` — snapshot de costo agregado de la org completa de Anthropic, no por tenant.

---

## 5. Caso especial: `whatsapp_sessions`

PK en prod (post-Fase B): **`(tenant_id, phone)`**.

Antes era solo `(phone)`. Con un segundo tenant, dos clientas de salones distintos con el mismo número chocarían. La migración `20260807002252_whatsapp_sessions_composite_pk.sql` ya se aplicó en prod (2026-08-07) junto con el código que usa `onConflict: "tenant_id,phone"`.

Queries del bot/panel siguen filtrando por `.eq("phone", …)` — válidas con un solo tenant; multi-tenant (Fase C) exigirá filtrar también por `tenant_id`.

---

## 6. Las fases

| Fase  | Qué hace                                                                                                                           | Estado                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **A** | Aplicar `20260807001949_tenant_id_retrofit.sql` a prod — columna + índices en las 27 tablas.                                       | ✅ Prod 2026-08-07                        |
| **B** | Auditar upserts/`onConflict` WABA + panel; aplicar PK compuesta; desplegar Edge Functions alineadas.                               | ✅ Prod 2026-08-07 (código + PK + deploy) |
| **C** | Escribir y probar (local primero) las RLS policies (68 existentes) para que filtren por `tenant_id`. Hoy la columna no aísla nada. | No iniciada                               |

---

## 7. Trabajo paralelo, no bloqueante: audit de paridad ZM Lash vs GeemaStudio

Este es un hilo **de producto, no de base de datos**, y no depende de las fases A/B/C:

¿Todo lo que tiene la app real de ZM Lash (web + mobile: agenda, servicios, inventario, finanzas, comisiones, bot WABA, promociones, packs) ya está implementado en el código genérico multi-tenant (`apps/geemastudio-web`, `geemastudio-mobile`, `geemastudio-server`)?

Cualquier feature que exista en ZM Lash y no en Geema es una mejora pendiente para Geema — ZM Lash es la referencia funcional real, Geema es la versión productizable de eso mismo.

**Este audit se puede hacer en paralelo a la Fase C.** No bloquea ni depende de ella.

---

## 8. Por qué esto importa antes de "conectar" nada

Conectar la app de GeemaStudio a esta base (o pensar en un segundo tenant real) solo tiene sentido **después de**:

1. Fase C probada y funcionando (RLS realmente aislando por `tenant_id`).
2. El audit de paridad confirmando que Geema cubre lo que ZM Lash necesita.

Antes de eso, `tenant_id` existe como columna pero no protege nada — cualquier query sigue viendo todas las filas de todos los tenants. Conectar una segunda app o un segundo cliente antes de la Fase C sería un hueco de seguridad real, no teórico.

---

## 9. Datos operativos de referencia

- **Supabase project (prod):** `udelxwwnyivknslueerr` — org `ZM-Lash-Nails-Beauty` (plan FREE, sin branching en la nube — usar `supabase start` local para pruebas)
- **Conector MCP (Cursor):** `project-0-ZM-Lash-and-Nails-Beauty-supabase-zm`
- **Tenant inicial (backfill):** `'zm-lash-nails'`
- **Tipo de `tenant_id`:** `text`, sin FK a una tabla `tenants` todavía (no existe aún — se agregará después, en migración aditiva aparte)
- **Baseline de schema (local, WIP):** `supabase/migrations/00000000000000_baseline_full_schema.sql` — generado vía `supabase db dump --linked`; **aún no consolidado en git** (ver housekeeping pendiente).
- **Migraciones de este plan (en repo):**
  - `supabase/migrations/20260807001949_tenant_id_retrofit.sql`
  - `supabase/migrations/20260807002252_whatsapp_sessions_composite_pk.sql`
- **Copia local no trackeada:** `supabase/migrations_backup/` (snapshots de migraciones previas al baseline) — no commitear hasta decidir higiene de schema.
- **CLI local:** `supabase/.branches/` y `supabase/.temp/` → gitignore (estado local del CLI, no fuente de verdad).

---

## 10. Estado de ejecución (actualizado por Cursor)

- **Fase A:** ✅ Prod 2026-08-07. 27/27 tablas con `tenant_id`, backfill confirmado (162 citas, 302 clientas, 153 pagos, 3047 mensajes WA, 712 logs IA, 303 sesiones WA — todas `tenant_id = 'zm-lash-nails'`).
- **Fase B — código:** ✅ `upsertSession` + upserts en `_shared/retoque-offer.ts` y `chat-quality-review` usan `tenant_id: "zm-lash-nails"` + `onConflict: "tenant_id,phone"` (PR #9).
- **Fase B — grep:** sin otros `onConflict` sobre `whatsapp_sessions`. Panel web solo SELECT/DELETE por `phone` (MessageThread, useWabaMessages, ClientDetailSidebar).
- **Fase B — PK:** ✅ `PRIMARY KEY (tenant_id, phone)` en prod.
- **Fase B — deploy Edge:** ✅ `whatsapp-webhook` v370 + `chat-quality-review` / `send-retouch-reengage` / `retouch-reminders` redesplegados a mano; smoke inbound QA `51999000999` → sesión con `tenant_id = zm-lash-nails` + outbound OK. CI _OTA Production_ (merge PR #9) también redesplegó el resto del job; `ads-bounce-nudge` reportó `No change found` (bundle idéntico, exit 0 — no es fallo silencioso del workflow).
- **Fase C:** no iniciada.
- **Housekeeping pendiente (no bloquea bot):** consolidar baseline + `migrations_backup/` en un PR de schema aparte; alinear project knowledge zm-tech/Geema con esta copia.
