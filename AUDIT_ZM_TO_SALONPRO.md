# Auditoría Comparativa: ZM Lash & Nails Beauty → SalonPro

> Generado: 2026-03-12
> Analista: Claude Code (claude-sonnet-4-6)
> Estado: Solo lectura — ningún archivo fue modificado

---

## Contexto

- **ZM Lash & Nails Beauty** (`/home/alber/ZM-Lash-and-Nails-Beauty`): App de producción con mejoras recientes.
- **SalonPro** (`/home/alber/salonpro`): Versión multi-tenant/SaaS derivada. Fases 1–5 completadas. Fase 6 (tabla `tenant_settings` en Supabase) pendiente.

Las Fases 1–5 ya genericizaron: TenantContext, colores dinámicos, moneda dinámica, terminología de personal, onboarding de 5 pasos y seeds genéricos. Este documento cubre las mejoras de ZM Lash que aún no han sido portadas.

---

## PASO 1 — Auditoría de Diferencias

### `apps/mobile/screens/`

| Archivo | Tipo | Descripción | Impacto |
|---------|------|-------------|---------|
| `DashboardScreen.tsx` | [MEJORADO] | ZM usa `getLimaTodayRange()` de `lima-time.ts`; SalonPro calcula inline sin timezone awareness | Bajo |
| `AgendaScreen.tsx` | [MEJORADO] | Alerta hardcodeada "Asigna una **chica** a cada servicio" — necesita `config.terminology.staffSingular` | Medio |
| `ServiciosScreen.tsx` | [MEJORADO] | ZM tiene campo `isPromo` en formulario de servicio para marcar descuentos. SalonPro lo eliminó | Bajo |
| `AsignarChicasScreen.tsx` | [NUEVO en ZM] | Pantalla de asignación manual de empleada a citas sin asignar. Flujo operativo clave. NO existe en SalonPro | Alto |
| `ValidacionPagosScreen.tsx` | [NUEVO en ZM] | Aprobación/rechazo de comprobantes de pago + fotos pre-servicio. Workflow muy específico de ZM | ⚪ Ignorar |
| `screens/promos/PromoMasivaScreen.tsx` | [NUEVO en ZM] | Broadcast masivo WhatsApp en 5 pasos (configurar, segmentar, preview, enviando, resultado) | ⚪ Ignorar |
| `screens/promos/HistorialPromosScreen.tsx` | [NUEVO en ZM] | Historial de campañas enviadas con estado (draft/sending/done/failed) | ⚪ Ignorar |
| `screens/clients/` (módulo completo) | [NUEVO en ZM] | Módulo avanzado: `ClientCard`, `ClientDetailModal`, `ClientFilterBar`, `ClientKPIStrip`, `ClientsHeader`, `ClientAppointmentRow` + hooks `useClientsData`, `useClientDetail`. KPI strip: retención %, CLV, próxima visita. Filtrado avanzado por segmento | Alto |

### `apps/mobile/screens/services/`

| Archivo | Tipo | Descripción | Impacto |
|---------|------|-------------|---------|
| `PacksSection.tsx` | [NUEVO en ZM] | Sección visual de bundles multi-servicio con badges y emojis | Alto |
| `PackModal.tsx` | [NUEVO en ZM] | Modal CRUD para crear/editar packs | Alto |
| `PromoCard.tsx` | [NUEVO en ZM] | Tarjeta visual para servicios en promoción | Medio |
| `PromoModal.tsx` | [NUEVO en ZM] | Modal para gestionar promociones de servicio | Medio |
| `PromoBanner.tsx` | [NUEVO en ZM] | Banner de promoción activa | Bajo |

### `apps/mobile/hooks/`

