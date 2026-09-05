# Changelog — GeemaStudio

Todos los cambios notables se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Añadido (4-sep 2026 — Personal Karelis/Alejandra + comisión fija casa)

- **BD compartida ZM**: `employees.commission_mode` + `house_cut_fixed`; `emp-romina`/`Chica Externa` → `emp-karelis`/Karelis; alta `emp-alejandra` (`fixed_house` S/50) para micro.
- **Mobile — Personal / Finanzas**: esquema % vs fijo casa; desglose acumula corte en Vanessa; badge “Casa S/…”.
- **Mobile — Agenda (`OwnerDayGrid`)**: carriles laterales para citas solapadas en la misma columna (texto ya no se pisa).

### Añadido (2-sep 2026 — Colores de marca editables)

- **Mobile — `TenantColorsScreen`**: nueva pantalla en Más → Datos del negocio para editar `theme.primaryColor`/`accentColor` post-onboarding, reutilizando paletas y selector HSV del wizard; `syncRemote` vía `updateTenant`.

### Corregido (2-sep 2026 — Auditoría de colores del tenant)

- **Mobile — hardcodes de color eliminados**: lecturas directas `Colors.light.violet/gold/warning` (bypaseaban `useTheme()`) corregidas en Dashboard, Finanzas, Inventario, Personal y Agenda (`getEmployeeColor` ahora recibe `fallbackColor` en vez de importar `Colors`); `DemoBanner.tsx` dejó de usar el magenta legacy `#E91E8C`.
- **Mobile — `OtaUpdateOverlay.tsx`**: 21 errores de lint `react-hooks/refs` corregidos (`useRef(...).current` → `useState(() => ...)[0]` en los 4 `Animated.Value`).

### Añadido (31-ago 2026 — País, feriados, Agenda multi-servicio)

- **`@zmtech/tenant-config` — país + feriados**: `country-presets.ts` (`COUNTRY_PRESETS`, `localeFromCountry`); `salon-holidays.ts` (catálogos PE/VE 2026, `resolveFranjaEfectiva`, alerts); `esCeldaAgendaEnHorarioLaboral` / `esInstanteEnHorarioLaboral` / `diaTieneFranjaAgenda` aceptan `SalonHolidayIndex` opcional. `locale.language` ampliado (`es-AR` | `es-CL` | `es-MX`).
- **BD — `salon_holidays`**: UNIQUE `(tenant_id, date)` (migración `20260831155349`); Drizzle `salonHolidays` en `shared-schema`.
- **Mobile — onboarding país**: `OnboardingCountryScreen` (paso 1); moneda/TZ/`language` derivados del país; quita selector de moneda del tipo de negocio; Settings con `CountryPickerModal` (+ moneda como override).
- **Mobile — feriados**: `useSalonHolidays` (auto-seed por `locale.country` si vacío); `FeriadosScreen` (CRUD + recargar nacionales); `HolidayAlertBanner` en Dashboard y Agenda; Agenda respeta franja de feriado/cerrado.
- **Mobile — Agenda**: editar servicios/packs en cita existente (`SvcPickerContent`, `useAppointmentServiceEditor`, `updateAppointmentServicesMutation`); marcar completada; línea “ahora” con `theme.primary`.
- **Mobile — UX**: `ScrollFadeRow` con flechas en scrolls horizontales; `OtaUpdateOverlay` + `useExpoOTAOnLaunch` (paridad ZM).
- **Diseño**: `docs/geemastudio/design/onboarding.pen` alineado a tokens Lunaris + frame `1-Pais`.

### Corregido (31-ago 2026 — Onboarding: banderas SVG + contador de pasos)

