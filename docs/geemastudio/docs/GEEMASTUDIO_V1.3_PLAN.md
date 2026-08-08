# Plan de Fases — GeemaStudio v1.3.0

> Objetivo: limpiar residuos de ZM Lash & Nails, consolidar multi-tenant y portar mejoras clave desde ZM v1.7.

## Fase 0 — Estado base (v1.2.0)

- Migración principal ZM → GeemaStudio completada.
- TenantConfig y TenantContext integrados.
- Onboarding 5 pasos funcionando.
- Flujos principales operativos: Dashboard, Agenda, Servicios, Personal, Finanzas, Inventario.

Estado: **completado (base del trabajo actual)**.

---

## Fase 1 — Auditoría y limpieza de residuos ZM

**Objetivo**: eliminar referencias directas a ZM Lash & Nails (nombres, colores, moneda, terminología) del código vivo, manteniendo solo documentación histórica donde corresponda.

- Búsqueda global de cadenas sensibles (nombres, IDs, colores, `S/`, `es-PE`, `chicas`, etc.).
- Limpieza selectiva en:
  - Código fuente mobile (`apps/mobile`).
  - Código fuente web (`apps/web`).
  - Paquetes compartidos (`packages/shared-schema`, `packages/tenant-config`).
- Mantener referencias históricas solo en:
  - `docs/GEEMASTUDIO_MIGRATION_GUIDE.md`.
  - Archivos `*-example.*` de seeds.

### Subtareas clave

- Actualizar defaults de `tenant_settings` y esquema compartido:
  - Colores por defecto genéricos (sin `#7B2D8E` / `#D4AF37`).
  - Terminología de staff y moneda no acopladas a ZM.
- Ajustar presets de `@zmtech/tenant-config`:
  - `defaultTenantConfig` con:
    - `terminology.staff = "Profesionales"`.
    - `locale.language = "es-VE"`.
    - `locale.currency = { code: "USD", symbol: "$" }`.
    - `businessName = "Mi Salón"` como placeholder neutro.
  - Presets:
    - `spa-nails` → `"Especialistas"`.
    - `barbershop` → `"Barberos"`.
    - `hair-salon` → `"Estilistas"`.
    - `full-aesthetic` → `"Profesionales"`.
- Sustituir `es-PE` por `config.locale.language` en formateos de fecha/hora.
- Eliminar nombres de personas reales de ZM de la UI de demo (por ejemplo en `AppMockup`).

Estado: **en progreso**  
Progreso:
- Defaults y presets de `@zmtech/tenant-config`: **completados**.
- Esquema compartido (colores y moneda por defecto): **completado**.
- Limpieza en Dashboard/Agenda/Finanzas (locales y textos): **en progreso**.
- AppMockup web actualizado para eliminar nombres/personas de ZM y colores de marca antiguos.

---

## Fase 2 — Moneda dinámica y helpers de formato

**Objetivo**: eliminar hardcodes de moneda (`S/`, `$`) y locales fijos, centralizando el formato de dinero en helpers que usen `TenantConfig`.

### Subtareas

- Crear helper `formatCurrency(amount, config)` en `apps/mobile/utils/format.ts`:
  - Usa `Intl.NumberFormat` con:
    - `locale = config.locale.language`.
    - `currency = config.locale.currency.code`.
    - `symbol = config.locale.currency.symbol`.
  - Evitar duplicar símbolo si `Intl` ya lo incluye.
- Reemplazar en mobile:
  - `FinancesScreen`: todos los montos y totales → `formatCurrency`.
  - Otros screens que usen `S/` o formateo manual de precios.
- Alinear todos los formateos de fecha/hora a `config.locale.language`.

Estado: **completado (primera ola)**  
Progreso:
- Helper `formatCurrency` creado y usado en `FinancesScreen`.  
- Dashboard y Agenda actualizados para usar `config.locale.language` en fechas/horas.  
- Pendiente revisar otros screens de negocio para reemplazar posibles `S/` o locales fijos.

---

## Fase 3 — Módulo Clientes (port desde ZM v1.7)

**Objetivo**: portar el módulo de Clientes de ZM a GeemaStudio respetando multi-tenant y terminología neutra.

### Alcance

