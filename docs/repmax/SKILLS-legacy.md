# SKILLS.md — RepMAX Business Suite
> Guía técnica de referencia profunda para desarrollo con IA (Claude Code / Gemini).
> Lee este archivo ANTES de tocar cualquier código.

**Índice:** [docs/README.md](./docs/README.md) · guía rápida: [CLAUDE.md](./CLAUDE.md)

---

## 🧭 Identidad del Producto

**RepMAX** es un SaaS B2B multi-tenant para tiendas de autopartes venezolanas (_repuesteras_) y talleres mecánicos (_talleres_). El core es gestión de inventario + POS mobile-first. La visión a largo plazo es un marketplace bidireccional que conecte vendedores con talleres.

**Repositorio:** `https://github.com/aeom0/RepMAX`  
**Rama activa:** `main`  
**Package manager:** Yarn 4 (SIEMPRE — nunca `npm`)

---

## 🏗️ Stack Técnico

| Capa          | Tecnología                                              | Path                            |
|---------------|---------------------------------------------------------|---------------------------------|
| Mobile        | React Native + Expo SDK 54                              | `/apps/mobile`                  |
| Web           | Next.js 15 + App Router + Tailwind CSS + Shadcn/UI      | `/apps/web`                     |
| Backend       | Express.js + TypeScript                                 | `/apps/server`                  |
| Auth          | JWT propio + bcryptjs                                   | `/apps/server/src/auth.ts`      |
| Base de datos | PostgreSQL + Drizzle ORM                                | `/packages/shared/src/schema.ts`|
| Monorepo      | Yarn 4 Workspaces + Turborepo                           | `/turbo.json`                   |
| Infra Web     | Vercel (deploy automático)                              | —                               |
| Infra DB      | Supabase (sa-east-1) — Drizzle conecta directo          | `/supabase/`                    |

> ⚠️ **Supabase Auth NO está activo**. El `AuthContext` mobile habla con Express `/api/auth/*`, no con Supabase Auth directamente. La migración está planificada para una fase posterior.

---

## 📁 Estructura del Monorepo