- **Mobile — banderas de país**: los badges de texto (código ISO) del onboarding y `CountryPickerModal` (introducidos para cumplir la regla de "sin emojis Unicode") se reemplazan por banderas SVG reales vía nuevo componente `components/CountryFlag.tsx` (paquete `country-flag-icons` + `react-native-svg-transformer` en `metro.config.js`); mantiene el look visual original sin usar emoji Unicode.
- **Mobile — contador "PASO X DE Y" desalineado**: al insertarse `OnboardingCountryScreen` como nuevo paso 1, el texto quedó en "DE 5" (o "DE 4" en pantallas más viejas) y `OnboardingProgressDots` recibía `currentStep` 1-indexado contra un componente 0-indexado (`TOTAL_STEPS = 7`), desalineando el dot activo y colapsando Auth/Complete en el mismo punto. Corregido: las 7 pantallas del wizard (País → Tipo de negocio → Datos básicos → Equipo → Servicios → Auth → Completado) ahora pasan `currentStep` 0-indexado (0–6) y los textos dicen "PASO N DE 7".
- **Diseño — `onboarding.pen`**: banderas de emoji reemplazadas por SVG generados (Venezuela, Perú, Colombia, México) en el frame `1-Pais`; ícono genérico ("droplets") desalineado eliminado; pantallas reordenadas 0-Entry → 1-Pais → 2-BusinessType → … → 7-Complete; textos "PASO X DE Y" alineados a "DE 7" en las 5 pantallas del wizard que los muestran.

### Corregido (31-ago 2026 — Agenda: feedback de nueva cita y reprogramación)

- **Mobile — Agenda**: badge de citas centrado sobre el avatar (antes desalineado); FAB de nueva cita restyled a color del tenant + solo ícono; `ScrollFadeRow` (`components/ScrollFadeRow.tsx`) con flechas táctiles (`showArrows`/`arrowColor`) aplicado a las filas de chips de fecha/hora/minuto en `NewAppointmentModal` y `AppointmentDetailModal`; texto prominente "Hora seleccionada" al reprogramar; selector de minutos (0/15/30/45) agregado al modal de detalle/reprogramación, antes solo disponible al crear cita.
- **Mobile — círculos de avatar más grandes en Agenda** (commit `17d9978`) y **foto de perfil de Personal habilitada para todos los tenants** (`eb58264`, dialecto ZM incluido — ver `avatar_url` en §7 del skill `geemastudio-dev`).

### Añadido (30-ago 2026 — Más: rediseño grid + terminología editable + avatar_url en ZM prod)

- **Mobile — Más (rediseño IA)**: `MoreHomeScreen` grid de categorías (Mi negocio, Finanzas, Asignar {staff}, Marketing y Redes, Ayuda, Cuenta) reemplaza la lista plana; subpantallas nuevas en `screens/more/`; `MenuRow`/`CategoryCard` extraídos a `components/`.
- **Mobile — terminología del personal editable**: `TerminologyEditModal` en Datos del negocio; `staff`/`staffSingular` ahora editables (antes solo lectura), con `syncRemote`.
- **Mobile — Logo del negocio**: movido de "Mi negocio" a la primera fila de "Datos del negocio".
- **BD producción ZM — `avatar_url`**: columna agregada a `employees` en el proyecto real (`udelxwwnyivknslueerr`); bucket `employee-avatars` (público) creado; `employeesAdapter.ts` ya no fuerza `avatar_url` a `null` para el dialecto `'zm'` — se lee/escribe igual que en Geema-nativo. Fotos reales de Vanessa/Stephani cargadas (fuente: Sanity del sitio web de ZM).

### Añadido (30-ago 2026 — S5-C paridad ZM)

- **Mobile — adaptador catálogo ZM** (`catalogAdapter.ts`): dialecto `packs.title` vs Geema; packs `title`/`pack_price`; promos `valid_until` + total desde `promotion_items` (S5C-1/2).
- **Mobile — adaptador `employees`** (`employeesAdapter.ts` + `useEmployeesQuery`): query única con agenda; writes ZM ahora incluyen `avatar_url` (agregado 30-ago), siguen sin `payment_mode`/`salary_amount` (S5C-11).

### Corregido (30-ago 2026 — S5-C)

- **Mobile — citas en hora de pared** del tenant (`appointments.date` sin TZ): deja de aplicar el `Z` falso de PostgREST; hidrata `timezone`/`businessHours` al login (S5C-3).

### Cambiado