- Nueva carpeta `apps/mobile/screens/clients/`:
  - `types.ts` con:
    - `Client`, `ClientWithMetrics`, `ClientSegment`, `ClientKPIs`.
  - Hooks:
    - `hooks/useClientsData.ts`:
      - Query key: `["clients"]`.
      - 3 queries separadas (clients, appointments, payments).
      - Combinación en memoria para métricas globales y por cliente.
      - Segmentos: `all`, `vip`, `regular`, `at_risk`, `new`.
    - `hooks/useClientDetail.ts`:
      - Query key: `["client_detail", clientId]`.
      - Historial de citas + pagos de un cliente + métricas individuales.
  - Componentes UI:
    - `ClientsHeader.tsx`.
    - `ClientKPIStrip.tsx`.
    - `ClientCard.tsx`.
    - `ClientDetailModal.tsx`.
    - `ClientFilterBar.tsx`.
    - `ClientAppointmentRow.tsx`.
- Pantalla `ClientsScreen.tsx`:
  - Orquesta header, filtros, KPIs y lista.
  - Integración con `useTenant()` para moneda y terminología.
- Navegación:
  - Agregar `Clients` al `MoreStackNavigator`.

Estado: **completado**.

---

## Fase 4 — Pestaña Más (MoreHomeScreen) v1.7

**Objetivo**: alinear la pantalla Más con la versión mejorada de ZM v1.7, pero genérica y multi-tenant.

### Alcance

- Menú para rol `dev/owner`:
  1. Validación de Pagos (icono `CreditCard`).
  2. Asignar Profesionales (icono `Users`).
  3. Finanzas (icono `BarChart2`).
  4. Profesionales (icono `UserCheck`).
  5. Clientes (icono `Users2`).
  6. Inventario (icono `Package`).
  7. Enviar Promo WA (icono `Megaphone`, visible solo si `config.features.whatsapp`).
  8. Configuración (icono `Settings`).
  9. Mi Perfil (icono `User`).
  10. Cerrar sesión (icono `LogOut`).
- Badges:
  - Tab Más: contar `appointments` con `status = "payment_submitted"`.
  - Item "Validación de Pagos": mismo contador anterior.
  - Item "Asignar Profesionales": citas sin `employee_id` en últimos 7 días.
- Terminología dinámica:
  - `"Chicas"` → `config.terminology.staff` (fallback `"Profesionales"`).
  - Labels y textos internos neutros.

Estado: **completado (mobile)**  
Progreso:
- Carpeta `apps/mobile/screens/clients/` creada con:
  - `types.ts` (`Client`, `ClientWithMetrics`, `ClientSegment`, `ClientKPIs`).
  - Hooks `useClientsData` y `useClientDetail` con Supabase directo (clients, appointments, payments) y combinación en memoria.
  - Componentes: `ClientsHeader`, `ClientKPIStrip`, `ClientCard`, `ClientDetailModal`, `ClientFilterBar`, `ClientAppointmentRow`.
- `ClientsScreen.tsx` implementada como orquestador.
- Ruta `Clients` agregada a `MoreStackNavigator` y lista para usarse desde la pestaña Más.

---

## Fase 5 — Pantalla Configuración (SettingsScreen) v1.7

**Objetivo**: modularizar Settings y agregar secciones avanzadas (tema, tenant, sistema, WhatsApp).

### Alcance

- Arquitectura en `apps/mobile/screens/settings/`:
  - `types.ts`.
  - `hooks/useSettingsData.ts`:
    - Versión de app, canal EAS, updateId, info OTA, limpieza de caché, etc.
  - Componentes:
    - `SettingsSection.tsx`.
    - `SettingsItem.tsx`.
    - `BuildInfoCard.tsx`.
    - `ThemeToggle.tsx`.
    - `TokenWarningBanner.tsx`.
- Secciones:
  - **Apariencia**:
    - Toggle tema: Light / Auto / Dark (persistido en AsyncStorage).
  - **Tenant / Negocio** (solo dev/owner):
    - Nombre editable via `updateTenant()`.
    - Tipo de negocio, moneda, idioma (solo lectura).
  - **Cuenta**:
    - Email y rol del usuario.
  - **Sistema** (solo dev/owner):
    - Versión app, canal, OTA ID, botón “Limpiar caché”.
  - **Información** (solo dev/owner):
    - `BuildInfoCard` con datos de build, copiable.
  - **Integración WhatsApp**:
    - `TokenWarningBanner` si `config.features.whatsapp === true`:
      - Colores según días restantes (`config.integrations.waba.tokenExpiry`).

