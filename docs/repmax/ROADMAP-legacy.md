# ROADMAP.md — RepMAX Business Suite
> Plan de ejecución faseado. Ordenado por prioridad estratégica y dependencias técnicas.
> Última actualización: Marzo 2026

---

## 📊 Estado Actual del Proyecto

```
✅ Listo y funcional
🔄 En progreso / parcial
⚠️  Pendiente (con deuda técnica)
🆕 Nuevo / no iniciado
```

| Módulo                      | Estado | Notas                                      |
|-----------------------------|--------|--------------------------------------------|
| Auth (Login + Registro)     | ✅     | JWT propio, funcional                      |
| Onboarding mobile           | ✅     | 7 pantallas, AsyncStorage                  |
| Dashboard KPIs              | ✅     | Datos del día                              |
| POS (flujo completo)        | ✅     | POS → Cart → Payment → Receipt             |
| Inventario                  | ✅     | CRUD completo con filtros                  |
| Clientes                    | ✅     | Lista + detalle + historial                |
| Caja (Cash Sessions)        | ✅     | Abrir / cerrar sesión                      |
| Settings + Tasa de cambio   | ✅     | StoreSettingsScreen + ExchangeRateScreen   |
| Landing page web            | ✅     | Industrial Dark, scroll-reveal, localizada |
| Rebranding Torquea → RepMAX | 🔄     | Packages + assets en actualización         |
| Módulo Taller               | 🆕     | Architecture agreed, no implementado       |
| Storefront público `/[slug]`| ✅     | Next.js + API pública en `apps/server` (ver `/docs/storefront.md`) |
| Supabase Auth (migración)   | 🆕     | Planificado, no activo                     |
| WhatsApp Business API       | 🆕     | Planificado, en evaluación BSP             |
| MercadoLibre integration    | 🆕     | Referenciado en landing, no implementado   |

---

## 🔴 FASE 0 — Deuda Técnica Urgente
> Hacer ANTES de cualquier nueva feature. Son la base de todo lo que sigue.

### 0.1 Completar Rebranding `torquea` → `repmax`
**Estado:** los workspaces usan `@repmax/*` y el producto se llama RepMAX. Revisar restos del nombre legacy con:

```bash
grep -r "torquea" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v .git
```

Pendiente puntual: `supabase/config.toml` (`project_id`), enlaces viejos en docs externos, y comentarios en migraciones históricas (baja prioridad).

### 0.2 Transacciones Atómicas en Ventas
**Archivo:** `apps/server/src/routes.ts` (cuando exista `POST /api/sales` en este servidor)  
**Problema:** `POST /api/sales` debe usar `db.transaction()` de Drizzle para que el descuento de stock y el registro de venta sean atómicos.

```typescript
// Patrón correcto con Drizzle
await db.transaction(async (tx) => {
  // 1. Verificar stock de cada ítem
  // 2. Descontar stock en products
  // 3. Insertar sale
  // 4. Insertar sale_items
  // Si cualquier paso falla → rollback automático
});
```

### 0.3 Variables de Entorno — Validación al Inicio
**Archivo:** `apps/server/src/index.ts`  
Agregar validación de env vars al startup del servidor con Zod:

```typescript
import { z } from 'zod';
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.string().default('5000'),
});
const env = envSchema.parse(process.env);
```

### 0.4 Actualizar `CLAUDE.md` con nuevo nombre y referencias
El archivo `CLAUDE.md` raíz tiene referencias a Torquea que Claude Code usa como contexto. Actualizar con el nuevo branding y este SKILLS.md.

---

## 🟠 FASE 1 — Módulo Taller (Prioridad Alta)
> El segundo segmento de clientes. Los amigos con el taller esperan esto.

### 1.1 Migración de Base de Datos

**Archivo nuevo:** `supabase/migrations/20260301000002_taller_module.sql`

```sql
-- Campo storeType en stores
ALTER TABLE stores ADD COLUMN store_type VARCHAR(20) DEFAULT 'repuesteria'
  CHECK (store_type IN ('repuesteria', 'taller', 'ambos'));

-- Vehículos de clientes
CREATE TABLE vehicles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  plate            VARCHAR(20),
  brand            VARCHAR(100) NOT NULL,
  model            VARCHAR(100) NOT NULL,
  year             INTEGER,
  color            VARCHAR(50),
  vin              VARCHAR(50),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Órdenes de trabajo
CREATE TABLE work_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  vehicle_id       UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  cashier_id       UUID REFERENCES store_users(id) ON DELETE SET NULL,
  order_number     VARCHAR(50),
  status           VARCHAR(20) DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  diagnosis        TEXT,
  labor_cost_usd   DECIMAL(12,2) DEFAULT 0,
  total_usd        DECIMAL(12,2) DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Repuestos usados en orden de trabajo
CREATE TABLE work_order_parts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id    UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price_usd   DECIMAL(12,2) NOT NULL,
  subtotal_usd     DECIMAL(12,2) NOT NULL
);
```

