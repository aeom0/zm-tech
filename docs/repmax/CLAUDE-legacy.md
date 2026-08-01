# CLAUDE.md — RepMAX Business Suite

Guía de referencia rápida para Claude Code. Lee esto antes de tocar cualquier archivo.

**Índice de documentación:** [docs/README.md](./docs/README.md)

---

## Producto

**RepMAX Business Suite** — SaaS B2B multi-tenant para tiendas de autopartes de Venezuela.
Una tienda registrada en el sistema gestiona su inventario, POS, clientes y caja desde la app mobile y, vía **panel web**, inventario, ventas y clientes en el navegador.

**Repositorio:** https://github.com/aeom0/repmax-app
**Rama activa:** `main`

---

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | React Native + Expo SDK 54 (`/apps/mobile`) |
| Web | Next.js 15 + App Router + Tailwind + Shadcn/UI (`/apps/web`) |
| Backend | Express.js + TypeScript (`/apps/server`) |
| Auth | JWT + bcryptjs en Express (`apps/server/src/auth.ts`); panel web con `AuthContext` + cookie `repmax_token`. Mobile puede usar Supabase según despliegue. |
| Base de datos | PostgreSQL + Drizzle ORM (`/packages/shared/src/schema.ts`) |
| Monorepo | Yarn 4 Workspaces + Turborepo |
| Package manager | **Yarn 4** — nunca usar npm en este proyecto |

> La migración a Supabase Auth está planificada pero NO está activa. El `AuthContext` del mobile habla con el backend Express, no con Supabase directamente.

---

## Comandos

```bash
# Desde la raíz (Turborepo)
yarn dev:server    # Express en :5000
yarn dev:web       # Next.js en :3000
yarn dev           # Next.js :3000 + Express :5000 en paralelo
yarn mobile        # Expo DevTools
yarn db:push       # Sincronizar schema Drizzle con la DB
yarn build         # Build todos los workspaces
yarn type-check    # TypeScript en todos los workspaces

# Mobile (cd apps/mobile)
yarn android       # Android (emulador o dispositivo)
yarn ios           # iOS
```

---

## Estructura clave

