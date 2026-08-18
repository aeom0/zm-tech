# SKILLS.md — GeemaStudio

> Lee este archivo **antes de tocar cualquier archivo del repo**.
> Fuente: código real del repositorio + docs internas · Versión: v1.5.0 (SDK 56 + TS 6) · Actualizado: julio 2026
>
> **Sync**: vive en `.cursor/skills/geemastudio.md` (monorepo **zm-tech**). Claude Code usa el mismo árbol vía symlink `.claude/skills` → `../.cursor/skills`. La entrada del monorepo es `SKILLS.md`; este archivo es el detalle de GeemaStudio.

---

## 1. Qué es este proyecto

**GeemaStudio** es un SaaS B2B multi-tenant para salones de belleza, barberías y centros estéticos en LATAM.

- Desarrollado por **ZM Tech** (Alberto, fundador y lead dev)
- Basado en **ZM Lash & Nails Beauty** (Lima, Perú) — cliente de referencia real en producción
- Prioridad comercial **#1** del portfolio ZM Tech
- Target: Venezuela como piloto, expansión LATAM
- Todo el texto de UI y comentarios de código va en **español LATAM neutro** (`es-VE`)
- Supabase proyecto activo: `xidjomlxpuosupymcsaj`
- Supabase referencia ZM: `udelxwwnyivknslueerr` ← **solo lectura, nunca modificar**

---

## 2. Stack exacto

### Mobile (`apps/geemastudio-mobile/`)

```
Expo SDK             56
React Native         0.85
React                19.2
TypeScript           ~6.0.3
React Navigation     v7
TanStack Query       v5              ← sintaxis de OBJETO, NO arrays
Supabase JS          v2 (PostgREST directo, sin Express)
expo-linear-gradient ~56.x           ← CTAs con gradiente Lunaris
expo-image-picker    SDK 56          ← result.assets[0].uri (NO result.uri)
expo-blur            blur en tab bar iOS
Reanimated           4.3 + worklets 0.8
New Architecture     siempre on (sin newArchEnabled en app.json)
Edge-to-edge Android siempre on (sin edgeToEdgeEnabled en app.json)
Feather icons        (@expo/vector-icons) ← iconografía principal
Lucide React         (web — iconografía principal; mobile: Feather icons)
Node                 22 (.nvmrc)
```

### Web (`apps/geemastudio-web/`)

```
Next.js              15 (App Router)
React                19
Tailwind CSS         3.x
TypeScript           ~6.0.3
Supabase JS          v2
```

### Monorepo

```
Yarn                 4 (PnP)
TypeScript           ~6.0.3 (resolutions en package.json raíz)
Turborepo            ^2.x
Workspaces:
  apps/geemastudio-mobile
  apps/geemastudio-web
  packages/shared-schema   → @geemastudio/shared-schema   (antes: @zm/shared-schema)
  packages/tenant-config   → @zmtech/tenant-config
```

### Backend / Infra

```
Supabase  PostgreSQL + Auth + Storage + Edge Functions (Deno)
Drizzle ORM  ^0.30.x — schema como fuente de verdad
Zod          ^3.x — validación
WSL          Ubuntu en Windows 11
NO Express   — mobile y web conectan directo a Supabase
```

### Bot WABA (`supabase/functions/whatsapp-webhook/`)

```
Runtime:   Deno (Supabase Edge Functions)
API:       Meta WhatsApp Business API
IA:        Claude claude-haiku-4-5-20251001 — MAX_TOKENS=350, timeout=5000ms
```

---

## 3. Estructura de carpetas