| Archivo | Tipo | Descripción | Impacto |
|---------|------|-------------|---------|
| `usePacks.ts` | [NUEVO en ZM] | CRUD de packs: `usePacksQuery`, `useCreatePack`, `useUpdatePack`, `useDeletePack` (React Query) | Alto |
| `usePromos.ts` | [NUEVO en ZM] | Gestión de promociones de servicios | Medio |
| `usePromotionItems.ts` | [NUEVO en ZM] | Items dentro de una promoción | Medio |
| `useClientsData.ts` | [NUEVO en ZM] | Agregación de KPIs: retención, CLV, frecuencia de visita | Alto |
| `useClientDetail.ts` | [NUEVO en ZM] | Detalle de cliente con historial de citas | Medio |
| `usePromoBroadcast.ts` | [NUEVO en ZM] | Broadcast WhatsApp: `createBroadcast()`, `sendBroadcast()`, `pollBroadcastStatus()` | ⚪ Ignorar |
| `useClientesSegmento.ts` | [NUEVO en ZM] | Segmentación por actividad/última visita (dependencia de broadcast WhatsApp) | ⚪ Ignorar |
| `useTheme.ts` | [MEJORADO] | ZM usa versión estática (`Colors[colorScheme]`). SalonPro ya mejoró con `createTheme()` | ✅ Ya migrado |

### `apps/mobile/contexts/`

| Archivo | Tipo | Descripción | Impacto |
|---------|------|-------------|---------|
| `AuthContext.tsx` | [CORREGIDO] | SalonPro está en **modo desarrollo** con `DEV_PROFILE` hardcodeado. ZM Lash tiene auth real: manejo de race conditions, `onAuthStateChange` con debounce, timeout de inicialización | Alto |
| `TenantContext.tsx` | [NUEVO en SalonPro] | Multi-tenant config persistence vía AsyncStorage. No existe en ZM Lash | ✅ Ya migrado |

### `apps/mobile/lib/`

| Archivo | Tipo | Descripción | Impacto |
|---------|------|-------------|---------|
| `lima-time.ts` | [NUEVO en ZM / ELIMINADO en SalonPro] | Utilidades timezone Lima: `getLimaTodayRange()`, `addLimaDays()`, `parseLimaDay()`. SalonPro lo eliminó pero **no creó el reemplazo dinámico** con `config.locale.timezone` | Alto |

### `apps/mobile/utils/`

| Archivo | Tipo | Descripción | Impacto |
|---------|------|-------------|---------|
| `format.ts` | [NUEVO en ZM] | Funciones clave ausentes en SalonPro: `fmtSoles()` (formato moneda), `formatTime()`, `formatHour12()`, `formatDateShort()`, `normalizePhone()`, `normalizeName()`, `filterPriceInput()` | Alto |

### `packages/`

| Cambio | Tipo | Descripción | Impacto |
|--------|------|-------------|---------|
| Schema tabla `packs` | [NUEVO en SalonPro] | SalonPro tiene la tabla en Drizzle schema. ZM tiene UI pero sin tabla formal. **Solo falta la UI en SalonPro** | Alto |
| `@zm/policies-text` | [NUEVO en ZM] | Textos legales WhatsApp. Totalmente específico de ZM | ⚪ Ignorar |

---

## PASO 2 — Clasificación de Cambios

### 🔴 CRÍTICOS

| ID | Cambio | Razón |
|----|--------|-------|
| C1 | **Utilidades de formato de fecha/hora ausentes** | Los screens usan lógica inline sin timezone awareness. Puede mostrar fechas incorrectas según el timezone del dispositivo |
| C2 | **Utilidades de formato de moneda ausentes** | Sin `formatCurrency()` genérico, los números se muestran sin formato regional correcto |
| C3 | **AuthContext en modo desarrollo** | `DEV_PROFILE` hardcodeado. SalonPro no puede ir a producción sin auth real de Supabase |

### 🟡 IMPORTANTES

| ID | Cambio | Razón |
|----|--------|-------|
| I1 | **Módulo de Clientes avanzado** | KPI strip (retención %, CLV, próxima visita) + filtrado avanzado. Feature core de un SaaS de salones |
| I2 | **Sistema de Packs (UI)** | El schema ya existe. Es un diferenciador competitivo — pocos SaaS de salones tienen bundles |
| I3 | **AsignarEmpleadoScreen** (genérica) | Flujo operativo esencial para salones con 3+ empleados |
| I4 | **Utilidades de fecha tenant-aware** | Reemplazar `lima-time.ts` con versión que use `config.locale.timezone` |

