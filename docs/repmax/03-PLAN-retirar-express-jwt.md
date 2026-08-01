# 03 — Retirar Express + JWT, cablear contra Supabase directo

**Precondición:** Fase 02 cerrada — schema, RLS y Auth Provider validados de forma aislada.

**Objetivo:** `apps/repmax-web` y `apps/repmax-mobile` hablan directo con `llacowjutjfefboqgfnj` vía `@supabase/supabase-js` + el Auth Provider de la fase 02. `apps/repmax-server` (Express) queda archivado o eliminado.

---

## Paso 1 — Inventario de lo que reemplaza cada ruta Express

De `CLAUDE.md` de RepMAX, las rutas ya implementadas en `apps/server`:

| Ruta Express | Reemplazo Supabase |
|---|---|
| `POST /api/auth/login` | `supabase.auth.signInWithPassword` (Auth Provider fase 02) |
| `GET /api/auth/me` | `supabase.auth.getUser()` + query a `repmax_store_users` |
| `GET /api/dashboard` | Query directa a `repmax_sales`/`repmax_cash_sessions` con agregaciones — evaluar si conviene una vista SQL (`repmax_dashboard_kpis`) o un Edge Function, según qué tan pesado sea el cálculo de KPIs (revisar la lógica actual en `apps/repmax-server/src/routes.ts` antes de decidir) |
| `GET/PATCH /api/products` | Query/mutation directa a `repmax_products` (RLS ya filtra por tienda) |
| `GET /api/sales` | Query directa a `repmax_sales` |
| `GET /api/customers` | Query directa a `repmax_customers` |
| `GET /api/public/:slug/store`, `/products` | Query directa usando la policy pública de storefront (fase 02, paso 3) — **sin auth**, igual que hoy |

La lógica de negocio real que vale la pena revisar con cuidado antes de tirar el Express: el cálculo de KPIs del dashboard (serie 7 días, top productos, métodos de pago) y cualquier validación de negocio en `routes.ts` que no sea solo CRUD — eso hay que trasladarlo a RLS/constraints o a un Edge Function, no perderlo.

## Paso 2 — `apps/repmax-mobile`

- `src/context/AuthContext.tsx` → reemplazar por `RepmaxAuthProvider` de `packages/tenant-config/src/repmax`
- `src/utils/api.ts` (axios + interceptor JWT) → eliminar; reemplazar por cliente `@supabase/supabase-js` (mismo patrón que `geemastudio-mobile`)
- `src/services/*Service.ts` (productService, saleService, customerService, analyticsService) → mantener la capa de servicios como punto único de acceso (ya es buena práctica, está en las reglas del propio `CLAUDE.md` de RepMAX: "services/ → único punto de acceso a la API") pero el contenido pasa de `axios.get('/api/products')` a `supabase.from('repmax_products').select()`
- `hooks/` (useAuth, useProducts, etc.) — cambian de fuente pero mantienen la misma interfaz hacia `screens/`, así los componentes de UI casi no se tocan

## Paso 3 — `apps/repmax-web`

- `middleware.ts` (protege `/dashboard/*` vía cookie `repmax_token`) → adaptar a `@supabase/ssr` (cookie de sesión de Supabase), mismo patrón que uses en `odentalpro-web`
- `context/AuthContext.tsx` + `hooks/useAuthFetch.ts` → reemplazar por el provider de Supabase
- `(dashboard)/*` — mismo criterio que mobile, cambia la fuente de datos, no la estructura de componentes
- `[slug]/` (storefront público) — pasa a Server Component con fetch directo a Supabase (más simple que hoy, que pasa por `NEXT_PUBLIC_API_URL` hacia Express)

## Paso 4 — Archivar `apps/repmax-server`

No borrar de inmediato — mover a `docs/repmax/legacy-server-reference/` por un ciclo (útil como referencia de la lógica de KPIs mientras se termina de portar). Sacarlo de `pnpm-workspace.yaml` y de los scripts `dev:repmax:server`/`build`. Confirmar con Alberto antes de borrar definitivamente, una vez que el dashboard esté verificado en paridad.

## Paso 5 — Variables de entorno

Eliminar de `.env`: `JWT_SECRET`, `DATABASE_URL` (Express), `WEB_URL` (CORS de Express ya no aplica).
Agregar/confirmar: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web) — apuntando a `llacowjutjfefboqgfnj`.

---

## Checkpoint de cierre de fase (= cierre de la integración completa)

- [ ] Login funciona en mobile y web contra Supabase Auth, sin rastro de JWT propio
- [ ] Dashboard, inventario, ventas, clientes leen/escriben contra `repmax_*` con RLS activo, verificado con al menos 2 tiendas de prueba (confirmar que una no ve datos de la otra)
- [ ] Storefront público `/[slug]` responde sin sesión, solo productos `is_active = true`
- [ ] `apps/repmax-server` archivado o eliminado, fuera de scripts y workspace
- [ ] `contacts`, `quote_leads`, `odental_*` — verificado por MCP: cero cambios durante todo el proceso
- [ ] Actualizar `00-README-repmax-integracion.md` con fecha de cierre y commits, como registro para memoria futura