```
geemastudio/
├── apps/
│   ├── mobile/
│   │   ├── App.tsx                   # Entry: QueryClient > AuthProvider > TenantProvider > Navigation
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # Auth Supabase (modo dev aceptable por ahora)
│   │   │   └── TenantContext.tsx      # Config tenant, markConfigured(), updateTenant()
│   │   ├── screens/
│   │   │   ├── DashboardScreen.tsx    # orquestador — módulo dashboard/
│   │   │   ├── AgendaScreen.tsx       # orquestador — módulo agenda/
│   │   │   ├── ServicesScreen.tsx
│   │   │   ├── FinancesScreen.tsx     # orquestador — módulo finances/
│   │   │   ├── InventoryScreen.tsx    # orquestador — módulo inventory/
│   │   │   ├── PersonalScreen.tsx
│   │   │   ├── MoreHomeScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── ClientsScreen.tsx      # orquestador módulo clientes
│   │   │   ├── ValidacionPagosScreen.tsx
│   │   │   ├── AsignarProfesionalesScreen.tsx
│   │   │   ├── onboarding/            # wizard 6 pasos
│   │   │   │   ├── OnboardingEntryScreen.tsx
│   │   │   │   ├── OnboardingBusinessTypeScreen.tsx
│   │   │   │   ├── OnboardingBasicInfoScreen.tsx
│   │   │   │   ├── OnboardingTeamScreen.tsx
│   │   │   │   ├── OnboardingServicesScreen.tsx
│   │   │   │   ├── OnboardingAuthScreen.tsx
│   │   │   │   └── OnboardingCompleteScreen.tsx
│   │   │   ├── clients/               # módulo clientes modularizado
│   │   │   │   ├── types.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useClientsData.ts
│   │   │   │   │   └── useClientDetail.ts
│   │   │   │   └── components/
│   │   │   │       ├── ClientsHeader.tsx
│   │   │   │       ├── ClientKPIStrip.tsx
│   │   │   │       ├── ClientFilterBar.tsx
│   │   │   │       ├── ClientCard.tsx
│   │   │   │       ├── ClientDetailModal.tsx
│   │   │   │       └── ClientAppointmentRow.tsx
│   │   │   ├── validacion/            # módulo validación de pagos
│   │   │   │   ├── types.ts
│   │   │   │   ├── hooks/useValidacionData.ts
│   │   │   │   └── components/ValidacionRow.tsx
│   │   │   ├── asignar/               # módulo asignar profesionales
│   │   │   │   ├── types.ts
│   │   │   │   ├── hooks/useAsignarData.ts
│   │   │   │   └── components/AsignarRow.tsx
│   │   │   ├── agenda/                # módulo agenda modularizado
│   │   │   │   ├── types.ts
│   │   │   │   ├── hooks/
│   │   │   │   └── components/
│   │   │   │       └── AgendaDayKPIStrip.tsx  # 3 KPIs del día (citas, ingresos, sin asignar)
│   │   │   ├── dashboard/             # módulo dashboard modularizado
│   │   │   ├── finances/              # módulo finanzas modularizado
│   │   │   └── inventory/             # módulo inventario modularizado
│   │   ├── screens/settings/
│   │   │   └── constants.ts           # 19 monedas LATAM para CurrencyPickerModal
│   │   ├── navigation/
│   │   │   ├── RootStackNavigator.tsx  # AuthGate → Onboarding o Main
│   │   │   ├── MainTabNavigator.tsx    # 4 tabs + badge en "Más"
│   │   │   └── MoreStackNavigator.tsx  # stack dentro del tab Más
│   │   ├── hooks/
│   │   │   ├── useTheme.ts             # createTheme(config, isDark)
│   │   │   ├── useTenant.ts            # wrapper de TenantContext
│   │   │   ├── useResponsive.ts        # isTablet >=768px
│   │   │   ├── useColorScheme.ts
│   │   │   ├── usePendingBadgeCount.ts # badge tab Más
│   │   │   ├── useScreenOptions.ts
│   │   │   └── useNotifications.ts
│   │   ├── components/
│   │   │   ├── ThemedText.tsx
│   │   │   ├── ThemedView.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Spacer.tsx
│   │   │   └── HeaderTitle.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── query-client.ts
│   │   ├── constants/
│   │   │   └── theme.ts               # Colors, Spacing, Typography, BorderRadius,
│   │   │                              # Shadows, createTheme(config, isDark)
│   │   └── utils/
│   │       └── format.ts              # formatCurrency(amount, config), relativeDays
│   │
│   └── web/
│       ├── src/
│       │   ├── app/                    # Next.js App Router
│       │   │   ├── page.tsx            # Landing pública
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/          # Fase 13 — KPIs (owner/dev); useDashboardData
│       │   │   │   ├── page.tsx
│       │   │   │   ├── layout.tsx      # FinanzasAuthWrapper
│       │   │   │   ├── useDashboardData.ts
│       │   │   │   └── components/
│       │   │   ├── finanzas/           # panel + login /finanzas/login
│       │   │   │   ├── page.tsx
│       │   │   │   ├── layout.tsx
│       │   │   │   └── login/page.tsx
│       │   │   └── panel/              # área autenticada
│       │   │       ├── servicios/      # CRUD categorías, servicios, packs, promos (?tab=)
│       │   │       │   ├── hooks/
│       │   │       │   ├── components/
│       │   │       │   ├── _services/  # packs + promotions
│       │   │       │   ├── _hooks/
│       │   │       │   └── _components/
│       │   │       └── horarios/       # picker formato 12/24h + business_hours
│       │   ├── components/
│       │   │   ├── sections/
│       │   │   │   ├── HeroSection.tsx
│       │   │   │   ├── FeaturesSection.tsx
│       │   │   │   ├── PricingSection.tsx
│       │   │   │   ├── DemoSection.tsx       # 5 tabs incl. WhatsApp
│       │   │   │   ├── SocialProofSection.tsx
│       │   │   │   ├── CtaSection.tsx
│       │   │   │   └── FAQSection.tsx
│       │   │   ├── layout/
│       │   │   │   ├── Navbar.tsx
│       │   │   │   └── Footer.tsx
│       │   │   └── ui/
│       │   │       ├── GradientButton.tsx     # botón con gradiente Lunaris
│       │   │       ├── PricingCard.tsx        # con badge WABA + sección WABA
│       │   │       ├── WABAPreview.tsx        # conversación animada tipo WA
│       │   │       ├── FeatureCard.tsx
│       │   │       ├── BusinessTypeTab.tsx
│       │   │       └── RevealWrapper.tsx
│       │   └── lib/
│       │       ├── constants.ts              # PLANS, WABA_ADDON_TIERS, FEATURES
│       │       └── format.ts                 # formatCurrency (panel dashboard/finanzas)
│       └── public/
│           ├── logo-diamondSparkle.svg   # marca principal (solo símbolo)
│           ├── logo-diamondSparkle-positive.svg
│           ├── logo-diamondSparkle-negative.svg
│           └── favicon.png
│
├── packages/
│   ├── shared-schema/            # @geemastudio/shared-schema
│   │   └── src/
│   │       ├── schema.ts         # Drizzle schema — fuente de verdad
│   │       ├── types.ts          # tipos inferidos
│   │       └── index.ts
│   │
│   └── tenant-config/            # @zmtech/tenant-config
│       └── src/
│           ├── types.ts          # TenantConfig interface completa
│           ├── defaults.ts       # defaultTenantConfig
│           ├── index.ts
│           └── presets/
│               ├── spa-nails.ts      # #40E0D0 (Lunaris)
│               ├── barbershop.ts     # #1A237E
│               ├── hair-salon.ts     # #6A1B9A
│               └── full-aesthetic.ts # #00695C
│
├── supabase/
│   └── functions/
│       └── whatsapp-webhook/     # Bot WABA (Deno)
│           ├── index.ts          # entry: responder 200 inmediato a Meta
│           └── handlers/
│               ├── dispatcher.ts
│               ├── agenda.ts
│               ├── menu.ts
│               ├── payment.ts
│               ├── steps.ts
│               ├── ai-assistant.ts
│               └── format.ts
│
├── scripts/
│   ├── seed-auth-users.mjs
│   └── db/
│       ├── seed-services-template.sql
│       ├── seed-services-example.sql   ← referencia ZM, no modificar
│       ├── seed-employees-template.sql
│       └── seed-employees-example.sql  ← referencia ZM, no modificar
│
├── docs/
├── .cursor/rules/
├── CLAUDE.md                     ← instrucciones para Claude Code
├── CHANGELOG.md
└── README.md
```

