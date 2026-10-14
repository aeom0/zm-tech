# Plan 19 — Paridad Geema mobile ↔ web y código compartido

**Fecha:** 2026-10-13
**Estado:** Fase 0 completada; Fase 1 (Web P0) en curso — ver pendientes en Fase 1
**Repos afectados:** `zm-tech` (`apps/geemastudio-web`, `apps/geemastudio-mobile`, `packages/geemastudio-data`)
**Relacionado:** Plan 13 (paridad panel ZM → Geema), Plan 14 (CRM clientes), Plan 15 (retail), Plan 18 (profesionales)

---

## Por qué existe

Los Planes 12 y 13 midieron la paridad ZM → Geema, no la paridad entre las dos apps de Geema. Al cruzar rutas, pantallas y escrituras a Supabase (13-oct) aparecen tres problemas:

1. El panel web es casi solo lectura en lo operativo: la agenda, los clientes y los pagos se ven pero no se pueden crear ni editar.
2. A la web le faltan módulos enteros que la app sí tiene (feriados, validación de pagos, inventario, asignar profesionales, notificaciones), y la app no tiene la bandeja de WhatsApp.
3. La misma lógica de Supabase está escrita dos veces (settings del tenant, Mi Web, catálogo, disponibilidad, empleados, packs y promos). Cada función nueva se hace dos veces y las copias divergen.

## Decisiones

- **Orden:** primero el código compartido, después los huecos de la web y **al final** portar a mobile lo que solo tiene la web.
- **Staff en la web:** sí. El panel web tiene una vista staff (su agenda y sus pagos), como la app.
- **Onboarding:** sigue solo en la app. Se revisa al preparar el 2.º tenant (Plan 17).
- **Regla de código:** toda función de este plan se escribe primero en `@geemastudio/data` y la consumen las dos apps. Al tocar una función que ya existe en una app, se migra al paquete en el mismo PR.

## Matriz de paridad (13-oct-2026)

Esta matriz es la fuente de verdad. Cada fila termina como **Ambas**, **Solo web (a propósito)** o **Solo móvil (a propósito)**.

### Ya en ambas

Catálogo (servicios, categorías, packs, promos), ventas de productos, Personal (alta y edición, horarios, ausencias, coberturas, servicios por profesional), horario del negocio, configuración general (datos, país, moneda, recargo POS, colores, logo, tasas), Mi Web (8 secciones), Mi plan, Ayuda, Finanzas ejecutiva y pagos a profesionales.

### Faltan en web

| ID  | Función                                                                                                                                                                                                                             | Fuente en mobile                                                                                                                                                                                             | Fase |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| W1  | Agenda con escritura: crear cita (multi-servicio + `appointment_services`), editar, reprogramar, cancelar con motivo, cambiar estado, completar con pago (gate de abono), chequeo de disponibilidad, bandeja de referencias (fotos) | `screens/agenda/hooks/useAgendaMutations.ts`, `useAvailabilityCheck.ts`, `hooks/useAppointmentCompletion.ts`, `components/NewAppointmentModal.tsx`, `CancelAppointmentModal.tsx`, `ReferencesInboxSheet.tsx` | 1    |
| W2  | Clientes: alta, edición, contacto por WhatsApp o llamada, orden                                                                                                                                                                     | `screens/clients/hooks/useClientsMutations.ts`, `ClientFormModal.tsx`, `utils/phoneContact.ts`, `lib/clientFields.ts`, `lib/clientLink.ts`                                                                   | 1    |
| W3  | Finanzas: registrar, editar y borrar pagos (incluye Bs), gastos operativos, historial de pagos                                                                                                                                      | `screens/finances/hooks/usePaymentForm.ts`, `services/expenses.ts`, `PaymentModal.tsx`, `ExpenseModal.tsx`, `lib/payments-ves.ts`, `lib/pos-fee.ts`                                                          | 1    |
| W9  | Vista staff: «Mi turno», «Mis pagos», navegación filtrada por rol                                                                                                                                                                   | `MoreHomeScreen.tsx`, `more/FinanzasMenuScreen.tsx` (`isAdmin`). La web ya tiene `useAuth()` con `role` e `isAdmin` en `contexts/AuthContext.tsx`, pero no los usa para filtrar                              | 1    |
| W5  | Feriados y días especiales (apertura tardía) + aviso de feriado                                                                                                                                                                     | `screens/holidays/*`, `hooks/useSalonHolidays.ts`, `components/HolidayAlertBanner.tsx`; la lógica ya está en `@zmtech/tenant-config` (`salon-holidays`)                                                      | 2    |
| W4  | Validación de pagos (`appointment_verifications`, adelanto perdido)                                                                                                                                                                 | `screens/validacion/*`, `ValidacionPagosScreen.tsx`                                                                                                                                                          | 2    |
| W7  | Asignar profesionales a citas sin asignar, sugiriendo solo elegibles                                                                                                                                                                | `screens/asignar/*`, `screens/personal/lib/serviceEligibility.ts`                                                                                                                                            | 2    |
| W6  | Inventario: stock, `adjust_inventory_quantity`, movimientos, categorías, stock bajo. La web hoy solo tiene el catálogo vendible (`panel/servicios/_components/productos`)                                                           | `screens/inventory/*`                                                                                                                                                                                        | 2    |
| W8  | Notificaciones: campana y contador de citas pendientes                                                                                                                                                                              | `components/NotificationsBell.tsx`, `AgendaNotifications.tsx`, `hooks/usePendingBadgeCount.ts`                                                                                                               | 2    |
| W10 | Promo masiva por WhatsApp e historial (`send-promo-whatsapp`). Distinta de «Campañas» web, que configura anuncios Meta Ads                                                                                                          | `screens/promos/*`                                                                                                                                                                                           | 3    |
| W11 | Reordenar servicios                                                                                                                                                                                                                 | `screens/services/components/ReorderServicesModal.tsx`                                                                                                                                                       | 3    |
| W12 | Dashboard: stock bajo, top servicios, próximas citas                                                                                                                                                                                | `screens/dashboard/components/*`                                                                                                                                                                             | 3    |