- **Monorepo — TypeScript 6.0.3**: bump en raíz, mobile, web, shared-schema y tenant-config; `resolutions.typescript` en la raíz. Web: eliminado `baseUrl` deprecado; `target` ES2022; declaración `*.css` en `apps/web/src/types/css.d.ts`. Packages/server: `rootDir` explícito donde hay `outDir`.
- **Mobile — Expo SDK 56**: `expo ~56.0.16`, React Native **0.85.3**, React **19.2.3**, Reanimated **4.3.1**, worklets **0.8.3**; resto de módulos `expo-*` alineados con `expo install --fix`. `app.json`: removidos `newArchEnabled` y `edgeToEdgeEnabled` (obligatorios / obsoletos desde SDK 55–56).
- **Mobile — breaking SDK 56**: `StatusBar` sin `backgroundColor`/`translucent`; `StyleSheet.absoluteFillObject` → `absoluteFill`; tipos Reanimated (`DashboardAnimatedStyle`) en cards del dashboard.
- **Web — eliminación de emojis** _(abr 2026)_: landing y panel con íconos Lucide React (`emoji` → `icon`).
- **Mobile — onboarding (TD-001)** _(abr 2026)_: tokens `Onboarding`, `BorderRadius.card`, `Onboarding.canvasBackground`.

### Añadido

- **Mobile — selector de moneda multi-LATAM** (`feat(settings+onboarding)`): 19 monedas LATAM; Ajustes + onboarding paso 2; `syncRemote`.
- **Mobile — gestión de profesionales** (`feat(personal)`): FAB crear; eliminar con confirmación y Storage.
- **Mobile — color personalizado en onboarding (paso 2)**: `CustomColorPickerModal` (HSV) + `@react-native-community/slider`.
- **`constants/theme.ts`**: objeto **`Onboarding`**; **`BorderRadius.card`**; **`backgroundSubtle`**.
- **Documentación**: `docs/tech-debt/TD-001-onboarding-tokens.md` resuelto; índice en `docs/INDEX.md`.

### Corregido

- **Mobile — typecheck**: prop `style` inválida en `Tab.Navigator`; `theme.borderSubtle` → `theme.border` en `CurrencyPickerModal`.
- **Mobile — Agenda** (`fix(agenda)`): KPI fila flex 1/3; avatar strip; chips de filtro más compactos.

---

## [1.4.9] — 2026-04-02

### Añadido

- **Mobile — Agenda KPI + UI compacta** (`feat(agenda+tenant)`): `AgendaDayKPIStrip` (3 métricas: citas, ingresos, sin asignar); agenda más compacta con safe-area; selector `locale.timeFormat` (12|24) en helpers, grids y modal detalle; `HorariosTrabajo` actualizado con picker de formato; `tenant_settings.time_format` en Drizzle y SQL de migración.

---

## [1.4.8] — 2026-04-01

### Añadido

- **Web — paleta Lunaris (fuente de verdad)**: `apps/web/src/lib/theme.ts` exporta **`LUNARIS`** (gradiente 135°/90°, `primary` `#40E0D0`, `primaryDark`, `badge`, `glow`, etc.). Landing, panel, login, `/dashboard` y `/finanzas` consumen estos tokens o clases Tailwind alineadas (`#40E0D0` / `#00897B`).
- **Tailwind / globals (web)**: `primary` → `#00897B`, `primaryLight` → `#B2DFDB`; scrollbar y `::selection` con tintes turquesa.

### Cambiado

- **Navbar (landing)**: wordmark **Geema** + **Studio** con gradiente Lunaris; badge Beta con `LUNARIS.badge`.
- **Mobile — `DiamondHero` / onboarding**: gradientes desde **`Gradients.onboarding`** en `constants/theme.ts` (sin array hardcodeado local); dirección 135° unificada (`linearStart` / `linearEnd`).
- **Vercel**: eliminado **`ignoreCommand`** en `vercel.json` — el diff contra `VERCEL_GIT_PREVIOUS_SHA` en checkout **shallow** provocaba `fatal: bad object` y builds en ERROR. Cada push a `main` ejecuta build de la web (sin omitir por paths).

### Corregido

- **Web**: Prettier en `/panel/horarios` para pasar lint en CI/Vercel.

### Notas

- **`defaultTenantConfig`** (`packages/tenant-config/src/defaults.ts`) puede seguir con `primaryColor` heredado hasta alineación explícita; el **preset `spa-nails`** (`presets/spa-nails.ts`) usa ya **`#40E0D0`**.

