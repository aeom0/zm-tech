# Plan 01 — Scaffold `apps/hub` + `packages/hub-schema` (Fase 0)

Objetivo: dejar el esqueleto del Hub corriendo en el monorepo, con auth y layout, sin lógica de negocio todavía.

## 1. `packages/hub-schema` (`@zmtech/hub-schema`)

Espejo de `packages/repmax-schema`:

```
packages/hub-schema/
  src/
    schema.ts        # tablas Drizzle hub_* (ver plan 02)
    enums.ts         # hub_client_status, hub_project_status, …
    constants.ts     # verticales, modelos de pago, etc.
    index.ts
  package.json       # name: @zmtech/hub-schema
  tsconfig.json      # rootDir fijado (mismo fix que repmax-schema, d29a983)
```

- Drizzle solo como **fuente de verdad TS** (tipos + referencia de schema); las migraciones reales son SQL en `docs/hub/supabase/migrations/`.
- Sin dependencias runtime más allá de `drizzle-orm`.

## 2. `apps/hub` (Next.js 16, puerto 3004)

Base: copiar la configuración de `apps/repmax-web` (Next 16 + React 19 + Tailwind v4), sin la vitrina pública.

```
apps/hub/
  app/
    (auth)/login/page.tsx
    (panel)/
      layout.tsx           # shell: sidebar + header
      dashboard/page.tsx
      clientes/…           # Fase 1
      proyectos/…          # Fase 1
      leads/…              # Fase 1
    layout.tsx
  lib/
    supabase/              # client browser + server (patrón repmax-web)
    content.ts             # strings del shell (nada hardcodeado en JSX)
  components/
  types/index.ts
  .env.example             # NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (proyecto ZMTech)
```

- **Todo** detrás de auth: middleware que redirige a `/login` si no hay sesión.
- Sidebar con los módulos del README (los de fases futuras, deshabilitados).
- Mobile-first (375px), Lucide para íconos, sin emojis en UI.

## 3. Auth mínima

- Supabase Auth email+password (usuario creado a mano en el dashboard, sin signup público).
- Tabla `hub_members` (plan 02) decide el acceso: sesión válida pero sin fila en `hub_members` → pantalla "sin acceso".
- Rol único `founder` en el MVP; enum ya preparado para `admin`/`viewer`.

## 4. Cableado monorepo

- Scripts raíz: `dev:hub` (`--filter hub dev`, puerto 3004) y `build:hub`.
- `turbo.json`: nada especial, hereda pipeline `build`/`lint`/`check:types`.
- `pnpm-workspace.yaml`: ya cubre `apps/*` y `packages/*` — verificar.

## Criterios de aceptación

- [ ] `pnpm dev:hub` levanta en `:3004` sin tocar otros productos.
- [ ] Login funciona; ruta protegida sin sesión redirige a `/login`.
- [ ] `pnpm check:types` y `pnpm lint` pasan en `hub` y `hub-schema`.
- [ ] Shell se ve bien en 375px.

## No hacer en esta fase

- No aplicar SQL a Supabase (eso es plan 02, con instrucción explícita).
- No crear app mobile ni Edge Functions.
- No agregar dependencias fuera del stack default sin confirmar con Alberto.