---

## 4. Naming conventions

| Tipo                 | Convención                                    | Ejemplo                                       |
| -------------------- | --------------------------------------------- | --------------------------------------------- |
| Componentes React/RN | PascalCase                                    | `ClientCard.tsx`                              |
| Hooks                | camelCase con `use`                           | `useClientsData.ts`                           |
| Servicios/utils      | camelCase                                     | `format.ts`, `tenantSettingsService.ts`       |
| Types / interfaces   | PascalCase                                    | `TenantConfig`, `ClientEnriched`              |
| Constantes           | SCREAMING_SNAKE                               | `LIMA_UTC_OFFSET_HOURS`                       |
| Columnas BD Supabase | snake_case                                    | `employee_id`, `created_at`                   |
| Props interfaces TS  | snake_case si viene de BD, camelCase si es UI | mixto                                         |
| Imports mobile       | alias `@/`                                    | `import { useTheme } from "@/hooks/useTheme"` |
| Imports packages     | `@geemastudio/*` + `@zmtech/tenant-config`    | `from "@zmtech/tenant-config"`                |
| Rutas de navegacion  | PascalCase o CamelCase generico               | `"Personal"` NO `"Chicas"`                    |
| AsyncStorage keys    | `@geemastudio/*`                              | `@geemastudio/tenant_configured`              |
| Comentarios codigo   | Espanol con prefijo modulo en logs            | `console.log('[WABA]', ...)`                  |

---

## 5. Patrones arquitectónicos establecidos

### 5.1 REGLA DE ORO: Multi-tenancy absoluta

**NUNCA** hardcodear valores de negocio. Todo pasa por `useTenant()` / `config.*`.

```typescript
// CORRECTO:
const { config } = useTenant()
const symbol = config.locale.currency.symbol // "$" | "S/" | "COP"
const staff = config.terminology.staff // "Profesionales" | "Barberos"
const tz = config.locale.timezone // "America/Lima" | "America/Bogota"
const primary = config.theme.primaryColor // hex dinamico del preset

// INCORRECTO — viola multi-tenancy:
const symbol = 'S/'
const staff = 'Chicas'
const color = '#7B2D8E'
const name = 'ZM Lash'
const tz = 'America/Lima' // hardcodeado en lugar de config.locale.timezone
```