---

## [1.4.7] — 2026-03-30

### Añadido

- **Empleados — foto de perfil**: columna `employees.avatar_url`, bucket público Supabase **`employee-avatars`** (RLS: lectura abierta; escritura solo `dev`/`owner`), migración `scripts/db/migrations/202603301200_employee_avatar_url_storage.sql` (también aplicable vía MCP `apply_migration`).
- **Mobile — Personal**: `expo-image-picker` (galería/cámara, recorte 1:1), subida con `apps/mobile/lib/employeeAvatar.ts`, preview en lista y modal; quitar foto borra referencia y el objeto en Storage cuando la URL es del bucket.
- **Mobile — Agenda**: misma foto en **cabecera por profesional (tablet / vista semana legacy)** (`AgendaEmployeeHeaders`) y en **franja de equipo (vista dueño)** (`OwnerStaffAvatarStrip`); query `employees` incluye `avatar_url`.

### Cambiado

- `app.json`: plugin `expo-image-picker` con textos de permiso en español.

---

## [1.4.6] — 2026-03-30

### Añadido

- **Config horario de trabajo**: zona horaria IANA (`tenant_settings.timezone`, ya mapeada en mobile) + **`business_hours`** por día editables.
  - **Mobile**: pantalla **`HorariosTrabajo`** (stack Más → Configuración → “Horario de trabajo”); `TenantContext.updateTenant(..., { syncRemote: true })` persiste en Supabase.
  - **Web (panel)**: **`/panel/horarios`** — mismo modelo (`timezone`, `business_hours`); nav lateral “Horario”; dependencia `@zmtech/tenant-config` en `apps/web`.
- **`@zmtech/tenant-config`**: módulos **`working-schedule.ts`** (validación HH:MM, `mergeTenantConfig`, `horasVisiblesParaAgenda`, bloqueo por franja) e **`iana-timezone.ts`** (Luxon 3: semana/día en zona del tenant, `instanteCitaEnZona`, `zonaIANASegura`, formateos Intl con `timeZone`).
- **Agenda (mobile)**: grilla alineada al **calendario y reloj del negocio** (`config.locale.timezone`); celdas fuera de franja atenuadas y sin alta; citas filtradas por día/hora en esa zona; alta/reprogramación con instante correcto para BD.
- **Drizzle (`tenant_settings`)**: columnas documentadas para alinear con remoto: **`timezone`**, **`client_terminology`**, **`tagline`**, **`features_whatsapp`**.

### Cambiado

- **`TenantContext`**: fusiones profundas con `mergeTenantConfig`; `updateTenant(partial, { syncRemote?: boolean })`.
- **Mobile**: eliminado `AGENDA_HOURS` fijo en `agenda/constants.ts`; rango de filas desde `horasVisiblesParaAgenda`.
- **`apps/web/package.json`**: `yarn.lock` por workspace `tenant-config` + Luxon.

---

## [1.4.5] — 2026-03-25

### Añadido

- Tabla **`appointment_verifications`** en `packages/shared-schema` (Drizzle + Zod + relaciones con `appointments`), alineada con Supabase.
- Scripts **`yarn db:generate`** y **`yarn db:studio`** en la raíz del monorepo.
- Carpeta **`migrations/`** en la raíz (salida prevista de Drizzle Kit) con `.gitkeep`.
- SQL de referencia **`scripts/db/migrations/20260324_advisor_rls_performance.sql`**: `search_path` en funciones públicas, índices FK, políticas RLS consolidadas y patrón initplan seguro para `auth.uid()` (ya aplicado en proyecto Supabase GeemaStudio vía MCP).
- **Web (panel)**: ruta autenticada **`/panel/servicios`** — CRUD de **`service_categories`** y **`services`** (toggle inline `is_active`, PR-06) más CRUD de **`packs`**, **`promotions`** y **`promotion_items`** (PR-06B; Supabase directo, TanStack Query). Tabs con título tipo _Catálogo de Servicios › …_ y tab activo sincronizado con query **`?tab=`** (`categorias` | `servicios` | `packs` | `promos`).
- **Web (auth)**: login básico en **`/login`** para acceso al panel y layout SSR con guard de sesión.
- **Mobile (Agenda)**: chequeo de disponibilidad y **bloqueo de solapes** al crear/reprogramar citas (incluye guard previo al insert/update para evitar race conditions).
- **Mobile (Personal/Finanzas)**: soporte de **pagos de empleados** por modo `commission` / `salary` / `mixed`, con utilidades de cálculo de nómina y badge de modo en UI.