### 🟢 DESEABLES

| ID | Cambio | Razón |
|----|--------|-------|
| D1 | **Sistema de Promociones en servicios** | `PromoCard`, `PromoModal`, `PromoBanner` + hooks. Agrega valor visual |
| D2 | **Campo `isPromo` en formulario de servicio** | Marcar servicios con descuento activo |

### ⚪ IGNORAR (específico de ZM Lash)

| ID | Cambio | Razón |
|----|--------|-------|
| X1 | `ValidacionPagosScreen.tsx` | Workflow muy específico de Vanessa / ZM |
| X2 | `PromoMasivaScreen.tsx` + `HistorialPromosScreen.tsx` | Broadcast WhatsApp — infraestructura específica de ZM |
| X3 | `usePromoBroadcast.ts`, `useClientesSegmento.ts` | Dependencias del sistema WhatsApp de ZM |
| X4 | `@zm/policies-text` | Textos legales en español de ZM |
| X5 | Web (Sanity CMS de ZM) | Landing específica para Vanessa |

---

## PASO 3 — Plan de Implementación

### Secuencia recomendada

```
C3 (Auth real) → C1+C2 (format.ts) → Fase 6 (tenant_settings) → I2 (Packs UI) → I1 (Clientes avanzados) → I3 (AsignarEmpleado) → D1 (Promos)
```

---

### 🔴 C3 — AuthContext: Supabase Auth real
**Complejidad: Complejo**

**Descripción:** Reemplazar `DEV_PROFILE` hardcodeado con el flujo completo de Supabase Auth de ZM Lash: manejo de race conditions, `onAuthStateChange` con debounce, timeout de inicialización.

**Archivos a modificar:**
- `apps/mobile/contexts/AuthContext.tsx` — reemplazar lógica dev con la de ZM Lash

**Consideraciones especiales:**
- Conservar la interfaz del `AuthContext` de SalonPro (compatible con `TenantProvider`)
- ZM Lash calcula `isAdmin` desde `profile.role` — mantener ese patrón
- Verificar que no queden referencias a `DEV_PROFILE` en otros screens

---

### 🔴 C1 + C2 + I4 — Utilidades de formato (`lib/format.ts`)
**Complejidad: Medio**

**Descripción:** Crear `apps/mobile/lib/format.ts` tenant-aware que consolide las funciones de `lima-time.ts` y `utils/format.ts` de ZM Lash, pero usando `config.locale` en lugar de valores hardcodeados.

**Archivos a crear/modificar:**
- `apps/mobile/lib/format.ts` ← **NUEVO** — reemplaza `lima-time.ts` + `utils/format.ts` de ZM
- `apps/mobile/screens/DashboardScreen.tsx` — actualizar imports de fecha
- `apps/mobile/screens/AgendaScreen.tsx` — actualizar imports de fecha

**Equivalencias de migración:**

| ZM Lash | SalonPro (nuevo) | Config key |
|---------|-----------------|------------|
| `fmtSoles(n)` | `formatCurrency(n, config.locale.currency)` | `locale.currency.symbol` |
| `getLimaTodayRange()` | `getTodayRange(config.locale.timezone)` | `locale.timezone` |
| `formatHour12(date)` | `formatHour12(date, config.locale.language)` | `locale.language` |
| `formatDateShort(date)` | `formatDateShort(date, config.locale.timezone)` | `locale.timezone` |
| `normalizePhone(s)` | `normalizePhone(s)` — sin cambios | — |
| `normalizeName(s)` | `normalizeName(s)` — sin cambios | — |
| `filterPriceInput(s)` | `filterPriceInput(s, config.locale.currency)` | `locale.currency` |

---

### 🟡 I2 — Sistema de Packs (UI completa)
**Complejidad: Medio**