**Checklist al portear cualquier pantalla de ZM:**

- [ ] `fmtSoles()` → `formatCurrency(amount, config)`
- [ ] `"S/"` → `config.locale.currency.symbol`
- [ ] `"chicas"` / `"Chicas"` → `config.terminology.staff`
- [ ] `"ZM Lash"` → `config.businessName`
- [ ] `"#7B2D8E"` → `config.theme.primaryColor`
- [ ] `"es-PE"` / locale fijo → `config.locale.language`
- [ ] `"America/Lima"` hardcodeado → `config.locale.timezone`
- [ ] `@zm_*` AsyncStorage → `@geemastudio/*`
- [ ] Ruta `"Chicas"` → `"Personal"`

### 5.2 Capas de la arquitectura mobile

```
Screen (orquestador — solo renderiza y delega)
  ↓ consume
Hooks (logica de UI + queries + mutaciones)
  ↓ llaman
Utils / Services (logica pura, formateo, helpers)
  ↓ usan
lib/supabase.ts (cliente Supabase singleton)
```

Nunca llamar Supabase directamente en una screen. Va en hook o service.

### 5.3 TanStack Query v5 — sintaxis OBLIGATORIA

```typescript
// v5 — SIEMPRE asi:
useQuery({ queryKey: ['employees'], queryFn: async () => { ... } })
useMutation({ mutationFn: async (data) => { ... } })
queryClient.invalidateQueries({ queryKey: ['employees'] })

// v4 — NUNCA:
useQuery(['employees'], async () => { ... })

// QueryKeys del proyecto:
// employees | employees,active | services | service_categories
// appointments | payments | inventory_items
// dashboard_stats | dashboard_revenue | tenant_settings
// pending_verifications_count | unassigned_appointments_count
// clients | client_detail,{id}
```

### 5.4 Badges (MoreHomeScreen / MainTabNavigator)

Toda query de badge **requiere** estas dos opciones:

```typescript
useQuery({
  queryKey: ['pending_verifications_count'],
  queryFn: async () => {
    const { count } = await supabase
      .from('appointment_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'payment_submitted')
    return count ?? 0
  },
  refetchInterval: 60_000, // OBLIGATORIO en badges
  enabled: isAdmin, // OBLIGATORIO en badges
})
```

### 5.5 Joins Supabase — PATRON CRITICO

PostgREST devuelve `[]` silencioso con joins encadenados. Siempre queries separadas:

```typescript
// NUNCA — devuelve [] sin error:
supabase.from('clients').select(`*, appointments(*, payments(*), services(*))`)

// SIEMPRE — queries separadas + combinar en memoria:
const { data: clients } = await supabase.from('clients').select('*')
const { data: apts } = await supabase
  .from('appointments')
  .select('id, client_id, status, price, date')
  .in(
    'client_id',
    clients.map((c) => c.id)
  )
const { data: payments } = await supabase
  .from('payments')
  .select('appointment_id, amount')
  .in(
    'appointment_id',
    apts.map((a) => a.id)
  )
// combinar en JavaScript
```

### 5.6 Migraciones de BD — restriccion WSL

```
Puerto 5432 BLOQUEADO en WSL → yarn db:push NO funciona

Usar SIEMPRE:
  1. Supabase Dashboard → SQL Editor (proyecto xidjomlxpuosupymcsaj)
  2. O scripts en scripts/db/ ejecutados desde el Dashboard

Drizzle solo para:
  - Definir schema como fuente de verdad (types)
  - Nuevas tablas en schema limpio
  - NO para tablas existentes (puede intentar dropear columnas)
```

### 5.7 Edge Functions WABA

```typescript
// Patron: responder 200 a Meta INMEDIATO, procesar en background
Deno.serve(async (req) => {
  const promise = processMessage(body)
  globalThis.EdgeRuntime?.waitUntil?.(promise) // background
  return new Response('ok', { status: 200 }) // inmediato — CRITICO
})

// CORS en toda Edge Function llamada desde web:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

// Edge Function llamada por DB trigger → deploy con:
// supabase functions deploy send-notification --no-verify-jwt
```

---

## 6. Design System — Lunaris

### Filosofia

- Fondo solido oscuro (`#0F0F0F` / `#111318`), no gradiente
- **Gradiente solo en elementos interactivos** (CTAs, progress dots, badges activos)
- Mobile-first, dark aesthetics, limpio

### Tokens en `apps/geemastudio-mobile/constants/theme.ts`

