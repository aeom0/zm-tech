# SalonPro — Setup inicial

App de gestión para salones de belleza, barberías y peluquerías (LATAM). Frontend React Native (Expo) + Next.js; backend **Supabase** (Auth + PostgREST). Sin servidor Express.

## Requisitos

- **Node.js** 22+ (recomendado: `nvm use`, hay `.nvmrc`)
- **Yarn** 4 (Berry)
- Cuenta **Supabase** (proyecto SalonPro: `xidjomlxpuosupymcsaj`)

## Desarrollo local

### 1. Clonar e instalar

```bash
git clone <repo>
cd salonpro
yarn install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y definir:

- **`EXPO_PUBLIC_SUPABASE_URL`**: `https://xidjomlxpuosupymcsaj.supabase.co`
- **`EXPO_PUBLIC_SUPABASE_ANON_KEY`**: clave anon del proyecto en Supabase Dashboard

Para seeds o scripts con servicio: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SEED_AUTH_PASSWORD`.

### 3. Base de datos

El schema se aplica con Drizzle. En WSL puede fallar la conexión TCP directa (IPv6). Opciones:

- **SQL Editor** del Dashboard Supabase: pegar y ejecutar el SQL generado por **`yarn db:generate`** (sale en `./migrations/`)
- **`yarn db:push`** si tienes conectividad a `db.xidjomlxpuosupymcsaj.supabase.co:5432`
- Referencia RLS/advisors ya aplicados en remoto: `scripts/db/migrations/20260324_advisor_rls_performance.sql`

Ver [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md) para detalle.

### 4. Arrancar apps

```bash
# App móvil (Expo)
yarn mobile:dev

# Web (Next.js) — landing + panel /finanzas
yarn web:dev
```

Abrir la URL que muestre Expo (web en 8081) o escanear QR con Expo Go.

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `yarn mobile:dev` | Expo (app móvil) |
| `yarn web:dev` | Next.js (landing + panel) |
| `yarn db:push` | Aplicar schema Drizzle a Supabase |
| `yarn db:generate` | Generar migraciones SQL en `./migrations/` |
| `yarn db:studio` | Drizzle Studio |
| `yarn db:seed` | Cargar seeds (editar templates antes) |
| `yarn lint` | ESLint |
| `yarn check:types` | TypeScript |
| `yarn format` | Prettier |

## Estructura resumida

- **`apps/mobile/`** — App Expo: pantallas, navegación, contexts (Auth, Tenant), hooks, tema.
- **`apps/web/`** — Next.js: landing pública + panel `/finanzas`.
- **`packages/shared-schema/`** — Schema Drizzle + Zod (tenant_settings, employees, services, etc.).
- **`packages/tenant-config/`** — Presets por tipo de negocio (spa-nails, barbershop, hair-salon, full-aesthetic).

No hay carpeta `server/`: todo el backend es Supabase.

Documentación: [INDEX.md](INDEX.md), [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md), [design_guidelines.md](design_guidelines.md).

## Licencia

Privado.
