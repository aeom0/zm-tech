# ROADMAP SalonPro (2026)

## Objetivo

Convertir SalonPro en una plataforma SaaS multi-tenant estable, segura y escalable para salones en LATAM, priorizando:  
1) confiabilidad operativa diaria, 2) seguridad/auth real, 3) velocidad de producto, 4) calidad de ingeniería.

---

## Principios de ejecución

- Priorizar impacto de negocio y reducción de riesgo técnico.
- Entregar en incrementos pequeños, con criterios de aceptación claros.
- Evitar regresiones con quality gates (lint, typecheck, tests críticos).
- Mantener consistencia multi-tenant (moneda, terminología, branding, permisos).

---

## Estado actual (resumen)

- Monorepo funcional con `apps/mobile`, `apps/web`, `packages/shared-schema`, `packages/tenant-config`.
- Funcionalidades core implementadas: onboarding, agenda, servicios, clientes, inventario, finanzas, dashboard web.
- Riesgos principales detectados:
  - Auth móvil en modo desarrollo (sin enforcement real de sesión/roles de Supabase).
  - Inconsistencias de defaults entre `tenant-config` y `tenant_settings`.
  - Pantallas/hook críticos con complejidad alta y manejo de errores mejorable.
  - Cobertura de testing/CI insuficiente para escalar sin regresiones.

---

## Fase 0 - Estabilización crítica (0 a 2 semanas)

### Prioridad P0

1. **Autenticación real en mobile**
   - Reemplazar login mock por Supabase Auth real.
   - Enlazar correctamente sesión, perfil (`profiles`) y control de roles.
   - Asegurar que flujos protegidos no dependan de estado local inseguro.

2. **Corrección de riesgo de hidratación de tema**
   - Garantizar que `ThemeContext` siempre provea provider antes de renderizar consumidores.
   - Evitar crashes intermitentes al iniciar la app.

3. **Consistencia multi-tenant de defaults**
   - Unificar comisión staff/casa, terminología y locale entre:
     - `packages/tenant-config`
     - `tenant_settings` (schema/DB)
   - Definir una única fuente de verdad para defaults.

4. **Validación operativa de citas**
   - Implementar validación de disponibilidad al crear/reprogramar citas.
   - Evitar solapamientos y conflictos de agenda.

### Criterios de aceptación

- Usuario real puede iniciar/cerrar sesión en mobile y web con el mismo comportamiento de permisos.
- No hay crasheos de arranque relacionados con tema/context.
- Defaults visibles en onboarding/settings coinciden con datos persistidos en DB.
- Intentos de doble reserva son bloqueados con feedback claro en UI.

---

## Fase 1 - Calidad base y confianza de release (2 a 6 semanas)

### Prioridad P0/P1

1. **Pipeline CI mínimo obligatorio**
   - Crear workflows para PR con:
     - `yarn lint`
     - typecheck real de workspaces (`apps/*`, `packages/*`, `server`)
     - build web
   - Fallo de checks bloquea merge.

2. **Estrategia de migraciones versionadas**
   - Formalizar uso de migraciones Drizzle versionadas en repo.
   - Reducir dependencia de `db:push` directo en entornos compartidos.

3. **Manejo de errores robusto**
   - Mejorar hooks de datos críticos (`dashboard`, `finanzas`, módulos mobile).
   - Mostrar estados de error/reintento en UI (no silenciosos).

4. **Estandarización de query keys**
   - Definir convención única y migrar módulos con naming inconsistente.
   - Asegurar invalidaciones predecibles.

### Criterios de aceptación

- Toda PR dispara checks automáticos y reporta resultados.
- Cambios de DB quedan trazables por migración.
- Pantallas críticas tienen UX clara en error/timeout/retry.
- Mutaciones invalidan caché de forma consistente.

---

## Fase 2 - Escalabilidad funcional (6 a 10 semanas)

### Prioridad P1