```typescript
// Spacing (px):
Spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 48 }

// BorderRadius:
BorderRadius: { sm: 6, md: 10, lg: 16, xl: 24, full: 9999 }

// Typography pesos: regular(400) medium(500) semibold(600) bold(700)
// Typography tamaños: xs(11) sm(12) base(14) md(16) lg(18) xl(20) 2xl(24) 3xl(28) 4xl(32)

// createTheme(config, isDark) → sobreescribe solo: primary, accent, violet, gold,
//                               warning, link, tabIconSelected, info
// El fondo y textos neutros son FIJOS; colores de tenant solo en interactivos
```

### Gradiente Lunaris (solo CTAs en mobile, GradientButton en web)

```
135 grados — stops:
  0%   #40E0D0  (turquesa Lunaris)
 35%   #9C27B0  (purple)
 70%   #3D3D8F  (indigo)
100%   #1565C0  (azul)
```

```typescript
// Mobile: usar expo-linear-gradient con estos 4 colors
// Web: gradient en GradientButton.tsx — "linear-gradient(135deg, ...)"
```

### Presets de tenant

| Preset              | businessType   | Color primario |
| ------------------- | -------------- | -------------- |
| spaNavilsPreset     | spa-nails      | #40E0D0        |
| barbershopPreset    | barbershop     | #1A237E        |
| hairSalonPreset     | hair-salon     | #6A1B9A        |
| fullAestheticPreset | full-aesthetic | #00695C        |

### Marca (`apps/geemastudio-web/public/`)

| Archivo                          | Uso                                                            |
| -------------------------------- | -------------------------------------------------------------- |
| logo-diamondSparkle.svg          | **Principal** — diamante claro, fondos oscuros / transparentes |
| logo-diamondSparkle-positive.svg | Export / materiales                                            |
| logo-diamondSparkle-negative.svg | Preview / redes                                                |
| favicon.png                      | Favicon                                                        |

El símbolo no incluye texto “GeemaStudio”. Ver CHANGELOG v1.4.4.

### Componentes UI mobile

| Componente               | Reglas clave                                             |
| ------------------------ | -------------------------------------------------------- |
| Boton primario           | expo-linear-gradient con tokens Lunaris, borderRadius 12 |
| Boton outline            | Border rgba(255,255,255,0.15), bg transparente           |
| Cards                    | bg backgroundSecondary, border theme.border, radius 16   |
| Iconos                   | Feather icons (@expo/vector-icons/Feather)               |
| Color swatches           | Cuadrados, NO circulos                                   |
| Progress dots onboarding | Pill-shape, activo = gradiente, inactivo = muted         |

---

## 7. TenantConfig interface (completa)

```typescript
// packages/tenant-config/src/types.ts
export interface TenantConfig {
  businessName: string
  businessType: 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic'
  logo?: string
  tagline?: string

  theme: {
    primaryColor: string // hex — del preset seleccionado
    accentColor: string // hex — complementario
    darkMode: boolean
  }

  locale: {
    currency: { code: string; symbol: string } // 'USD'/'$' | 'PEN'/'S/' | 'COP'/'COP$'
    country: string
    timezone: string // 'America/Lima' | 'America/Caracas' | 'America/Bogota'
    language: 'es' | 'es-PE' | 'es-VE' | 'es-CO' | 'pt-BR'
  }

  terminology: {
    staff: string // 'Profesionales' | 'Barberos' | 'Estilistas' | 'Especialistas'
    staffSingular: string
    appointment: string // 'cita' | 'turno' | 'reserva'
    client: string // 'cliente' | 'clienta'
  }

  contact?: {
    phone?: string
    whatsapp?: string
    email?: string
    address?: string
    instagram?: string
  }

  features?: {
    whatsapp?: boolean // activa PromoMasiva + TokenWarningBanner + Bot WABA
    inventory?: boolean
    commissions?: boolean
  }

  integrations?: {
    waba?: { tokenExpiry?: string } // ISO date → TokenWarningBanner
  }

  schedule?: {
    weekdays: { open: string; close: string } // '10:00' | '19:00'
    sunday: { open: string; close: string } | null
  }
}
```

---

## 8. Base de datos (Supabase xidjomlxpuosupymcsaj)

### Tablas