### Cambiado

- **Drizzle**: índices `idx_appointments_*`, `idx_payments_appointment_id`, `idx_profiles_employee_id`, `idx_services_category_id` e índices `idx_appt_verif_*` declarados en `schema.ts` para coincidir con la base remota y con `yarn db:push`.
- **`drizzle.config.ts`**: comentarios que distinguen `db:push` vs `db:generate` y remiten al SQL de advisors/RLS.
- **Supabase Web**: cliente actualizado para usar `@supabase/ssr` (browser + server) y soportar guard SSR por cookies en App Router.
- **Onboarding (Equipo)**: simplificado — ya no captura comisión/salario; el modo de pago se configura luego en **Personal**.

### Notas

- **Security Advisor**: puede seguir mostrando _Leaked Password Protection_ en plan Free de Supabase Auth; el resto de avisos de funciones `search_path` y performance RLS/FK quedaron atendidos en remoto según el SQL anterior.

---

## [1.4.4] — 2026-03-24

### Añadido

- Marca **diamante** (`logo-diamondSparkle.svg` y variantes `positive` / `negative` en `apps/web/public/`; copias en `apps/mobile/assets/`).
- `apps/web/public/favicon.png` y regeneración de `splash-icon.png` / íconos raíz alineados al diamante.
- `apps/mobile/app.json`: `icon`, `updates.url` (`https://u.expo.dev/<projectId>`) para EAS Update y canales.
- Scripts `build:preview:android` y `build:preview:ios` en `apps/mobile/package.json`.

### Cambiado

- **Web**: Navbar y Footer usan solo el diamante (`next/image`); en barra clara tras scroll (modo claro) se aplica `invert` al mismo SVG.
- **Mobile**: splash in-app con PNG del diamante; sin wordmark “GeemaStudio” en el bloque del logo; `expo-splash-screen` con fondo `#111318`.
- **`apps/mobile/eas.json`**: perfil `preview` con `EXPO_PUBLIC_SUPABASE_URL` (anon key vía entornos Expo).
- **Raíz `app.json`**: splash `#111318`, adaptive Android con `android-icon-foreground.png` regenerado.

### Eliminado

- `eas.json` duplicado en la raíz del monorepo (config EAS solo en `apps/mobile/eas.json`).
- Logos horizontales web (`logo.svg`, `logo-light.svg`, `logo-icon.svg`), `GemaStudio.png`.
- Assets mobile obsoletos (`logo-geemastudio*`, `logo.svg`, `compare.html`, carpeta `apps/mobile/assets/images/` duplicada).
- `assets/images/android-icon-background.png` y `android-icon-monochrome.png` en raíz (foreground + íconos unificados al diamante).

---

## [1.3.2] — 2026-03-19

### Añadido

- **Fase 10 — ValidacionPagosScreen**: pantalla completa de validación de pagos con spinner per-row (Aprobar / Rechazar independientes por fila).
  - `screens/validacion/types.ts` — interfaces `PendingAppointment`, `VerificationAction`, `RowLoadingState`.
  - `screens/validacion/hooks/useValidacionData.ts` — React Query: lista de citas `payment_submitted`, enriquecimiento en memoria con nombre de servicio y empleado, mutación `verifyMutation` que inserta en `appointment_verifications` y actualiza `appointments.status`.
  - `screens/validacion/components/ValidacionRow.tsx` — card con franja de color del empleado, datos de la cita y botones Aprobar/Rechazar con `ActivityIndicator` per-row.
  - `screens/ValidacionPagosScreen.tsx` — orquestador con `FlatList`, `RefreshControl`, estado `rowLoading` per-row y empty state "Todo al día".