```
repmax-app/
├── package.json          # ROOT: workspaces + scripts Turborepo
├── turbo.json            # Pipeline: build, dev, type-check, db:push
├── .yarnrc.yml           # nodeLinker: node-modules (compatibilidad Expo)
├── docs/                 # Índice y guías (desarrollo, dashboard-web, storefront)
├── packages/
│   └── shared/           # @repmax/shared
│       └── src/schema.ts # Schema Drizzle (stores, users, products, sales, …)
├── apps/
│   ├── server/           # @repmax/server
│   │   └── src/
│   │       ├── index.ts  # Express + CORS + registerRoutes
│   │       ├── routes.ts # API pública storefront + rutas JWT (panel web)
│   │       ├── auth.ts   # verificarJWT, firmarToken
│   │       ├── types/express.d.ts  # req.user
│   │       └── db.ts     # Drizzle + pg Pool
│   ├── web/              # @repmax/web
│   │   └── src/
│   │       ├── middleware.ts         # Protege /dashboard/* vía cookie repmax_token
│   │       ├── app/
│   │       │   ├── layout.tsx        # RootLayout + AuthProvider
│   │       │   ├── landing.css       # Design system Industrial Dark (vars, animaciones, todos los estilos landing)
│   │       │   ├── page.tsx          # Landing page
│   │       │   ├── (auth)/login/     # Login panel web
│   │       │   ├── (dashboard)/      # Sidebar, overview, inventory, sales, customers
│   │       │   └── [slug]/           # Storefront público (page, loading, not-found)
│   │       ├── components/
│   │       │   ├── landing/          # Componentes landing (Industrial Dark)
│   │       │   │   ├── LandingPage.tsx   # Orquestador: scroll-reveal + orden de secciones
│   │       │   │   ├── NavBar.tsx
│   │       │   │   ├── HeroSection.tsx
│   │       │   │   ├── ProblemSection.tsx
│   │       │   │   ├── FeaturesSection.tsx
│   │       │   │   ├── PhoneSection.tsx  # Mockup teléfono + beneficios app mobile
│   │       │   │   ├── MLSection.tsx     # Integración MercadoLibre (logo SVG)
│   │       │   │   ├── PaymentsSection.tsx
│   │       │   │   ├── PricingSection.tsx
│   │       │   │   ├── ProofSection.tsx
│   │       │   │   ├── CTASection.tsx
│   │       │   │   └── LandingFooter.tsx
│   │       │   ├── storefront/       # StorefrontView, header, catálogo, cards, CTA
│   │       │   └── ui/               # Shadcn/UI (button, table, sheet, label…)
│   │       ├── context/AuthContext.tsx
│   │       ├── hooks/useAuthFetch.ts
│   │       ├── types/dashboard.ts
│   │       └── lib/utils.ts
│   └── mobile/           # @repmax/mobile
│       ├── App.tsx        # Entry: AuthProvider > CartProvider > AppNavigator
│       └── src/
│           ├── navigation/
│           │   ├── types.ts          # ParamLists tipadas
│           │   ├── AppNavigator.tsx  # Raíz: Auth vs Main según sesión
│           │   ├── AuthNavigator.tsx # Stack: Login
│           │   └── MainNavigator.tsx # Bottom tabs + stacks internos
│           ├── context/
│           │   ├── AuthContext.tsx   # user + storeUser + store + login/logout
│           │   ├── CartContext.tsx   # items POS en memoria
│           │   └── OnboardingContext.tsx
│           ├── screens/
│           │   ├── auth/             # LoginScreen
│           │   ├── onboarding/       # Splash → país → vehículo → … → decisión
│           │   ├── dashboard/        # DashboardScreen (KPIs)
│           │   ├── pos/              # POSScreen → CartScreen → PaymentScreen → ReceiptScreen
│           │   ├── inventory/        # InventoryScreen + ProductFormScreen
│           │   ├── customers/        # CustomersScreen + CustomerDetailScreen
│           │   ├── reports/          # CashSessionScreen (abrir/cerrar caja)
│           │   └── settings/         # StoreSettings, ExchangeRate
│           ├── hooks/                # useAuth, useProducts, useSales, useCustomers, useDashboard
│           ├── services/             # productService, saleService, customerService, analyticsService
│           ├── types/
│           │   └── database.ts       # Interfaces espejo del schema (camelCase)
│           ├── constants/            # brands.ts, paymentMethods.ts, vehicleTypes.ts
│           └── utils/
│               ├── theme.ts          # Design System "Industrial Dark"
│               ├── api.ts            # axios + interceptor JWT, base URL 10.0.2.2:5000
│               └── formatters.ts     # formatUSD, formatBS, formatDate, formatDateTime
└── supabase/
    └── migrations/        # SQL preparado para migración futura
```

---

## Reglas de código

1. **Yarn siempre** — `yarn add`, `yarn install`. Nunca `npm`.
2. **TypeScript estricto** — `strict: true`. Sin `any`.
3. **camelCase en tipos** — `database.ts` usa `priceUsd`, no `price_usd`. El backend Drizzle mapea automáticamente.
4. **Importaciones internas** — usar `@repmax/shared`, nunca rutas relativas entre workspaces.
5. **Arquitectura en capas (mobile):**
   - `screens/` → solo renderizado, sin lógica de negocio
   - `hooks/` → coordinan estado + llaman services
   - `services/` → único punto de acceso a la API
6. **Next.js App Router** — Server Components por defecto. Agregar `"use client"` solo cuando se usan hooks o APIs del browser.
7. **Todo `async` con `try/catch`** — siempre manejar errores.
8. **Loading states** — toda operación async necesita feedback visual.
9. **Comentarios en español.**
10. **Nombres descriptivos** — `handleCreateSale`, no `handleClick`.

---

## API Backend (Express)

Base URL móvil en desarrollo: `http://10.0.2.2:5000` (emulador Android → host WSL)  
Base URL web en desarrollo: `http://localhost:5000` — storefront usa `NEXT_PUBLIC_API_URL` en `fetch` directo.