```sql
profiles           -- id = auth.users.id, role (dev|owner|staff), employee_id
employees          -- id, name, email, color(hex), commission_percentage, is_active, notes
service_categories -- id, name, color(hex), icon, order
services           -- id, name, category_id, price, duration, is_active
clients            -- id, name, phone, email, notes, created_at
appointments       -- id, client_id, client_name, client_phone, employee_id,
                   --   service_id(legacy), date, duration, price, status, notes
appointment_services -- id, appointment_id, service_id, employee_id, price, duration
payments           -- id, appointment_id, employee_id, amount, method, date, is_abono
inventory_items    -- id, name, category, quantity, min_stock, unit, price
tenant_settings    -- id(uuid=auth.uid), business_name, timezone, business_hours(json),
                   --   currency_symbol, time_format(12|24), client_terminology,
                   --   tagline, features_whatsapp,
                   --   web_mode('none'|'geema_hosted'|'own_domain'), slug, custom_domain
                   --   (RLS: solo dev/owner)

-- Bot WABA:
whatsapp_sessions        -- phone_number, state(json), updated_at
appointment_verifications -- id, appointment_id, screenshot_url, status, submitted_at
cart_items               -- id, session_phone, item_type, item_id, quantity, price

-- Catalogo extendido:
promotions       -- id, title, description, badge, accent_color, promo_price, is_active
promotion_items  -- id, promo_id, item_type(service|pack), item_id, discounted_price
packs            -- id, name, description, price, service_ids[], is_active
```

### RLS

```sql
-- Helper: get_my_role() → rol del usuario autenticado
-- profiles:     lectura propia; admins ven/editan todos
-- employees:    todos autenticados leen; solo admins escriben
-- appointments: staff/dev/owner leen y escriben
-- payments, inventory_items: solo dev/owner
-- tenant_settings: solo dev/owner
```

### Fechas — gotcha critico

```typescript
// appointments.date es "timestamp WITHOUT time zone" — guarda hora local del tenant
// Al leer  → parseLimaLocalToDate(dateStr): Date UTC
// Al escribir → toLimaLocalTimestamp(dateUtc): "YYYY-MM-DD HH:mm:ss"
// En GeemaStudio: reemplazar "America/Lima" hardcodeado → config.locale.timezone
```

### Moneda segun contexto

```
Landing (apps/web): usa "$" USD — moneda internacional para conversion
Mobile (apps/geemastudio-mobile): usa config.locale.currency.symbol — dinamico del tenant
```

---

## 9. Flujos clave

### 9.1 Arranque de la app (mobile)

```
AuthGate
  └─ sin sesion + sin tenant → OnboardingEntryScreen
       ├─ "Crear negocio" → wizard 6 pasos (BusinessType → BasicInfo → Team → Services → Auth → Complete)
       └─ "Ya tengo cuenta" → LoginScreen
  └─ con sesion + tenant configurado → MainTabNavigator
```

### 9.2 Onboarding (6 pasos)

```
Paso 0: Entry        → "Crear negocio" o "Ya tengo cuenta"
Paso 1: BusinessType → elige preset → aplica config base
Paso 2: BasicInfo    → nombre + colores con preview
Paso 3: Team         → primer empleado (omitible)
Paso 4: Services     → categorias sugeridas (errores RLS tolerados en dev)
Paso 5: Auth         → registro/login con UI del onboarding
Paso 6: Complete     → markConfigured() → upsert tenant_settings + AsyncStorage
```

Forzar en dev: `EXPO_PUBLIC_FORCE_ONBOARDING=true`

### 9.3 Navegacion (MoreStackParamList — rutas exactas del repo)

```typescript
export type MoreStackParamList = {
  MoreHome: undefined
  ValidacionPagos: undefined
  AsignarProfesionales: undefined
  Finanzas: undefined
  Personal: undefined
  Clients: undefined
  Inventario: undefined
  Configuracion: undefined
  Perfil: undefined
}
// Tab Mas → badge = usePendingBadgeCount().tabBadgeCount
```

### 9.4 Segmentacion de clientes

```typescript
const isVip = totalAppointments >= 3
const isNew = createdAt >= thirtyDaysAgo
const isAtRisk = !isNew && daysSinceLastVisit !== null && daysSinceLastVisit > 45
// KPIs: total_clients, vip_count, new_this_month, at_risk_count, top_spender
```

### 9.5 Rutas web — dos productos distintos

`apps/geemastudio-web` contiene **dos productos** con lógicas de auth, routing y audiencia completamente distintas. Ver [`docs/WEB_ARCHITECTURE.md`](../docs/WEB_ARCHITECTURE.md) para detalle completo.

#### Producto 1 — Panel de gestión (siempre activo)

Audiencia: `owner` / `staff` / `dev`. Siempre autenticados con Supabase Auth.
**Nunca depende de `web_mode`** — está disponible para todo tenant desde el día 1.

| Ruta                                                                                         | Estado          |
| -------------------------------------------------------------------------------------------- | --------------- |
| `/finanzas` + `/finanzas/login`                                                              | ✅ Implementado |
| `/dashboard`                                                                                 | ✅ Implementado |
| `/panel/servicios` (`?tab=categorias\|servicios\|packs\|promos`)                             | ✅ Implementado |
| `/panel/horarios`                                                                            | ✅ Implementado |
| `/panel/clientes`, `/panel/personal`, `/panel/agenda`, `/panel/waba`, `/panel/configuracion` | ⏳ PR-11        |

