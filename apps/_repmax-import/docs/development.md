# Desarrollo local

## Requisitos

- Node.js 20+
- Yarn 4 (Corepack: `corepack enable`)
- PostgreSQL accesible vía `DATABASE_URL` (para el servidor API)

## Instalación

```bash
yarn install
```

> En CI con instalaciones inmutables, si se agregan workspaces nuevos puede hacer falta  
> `YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install` para actualizar el lockfile.

## Scripts (raíz)

| Comando | Descripción |
|---------|-------------|
| `yarn dev` | Next.js (`:3000`) + Express (`:5000`) en paralelo (Turborepo) |
| `yarn dev:web` | Solo `@repmax/web` |
| `yarn dev:server` | Solo `@repmax/server` |
| `yarn mobile` | Expo (`@repmax/mobile`) |
| `yarn type-check` | `tsc --noEmit` en workspaces que definan el script |
| `yarn build` | Build de web + shared (ajustar filtros en `package.json` si hace falta) |

## Variables de entorno

### Raíz o `apps/server` (API)

```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/repmax
PORT=5000
WEB_URL=http://localhost:3000
JWT_SECRET=una-cadena-larga-y-secreta
```

- **`JWT_SECRET`**: obligatorio para firmar y verificar JWT (`POST /api/auth/login`, rutas con `Authorization: Bearer`).
- Tras añadir o cambiar tablas en `packages/shared` (p. ej. `users`), sincronizar la DB: **`yarn db:push`**.

El servidor expone **rutas públicas** del catálogo (`/api/public/...`) y **rutas JWT** usadas por el panel web (`/api/auth/*`, `/api/dashboard`, `/api/products`, `/api/sales`, `/api/customers`). Detalle: [dashboard-web.md](./dashboard-web.md).

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

El storefront (`/[slug]`) hace `fetch` a `${NEXT_PUBLIC_API_URL}/api/public/...` con `cache: 'no-store'`.

### `apps/mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

Emulador Android → host WSL. En dispositivo físico, usar la IP LAN del PC.

## TypeScript

```bash
yarn workspace @repmax/web exec tsc --noEmit
yarn workspace @repmax/server exec tsc --noEmit
yarn workspace @repmax/mobile exec tsc --noEmit
```

O desde la raíz: `yarn type-check` (si cada workspace expone el script).
