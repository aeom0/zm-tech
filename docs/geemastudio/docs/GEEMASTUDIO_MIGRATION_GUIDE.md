# GeemaStudio — Guía de Migración para Claude

> **Fecha de inicio**: 2026-02-19
> **Estado actual**: FASES 1–6 completadas ✅ | FASE 7: 7A (RLS) y 7B (tenant_settings en onboarding) completados; 7C (pruebas integrales) y 7D (landing) pendientes

---

## Contexto del Proyecto

Este repositorio es la versión genérica y comercializable de **ZM Lash & Nails Beauty**
(salón de belleza en Perú). El objetivo es convertirlo en un producto **SaaS multi-tenant**
para gestión de salones de belleza, barberías y peluquerías en LATAM.

**Repo GitHub**: https://github.com/aeom0/geemastudio

---

## Stack Tecnológico

- React Native 0.85 + Expo SDK 56 + React 19.2 + TypeScript ~6.0
- Supabase (Auth + PostgREST) — sin servidor Express
- Drizzle ORM + Zod (schema compartido)
- TanStack React Query v5
- React Navigation 7
- TypeScript estricto, sin `any`
- Monorepo con Yarn Workspaces

---

## Estado de las Fases

### ✅ FASE 1 — Auditoría completada

Se identificaron ~180+ referencias hardcodeadas al salón original distribuidas en ~40 archivos.
**No se modificó ningún archivo en esta fase.**

#### Resumen de hallazgos por categoría:

| Categoría | Archivos principales | Cant. aprox. |
|-----------|---------------------|-------------|
| Nombre del negocio (ZM Lash & Nails) | LoginScreen, SettingsScreen, ProfileScreen, DashboardScreen, MainTabNavigator, PersonalScreen, apps/web/* | 22+ |
| Teléfono (+51 932 535 512) | apps/web/src/app/page.tsx, Navbar.tsx | 4 |
| Direcciones físicas (Surco, Lima) | apps/web/src/app/page.tsx, layout.tsx | 9+ |
| Redes sociales (@zmlashandnails) | apps/web/src/app/page.tsx | 4 |
| Nombres de empleadas (Vanessa, Stephani, Yosaida, Romina) | page.tsx, finanzas/page.tsx, PersonalScreen, seed-employees.sql, seed-auth-users.mjs | 15+ |
| Supabase IDs hardcodeados (udelxwwnyivknslueerr) | apps/mobile/lib/supabase.ts, .env.example, apps/web/.env.local.example | 5+ |
| Colores hardcodeados (#7B2D8E, #D4AF37) | app.json, useNotifications.ts, PersonalScreen, MainTabNavigator, tailwind.config.ts, finanzas/* | 40+ |
| Moneda S/ hardcodeada | FinancesScreen, DashboardScreen, AgendaScreen, ServicesScreen, InventoryScreen, finanzas/page.tsx | 50+ |
| Horarios del salón (10AM-7PM) | apps/web/src/app/layout.tsx, page.tsx | 4 |
| Package/bundle names (com.zmlash*) | apps/mobile/app.json, google-services.json, package.json raíz | 10+ |
| Emails @zmlashnails.com | scripts/seed-auth-users.mjs, LoginScreen, PersonalScreen | 8+ |
| DB names (zm_lash_nails) | .env.example, seed-services.sql, seed-employees.sql | 3 |

---

### ✅ FASE 2 — Crear paquete `packages/tenant-config/`

**Instrucciones detalladas:**

Crear la siguiente estructura de archivos:

```
packages/tenant-config/
├── package.json          (name: "@geemastudio/tenant-config")
├── tsconfig.json
└── src/
    ├── index.ts          ← exporta todo
    ├── types.ts          ← TenantConfig interface completa
    ├── defaults.ts       ← valores por defecto / placeholder
    └── presets/
        ├── index.ts      ← exporta todos los presets
        ├── spa-nails.ts
        ├── barbershop.ts
        ├── hair-salon.ts
        └── full-aesthetic.ts
```

#### `types.ts` — Interface TenantConfig completa:

```typescript
export interface TenantConfig {
  businessName: string;
  businessType: 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic';
  logo?: string;
  tagline?: string;

  theme: {
    primaryColor: string;
    accentColor: string;
    darkMode: boolean;
  };

  locale: {
    currency: { code: string; symbol: string };
    country: string;
    timezone: string;
    language: 'es' | 'es-PE' | 'es-VE' | 'es-CO' | 'pt-BR';
  };

  terminology: {
    staff: string;         // "chicas" | "barberos" | "estilistas" | "especialistas"
    staffSingular: string;
    appointment: string;   // "cita" | "turno" | "reserva"
    client: string;        // "cliente" | "clienta"
  };

  contact: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };

  businessHours: {
    [day: string]: { open: string; close: string } | null;
  };

  commissions: {
    defaultStaffPercent: number;
    defaultHousePercent: number;
  };

  supabase?: {
    url: string;
    anonKey: string;
  };
}
```

#### Presets a crear:

| Preset | Negocio ejemplo | Color primario | Color acento | Staff | Cita |
|--------|----------------|----------------|--------------|-------|------|
| `spa-nails.ts` | "Spa Bella" | #40E0D0 | #D4AF37 | "chicas" / "especialista" | "cita" |
| `barbershop.ts` | "Barbería Clásica" | #1A237E | #F9A825 | "barberos" / "barbero" | "turno" |
| `hair-salon.ts` | "Salón de Estilo" | #6A1B9A | #9E9E9E | "estilistas" / "estilista" | "cita" |
| `full-aesthetic.ts` | "Centro Estético Integral" | #00695C | #FFD700 | "especialistas" / "especialista" | "cita" |

Horarios típicos:
- spa-nails: L-S 10:00–19:00, D 10:30–13:00
- barbershop: L-S 09:00–20:00, D null (cerrado)
- hair-salon: L-S 09:00–19:00, D null
- full-aesthetic: L-V 09:00–19:00, S 09:00–18:00, D null

#### `package.json` del paquete:

```json
{
  "name": "@geemastudio/tenant-config",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "check:types": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "*"
  }
}
```

Agregar `"@geemastudio/tenant-config": "workspace:*"` como dependencia en:
- `apps/mobile/package.json`
- `packages/shared-schema/package.json` (si se necesita)

---

### ✅ FASE 3 — Integrar TenantConfig en la app mobile

#### 3.1 Crear `apps/mobile/context/TenantContext.tsx`

- Provee el `TenantConfig` activo a toda la app vía React Context
- Lee de `AsyncStorage` (clave: `@geemastudio/tenant_config`)
- Si no hay config guardada → usa preset `spa-nails` por defecto
- Hook exportado: `useTenant()` → retorna `{ config, updateTenant, isLoading }`
- `updateTenant(partial)` → merge + guarda en AsyncStorage

#### 3.2 Reemplazar referencias hardcodeadas en mobile

Archivos a modificar y qué cambiar:

| Archivo | Qué reemplazar |
|---------|---------------|
| `apps/mobile/screens/LoginScreen.tsx:127` | placeholder email `@zmlashnails.com` → `@{dominio}` o genérico |
| `apps/mobile/screens/SettingsScreen.tsx:59` | `"ZM Lash & Nails Beauty"` → `config.businessName` |
| `apps/mobile/screens/ProfileScreen.tsx:35` | `"Panel de gestión ZM Lash & Nails"` → `config.businessName` |
| `apps/mobile/screens/DashboardScreen.tsx:491` | `"ZM"` → iniciales de `config.businessName` |
| `apps/mobile/navigation/MainTabNavigator.tsx:83` | `headerTitle: "ZM Lash & Nails"` → `config.businessName` |
| `apps/mobile/screens/PersonalScreen.tsx:261,270,281` | placeholders con nombres/emails reales → genéricos |
| `apps/mobile/hooks/useNotifications.ts:36,39` | nombre canal + color → `config.businessName`, `config.theme.primaryColor` |
| `apps/mobile/screens/FinancesScreen.tsx` (16+ lugares) | `S/` → `config.locale.currency.symbol` |
| `apps/mobile/screens/DashboardScreen.tsx` (3 lugares) | `S/` → `config.locale.currency.symbol` |
| `apps/mobile/screens/AgendaScreen.tsx` (2 lugares) | `S/` → `config.locale.currency.symbol` |
| `apps/mobile/screens/ServicesScreen.tsx` (2 lugares) | `S/` → `config.locale.currency.symbol` |
| `apps/mobile/screens/InventoryScreen.tsx:499` | `Costo (S/)` → `Costo (${symbol})` |
| `apps/mobile/screens/PersonalScreen.tsx:37,38` | colores preset #7B2D8E, #D4AF37 → usar theme |
| `apps/mobile/navigation/MainTabNavigator.tsx:33,49` | `#7B2D8E` → `config.theme.primaryColor` |

#### 3.3 Actualizar sistema de tema

En `apps/mobile/constants/theme.ts`:
- Crear función `createTheme(config: TenantConfig): Theme`
- El objeto estático actual pasa a ser el tema del preset `spa-nails` por defecto
- El hook `useTheme()` en `apps/mobile/hooks/useTheme.ts` debe llamar a `useTenant()` e invocar `createTheme(config)`

#### 3.4 Registrar TenantProvider en App.tsx

Envolver el árbol de navegación con `<TenantProvider>` en `apps/mobile/App.tsx`.

---

### ✅ FASE 4 — Limpieza de seeds y datos específicos

Acciones en `scripts/db/`:

1. Renombrar `seed-services.sql` → `seed-services-example.sql` (mantener como referencia)
2. Crear `seed-services-template.sql` con servicios genéricos por los 4 tipos de negocio
3. Renombrar `seed-employees.sql` → `seed-employees-example.sql`
4. Crear `seed-employees-template.sql` con datos ficticios genéricos (sin nombres reales)
5. Actualizar `scripts/seed-auth-users.mjs` → usar emails `@ejemplo.com` ficticios

Actualizar `README.md` raíz:
- Nombre: **GeemaStudio**
- Descripción genérica del producto
- Sección "Tipos de negocio soportados"
- Instrucciones de configuración del tenant
- Nota al pie: "Basado en ZM Lash & Nails Beauty"

---

### ✅ FASE 5 — Onboarding flow (pantallas nuevas)

Crear en `apps/mobile/screens/onboarding/`:

```
OnboardingBusinessTypeScreen.tsx   ← paso 1: elige tipo de negocio (4 cards)
OnboardingBasicInfoScreen.tsx      ← paso 2: nombre, logo (opcional), colores
OnboardingTeamScreen.tsx           ← paso 3: primer empleado
OnboardingServicesScreen.tsx       ← paso 4: confirma/edita categorías sugeridas
OnboardingCompleteScreen.tsx       ← paso 5: listo, ir al dashboard
```

Lógica:
- Solo se muestra si `AsyncStorage` no tiene `@geemastudio/tenant_configured: true`
- Al completar: guarda config en AsyncStorage + Supabase tabla `tenant_settings`
- `RootStackNavigator` verifica si hay config → Onboarding o App principal

UI `OnboardingBusinessTypeScreen`:
- 4 cards grandes con icono emoji, nombre y descripción
- Iconos: 💅 Spa/Uñas, ✂️ Barbería, 💇 Peluquería, 🌿 Estética Integral
- Al seleccionar → aplica preset como punto de partida y navega al paso 2

---

### ✅ FASE 6 — Schema de BD actualizado *(completada 2026-03-12)*

Tabla `tenant_settings` agregada a `packages/shared-schema/src/schema.ts` con defaults
neutros LATAM (USD/$, país vacío, idioma `es`, terminología `especialistas`).

Aplicada manualmente en Supabase vía SQL Editor (proyecto `udelxwwnyivknslueerr`).
Restricción: puerto 5432 bloqueado en WSL → usar SQL Editor del Dashboard para DDL.
Ver `docs/DESARROLLO_LOCAL.md` para el procedimiento completo.

---

### FASE 7 — RLS e integración (parcialmente completada)

#### FASE 7A — RLS en tenant_settings ✅

Agregar políticas Row Level Security en Supabase para que cada owner
solo pueda leer y escribir su propio registro.

SQL a ejecutar en SQL Editor del Dashboard:
```sql
-- Habilitar RLS
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Owner lee su propio registro
CREATE POLICY "owner puede leer su tenant"
  ON tenant_settings FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('owner', 'dev')
  ));

-- Owner crea/actualiza su propio registro
CREATE POLICY "owner puede escribir su tenant"
  ON tenant_settings FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('owner', 'dev')
  ));
```

#### FASE 7B — Integrar tenant_settings con onboarding ✅

Implementado: al completar el flujo de 5 pasos se hace upsert en `tenant_settings` y se marca config en AsyncStorage. TenantContext sincroniza al terminar onboarding y carga desde Supabase al arranque si hay sesión y no hay config local.

#### FASE 7C — Prueba integral de la app móvil ⏳

Con `yarn mobile:dev` contra el proyecto Supabase `udelxwwnyivknslueerr`:

- Login con `dev@ejemplo.com` / `Geema2025!` (creado por seed-auth-users.mjs)
- Login con `propietario@ejemplo.com` / `Geema2025!`
- Verificar que el onboarding fluya los 5 pasos y guarde en tenant_settings
- Verificar Dashboard con datos reales (employees, services, appointments)
- Verificar Agenda, Servicios, Inventario, Finanzas
- Verificar navegación Más → Personal, Inventario, Finanzas (solo dev/owner)

#### FASE 7D — Landing web GeemaStudio (apps/web) ⏳

La landing actual (`apps/web`) tiene diseño de conversión general.
Actualizar/refinar con:

- **Pricing tiers**: Basic, Pro, Elite con trial 14 días sin tarjeta
- Diseño mobile-first orientado a conversión LATAM (Venezuela piloto)
- CTA enfocado en "prueba gratis 14 días"
- Testimonios/social proof con casos de uso reales de Venezuela

> **Nota sobre Vanessa (Tenant #1) y rutas web**: el panel de gestión (`/finanzas`, `/dashboard`, `/panel/*`) está disponible para Vanessa **sin depender de `middleware.ts` ni de que `zmlashnails.com` esté conectado**. El `web_mode` de Vanessa será `'own_domain'` (informativo), no bloqueante. Ver [`docs/WEB_ARCHITECTURE.md`](./WEB_ARCHITECTURE.md) para la distinción completa entre Panel de gestión (siempre activo) y Landing pública del tenant (`web_mode`). La configuración de `web_mode` vive en `tenant_settings` y se expone en `/panel/configuracion/web` (pendiente, P2).

### Alta de WABA para el tenant

Ver [`docs/WABA_MULTITENANT_ARCHITECTURE.md`](./WABA_MULTITENANT_ARCHITECTURE.md) — checklist completo de configuración
de credenciales por tenant. No omitir el query param `phone_number_id` en la URL
del webhook registrada en Meta.

---

## Convenciones del Proyecto

- TypeScript estricto, sin `any`
- Componentes funcionales con hooks, sin lógica en JSX
- Separación clara: UI / lógica / servicios / contexto
- `snake_case` para propiedades de Supabase, `camelCase` en TypeScript
- Comentarios en español (es-PE)
- Dark mode automático en todos los componentes nuevos
- Responsive: usar `useResponsive()` hook existente para tablet

---

## Comandos útiles

```bash
# Instalar dependencias (desde raíz del monorepo)
yarn install

# Iniciar Expo (app mobile)
yarn mobile:dev

# Iniciar web (Next.js)
yarn web:dev

# Type checking
yarn check:types

# Lint
yarn lint
yarn lint:fix
```

---

## Notas importantes

- El proyecto original (ZM Lash & Nails) está en `/home/alber/ZM-Lash-and-Nails-Beauty`
  pero NO debe modificarse — es solo referencia.
- Este repo (`/home/alber/geemastudio`) es donde se hacen TODOS los cambios.
- Proyecto Supabase activo (producción): `udelxwwnyivknslueerr` — URL: `https://udelxwwnyivknslueerr.supabase.co`
  - Este es el proyecto real de ZM Lash & Nails (negocio de Vanessa, datos de producción).
  - Decisión de arquitectura: ZM Lash & Nails es el tenant #1 dentro de GeemaStudio, **no** un ambiente de práctica ni un proyecto a descartar.
  - El proyecto anterior (`xidjomlxpuosupymcsaj`) se eliminó por inactividad en free tier; no contenía datos reales, no se perdió nada.
- Las variables de entorno de GeemaStudio están en `.env` (no commiteado). Ver `.env.example` para referencia.
- `apps/mobile/lib/supabase.ts` ✅ ya usa `process.env.EXPO_PUBLIC_SUPABASE_*` (corregido en sesión 2026-03-12).
- Restricción de entorno: puerto 5432 bloqueado en WSL (solo IPv6). Usar SQL Editor del Dashboard para DDL. Ver `docs/DESARROLLO_LOCAL.md`.