### Faltan en mobile (última fase)

| ID  | Función                                                                    | Fuente en web                                                                                      | Fase |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| M1  | Bandeja de WhatsApp: leer, responder, bloquear números                     | `hooks/waba/useWabaMessages.ts`, `useWabaSend.ts`, `useWabaModeration.ts`, `panel/waba/mensajes/*` | 4    |
| M2  | Tarjeta de estado del WABA (solo lectura)                                  | `hooks/waba/useWabaStatus.ts`                                                                      | 4    |
| M3  | Gráficos ejecutivos extra: punto de equilibrio, mezcla de ventas, utilidad | `finanzas/components/executive/*`                                                                  | 4    |

### A propósito en una sola app

- **Solo web:** Asistente IA (prompt, saludo, palabras clave, números bloqueados), Reglas, Simulador, Portafolio, Campañas Meta Ads, Historial WABA. La app enlaza a la web para estas.
- **Solo móvil:** onboarding, acceso biométrico, actualizaciones OTA, modo demo.

## Fases

### Fase 0 — Paquete `@geemastudio/data` (completada)

Paquete nuevo en `packages/geemastudio-data`, con el mismo patrón que `@zmtech/tasas` y `@geemastudio/shared-schema` (TypeScript fuente, `main: ./src/index.ts`, sin build). Organizado por dominio (`src/<dominio>/`):

- **Servicios puros** que reciben `SupabaseClient` como primer argumento (`createAppointment(client, input)`, `cancelAppointment`, `listClients`, `upsertExpense`, …). Sin React, sin `Alert` de React Native y sin `next/*`.
- **Mappers** de fila a modelo y armado de payloads de escritura.
- **Query keys** de TanStack Query (las dos apps usan v5).
- **Sin hooks:** las versiones de React difieren (web 19.1, mobile 19.2.3). Cada app mantiene hooks finos sobre los servicios.
- Reusar lo que ya está compartido y no duplicarlo: `@geemastudio/shared-schema/utils` (`availability`, `cancel-reasons`, `payroll`, `plans`) y `@zmtech/tenant-config` (`salon-holidays`, `working-schedule`, `appointment-wallclock`).

Primera tanda de extracción, migrando las dos apps en el mismo PR:

| Dominio                    | Mobile                                                                                                 | Web                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Settings del tenant        | `services/tenantSettingsService.ts`                                                                    | `hooks/configuracion/tenantSettingsService.ts`                 |
| Mi Web                     | `services/webSettingsService.ts`                                                                       | `hooks/web-config/webSettingsService.ts`                       |
| Catálogo                   | `screens/services/lib/catalogAdapter.ts`                                                               | `hooks/servicios/catalogAdapter.ts`                            |
| Disponibilidad y empleados | `screens/personal/lib/availabilityAdapter.ts`, `employeesAdapter.ts`                                   | `hooks/personal/availabilityService.ts`, `employeesService.ts` |
| Packs, promos, productos   | `screens/services/hooks/usePacksData.ts`, `usePromosData.ts`, `screens/sales/hooks/useProductSales.ts` | `panel/servicios/_services/*`                                  |
| Rol y perfil               | `contexts/AuthContext.tsx` (`Role`, `isAdmin`)                                                         | `contexts/AuthContext.tsx`                                     |

