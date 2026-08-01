# RepMAX → zm-tech: Integración al monorepo y a la BD compartida

## Contexto (verificado, no supuesto)

- Org Supabase `eurhupibqbgrcydbzrar` ya tiene 2 proyectos free ACTIVE_HEALTHY: `naturalforce-suite` y `ZMTech` (`llacowjutjfefboqgfnj`, el que ya comparten `apps/landing` + OdentalPro). Ese es el tope free (2 proyectos activos).
- Existía un 3er proyecto llamado "RepMAX" (`ckaubaosvpmcxffyioio`), pausado desde feb-2026, sin nada rescatable — Alberto lo va a eliminar.
- **Decisión:** RepMAX entra como 3er vertical dentro de `llacowjutjfefboqgfnj`, con el mismo patrón de aislamiento que ya usa OdentalPro (prefijo de tablas, RLS, Auth Provider aislado). No se paga BD dedicada hasta que haya tenants reales pagando.
- RepMAX hoy NO usa Supabase — corre Express + JWT + bcrypt contra Postgres suelto, con `supabase/migrations/` como "SQL de referencia" nunca aplicado. Este proceso reemplaza esa capa por el patrón directo Supabase Auth + RLS que ya usan GeemaStudio/OdentalPro.
- Gap de versiones confirmado contra `apps/geemastudio-mobile` (el estándar actual del monorepo): TypeScript 5.9.3→6.0.3, Expo SDK 54→56, RN 0.81.5→0.85.3, React 19.1.0→19.2.3, yarn 4.12.0→pnpm 11.15.1. Ver detalle en `01-PLAN`.

## Orden de ejecución (no saltar fases)

1. **`01-PLAN-scaffold-y-versiones.md`** — subtree merge mecánico (preserva historia) + alineación de versiones. Al final de esta fase, RepMAX vive en `apps/repmax-{web,mobile,server}` dentro de zm-tech, compila con pnpm, sin tocar todavía la BD ni el auth.
2. **`02-PLAN-schema-rls-auth-supabase.md`** — mueve las 8 tablas a `llacowjutjfefboqgfnj` con prefijo `repmax_`, RLS, y el Auth Provider aislado (`RepmaxAuthProvider`/`useAuth`, patrón idéntico a `@geemastudio/tenant-config/odental`).
3. **`03-PLAN-retirar-express-jwt.md`** — reescribe `apps/repmax-web` y `apps/repmax-mobile` para hablar directo con Supabase (mata JWT/bcrypt), y archiva o elimina `apps/repmax-server`.

## Reglas que se heredan de OdentalPro (no negociables)

- Todo objeto nuevo (tabla, bucket, policy) lleva prefijo `repmax_`. Cero excepciones.
- Nunca tocar `contacts`, `quote_leads`, ni ninguna tabla/policy `odental_*`.
- Toda migración se prueba local con `supabase start` antes de aplicar contra `llacowjutjfefboqgfnj`. Solo aditivas (sin `DROP`, sin `NOT NULL` sin default) — mismo criterio que con datos de producción, aunque acá no haya data real todavía; es más barato mantener el hábito que rompelo dos veces.
- `auth.users` es compartido a nivel de proyecto (así es Supabase Auth). Cada vertical resuelve su propio perfil vía join contra su tabla `_employees`/`_users` por `auth_user_id`. No hay cruce funcional entre verticales, pero documentar el edge case: un mismo email podría loguearse en OdentalPro y RepMAX sin fricción — bajo riesgo real dado que son públicos distintos, no requiere fix ahora.

## Al cerrar las 3 fases

- Confirmar por MCP que las 8 tablas `repmax_*` existen con RLS activo y 0 filas fuera de pruebas.
- Actualizar este README con fecha de cierre y commits, como ya haces con OdentalPro/pen.dev.
- Verificar que el proyecto Supabase huérfano (`ckaubaosvpmcxffyioio`) fue eliminado.

## Estado de ejecución

- **Fase 01 cerrada** — 2026-08-01. Commits: `31f8b07` (scaffold), `6f1c24e` (TS 6), `27c9c4f` (Expo 56), + fix mobile SDK 56. `pnpm --filter repmax-web` levanta en `:3003`; builds web/server OK; `expo-doctor` 21/21; typecheck mobile OK.
- **Fase 02 cerrada** — 2026-08-01. Migraciones `repmax_initial_schema` + `repmax_rls_and_storage` aplicadas en `llacowjutjfefboqgfnj` (validadas antes con `supabase start` local). 7 tablas `repmax_*` con RLS; bucket `repmax-products`; Auth Provider en `@geemastudio/tenant-config/repmax`. Usuarios de prueba: `repmax-owner-a@test.local` / `repmax-owner-b@test.local` (pass `TestRepmax123!`) — A solo ve `repuestos-alfa`, B solo `repuestos-beta`. Storefront anónimo lee productos `is_active`. `contacts` / `quote_leads` / `odental_*` sin cambios de schema.
- **Fase 03 cerrada** — 2026-08-01. Web/mobile cableados a Supabase Auth + `repmax_*` (sin JWT Express). RPC `repmax_create_sale_with_items`. Storefront Server Component. `apps/repmax-server` archivado en `docs/repmax/legacy-server-reference/`. Policies públicas de catálogo solo para `anon`. Build `repmax-web` OK.