### ThemeContext

- Crear `ThemeContext` con:
  - Preferencia `'light' | 'dark' | 'auto'`.
  - Persistencia en `@geemastudio/theme_preference`.
  - Uso de `useColorScheme()` para modo `auto`.
- Integrar `ThemeProvider` en `App.tsx` (envolviendo navegación).

Estado: **completado (primera versión)**  
Progreso:
- Menú Administración actualizado en `MoreHomeScreen` para rol dev/owner con:
  - Validación de Pagos (badge con citas `status = "payment_submitted"`).
  - Asignar Profesionales (badge con citas sin `employee_id` en últimos 7 días).
  - Finanzas, Profesionales, Clientes, Inventario.
  - Enviar Promo WA visible solo si `config.features.whatsapp` es verdadero (placeholder con alerta por ahora).
- Terminología dinámica aplicada:
  - Labels de profesionales basados en `config.terminology.staff` con fallback `"Profesionales"`.

---

## Fase 6 — Actualización de documentación interna (CLAUDE.md / reglas)

**Objetivo**: alinear documentación interna con v1.3.0 y nuevo idioma base.

### Alcance

- `CLAUDE.md`:
  - Idioma: `español neutro LATAM (es-VE)`.
  - Navegación → sección Más actualizada con nuevo menú.
  - Notas de desarrollo:
    - `es-PE` → `es-VE`.
    - Terminología del personal: default `"Profesionales"`; siempre vía `config.terminology.staff`.
  - Sección de cambios recientes:
    - Agregar bloque `mar 2026 — v1.3.0` con resumen de:
      - Limpieza ZM.
      - Moneda dinámica.
      - Módulo Clientes.
      - Más v1.7.
      - Settings v1.7.
Estado: **completado**  
Progreso:
- `CLAUDE.md` actualizado a idioma `español neutro LATAM (es-VE)` con navegación y menú Más v1.7.
- Notas de desarrollo ajustadas para terminología dinámica de personal y moneda/locale basados en `TenantConfig`.
- Sección de cambios recientes extendida con bloque `mar 2026 — v1.3.0` (limpieza ZM, moneda dinámica, módulo Clientes, Más v1.7, Settings v1.7).

---

## Fase 7 — Verificación técnica y QA rápido

**Objetivo**: asegurar que los cambios de v1.3.0 no rompen el proyecto ni el onboarding.

### Checklist

- `yarn check:types` sin errores. ✅
- `yarn lint` sin errores (warnings aceptables). ⏸️ Bloqueado por configuración de ESLint/Next/Expo:
  - `eslint` ya está instalado en el root junto con `eslint-config-expo` y `eslint-plugin-prettier`.
  - `yarn lint` (root) sigue usando `yarn workspaces run` (no compatible con Yarn 4; habría que migrar a `workspaces foreach`).
  - `yarn workspace mobile lint` y `yarn workspace web lint` fallan actualmente por incompatibilidad entre la versión de ESLint y el stack de `@typescript-eslint`/Next (error: `Class extends value undefined is not a constructor or null`).
- Flujos (por ejecutar manualmente en dispositivo/emulador):
  - Onboarding con `EXPO_PUBLIC_FORCE_ONBOARDING=true`:
    - `OnboardingEntryScreen` visible.
    - Wizard completo sin errores.
  - `LoginScreen` clásico:
    - “Ya tengo cuenta” sigue funcionando.
  - Tab Más:
    - Badge de pagos pendientes visible y consistente con datos.
  - `ClientsScreen`:
    - Renderiza sin crashear, incluso con BD vacía.
  - `SettingsScreen`:
    - Secciones correctas según rol y configuración de WhatsApp.

Estado: **en progreso**  
Progreso:
- `yarn check:types` en raíz: **ok, sin errores**.
- `yarn workspace mobile lint`: **ok**, usando `eslint-config-expo` + `eslint-plugin-prettier` + `eslint-config-prettier`.
- `yarn workspace web lint`: **ok**, solo warnings menores (directivas `eslint-disable` sin uso en `/finanzas`).
- Pendiente ajustar script root `yarn lint` (migrar de `workspaces run` a `workspaces foreach`) si se quiere un comando único.