**Schema Drizzle:** Agregar tablas en `/packages/shared/src/schema.ts`

### 1.2 Backend — Endpoints de Taller

```
GET/POST    /api/vehicles              → CRUD de vehículos
GET/PATCH   /api/vehicles/:id
GET/POST    /api/work-orders           → CRUD de órdenes de trabajo
GET/PATCH   /api/work-orders/:id
POST        /api/work-orders/:id/close → Cierra orden + descuenta stock partes
```

### 1.3 Mobile — Navegación Condicional

**Archivo:** `apps/mobile/src/navigation/MainNavigator.tsx`

```typescript
// El AuthContext ya tiene acceso al store
const { store } = useAuth();
const isTaller = store?.storeType === 'taller' || store?.storeType === 'ambos';
const isRepuesteria = store?.storeType === 'repuesteria' || store?.storeType === 'ambos';

// Renderizar tabs condicionalmente
{isTaller && (
  <Tab.Screen name="WorkOrdersTab" component={WorkOrdersNavigator} ... />
)}
{isRepuesteria && (
  <Tab.Screen name="InventoryTab" component={InventoryNavigator} ... />
)}
```

### 1.4 Mobile — Nuevas Pantallas (Taller)

| Pantalla              | Path                                     | Descripción                              |
|-----------------------|------------------------------------------|------------------------------------------|
| VehiclesScreen        | `screens/taller/VehiclesScreen.tsx`      | Lista de vehículos del cliente           |
| VehicleFormScreen     | `screens/taller/VehicleFormScreen.tsx`   | Crear / editar vehículo                  |
| WorkOrdersScreen      | `screens/taller/WorkOrdersScreen.tsx`    | Lista de órdenes de trabajo              |
| WorkOrderDetailScreen | `screens/taller/WorkOrderDetailScreen.tsx` | Detalle + partes + estado              |
| WorkOrderFormScreen   | `screens/taller/WorkOrderFormScreen.tsx` | Nueva orden de trabajo                   |

### 1.5 Actualizar Onboarding

El onboarding ya tiene `BUSINESS_OPTIONS` con `WORKSHOP` y `BOTH`. Conectar esa selección al `storeType` al momento del registro (`POST /api/auth/register`).

---

## 🟡 FASE 2 — Web Dashboard (Panel de Administración)
> El dueño de la tienda debería poder revisar reportes y configurar sin la app mobile.

### 2.1 Estructura de Rutas Web (App Router)

```
/app
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx          ← Sidebar + AuthGuard + TanStack Query Provider
│   ├── page.tsx            ← Redirect a /dashboard
│   └── dashboard/
│       ├── page.tsx        ← KPIs + charts (Recharts)
│       ├── inventory/
│       │   ├── page.tsx    ← Tabla de productos (Server Component + filtros)
│       │   └── [id]/page.tsx ← Detalle/edición
│       ├── sales/
│       │   └── page.tsx    ← Historial de ventas con filtros de fecha
│       ├── customers/
│       │   └── page.tsx    ← Lista de clientes
│       └── settings/
│           └── page.tsx    ← Config tienda + tasa de cambio
└── [slug]/
    └── page.tsx            ← ⚠️ Storefront público (ver Fase 3)
```

### 2.2 Auth Web

Implementar con `AuthContext` client-side (similar al mobile) o con cookies httpOnly:
- `POST /api/auth/login` → guardar JWT en cookie httpOnly (más seguro que localStorage)
- Middleware Next.js para proteger rutas `/dashboard/*`

### 2.3 Dashboard KPIs (Recharts)

Componentes a crear:
- `<DailyRevenueChart />` — Line chart USD por día (últimos 30 días)
- `<TopProductsCard />` — Top 5 productos más vendidos
- `<PaymentMethodsPie />` — Distribución de métodos de pago
- `<LowStockAlert />` — Productos bajo `min_stock`
- `<TodaySummaryCards />` — Ventas hoy, clientes atendidos, caja actual

### 2.4 Tabla de Inventario Web

