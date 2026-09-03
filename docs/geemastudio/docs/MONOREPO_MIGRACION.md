# Migración a monorepo — GeemaStudio

El proyecto está organizado como monorepo: **apps** (mobile, web) y **packages** (shared-schema, tenant-config). No hay servidor en la raíz.

## Estructura actual

- **apps/geemastudio-web** — Next.js 15, landing pública y paneles `/finanzas`, `/dashboard` y `/panel` (login en `/login`; **`/panel/servicios`**: CRUD catálogo incl. packs y promos; query `?tab=`).
- **apps/geemastudio-mobile** — Expo, app de gestión del salón (Dashboard, Agenda, Servicios, Inventario, Finanzas, onboarding).
- **packages/shared-schema** — Schema Drizzle + Zod compartido (`@geemastudio/shared-schema`). Tablas: tenant_settings, employees, service_categories, services, clients, appointments, payments, inventory_items, profiles.
- **packages/tenant-config** — Presets por tipo de negocio (`@zmtech/tenant-config`).

No existe **server/** ni Express. Toda la API es Supabase (PostgREST + Auth).

## Comandos (desde la raíz)

```bash
pnpm install

# Desarrollo
pnpm dev:mobile       # Solo Expo (app móvil)
pnpm dev:web          # Solo Next.js (landing) — puerto 3000

# Base de datos
pnpm db:push          # Aplicar esquema Drizzle a Supabase

# Calidad
pnpm lint
pnpm check:types
pnpm format
```

> Monorepo real: **pnpm + Turborepo** (ver `package.json` raíz). No hay script `db:seed` a nivel raíz — los seeds viven en `apps/geemastudio-server/scripts/db/` (templates SQL) y `apps/geemastudio-server/scripts/seed-auth-users.mjs`.

## Vercel

La web se despliega desde **apps/geemastudio-web**. Configurar en Vercel `rootDirectory: "apps/geemastudio-web"` y, si hace falta, `installCommand` que instale dependencias desde la raíz (workspaces).

## Notas

- **client/** y **shared/** (estructura antigua de ZM) no existen; el código está en `apps/geemastudio-mobile/` y `packages/shared-schema/`.
- Si mobile no arranca: comprobar que `pnpm install` se ejecutó en la raíz y que existe el workspace `@geemastudio/shared-schema` y `@zmtech/tenant-config`.