```
repmax-app/
├── package.json              # ROOT: workspaces + scripts Turborepo
├── turbo.json                # Pipeline: build, dev, type-check, db:push
├── .yarnrc.yml               # nodeLinker: node-modules (compatibilidad Expo)
├── docs/                     # Índice + guías (desarrollo, storefront)
│
├── packages/
│   └── shared/               # @repmax/shared
│       └── src/
│           └── schema.ts     # Fuente de verdad de la DB (Drizzle + Zod)
│
├── apps/
│   ├── server/               # @repmax/server
│   │   └── src/
│   │       ├── index.ts      # Entry Express (CORS, JSON)
│   │       ├── routes.ts     # Rutas API (hoy: públicas `/api/public/*` + extensible)
│   │       └── db.ts         # Pool pg + Drizzle
│   │       # auth.ts + JWT: incorporar cuando el API autenticado viva en este paquete
│   │
│   ├── web/                  # @repmax/web
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx           # RootLayout (fonts + providers)
│   │       │   ├── landing.css          # Design System "Industrial Dark"
│   │       │   ├── page.tsx             # Landing (Server Component)
│   │       │   └── [slug]/              # Storefront público por tienda
│   │       │       ├── page.tsx
│   │       │       ├── loading.tsx
│   │       │       └── not-found.tsx
│   │       └── components/
│   │           ├── landing/             # Componentes landing
│   │           │   ├── LandingPage.tsx  # Orquestador (scroll-reveal)
│   │           │   ├── NavBar.tsx
│   │           │   ├── HeroSection.tsx
│   │           │   ├── ProblemSection.tsx
│   │           │   ├── FeaturesSection.tsx
│   │           │   ├── PhoneSection.tsx
│   │           │   ├── MLSection.tsx
│   │           │   ├── PaymentsSection.tsx
│   │           │   ├── PricingSection.tsx
│   │           │   ├── ProofSection.tsx
│   │           │   ├── CTASection.tsx
│   │           │   └── LandingFooter.tsx
│   │           ├── storefront/          # StorefrontHeader, ProductCatalog, ProductCard, ContactCTA…
│   │           └── ui/                  # Shadcn/UI components
│   │
│   └── mobile/               # @repmax/mobile
│       ├── App.tsx            # Entry: AuthProvider > CartProvider > AppNavigator
│       └── src/
│           ├── navigation/
│           │   ├── types.ts              # ParamLists tipadas (todo el árbol)
│           │   ├── AppNavigator.tsx      # Raíz: Onboarding | Auth | Main
│           │   ├── AuthNavigator.tsx     # Stack: Login
│           │   ├── OnboardingNavigator.tsx # Stack: 7 pantallas onboarding
│           │   └── MainNavigator.tsx     # Bottom tabs + stacks internos
│           ├── context/
│           │   ├── AuthContext.tsx       # user + storeUser + store + login/logout
│           │   ├── CartContext.tsx       # items POS en memoria
│           │   └── OnboardingContext.tsx # AsyncStorage: completed flag
│           ├── screens/
│           │   ├── auth/                 # LoginScreen
│           │   ├── onboarding/           # Splash→Country→Vehicle→Business→Theme→Preview→Decision
│           │   ├── dashboard/            # DashboardScreen (KPIs del día)
│           │   ├── pos/                  # POS → Cart → Payment → Receipt
│           │   ├── inventory/            # InventoryScreen + ProductFormScreen
│           │   ├── customers/            # CustomersScreen + CustomerDetailScreen
│           │   ├── reports/              # CashSessionScreen
│           │   └── settings/             # StoreSettingsScreen + ExchangeRateScreen
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useProducts.ts
│           │   ├── useSales.ts
│           │   ├── useCustomers.ts
│           │   ├── useDashboard.ts
│           │   └── useOnboardingNavigation.ts
│           ├── services/
│           │   ├── productService.ts
│           │   ├── saleService.ts
│           │   ├── customerService.ts
│           │   └── analyticsService.ts
│           ├── types/
│           │   └── database.ts           # Interfaces camelCase espejo del schema
│           ├── constants/
│           │   ├── brands.ts             # Toyota, Ford, Bera, Empire...
│           │   ├── paymentMethods.ts     # Labels en español
│           │   ├── vehicleTypes.ts       # CAR, MOTO, TRUCK, SUV
│           │   └── onboarding.ts         # COUNTRIES, BUSINESS_OPTIONS, THEMES...
│           └── utils/
│               ├── theme.ts              # Design System tokens
│               ├── api.ts                # axios + interceptor JWT
│               └── formatters.ts        # formatUSD, formatBS, formatDate
│
└── supabase/
    ├── config.toml
    ├── migrations/
    │   └── 20260225000001_initial_schema.sql
    └── seed.sql
```

---

## 🗄️ Modelo de Datos

Cada **store** es un tenant independiente. Todos los datos están aislados por `store_id`.

### Tablas principales

| Tabla          | Descripción                                                      |
|----------------|------------------------------------------------------------------|
| `stores`       | Raíz del tenant (slug, plan, tasa USD/BS, logo)                  |
| `store_users`  | Empleados con roles (`owner`, `cashier`, `inventory`)            |
| `products`     | Inventario (marca, modelo, año, condición, stock, precio USD/BS) |
| `customers`    | Clientes con historial de compras                                |
| `cash_sessions`| Sesiones de caja (apertura, cierre, fondo inicial)               |
| `sales`        | Ventas con método de pago, tasa y cliente asociado               |
| `sale_items`   | Líneas de detalle de cada venta (con product_snapshot JSONB)     |

### Enums

```sql
vehicle_type:      CAR | MOTO | TRUCK | SUV
part_condition:    NEW | USED
payment_method:    CASH_USD | CASH_BS | ZELLE | PAGO_MOVIL | TRANSFERENCIA | MIXED
sale_status:       COMPLETED | CANCELLED | REFUNDED
store_user_role:   owner | cashier | inventory
subscription_plan: basic | pro | enterprise
```

### Tablas pendientes (Módulo Taller)

```sql
-- A agregar en próxima migración
stores.store_type:  repuesteria | taller | ambos  -- campo nuevo en stores
vehicles:           id, store_id, plate, brand, model, year, owner_customer_id
work_orders:        id, store_id, vehicle_id, cashier_id, status, diagnosis, labor_cost_usd
work_order_parts:   id, work_order_id, product_id, quantity, unit_price_usd
```

---

## 🔌 API Backend

**Base URL:**
- Mobile dev: `http://10.0.2.2:5000` (emulador Android → host WSL)
- Web dev: `http://localhost:5000`

**Auth:** `Authorization: Bearer <token>` en todas las rutas excepto `/api/auth/*`

| Método        | Ruta                           | Auth | Descripción                      |
|---------------|--------------------------------|------|----------------------------------|
| POST          | `/api/auth/register`           | No   | Crear cuenta + tienda            |
| POST          | `/api/auth/login`              | No   | Login → JWT                      |
| GET           | `/api/auth/me`                 | JWT  | Usuario actual                   |
| GET/PATCH     | `/api/store`                   | JWT  | Info de la tienda                |
| GET/POST      | `/api/products`                | JWT  | Inventario con filtros           |
| PATCH/DELETE  | `/api/products/:id`            | JWT  | Editar/desactivar producto       |
| GET/POST      | `/api/customers`               | JWT  | Clientes                         |
| GET           | `/api/customers/:id`           | JWT  | Detalle + historial              |
| GET/POST      | `/api/sales`                   | JWT  | Ventas (POST es transaccional)   |
| GET           | `/api/cash-sessions/active`    | JWT  | Sesión de caja activa            |
| POST          | `/api/cash-sessions/open`      | JWT  | Abrir caja                       |
| PATCH         | `/api/cash-sessions/:id/close` | JWT  | Cerrar caja                      |
| GET           | `/api/dashboard`               | JWT  | KPIs del día                     |

### API pública (sin JWT) — storefront

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/public/:slug/store` | Tienda activa por `slug` |
| GET | `/api/public/:slug/products` | Catálogo con filtros y paginación |

> 🔐 **Crítico:** `POST /api/sales` debe ser una transacción atómica (descuento de stock + registro de venta en un solo commit). Cualquier error hace rollback total. *(Aplica cuando esa ruta esté implementada en `apps/server`.)*

---

## 🎨 Design System — Industrial Dark

### Tokens de color

```typescript
// Fondos
colors.bg.primary    = '#0D0D0D'  // Negro carbón — fondo de pantallas
colors.bg.secondary  = '#1A1A1A'  // Cards, surfaces
colors.bg.elevated   = '#242424'  // Modales, inputs, dropdowns
colors.bg.border     = '#2A2A2A'  // Divisores sutiles

// Marca
colors.brand.orange  = '#FF6B00'  // Acción principal, precios, CTA
colors.brand.steel   = '#607D8B'  // Gris acero — badges, metadata

// Texto
colors.text.primary  = '#F5F5F5'
colors.text.secondary = '#9E9E9E'
colors.text.disabled  = '#616161'
colors.text.inverse   = '#0D0D0D' // Sobre fondos naranja

// Semánticos
colors.semantic.success = '#4CAF50'
colors.semantic.warning = '#FFC107'
colors.semantic.error   = '#F44336'
colors.semantic.info    = '#2196F3'

// Status de stock
colors.status.inStock   = '#4CAF50'
colors.status.lowStock  = '#FFC107'
colors.status.outOfStock = '#F44336'
colors.status.new       = '#2196F3'
colors.status.used      = '#9E9E9E'
```

### Tipografía

```typescript
// Mobile (React Native) — @expo-google-fonts/inter
typography.fontFamily.regular  = 'Inter_400Regular'
typography.fontFamily.medium   = 'Inter_500Medium'
typography.fontFamily.semibold = 'Inter_600SemiBold'
typography.fontFamily.bold     = 'Inter_700Bold'

// Web (landing): ver landing.css / Tailwind (Industrial Dark)
```

### Convenciones de clases (Web — landing.css)

- `.l-*` → prefijo para estilos de landing
- `.l-reveal` → clase para scroll-reveal (todos los componentes excepto NavBar y Hero)
- Las tarjetas de features tienen efecto `radial-gradient` en `onMouseMove`

---

## ⚙️ Comandos de Desarrollo

```bash
# Desde la raíz del monorepo
yarn dev           # Next.js :3000 + Express :5000 (Turborepo)
yarn dev:server    # Solo Express :5000
yarn dev:web       # Solo Next.js :3000
yarn mobile        # Expo DevTools (escanear QR)
yarn db:push       # Sincronizar schema Drizzle con la DB
yarn build         # Build de todos los workspaces
yarn type-check    # TypeScript en todos los workspaces

# Desde /apps/mobile
yarn android       # Android emulador o dispositivo
yarn ios           # iOS (requiere macOS)
```

---

## 📐 Reglas de Arquitectura

### 1. Arquitectura en Capas (Mobile)

```
screens/   → Solo JSX + estilos. CERO lógica de negocio.
hooks/     → Coordinan estado local + llaman a services.
services/  → Único punto de acceso a la API REST.
context/   → Estado global (auth, carrito, onboarding).
```

**Regla de oro:** Si un `screen` hace un `fetch` directamente → está mal.

### 2. Next.js App Router

- **Server Components por defecto.** Agregar `"use client"` solo cuando se usan:
  - Hooks de React (`useState`, `useEffect`, `useRef`...)
  - APIs del browser (`window`, `localStorage`...)
  - Event handlers interactivos
- Los datos del servidor se pasan como props a Client Components.

### 3. TypeScript Estricto

```typescript
// ✅ Correcto
interface ProductForm {
  priceUsd: string;
  minStock: number;
}

// ❌ Prohibido
const data: any = response.data;
```

- **Sin `any`**. Usar `unknown` y hacer type guard si es necesario.
- **camelCase en tipos** (`priceUsd`, no `price_usd`).
- **Importaciones internas:** `@repmax/shared` (nunca rutas relativas entre workspaces).

### 4. Manejo de Errores

```typescript
// Todo async DEBE tener try/catch + loading state
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await someService.doSomething();
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : 'Error inesperado';
    Alert.alert('Error', mensaje);
  } finally {
    setIsLoading(false);
  }
};
```

### 5. Comentarios

- **Todos en español.** Sin excepción.
- Header de archivo:
  ```typescript
  // ============================================================
  // REPMAX — [Nombre del módulo]
  // [Descripción de una línea]
  // ============================================================
  ```

---

## 🧩 Flujos Clave

### Flujo de Onboarding (Mobile)

```
OnboardingSplash
  → OnboardingCountry   (VE destacado, +4 países LATAM)
  → OnboardingVehicle   (CARS | MOTOS | BOTH)
  → OnboardingBusiness  (PARTS_STORE | WORKSHOP | BOTH)
  → OnboardingTheme     (Turbo/Rojo | Acero/Azul | Terreno/Verde)
  → OnboardingPreview   (Mock del dashboard con datos del onboarding)
  → OnboardingDecision  (CTA: Registrar o Iniciar sesión)
```

El flujo se controla con `useOnboardingNavigation`. Al completar, `OnboardingContext` marca `completed: true` en AsyncStorage.

### Flujo de Venta POS (Mobile)

```
POSScreen (búsqueda de productos)
  → CartScreen (items + totales USD/BS)
  → PaymentScreen (método de pago + tasa)
  → ReceiptScreen (comprobante — headerBackVisible: false)
```

El carrito vive en `CartContext` (memoria). Al confirmar venta, `saleService` hace `POST /api/sales` (transacción atómica).

### Flujo de Autenticación (Mobile)

```
AppNavigator comprueba:
  1. ¿Onboarding completado? (AsyncStorage)   → No: OnboardingNavigator
  2. ¿User en AuthContext?                     → No: AuthNavigator (Login)
  3. Sí autenticado                            → MainNavigator (Dashboard)
```

---

## 🌐 Landing Page Web

### Orden de secciones

```
NavBar → Hero → Problem → Features → PhoneSection → MLSection
→ Payments → Pricing → Proof → CTA → Footer
```

### Reglas

- **NavBar y Hero**: NO llevan `.l-reveal`
- **Todos los demás**: Deben llevar `className="l-reveal"` o `className="l-features-section l-reveal"`
- El logo de MercadoLibre en `MLSection` es **SVG inline** (sin imágenes externas)
- Las feature cards tienen `onMouseMove` → `radial-gradient` dinámico

---

## 🔐 Variables de Entorno

```bash
# /.env (raíz — servidor Express)
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=5000
WEB_URL=http://localhost:3000   # CORS del servidor

# /apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000

# /apps/mobile/.env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000         # Android emulador
# EXPO_PUBLIC_API_URL=http://192.168.x.x:5000    # Dispositivo físico
EXPO_PUBLIC_SUPABASE_URL=...                      # Para migración futura
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 🚦 Multi-tenancy

- Cada `store` es un tenant 100% aislado.
- El `store_id` viene del JWT decodificado en el servidor → NUNCA confiar en el `store_id` del cliente.
- RLS preparado en Supabase migrations pero NO activo aún (Express hace el filtrado).
- Roles por tenant: `owner` (acceso total) | `cashier` (solo POS + caja) | `inventory` (solo inventario)

---

## 📱 Mobile — Notas WSL/Android

- Emulador Android → host WSL: `http://10.0.2.2:5000`
- Dispositivo físico: usar la IP local de la máquina Windows en la red LAN
- El APK es **monolítico** — la condicionalidad por `storeType` se maneja con UI condicional, NO con builds separados
- `storeType`-based tabs: React Navigation lazy-mounts las tabs no activas → eficiente en memoria

---

## 🗓️ Contexto de Negocio

| Dato                  | Valor                                                         |
|-----------------------|---------------------------------------------------------------|
| Mercado objetivo      | Venezuela (primario) → LATAM (expansión)                      |
| Monedas               | USD (precio base) + Bs (calculado según tasa configurable)    |
| Métodos de pago       | Zelle, Pago Móvil, Efectivo USD, Efectivo Bs, Transferencia   |
| Integración planificada | MercadoLibre, WhatsApp Business API (Meta Cloud + 360dialog) |
| Planes disponibles    | `basic` | `pro` | `enterprise`                                  |
| Primer cliente real   | Repuestería de cuñado (Toyota parts)                          |
| Segmento taller       | Amigos con taller mecánico (próximos clientes)                |

---

## 🚫 Prohibiciones Absolutas

1. **Nunca `npm`** — solo `yarn`
2. **Nunca `any`** en TypeScript
3. **Nunca rutas relativas entre workspaces** — usar `@repmax/shared`
4. **Nunca lógica de negocio en `screens/`**
5. **Nunca `"use client"` innecesario** en Next.js
6. **Nunca fetch directo en componentes** — pasar por services/hooks
7. **Nunca confiar en `store_id` del cliente** en el backend
8. **Nunca operación de venta sin transacción atómica**