Usar Shadcn/UI `DataTable` + TanStack Table:
- Columnas: Producto, Marca, Modelo, Precio USD, Stock, Condición, Acciones
- Filtros: por marca, condición, stock bajo
- Acciones: editar inline, desactivar

---

## 🟢 FASE 3 — Storefront Público `/[slug]`
> La "vitrina digital" de cada repuestería. Un cliente puede buscar repuestos online.

**Estado (Mar 2026):** implementación base lista — página SSR, `loading` / `not-found`, componentes en `apps/web/src/components/storefront/`, endpoints en `apps/server/src/routes.ts`. Documentación: [`docs/storefront.md`](./docs/storefront.md).

### 3.1 Página del Storefront

**Archivos:** `apps/web/src/app/[slug]/page.tsx`, `loading.tsx`, `not-found.tsx` — `generateMetadata`, fetch a API pública, `StorefrontView`.

### 3.2 Componentes del Storefront

| Componente              | Descripción                                       |
|-------------------------|---------------------------------------------------|
| `<StorefrontHeader />`  | Nombre, ciudad, badge plan, WhatsApp              |
| `<ProductCatalog />`    | Búsqueda, filtros, grid, paginación (client)      |
| `<ProductCard />`       | Precio USD/BS, stock, condición, foto             |
| `<ContactCTA />`        | FAB WhatsApp                                      |
| `<StorefrontSEO />`     | _(Pendiente)_ JSON-LD / OG enriquecido          |

### 3.3 API Pública (sin auth)

```
GET /api/public/:slug/store     → Info pública de la tienda
GET /api/public/:slug/products  → Catálogo público con filtros
```

---

## 🔵 FASE 4 — Supabase Auth (Migración)
> Reemplazar el JWT propio por Supabase Auth para mejor seguridad y funcionalidades.

### 4.1 Plan de Migración

1. **Habilitar Supabase Auth** en el proyecto
2. **Migrar usuarios:** Script para crear usuarios en `auth.users` con las mismas credenciales
3. **Actualizar `AuthContext` mobile:** Cambiar de `POST /api/auth/login` a `supabase.auth.signInWithPassword()`
4. **Activar RLS:** El schema SQL ya tiene la estructura preparada
5. **Actualizar backend:** Cambiar verificación JWT de `jwt.verify(token, secret)` a Supabase JWT secret

### 4.2 RLS Policies a Activar

```sql
-- Ejemplo para products
CREATE POLICY "Empleados ven solo su store"
  ON products FOR SELECT
  USING (store_id = (
    SELECT store_id FROM store_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1
  ));
```

### 4.3 Impacto en el Código

- `apps/mobile/src/context/AuthContext.tsx` → migrar a `@supabase/supabase-js`
- `apps/mobile/src/utils/api.ts` → token ahora viene de `supabase.auth.getSession()`
- `apps/server/src/auth.ts` → validar con Supabase JWT secret (o eliminar si RLS hace el trabajo)

---

## 🟣 FASE 5 — Integraciones Externas

### 5.1 WhatsApp Business API (WABA)

**Estrategia:** Modelo multi-tenant donde cada tienda conecta su propio número.

**Opciones evaluadas:**
- **Meta Cloud API directo:** Requiere verificación de negocio (registro mercantil) — viable post formalización
- **360dialog (BSP):** Permite usar número sin verificación independiente de Meta — preferido para early adopters

**Fases de implementación:**
1. Dev/test mode: Usar cuenta Meta Business Manager personal para pruebas
2. Early pilots: 360dialog como BSP (bypass verificación Meta)
3. Escala: Migrar a Meta Cloud API directo post-registro formal

**Endpoints a crear:**
```
POST /api/whatsapp/send-receipt    → Enviar comprobante de venta por WA
POST /api/whatsapp/send-reminder   → Recordatorio de fiado / cita
GET  /api/whatsapp/status          → Estado de la conexión WABA del tenant
```

**Schema adicional:**
```sql
-- En stores
waba_phone_number_id  VARCHAR(100),  -- Meta API
waba_access_token     TEXT,          -- Encriptado
waba_is_connected     BOOLEAN DEFAULT false
```

### 5.2 MercadoLibre

**Flujo de integración:**
1. OAuth 2.0 con cuenta ML del vendedor
2. Sincronización bidireccional de inventario (RepMAX → ML y ML → RepMAX)
3. Pedidos ML aparecen en historial de ventas + descuentan stock