### API pública (sin JWT)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/public/:slug/store` | Datos de tienda activa |
| GET | `/api/public/:slug/products` | Catálogo con filtros |

### API autenticada (JWT) — implementado en `apps/server` (panel web + base para mobile)

Login con **bcrypt** contra la tabla **`users`**; el JWT incluye `userId` y `storeId` (expira en 7 días). Header: `Authorization: Bearer <token>`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Body `{ email, password }` → `{ token, user, store, storeUser }` |
| GET | `/api/auth/me` | JWT | Perfil + tienda + `store_user` |
| GET | `/api/dashboard` | JWT | KPIs del día, serie 7 días, top productos hoy, métodos de pago |
| GET | `/api/products` | JWT | Query: `brand`, `condition`, `vehicleType`, `q`, `page`, `limit`, `lowStock` |
| PATCH | `/api/products/:id` | JWT | Body parcial camelCase: `priceUsd`, `stock`, `minStock`, `isActive`, etc. |
| GET | `/api/sales` | JWT | Query: `page`, `limit`, `from`, `to` (ISO) |
| GET | `/api/customers` | JWT | Query: `q`, `page`, `limit` |

### API autenticada — pendiente / mobile (no obligatorio en este proceso Express)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Crear cuenta + tienda |
| GET/PATCH | `/api/store` | Info de la tienda |
| POST | `/api/products` | Alta de producto |
| DELETE | `/api/products/:id` | Baja |
| POST | `/api/customers`, `/api/sales` | Altas |
| GET/POST/PATCH | `/api/cash-sessions/*` | Caja |

> Documentación del panel: [docs/dashboard-web.md](./docs/dashboard-web.md).

---

## Design System — Industrial Dark

```typescript
// Fondos
colors.bg.primary   = '#0D0D0D'   // Negro carbón
colors.bg.secondary = '#1A1A1A'   // Cards
colors.bg.elevated  = '#242424'   // Modales

// Marca
colors.brand.orange = '#FF6B00'   // Acción principal
colors.brand.steel  = '#607D8B'   // Gris acero

// Texto
colors.text.primary   = '#F5F5F5'
colors.text.secondary = '#9E9E9E'
colors.text.inverse   = '#0D0D0D' // sobre fondos naranja
```

---

## Variables de entorno

```bash
# /.env (raíz — servidor Express)
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=5000
WEB_URL=http://localhost:3000     # para CORS del servidor

# /apps/web/.env.local (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:5000

# /apps/mobile/.env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000   # Android emulador
# EXPO_PUBLIC_API_URL=http://192.168.x.x:5000  # dispositivo físico
EXPO_PUBLIC_SUPABASE_URL=...    # preparado para migración futura
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Landing — orden de secciones

```
NavBar → Hero → Problem → Features → PhoneSection → MLSection →
Payments → Pricing → Proof → CTA → Footer
```

Todos los componentes (excepto Hero y NavBar) usan `.l-reveal` para scroll-reveal automático.
El logo de MercadoLibre en `MLSection` es SVG inline (sin imágenes externas).

---

## Pendiente (roadmap)

- [ ] Completar `apps/server` con rutas JWT restantes (`register`, `store`, POST productos/ventas, caja, etc.) según paridad con mobile
- [ ] JSON-LD / Open Graph avanzado en storefront
- [ ] `StoreSettingsScreen` — editar nombre, teléfono, dirección, tasa USD/BS
- [ ] Componentes reutilizables en `apps/mobile/src/components/` (Button, Input, Card...)
- [ ] Cargar fuente Inter (actualmente referenciada pero no cargada con `expo-font`)
- [ ] Migrar `AuthContext` a Supabase Auth cuando el proyecto Supabase esté listo
- [ ] Aplicar migraciones SQL en `/supabase/migrations/` al proyecto Supabase
- [ ] Deploy: `apps/web` → Vercel | `apps/server` → Railway o Render
- [ ] Tests E2E