**Descripción:** El schema de `packs` ya existe en SalonPro. Portar la UI completa de ZM Lash e integrarla en `ServiciosScreen`.

**Archivos a crear/modificar:**
- `apps/mobile/screens/services/PacksSection.tsx` ← **NUEVO**
- `apps/mobile/screens/services/PackModal.tsx` ← **NUEVO**
- `apps/mobile/hooks/usePacks.ts` ← **NUEVO**
- `apps/mobile/screens/ServiciosScreen.tsx` — integrar `PacksSection`

**Consideraciones especiales:**
- `PackModal` en ZM usa `S/` para precios → reemplazar con `config.locale.currency.symbol`
- Verificar que los campos del schema `packs` en SalonPro son compatibles con la UI de ZM (campos: `packPrice`, `emoji`, `badge`, `displayOrder`)
- Usar `config.terminology.staff` si el pack menciona empleados

---

### 🟡 I1 — Módulo de Clientes Avanzado
**Complejidad: Complejo**

**Descripción:** Portar el módulo completo de clientes de ZM Lash con KPI strip, filtrado avanzado y detalle de cliente.

**Archivos a crear/modificar:**
- `apps/mobile/screens/clients/ClientCard.tsx` ← **NUEVO**
- `apps/mobile/screens/clients/ClientDetailModal.tsx` ← **NUEVO**
- `apps/mobile/screens/clients/ClientFilterBar.tsx` ← **NUEVO**
- `apps/mobile/screens/clients/ClientKPIStrip.tsx` ← **NUEVO**
- `apps/mobile/screens/clients/ClientsHeader.tsx` ← **NUEVO**
- `apps/mobile/screens/clients/ClientAppointmentRow.tsx` ← **NUEVO**
- `apps/mobile/hooks/useClientsData.ts` ← **NUEVO**
- `apps/mobile/hooks/useClientDetail.ts` ← **NUEVO**
- `apps/mobile/screens/ClientsScreen.tsx` — actualizar para usar componentes avanzados

**Consideraciones especiales:**
- "Clientas" → `config.terminology.client` o "Clientes" genérico
- KPIs deben funcionar con cualquier moneda: `config.locale.currency.symbol`
- `useClientesSegmento` no portar — depende del sistema WhatsApp de ZM (X3)

---

### 🟡 I3 — AsignarEmpleadoScreen (genérica)
**Complejidad: Simple**

**Descripción:** Portar `AsignarChicasScreen.tsx` como pantalla genérica para asignar empleado a citas sin asignar.

**Archivos a crear/modificar:**
- `apps/mobile/screens/AsignarEmpleadoScreen.tsx` ← **NUEVO** (renombrar de "Chicas" a "Empleado")
- `apps/mobile/navigation/` — agregar al stack de navegación (rol owner/dev)

**Consideraciones especiales:**
- Título "Asignar Chica" → `"Asignar " + config.terminology.staffSingular`
- Restringir acceso a roles owner/dev

---

### 🟢 D1 — Sistema de Promociones en Servicios
**Complejidad: Medio** *(después de Packs)*

**Descripción:** Portar `PromoCard`, `PromoModal`, `PromoBanner` + hooks `usePromos`, `usePromotionItems`.

**Archivos a crear/modificar:**
- `apps/mobile/screens/services/PromoCard.tsx` ← **NUEVO**
- `apps/mobile/screens/services/PromoModal.tsx` ← **NUEVO**
- `apps/mobile/screens/services/PromoBanner.tsx` ← **NUEVO**
- `apps/mobile/hooks/usePromos.ts` ← **NUEVO**
- `apps/mobile/hooks/usePromotionItems.ts` ← **NUEVO**
- `apps/mobile/screens/ServiciosScreen.tsx` — integrar banners y tarjetas de promo

**Consideraciones especiales:**
- Verificar si el schema de SalonPro tiene tabla de promociones (no confirmado)
- Precios siempre con `config.locale.currency.symbol`

---

### 🟢 D2 — Campo `isPromo` en formulario de servicio
**Complejidad: Simple**