**Endpoints:**
```
GET  /api/ml/auth-url              → URL de OAuth ML
POST /api/ml/callback              → Guardar access token ML
POST /api/ml/sync-products         → Subir/actualizar productos a ML
GET  /api/ml/orders                → Pull de pedidos ML
```

**Schema adicional:**
```sql
-- En products
ml_item_id      VARCHAR(50),   -- ID en MercadoLibre
ml_permalink    TEXT,          -- URL de la publicación
ml_sync_status  VARCHAR(20)    -- SYNCED | PENDING | ERROR
```

---

## ⚫ FASE 6 — Escalabilidad y Operaciones

### 6.1 Dominio

- **Ahora:** GoDaddy (precio promocional)
- **Plan:** Transferir a Namecheap post-expiración del promo GoDaddy
- Configurar DNS apuntando a Vercel (dominio customizado para la web)

### 6.2 Registro Formal del Negocio

- Registro mercantil (Venezuela) — planificado post primer cliente pagando
- Necesario para: Supabase Pro, dominio empresarial, Meta Business Manager verificado

### 6.3 Monitoreo y Observabilidad

```
- Error tracking:     Sentry (free tier)
- Logs del servidor:  Vercel Functions logs
- DB monitoring:      Supabase Dashboard
- Uptime:             UptimeRobot o Better Uptime (free)
```

### 6.4 EAS Build (Multi-Flavor)

Cuando se necesiten APKs diferenciados por cliente:
- Expo EAS Build con `eas.json` multi-profiles
- Environment variables por cliente via EAS secrets
- Por ahora: un solo APK con `storeType`-based UI

### 6.5 Optimizaciones de Performance

- **Mobile:** Implementar `React.memo` en `ProductRow`, `CustomerCard` (listas largas)
- **Mobile:** `FlatList.getItemLayout` para listas de inventario grande
- **Backend:** Cursor-based pagination en `/api/products` y `/api/sales`
- **DB:** Revisar EXPLAIN ANALYZE en queries de dashboard (join con sale_items es potencialmente lento)

---

## 📋 Backlog sin Fase Asignada

| Feature                        | Prioridad | Notas                                              |
|--------------------------------|-----------|----------------------------------------------------|
| Reportes avanzados (PDF)       | Media     | Export de cierre de caja, ventas del mes           |
| Búsqueda por número de parte   | Alta      | `part_number` en `ProductRow` ya se muestra        |
| Fotos de productos             | Media     | `photos TEXT[]` ya está en schema                  |
| Registro móvil (sin web)       | Alta      | `OnboardingDecision` ya tiene botón "Registrarse"  |
| Notificaciones push            | Media     | Expo Notifications + stock bajo                    |
| Importar inventario por CSV    | Media     | Ahorra tiempo en onboarding de clientes grandes    |
| Dark/Light mode toggle web     | Baja      | Landing siempre dark; dashboard podría ser toggle  |
| Modo offline básico            | Media     | AsyncStorage para POS sin conexión                 |
| Historial de tasa de cambio    | Media     | Tabla `exchange_rate_history` con timestamp        |
| Multi-sucursal                 | Baja      | Arquitectura ya lo soporta (multi-store por user)  |

---

## 🧪 Testing (Deuda Pendiente)

Actualmente no hay tests. Prioridad de implementación:

1. **Unit tests:** `formatUSD`, `formatBS`, `formatDate` (utils puros)
2. **Integration tests:** `POST /api/sales` (transacción atómica)
3. **E2E mobile:** Flujo POS completo (Detox o Maestro)
4. **Component tests:** `ProductCard`, `CartItem` (React Native Testing Library)

```bash
# Agregar a package.json cuando se implemente
yarn test          # Jest
yarn test:e2e      # Detox / Maestro
yarn test:coverage # Coverage report
```

---

## 🗺️ Visión a Largo Plazo

```
Fase 0-1:  Validar core repuestería + lanzar módulo taller
           → Objetivo: 5 clientes pagando en Venezuela

Fase 2-3:  Web dashboard + storefront público
           → Repuestería como marketplace individual (no inter-tiendas)

Fase 4-5:  Supabase Auth + WABA + ML
           → Automatización y canales de venta integrados

Fase 6+:   Marketplace bidireccional (repuesteras ↔ talleres)
           → Búsqueda de repuestos cross-vendor + instaladores
           → Expansión LATAM (Colombia, Perú, Ecuador, Rep. Dom.)
```

> **Principio:** Secuenciar antes de escalar. Validar cada módulo individualmente antes de construir la capa de marketplace. La arquitectura ya está lista — no hay que sobreingeniear.