#### Producto 2 — Landing pública del tenant (opcional)

Audiencia: clientes del negocio. Sin auth. Controlado por `tenant_settings.web_mode`.

| Ruta        | Estado                                                                |
| ----------- | --------------------------------------------------------------------- |
| `/`         | ✅ Landing plataforma GeemaStudio (B2B)                               |
| `/s/[slug]` | ✅ Landing pública del tenant (SSG + revalidación 5 min; 3 templates) |

#### `web_mode` en `tenant_settings`

| Valor            | Significado                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `'none'`         | Sin landing pública (default al crear tenant)                       |
| `'geema_hosted'` | Landing en `geemastudio.app/s/[slug]`                               |
| `'own_domain'`   | Dominio propio del tenant — GeemaStudio no interviene en el routing |

> ZM Lash & Nails (Vanessa) → `web_mode = 'own_domain'` (informativo, no bloquea el panel).
> Columnas en BD: `web_mode`, `slug` (único, Modo B), `custom_domain` (informativo, Modo A).

### 9.6 Bot WABA — despacho

```
Meta POST → responder 200 inmediato → processMessage en background
  1. Cargar catalogo UNA sola vez (loadCatalog)
  2. dispatcher.ts evalua en orden:
     a. Prefijos interactivos (cat- / svc- / pack_ / pitem_ / promo_ / date_ / time_)
     b. Saludos → menu principal
     c. Keywords tardanza → imagen politica
     d. Texto libre en step "browsing" → detectAITrigger → Claude Haiku
  3. Claude Haiku: MAX_TOKENS=350, timeout=5000ms, rate limiting por phoneNumber
```

---

## 10. Helpers criticos

### formatCurrency (NO usar fmtSoles, NO "S/" hardcodeado)

```typescript
// apps/geemastudio-mobile/utils/format.ts
export function formatCurrency(amount: number, config: TenantConfig): string {
  // Usar Intl.NumberFormat con config.locale.language + config.locale.currency.code
  // Fallback simple si Intl da problemas en RN:
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${config.locale.currency.symbol} ${formatted}`
}

