# Migración a monorepo

El proyecto pasó a monorepo para separar la **landing web** (Next.js) de la **app móvil** (Expo) y que la landing funcione correctamente (SEO, build estable en Vercel).

## Estructura actual

- **apps/web** — Next.js 15, landing pública (servicios, equipo, CTA WhatsApp).
- **apps/mobile** — Expo, app de gestión del salón (Dashboard, Agenda, Servicios, Inventario, Finanzas).
- **packages/shared-schema** — Schema Drizzle + Zod compartido por el servidor (y futuro uso en web/mobile si hace falta).
- **server/** — Express API en la raíz; usa `@zm/shared-schema`.

## Comandos (desde la raíz)

```bash
# Instalar dependencias (workspaces)
npm install

# Desarrollo
npm run dev              # server + mobile en paralelo
npm run web:dev          # solo Next.js (landing) — puerto 3000
npm run mobile:dev       # solo Expo (app móvil)
npm run server:dev       # solo API — puerto 5000

# Build
npm run web:build        # build Next.js
npm run mobile:build     # build Expo
npm run build            # web build + server build

# Base de datos
npm run db:push          # aplicar esquema Drizzle (desde raíz)
```

## Vercel

La landing se despliega desde **apps/web**. En `vercel.json` está configurado `rootDirectory: "apps/web"` e `installCommand: "cd ../.. && npm install"` para que las workspaces instalen desde la raíz.

## Carpetas antiguas (raíz)

- **client/** y **shared/** — Eliminadas; el código está en `apps/mobile/` y `packages/shared-schema/`.

## Si algo falla

1. **Server no arranca**: Comprueba que `npm install` se ejecutó en la raíz y que existe `node_modules/@zm/shared-schema` (enlace al workspace).
2. **Web (Next.js) no arranca**: Desde raíz, `npm run web:dev`; o `cd apps/web && npm run dev` (con dependencias instaladas desde raíz).
3. **Mobile no arranca**: Desde raíz, `npm run mobile:dev`; o `cd apps/mobile && npm run dev`. El alias `@/` en mobile apunta a la raíz de `apps/mobile`.