- **Tabla `appointment_verifications`** en Supabase: registra cada acción de verificación (`approved`/`rejected`) con RLS para roles `owner`/`dev`. FK `appointment_id` como `text` para compatibilidad con el esquema existente.
- **Navegación**: `ValidacionPagos` añadida a `MoreStackParamList`; menú "Validación de Pagos" en `MoreHomeScreen` navega a la pantalla real (reemplaza el `Alert.alert` placeholder).

---

## [1.3.1] — 2026-03-19

### Añadido

- `apps/web/public/logo-light.svg` — variante del logo horizontal para fondos claros; fills/strokes invertidos a `#0F0F0F` con las mismas opacidades que la versión oscura.

### Corregido

- Eliminado `<rect fill="#0F0F0F"/>` de `logo.svg` y `logo-icon.svg`; los SVG ahora son transparentes y delegan el fondo al contexto de uso.
- Confirmada ausencia de `"Chicas"` hardcodeado en `.ts`/`.tsx`; terminología de personal proviene siempre de `config.terminology.staff`.

### Eliminado

- `docs/replit.md` — archivo heredado de ZM Lash & Nails; ya no relevante para GeemaStudio (backend 100% Supabase).

---

## [1.3.0] — 2026-03

### Añadido

- Módulo Clientes (mobile): `ClientsScreen` con hooks `useClientsData` / `useClientDetail`, KPIs globales, segmentos (VIP, regulares, en riesgo, nuevos) y detalle con historial de citas y métricas.
- Pantalla Más v1.7: badges para pagos pendientes y citas sin profesional asignado; terminología de personal dinámica desde `config.terminology.staff`.

### Cambiado

- Limpieza ZM: eliminadas todas las referencias directas a colores, moneda y nombre del salón original en código vivo.
- Defaults de `tenant_settings` y `TenantConfig` ahora genéricos (USD, es-VE, `"Profesionales"`).
- Helper `formatCurrency` en mobile; uso de `config.locale.language` para fechas/números.

---

## [1.2.0] — 2026-02

### Añadido

- Paquete `@zmtech/tenant-config`: `TenantConfig` interface + `defaultTenantConfig` + 4 presets (spa-nails, barbershop, hair-salon, full-aesthetic).
- `TenantProvider` en `App.tsx`; `useTenant()` y `createTheme(config, isDark)` en todos los screens.
- Onboarding de 5 pasos en `screens/onboarding/`; `AuthGate` orquesta el flujo; `isConfigured` + `markConfigured()` en `TenantContext`.
- Tabla `tenant_settings` en Supabase con RLS y sincronización desde el onboarding.
- Supabase full-mobile: todos los flujos usan Supabase directo; eliminado cliente Express (`apiRequest`, `/api/*`).
- Landing pública completa en `apps/web` (Next.js 15 App Router): Hero, Pain Points, Features, Social Proof, Pricing, FAQ, CTA, Footer.

### Cambiado

- Seeds renombrados a `*-example.sql`; nuevos `*-template.sql` genéricos para los 4 tipos de negocio.
- `queryKey` de React Query actualizadas (`employees`, `services`, `service_categories`, `appointments`, `payments`, `inventory_items`, `dashboard_stats`, `dashboard_revenue`).

---

## [1.1.0] — 2026-01

### Añadido

- Auth Supabase en mobile y web.
- Tab **Más** con `PersonalScreen` y `SettingsScreen`.
- Notificaciones push (Expo Notifications).
- UI tablet responsive (`useResponsive`, `isTablet ≥ 768px`).
- Panel `/finanzas` en web con Auth Supabase.

### Cambiado

- Eliminado servidor Express; backend 100% Supabase.
- `metro.config.js` corregido para monorepo.
- `expo-updates` movido a raíz del monorepo.

---

## [1.0.0] — 2025-12

### Añadido

- Proyecto inicial basado en ZM Lash & Nails Beauty.
- Monorepo Yarn Workspaces: `apps/mobile`, `apps/web`, `packages/shared-schema`.
- Schema Drizzle + Zod: `employees`, `service_categories`, `services`, `clients`, `appointments`, `inventory_items`, `payments`, `profiles`.
- App móvil Expo SDK 54 con React Navigation 7, TanStack Query v5, Reanimated 4.
- Dashboard, Agenda, Servicios, Finanzas, Inventario.