**Descripción:** Agregar campo booleano `isPromo` al formulario de creación/edición de servicio en `ServiciosScreen`.

**Archivos a modificar:**
- `apps/mobile/screens/ServiciosScreen.tsx` — agregar toggle `isPromo`
- `packages/shared-schema/src/schema.ts` — verificar si el campo ya existe en tabla `services`

---

## PASO 4 — Resumen Ejecutivo

### Conteo de cambios por categoría

| Categoría | Cantidad |
|-----------|----------|
| 🔴 CRÍTICO | 3 |
| 🟡 IMPORTANTE | 4 |
| 🟢 DESEABLE | 2 |
| ⚪ IGNORAR | 5 |
| ✅ Ya migrado (Fases 1–5) | ~12 |

### Los 5 cambios más impactantes (orden de prioridad)

1. **🔴 C3 — AuthContext real**: Bloqueador de producción. Sin auth real, SalonPro no puede lanzarse. ZM Lash tiene el código probado con manejo de edge cases.

2. **🔴 C1+C2 — `format.ts` tenant-aware**: Afecta todos los screens con fechas y moneda. Sin esto hay bugs silenciosos de timezone dependiendo del dispositivo del usuario.

3. **🟡 I2 — Sistema de Packs (UI)**: El schema ya está listo. Feature diferenciador visible — pocos SaaS de salones tienen bundles. Trabajo medio con alta visibilidad comercial.

4. **🟡 I1 — Módulo de Clientes Avanzado**: KPI strip + filtrado avanzado transforman SalonPro en herramienta de retención, no solo agenda. Es el feature que más valor aporta al pitch de ventas.

5. **🟡 I3 — AsignarEmpleadoScreen**: Flujo operativo esencial para salones con 3+ empleados. Sin asignación manual, los dueños no pueden gestionar cambios de última hora.

### Relación con la Fase 6 pendiente (`tenant_settings` en Supabase)

- **C3 (AuthContext)** debe completarse **antes** de Fase 6: la tabla `tenant_settings` requiere auth funcionando para testear las RLS policies correctamente.
- La tabla `tenant_settings` podría sincronizar la config de `TenantContext` (hoy solo en AsyncStorage) entre dispositivos del mismo dueño.
- El módulo de **Packs (I2)** requiere que la tabla `packs` tenga políticas RLS correctas — parte del trabajo de Fase 6.
- Los KPIs de **Clientes (I1)** podrían cachear métricas computadas en `tenant_settings`.

### Mapa de genericización: ZM Lash → SalonPro

| ZM Lash (hardcodeado) | SalonPro (dinámico) | Config key |
|----------------------|--------------------|-----------:|
| `S/` | `config.locale.currency.symbol` | `locale.currency.symbol` |
| `#7B2D8E` | `config.theme.primaryColor` | `theme.primaryColor` |
| `#D4AF37` | `config.theme.accentColor` | `theme.accentColor` |
| `40` (comisión %) | `config.commissions.defaultStaffPercent` | `commissions.defaultStaffPercent` |
| `"chicas"` / `"Clientas"` | `config.terminology.staff` | `terminology.staff` |
| Logo ZM | `config.businessName.slice(0,2)` | `businessName` |
| `"America/Lima"` | `config.locale.timezone` | `locale.timezone` |
| `es-PE` | `config.locale.language` | `locale.language` |

### Recomendación general

SalonPro está en excelente forma arquitectónicamente. La genericización multi-tenant de Fases 1–5 es sólida. Los principales riesgos son:

1. **AuthContext en modo dev** — bloqueador absoluto de producción
2. **Ausencia de utilidades de formato** — bugs silenciosos en producción
3. **Features de valor comercial sin portar** — Packs y Clientes avanzados son clave para el pitch de ventas del SaaS

Los cambios marcados como ⚪ IGNORAR (WhatsApp broadcast, ValidacionPagos, policies-text) son 100% específicos de ZM Lash. Si en el futuro SalonPro quiere integración WhatsApp, debe construirse como módulo opcional configurable por tenant.
