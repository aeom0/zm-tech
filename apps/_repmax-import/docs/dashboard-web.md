# Panel web de administración (`apps/web`)

Dueños de repuesterías pueden gestionar el negocio desde el navegador en rutas bajo **`/dashboard`**, sin depender del mobile. El diseño sigue **Industrial Dark** (Tailwind con colores fijos: `#0D0D0D`, `#1A1A1A`, `#FF6B00`, etc.).

## Rutas Next.js

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión (grupo de rutas `(auth)/login`) |
| `/dashboard` | Redirige a `/dashboard/overview` |
| `/dashboard/overview` | KPIs del día, gráfica 7 días (Recharts), top productos y métodos de pago |
| `/dashboard/inventory` | Tabla de productos, filtros, edición en Sheet (precio, stock, mínimo, activo) |
| `/dashboard/sales` | Historial de ventas con filtros por fecha |
| `/dashboard/customers` | Listado de clientes con búsqueda |

La landing (`/`) y el storefront (`/[slug]`) no se modifican en comportamiento público.

## Autenticación

- **`AuthProvider`** (`src/context/AuthContext.tsx`): JWT en `localStorage` bajo la clave `repmax_token`; al iniciar sesión también se escribe la cookie **`repmax_token`** (`path=/`, `max-age=604800`) para el middleware de Next.js.
- **`middleware.ts`**: si entras a `/dashboard` o subrutas sin cookie `repmax_token`, redirección a `/login`. No valida el JWT (eso lo hace el API Express).
- **`useAuthFetch`**: `fetch` al API con `Authorization: Bearer <token>`. Expone **`refetch: () => void`** para repetir el mismo request (p. ej. inventario tras un `PATCH` exitoso).

## Recharts y SSR (Next.js App Router)

`ResponsiveContainer` de Recharts necesita el DOM para medir ancho/alto; renderizarlo en el servidor puede provocar **warnings de hidratación** (`className did not match`) o **altura 0**. La gráfica de overview vive en `components/dashboard/GraficaVentas.tsx` y se importa desde `overview/page.tsx` con **`next/dynamic`** y **`ssr: false`**, más un placeholder `loading` con el mismo alto (`h-72`).

## API consumida (Express)

Base URL: `NEXT_PUBLIC_API_URL` (p. ej. `http://localhost:5000`). Ver contrato detallado en [CLAUDE.md](../CLAUDE.md) sección API.

## Archivos relevantes

```
apps/web/src/
├── middleware.ts
├── context/AuthContext.tsx
├── hooks/useAuthFetch.ts
├── types/dashboard.ts
├── lib/etiquetas-pago.ts
├── app/
│   ├── layout.tsx              # AuthProvider
│   ├── (auth)/login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx            # redirect → overview
│       ├── overview/page.tsx
│       ├── inventory/page.tsx
│       ├── sales/page.tsx
│       └── customers/page.tsx
├── components/
│   ├── dashboard/
│   │   └── GraficaVentas.tsx   # Recharts; solo cliente (dynamic ssr: false)
│   └── ui/
│       ├── table.tsx
│       ├── sheet.tsx
│       └── label.tsx
```

## Dependencias UI

- **recharts** — gráfica en overview  
- **lucide-react** — iconos del sidebar y acciones

## Base de datos (login web)

El login del panel usa la tabla **`users`** (email + `password_hash` con bcrypt) y un registro en **`store_users`** que enlace `user_id` con la tienda. Tras cambios en el schema: `yarn db:push` desde la raíz. El mobile puede seguir usando Supabase; el panel web en este sprint no llama a Supabase Auth en el servidor.

### Deuda técnica: dos sistemas de identidad

Hoy conviven **login web (bcrypt + JWT sobre `users`)** y **mobile (Supabase Auth)**. Un usuario creado solo en uno no puede iniciar sesión en el otro sin datos alineados (misma identidad en ambos mundos). Es aceptable para este sprint; al abordar la **migración unificada a Supabase Auth** (p. ej. Fase 4 del [ROADMAP.md](../ROADMAP.md)) hay que unificar credenciales y vínculos `store_users` / `auth.users` para un solo flujo de acceso.