1. **Refactor de módulos de alta complejidad**
   - Partir pantallas monolíticas (especialmente finanzas mobile) en:
     - hooks de negocio
     - componentes presentacionales
     - utilidades puras tipadas

2. **Optimización de consultas**
   - Reducir trabajo pesado en cliente cuando sea posible.
   - Mejorar filtros, agregaciones y payload para módulos de clientes/finanzas/dashboard.
   - Resolver desfase por timezone en dashboard web.

3. **Limpieza de legado**
   - Eliminar/aislar navegación y pantallas legacy no usadas.
   - Corregir naming técnico inconsistente (ejemplo: typos heredados de presets).

4. **Consistencia de branding y copy**
   - Remover textos legacy de marca anterior en web/finanzas.
   - Alinear terminología al modelo multi-tenant configurable.

### Criterios de aceptación

- Reducción de complejidad en módulos críticos (archivos más pequeños y testeables).
- Mejora medible de tiempo de carga y/o menor cantidad de consultas pesadas.
- Sin referencias legacy en interfaces públicas.

---

## Fase 3 - Madurez de producto (10 a 16 semanas)

### Prioridad P1/P2

1. **Testing por capas**
   - Unit tests: utilidades y reglas de negocio clave.
   - Integración: hooks de datos/mutaciones con casos críticos.
   - E2E/smoke: auth, onboarding, agenda y dashboard.

2. **Notificaciones push completas**
   - Persistencia de token.
   - Flujo end-to-end validado para casos de negocio prioritarios.

3. **Web growth + experiencia**
   - SEO técnico completo (sitemap, robots, metadata mejorada, structured data).
   - Mejoras de accesibilidad en tabs, acordeones y tablas.
   - Ajustes de performance en landing (hidratar solo lo necesario).

4. **Normalización de dependencias y DX**
   - Alinear versiones transversales (TypeScript, Supabase JS, pg, ESLint stack).
   - Endurecer scripts de salud del monorepo (`ci:*`, validaciones rápidas locales).

### Criterios de aceptación

- Cobertura mínima definida para dominios críticos y ejecutada en CI.
- Notificaciones funcionando de punta a punta en ambientes de prueba.
- Mejoras SEO/a11y validadas con herramientas automáticas y revisión manual.

---

## Backlog continuo (siempre activo)

- Observabilidad funcional (errores de UI y fallas de red) con priorización semanal.
- Revisión de RLS y permisos por rol ante cada nueva feature.
- Performance budget para pantallas y rutas críticas.
- Hardening de TypeScript (reducir `any` y casts inseguros).

---

## Métricas de éxito (KPIs de ingeniería y producto)

- **Confiabilidad**
  - Caída de errores críticos en producción.
  - Menor tasa de fallos en flujos auth/onboarding/agenda.

- **Velocidad de entrega**
  - Lead time PR -> deploy.
  - Porcentaje de PRs que pasan CI en primer intento.

- **Calidad**
  - Cobertura en módulos críticos.
  - Disminución de regresiones reportadas por versión.

- **Experiencia de usuario**
  - Menor fricción en login y agenda.
  - Mejora en tiempos de carga de dashboard y finanzas.

---

## Orden sugerido de PRs (primer mes)

1. PR-01: Auth real mobile + ajustes de permisos.
2. PR-02: Fix ThemeContext hydration + hardening de arranque.
3. PR-03: Unificación de defaults tenant-config/DB.
4. PR-04: Validación anti-solapamiento de citas.
5. PR-05: CI básico + typecheck completo de workspaces.
6. PR-06: Migraciones versionadas + guía operativa mínima en scripts existentes.
7. PR-07: Error handling dashboard/finanzas.
8. PR-08: Convención de query keys + migración inicial.

---

## Notas de gestión

- Este roadmap prioriza reducción de riesgo antes de expansión funcional.
- Cada fase puede replanificarse semanalmente según hallazgos de producción.
- Si una tarea P0 queda incompleta, no se recomienda avanzar de fase.
