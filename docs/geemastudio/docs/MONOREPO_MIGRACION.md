# Migración a monorepo — GeemaStudio

El proyecto está organizado como monorepo: **apps** (mobile, web) y **packages** (shared-schema, tenant-config). No hay servidor en la raíz.

## Estructura actual

- **apps/web** — Next.js 15, landing pública y paneles `/finanzas`, `/dashboard` y `/panel` (login en `/login`; **`/panel/servicios`**: CRUD catálogo incl. packs y promos; query `?tab=`).
- **apps/mobile** — Expo, app de gestión del salón (Dashboard, Agenda, Servicios, Inventario, Finanzas, onboarding).
- **packages/shared-schema** — Schema Drizzle + Zod compartido (`@geemastudio/shared-schema`). Tablas: tenant_settings, employees, service_categories, services, clients, appointments, payments, inventory_items, profiles.
- **packages/tenant-config** — Presets por tipo de negocio (`@zmtech/tenant-config`).

No existe **server/** ni Express. Toda la API es Supabase (PostgREST + Auth).

## Comandos (desde la raíz)

```bash
yarn install

# Desarrollo
yarn mobile:dev       # Solo Expo (app móvil) — puerto 8081
yarn web:dev          # Solo Next.js (landing) — puerto 3000

# Base de datos
yarn db:push          # Aplicar esquema Drizzle a Supabase
yarn db:seed          # Cargar seeds (editar templates en scripts/db antes)

# Calidad
yarn lint
yarn check:types
yarn format
```

## Vercel

La web se despliega desde **apps/web**. Configurar en Vercel `rootDirectory: "apps/web"` y, si hace falta, `installCommand` que instale dependencias desde la raíz (workspaces).

## Notas

- **client/** y **shared/** (estructura antigua de ZM) no existen; el código está en `apps/mobile/` y `packages/shared-schema/`.
- Si mobile no arranca: comprobar que `yarn install` se ejecutó en la raíz y que existe el workspace `@geemastudio/shared-schema` y `@zmtech/tenant-config`.