// Uso correcto en todos los screens:
formatCurrency(client.total_spent, config)
formatCurrency(payment.amount, config)
```

### Precio con coma decimal (web — LATAM)

```typescript
// Input de precio acepta "," como separador decimal en web
const normalizedPrice = inputValue.replace(',', '.')
const price = parseFloat(normalizedPrice)
```

### expo-image-picker (SDK 56)

```typescript
const result = await ImagePicker.launchImageLibraryAsync({ ... });
if (result.canceled) return;           // NO result.cancelled
const uri = result.assets[0].uri;     // NO result.uri
```

---

## 11. Credenciales de desarrollo (seed)

```
dev@ejemplo.com          → rol dev   (acceso total)
propietario@ejemplo.com  → rol owner (acceso admin)
empleado1@ejemplo.com    → rol staff
empleado2@ejemplo.com    → rol staff
empleado3@ejemplo.com    → rol staff
password: Geema2025!
```

---

## 12. Comandos del proyecto

```bash
yarn mobile:dev      # Expo en 8081
yarn web:dev         # Next.js
yarn check:types     # correr SIEMPRE antes de commit
yarn lint
yarn lint:fix
# yarn db:push       # NO en WSL — usar Supabase Dashboard SQL Editor
yarn db:seed         # seeds template
```

---

## 13. Estado de fases (abr 2026)

### Completadas

- Fases 1 al 6: Migracion ZM → GeemaStudio, monorepo, @zmtech/tenant-config, onboarding, tenant_settings
- Fase 7A+7B: RLS 9 tablas con get_my_role(), onboarding conectado a Supabase
- Fase 8: SettingsScreen modular + ThemeContext (useColorScheme, light|dark|auto)
- Fase 9: usePendingBadgeCount + badge en tab Mas
- Fase 10: ValidacionPagosScreen con spinner per-row
- Fase 11: AsignarProfesionalesScreen con timezone dinamica
- Fase 12: Landing web rediseno LATAM + GradientButton
- Fase 12B: Bot WABA en landing (WABAPreview, PricingCard con WABA, add-on tiers)
- Rediseno onboarding: dark theme Lunaris, Feather icons, pill dots, stat tiles 2x2
- Fase 13: Dashboard metricas web (KPIs hoy/mes, grafico 7 dias, top servicios)
- Web panel /servicios: CRUD categorias, servicios, packs, promos (?tab= deep link)
- Web panel /horarios: picker formato 12/24h + tenant_settings.time_format
- v1.4.8: Lunaris web (#40E0D0), Vercel, DiamondHero sin MaskedView
- v1.4.9: Selector moneda multi-LATAM (19 monedas), Personal CRUD completo,
  Agenda KPI strip (AgendaDayKPIStrip), locale.timeFormat (12|24),
  emojis → iconos Lucide en web (FeatureCard, BusinessTypeTab, HeroSection, etc.)

### Proximas

- Fase 14: EAS Build beta
- Fase 15: Bot WABA multi-tenant (Edge Function)
- PromoMasivaScreen (requiere WABA activo)
- Auth Supabase real en mobile (AuthContext modo dev actual)

---

## 14. LO QUE CLAUDE CODE DEBE HACER

1. Leer este archivo antes de modificar cualquier parte del repo
2. Consultar ZM_KNOWLEDGE_FOR_GEEMASTUDIO.md antes de implementar cualquier modulo nuevo
3. Usar useTenant() y useTheme() en todo componente que necesite datos del negocio
4. Proponer codigo modular: screen orquestador → hook → service → supabase
5. Usar TanStack Query v5 con sintaxis de objeto { queryKey, queryFn }
6. Aplicar tokens de theme desde constants/theme.ts — nunca hex inline
7. Separar queries Supabase: maximo 1 nivel de join, combinar en memoria
8. Incluir refetchInterval: 60_000 y enabled: isAdmin en queries de badges
9. CORS headers en toda Edge Function accesible desde web
10. Responder 200 inmediato en webhooks Meta WABA antes de procesar
11. Ejecutar DDL solo desde Supabase Dashboard SQL Editor (WSL bloquea 5432)
12. Escribir comentarios en espanol con prefijo de modulo en logs: [WABA], [AUTH]
13. Usar formatCurrency(amount, config) para todo formateo de moneda
14. Feather icons como iconografia principal en mobile; Lucide React en web
15. Gradiente solo en elementos interactivos, nunca en fondos de pantalla
16. Rutas de navegacion con nombres neutros: "Personal", "Clients", no "Chicas"
17. Usar config.locale.timeFormat (12|24) para formato de hora — NO hardcodear AM/PM
18. Iconos Lucide en web via LucideIcons as Record<string, LucideIcon> — NO emojis en UI web"

---

## 15. LO QUE CLAUDE CODE NO DEBE HACER

1. Hardcodear valores de negocio: "S/", "Chicas", "#7B2D8E", "ZM Lash", "America/Lima" fija
2. TanStack Query v4: useQuery(['key'], fn) — obsoleto en este proyecto
3. Joins encadenados PostgREST: causan [] silencioso, sin error visible
4. yarn db:push en WSL: el puerto 5432 esta bloqueado
5. result.uri en expo-image-picker: es SDK menor a 48, usar result.assets[0].uri
6. Queries de badge sin refetchInterval ni enabled: badges desactualizados
7. Logica de negocio en screens: va en hooks o services, nunca en el JSX
8. Supabase directo en screens: siempre mediado por hook o service
9. any en TypeScript: usar unknown + type guards
10. Keys AsyncStorage con prefijo @zm__: usar @geemastudio/_
11. Nombre de ruta "Chicas": usar "Personal" (ya corregido en el repo)
12. Gradiente en fondos de pantalla completa: solo en CTAs e interactivos
13. Crear archivos .md sin que se pida: no generar docs automaticamente
14. Modificar udelxwwnyivknslueerr (Supabase ZM): solo lectura como referencia
15. Llamar loadCatalog() mas de una vez por request en bot WABA
16. Olvidar CORS headers en Edge Functions con acceso desde web
17. result.cancelled (typo SDK menor a 48): usar result.canceled
18. Duplicar tipos manualmente: inferir desde Drizzle/Zod como fuente de verdad
19. Emojis en web UI: toda iconografia web usa Lucide React (ver v1.4.9)
20. Hardcodear formato de hora (12h/AM-PM): viene de config.locale.timeFormat

---

## 16. MCP Servers (Cursor IDE)

```json
{
  "mcpServers": {
    "supabase-geemastudio": { "url": "...?project_ref=xidjomlxpuosupymcsaj" },
    "supabase-zm": { "url": "...?project_ref=udelxwwnyivknslueerr" },
    "vercel": { "url": "https://mcp.vercel.com" },
    "github": { "image": "ghcr.io/github/github-mcp-server" }
  }
}
```

Formato `mcpServers` objeto — el formato antiguo `tools` block esta obsoleto.
Para BD de GeemaStudio: siempre usar supabase-geemastudio, nunca supabase-zm.

---

_Generado: marzo 2026. Actualizado: abril 2026 (v1.4.9). Para actualizar: re-ejecutar analisis del repo con Claude Code o claude.ai_
