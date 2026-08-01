# RepMAX Business Suite

**SaaS B2B multi-tenant** para tiendas de autopartes en Venezuela: inventario, POS, clientes y caja desde la app mobile; landing, **vitrina pública por tienda** y **panel web de administración** (`/dashboard`) en Next.js.

📚 **Documentación:** [docs/README.md](./docs/README.md)

---

## Stack

| Capa | Tecnología |
|------|------------|
| Mobile | React Native + Expo SDK 54 (`apps/mobile`) |
| Web | Next.js 15 + App Router + Tailwind + Shadcn/UI (`apps/web`) |
| API | Express + TypeScript + Drizzle (`apps/server`) |
| Datos | PostgreSQL · schema en `packages/shared` (`@repmax/shared`) |
| Monorepo | Yarn 4 workspaces + Turborepo |

---

## Estructura del monorepo

```
repmax-app/
├── docs/                 # Índice y guías (storefront, desarrollo)
├── packages/shared/      # @repmax/shared — schema Drizzle + constantes
├── apps/
│   ├── server/           # @repmax/server — API Express
│   ├── web/              # @repmax/web — landing, /[slug] storefront, /dashboard
│   └── mobile/           # @repmax/mobile — app Expo
├── design/               # Especificaciones de diseño (p. ej. onboarding)
├── supabase/migrations/  # SQL de referencia / futuro Supabase
├── CLAUDE.md             # Guía rápida para IA
├── SKILLS.md             # Referencia técnica amplia
├── ROADMAP.md            # Plan por fases
└── package.json
```

---

## Requisitos

- Node.js 20+
- Yarn 4 (`corepack enable`)
- PostgreSQL (para levantar el API con datos reales)

---

## Desarrollo

```bash
yarn install

# Next.js :3000 + Express :5000
yarn dev

# Por separado
yarn dev:web
yarn dev:server

# App mobile (Expo)
yarn mobile
```

Variables típicas: ver [docs/development.md](./docs/development.md).

**Mobile (WSL / Android emulador):** la app usa `http://10.0.2.2:5000` hacia el host. En dispositivo físico, la IP LAN de tu PC.

---

## Storefront público

Ruta web: `/[slug]` (ej. `/repuestoselchamo`). Catálogo sin login; datos vía API pública en el servidor.

Detalle: [docs/storefront.md](./docs/storefront.md).

---

## Panel web (administración)

Rutas: `/login` y `/dashboard/*` (resumen, inventario, ventas, clientes). Autenticación JWT contra el API Express; cookie `repmax_token` para proteger rutas en Next.js.

Detalle: [docs/dashboard-web.md](./docs/dashboard-web.md).

---

## Flujo principal (mobile)

```
Onboarding (opcional) → Login / Registro
  → Dashboard → POS / Inventario / Clientes / Caja / Ajustes
```

---

## API (resumen)

- **Pública (sin JWT):** `GET /api/public/:slug/store`, `GET /api/public/:slug/products`
- **Resto del negocio (JWT):** registro, login, productos, ventas, caja, dashboard, etc. — ver `SKILLS.md` / `CLAUDE.md` (el código en `apps/server` puede ir creciendo; hoy incluye al menos las rutas públicas del storefront).

---

## Modelo multi-tenant

Cada **store** es un tenant; los datos se aislan por `store_id`.

---

*RepMAX Business Suite · Venezuela · 2026*
