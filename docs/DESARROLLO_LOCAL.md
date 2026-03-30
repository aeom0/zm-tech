# Desarrollo Local — SalonPro

**Proyecto Supabase**: `xidjomlxpuosupymcsaj` · URL: `https://xidjomlxpuosupymcsaj.supabase.co`

## Problema de conectividad TCP en WSL

El host directo de Supabase (`db.[ref].supabase.co:5432`) solo resuelve en IPv6.
WSL2 en Windows no enruta IPv6 hacia internet por defecto, por lo que herramientas
que usan TCP directo (Drizzle Kit, psql, Supabase CLI `db push`) fallan con:

```
Error: connect ENETUNREACH [IPv6]:5432
```

## Cómo aplicar migraciones de schema

### Opción A — SQL Editor del Dashboard (siempre funciona)

1. Ve a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**
2. Escribe o pega el SQL de la migración
3. Ejecuta con **Run**

Para generar el SQL a partir del schema Drizzle sin aplicarlo:
```bash
yarn db:generate
# El SQL queda en ./migrations/ (configurado en drizzle.config.ts)
```

### SQL de RLS / advisors (referencia)

El archivo **`scripts/db/migrations/20260324_advisor_rls_performance.sql`** documenta y reproduce (si lo ejecutas entero) los cambios de **Database Advisor** ya aplicados en el proyecto Supabase SalonPro: `search_path` en funciones, índices de FK, políticas RLS unificadas. En WSL sin IPv6 a TCP, suele aplicarse con el **SQL Editor** del dashboard o con **MCP Supabase** (`apply_migration`) desde Cursor.

### Avatar del personal (Storage)

- **`scripts/db/migrations/202603301200_employee_avatar_url_storage.sql`**: añade `employees.avatar_url`, crea bucket **`employee-avatars`** (público, imágenes) y políticas de Storage para que solo `dev`/`owner` suban o borren archivos.
- Otro proyecto Supabase: ejecutar ese SQL en el editor o `apply_migration` con el mismo contenido.
- La app móvil sube archivos con la **anon key** autenticada; si falta el bucket o las políticas, fallará el guardado de la foto en Personal.

### Logo del negocio (Storage)

- **Schema (DB)**: `tenant_settings.logo_url text not null default ''`.
  - Migración (SQL Editor o MCP `apply_migration`):

```sql
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';
```

- **Bucket**: crear manualmente en **Storage → Buckets**:
  - Nombre: **`tenant-logos`**
  - Público: **true**
  - MIME types permitidos: `image/jpeg, image/png, image/webp`
- **App móvil**: el upload usa Supabase Storage (usuario autenticado) y guarda la URL pública en `tenant_settings.logo_url` vía `TenantContext.updateTenant(..., { syncRemote: true })`.

### Opción B — yarn db:push con conectividad directa

Funciona desde Linux nativo, macOS, o WSL con IPv6 habilitado.

```bash
yarn db:push
```

Requiere que `DATABASE_URL` en `.env` apunte al host directo (reemplazar `[REF]` por `xidjomlxpuosupymcsaj`):
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xidjomlxpuosupymcsaj.supabase.co:5432/postgres
```

### Opción C — Supabase CLI via API (sin TCP)

El CLI usa la API REST de Supabase para algunas operaciones pero `db push`
también requiere TCP para el rol temporal. No funciona en WSL con IPv6 bloqueado.

Cuando haya conectividad, se puede ejecutar (proyecto SalonPro):
```bash
npx supabase link --project-ref xidjomlxpuosupymcsaj --password [DB_PASSWORD]
npx supabase db push
```

**Alternativa sin TCP**: usar el MCP de Supabase en Cursor (servidor **supabase-salonpro**) para `list_tables`, `execute_sql` o `apply_migration` contra este proyecto.

## Seeds y usuarios Auth

Los seeds y la creación de usuarios **no requieren TCP** — usan la API REST:

```bash
# Cargar servicios y empleados de ejemplo
node scripts/db/run-seeds-api.js   # (si se crea este helper)

# O directamente el script de usuarios:
node scripts/seed-auth-users.mjs
```

El script `seed-auth-users.mjs` usa `fetch` contra `/auth/v1/admin/users`
y `/rest/v1/profiles`, por lo que funciona en cualquier entorno.

## Variables de entorno requeridas

Ver [`.env.example`](../.env.example) en la raíz. Para migraciones solo se necesita:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
```

Para seeds y scripts de Auth:
```
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role key]
SEED_AUTH_PASSWORD=SalonPro2025!
```

## Web — panel de catálogo (`/panel/servicios`)

- Desarrollo: `yarn web:dev` (puerto 3000). Variables en **`apps/web/.env.local`**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Rutas bajo **`/panel/*`** exigen sesión (guard SSR); sin login redirige a **`/login`**.
- **`/panel/servicios`**: tabs categorías, servicios, packs y promos; deep link con **`?tab=categorias|servicios|packs|promos`**. Los datos van a tablas `service_categories`, `services`, `packs`, `promotions`, `promotion_items` vía PostgREST (RLS según rol).