También en esta fase:

- Agregar la regla de código compartido a `.cursor/skills/geemastudio-dev/SKILL.md`.
- Crear una cita hoy es un insert en `appointments` seguido de un insert en `appointment_services`, con borrado manual si el segundo falla (`createAppointment` en `@geemastudio/data`). Pendiente: evaluar pasarlo a una RPC transaccional (migración Geema alineada 1:1 con `schema_migrations`).

Resultado: dominios `auth`, `tenant-settings`, `web-settings`, `catalog` (dialectos `zm`/`geema`, packs, promos, productos) y `personal` (empleados y disponibilidad), con query keys compartidas. Las dos apps delegan en el paquete y la regla quedó en `.cursor/skills/geemastudio-dev/SKILL.md`.

### Fase 1 — Web P0: operación diaria (en curso)

W1 agenda con escritura, W2 clientes, W3 pagos y gastos, W9 vista staff.

**Hecho (14-oct-2026)**

- `@geemastudio/data` suma los dominios `clients` (alta, edición, validación de teléfono, documento y correo por país, vínculo cita ↔ cliente), `agenda` (crear multi-servicio, reprogramar, editar líneas, cancelar con motivo, completar, guardia de solapes, fotos de referencia) y `finances` (pagos con campos Bs, gastos operativos, métodos de pago por país, gate de completar cita con abono).
- Mobile migrado: `useAgendaMutations`, `useAppointmentCompletion`, `useClientsMutations`, `usePaymentForm`, gastos, `payments-ves` y métodos de pago delegan en el paquete. Ya no hay lógica de escritura duplicada entre apps en estos dominios.
- Web, W1: nueva cita (multi-servicio, fecha en la zona del negocio), reprogramar (solo la hora; el choque se valida contra todos los profesionales de la cita), cancelar con motivo, registrar pago y completar con el mismo gate que la app (abono parcial bloquea; sin pago pide cobrar el saldo), saldo pagado/pendiente en el drawer, subida de fotos de referencia.
- Web, W2: alta y edición de clientes con el país del tenant.
- Web, W3: registrar pagos (métodos según país, saldo pendiente sugerido, Pago Móvil en Bs con la tasa vigente) y gastos operativos (categorías del paquete, mes en la zona del negocio). Un gasto repetido (misma categoría, descripción y mes) ahora da error en vez de sobrescribirse.
- Web, W9: navegación por rol (nada visible mientras carga el perfil; «Más» filtra módulos de admin para staff) y «Mis pagos» por `employee_id`.
- Tests del paquete: 30 en verde (5 archivos).

**Pendiente para cerrar Fase 1**

- W1: editar servicios y profesionales de una cita existente (`updateAppointmentServices` ya está en el paquete), cambiar estado (confirmar, no-show), chequeo de disponibilidad al elegir hora (`useAvailabilityCheck`) y bandeja de referencias (`ReferencesInboxSheet`, `markReferencesReviewed`).
- W3: editar y borrar pagos (`updatePayment` y `deletePayment` ya están en el paquete), elegir moneda USD/Bs al cobrar en VE, historial de pagos y repartir un pago en servicio + producto (ROADMAP pendiente #4).
- Smoke manual W1: verificar la fila en `appointment_audit` al crear, reprogramar y cancelar desde la web.
- Smoke con usuario owner y staff en `geema.zmtechdev.com`.

### Fase 2 — Web P1: administración

W5 feriados, W4 validación de pagos, W7 asignar profesionales (solo elegibles, ROADMAP pendiente #8), W6 inventario completo, W8 notificaciones.

### Fase 3 — Web P2

W10 promo masiva (después de cerrar el envío real, ROADMAP pendiente #6), W11 reordenar servicios, W12 dashboard.

### Fase 4 — Mobile

M1 bandeja de WhatsApp (con las notificaciones push existentes como entrada), M2 estado del WABA, M3 gráficos ejecutivos. Enlace «Abrir en la web» para las funciones solo web.

## Criterio de cierre

- Cada fila de la matriz queda en **Ambas**, **Solo web (a propósito)** o **Solo móvil (a propósito)**.
- Ninguna lógica de Supabase de las funciones de este plan queda duplicada entre `apps/geemastudio-web` y `apps/geemastudio-mobile`.

## Verificación por fase

- `pnpm check:types` y `pnpm lint` en web, mobile y `@geemastudio/data`.
- Tests con vitest de los servicios puros del paquete (cliente Supabase simulado).
- Smoke manual en `geema.zmtechdev.com` con un usuario owner y uno staff; smoke en APK para lo que se migra en mobile.
- W1: verificar la fila en `appointment_audit` al crear, reprogramar y cancelar desde la web.
