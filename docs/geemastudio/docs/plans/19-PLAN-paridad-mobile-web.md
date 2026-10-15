# Plan 19 — Paridad Geema mobile ↔ web y código compartido

**Fecha:** 2026-10-13
**Estado:** Fases 0–3 completadas (W10 el 15-oct-2026). Faltan el smoke manual en `geema.zmtechdev.com`, la Fase 3b (W13 alta de negocio en la web y PWA) y la Fase 4 (mobile)
**Repos afectados:** `zm-tech` (`apps/geemastudio-web`, `apps/geemastudio-mobile`, `packages/geemastudio-data`)
**Relacionado:** Plan 13 (paridad panel ZM → Geema), Plan 14 (CRM clientes), Plan 15 (retail), Plan 17 (planes y trial), Plan 18 (profesionales)

---

## Por qué existe

Los Planes 12 y 13 midieron la paridad ZM → Geema, no la paridad entre las dos apps de Geema. Al cruzar rutas, pantallas y escrituras a Supabase (13-oct) aparecen tres problemas:

1. El panel web es casi solo lectura en lo operativo: la agenda, los clientes y los pagos se ven pero no se pueden crear ni editar.
2. A la web le faltan módulos enteros que la app sí tiene (feriados, validación de pagos, inventario, asignar profesionales, notificaciones), y la app no tiene la bandeja de WhatsApp.
3. La misma lógica de Supabase está escrita dos veces (settings del tenant, Mi Web, catálogo, disponibilidad, empleados, packs y promos). Cada función nueva se hace dos veces y las copias divergen.

## Decisiones

- **Orden:** primero el código compartido, después los huecos de la web y **al final** portar a mobile lo que solo tiene la web.
- **Staff en la web:** sí. El panel web tiene una vista staff (su agenda y sus pagos), como la app.
- **Onboarding y alta de negocio:** pasan a la web (decisión del 15-oct-2026, antes el onboarding era solo de la app). Un negocio nuevo se crea solo desde la web, sin descargar el APK ni pasar por una tienda. La PWA es el canal principal y el APK queda como opción. Es W13, en la Fase 3b.
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
| W13 | Alta de negocio self-service (cuenta del dueño, tenant y trial) y onboarding (rubro, datos y colores, servicios, equipo), más instalación de la PWA. Hoy la app no crea negocios: pide una cuenta que ya tiene tenant | `screens/onboarding/*`, `contexts/TenantContext.tsx` (`markConfigured`), `services/onboardingEmployeesService.ts` | 3b   |

### Faltan en mobile (última fase)

| ID  | Función                                                                    | Fuente en web                                                                                      | Fase |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| M1  | Bandeja de WhatsApp: leer, responder, bloquear números                     | `hooks/waba/useWabaMessages.ts`, `useWabaSend.ts`, `useWabaModeration.ts`, `panel/waba/mensajes/*` | 4    |
| M2  | Tarjeta de estado del WABA (solo lectura)                                  | `hooks/waba/useWabaStatus.ts`                                                                      | 4    |
| M3  | Gráficos ejecutivos extra: punto de equilibrio, mezcla de ventas, utilidad | `finanzas/components/executive/*`                                                                  | 4    |

### A propósito en una sola app

- **Solo web:** Asistente IA (prompt, saludo, palabras clave, números bloqueados), Reglas, Simulador, Portafolio, Campañas Meta Ads, Historial WABA. La app enlaza a la web para estas.
- **Solo móvil:** acceso biométrico, actualizaciones OTA, modo demo.
- **Distribución:** la PWA es el canal principal para negocios nuevos; el APK queda como opción (Plan 17 F5).

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
- Crear una cita es una sola transacción: `createAppointment` en `@geemastudio/data` llama a la RPC `create_appointment_with_services` (migración `20261015134627`, `SECURITY INVOKER`, mismas políticas RLS que los inserts directos). Antes eran dos inserts con borrado manual si el segundo fallaba.

Resultado: dominios `auth`, `tenant-settings`, `web-settings`, `catalog` (dialectos `zm`/`geema`, packs, promos, productos) y `personal` (empleados y disponibilidad), con query keys compartidas. Las dos apps delegan en el paquete y la regla quedó en `.cursor/skills/geemastudio-dev/SKILL.md`.

### Fase 1 — Web P0: operación diaria (completada)

W1 agenda con escritura, W2 clientes, W3 pagos y gastos, W9 vista staff.

**Hecho (14-oct-2026)**

- `@geemastudio/data` suma los dominios `clients` (alta, edición, validación de teléfono, documento y correo por país, vínculo cita ↔ cliente), `agenda` (crear multi-servicio, reprogramar, editar líneas, cancelar con motivo, completar, guardia de solapes, fotos de referencia) y `finances` (pagos con campos Bs, gastos operativos, métodos de pago por país, gate de completar cita con abono).
- Mobile migrado: `useAgendaMutations`, `useAppointmentCompletion`, `useClientsMutations`, `usePaymentForm`, gastos, `payments-ves` y métodos de pago delegan en el paquete. Ya no hay lógica de escritura duplicada entre apps en estos dominios.
- Web, W1: nueva cita (multi-servicio, fecha en la zona del negocio), reprogramar (solo la hora; el choque se valida contra todos los profesionales de la cita), cancelar con motivo, registrar pago y completar con el mismo gate que la app (abono parcial bloquea; sin pago pide cobrar el saldo), saldo pagado/pendiente en el drawer, subida de fotos de referencia.
- Web, W2: alta y edición de clientes con el país del tenant.
- Web, W3: registrar pagos (métodos según país, saldo pendiente sugerido, Pago Móvil en Bs con la tasa vigente) y gastos operativos (categorías del paquete, mes en la zona del negocio). Un gasto repetido (misma categoría, descripción y mes) ahora da error en vez de sobrescribirse.
- Web, W9: navegación por rol (nada visible mientras carga el perfil; «Más» filtra módulos de admin para staff) y «Mis pagos» por `employee_id`.
- Tests del paquete: 30 en verde (5 archivos).

**Cierre (14-oct-2026)**

- W1: editar servicios y profesionales de una cita existente, confirmar asistencia y marcar no-show, chequeo de disponibilidad al elegir hora (nueva cita, reprogramar, editar servicios) y bandeja de fotos de referencia (abre la cita desde la campana; al verlas se marcan revisadas).
- W3: editar y borrar pagos desde el drawer, elegir USD/Bs al cobrar en VE, historial de pagos de la cita y repartir un pago completo en servicio + producto (ROADMAP pendiente #4). La validación y el armado de filas viven en `buildPaymentRows` del paquete, que también usa mobile.

**Pendiente (manual)**

- Smoke W1: verificar la fila en `appointment_audit` al crear, reprogramar y cancelar desde la web.
- Smoke con usuario owner y staff en `geema.zmtechdev.com`.

### Fase 2 — Web P1: administración

W5 feriados, W4 validación de pagos, W7 asignar profesionales (solo elegibles, ROADMAP pendiente #8), W6 inventario completo, W8 notificaciones.

**Hecho (14-oct-2026)**

- Paquete: dominios `holidays`, `verifications` e `inventory`; `operationsService` (confirmar, no-show, asignar, ventana de asignación, citas sin asignar, referencias sin revisar) y `availabilityCheck`. Mobile usa los mismos servicios y las mismas query keys para los badges.
- W5: `/panel/feriados` (días cerrados y apertura tardía) y aviso de feriado en la agenda.
- W4: `/panel/validacion` con pendientes, aprobados y rechazados, y marca de adelanto perdido.
- W7: `/panel/asignar` con próximas y pasadas (7 días); el selector solo ofrece profesionales que hacen todos los servicios de la cita ese día, y si nadie califica no filtra.
- W6: `/panel/inventario` con stock, ajuste ±1 (`adjust_inventory_quantity`), movimientos recientes, categorías del rubro más las propias y filtro de stock bajo.
- W8: campana en el panel (comprobantes, citas sin asignar, fotos de referencia nuevas) y badges en la navegación.

### Fase 3 — Web P2

W10 promo masiva (después de cerrar el envío real, ROADMAP pendiente #6), W11 reordenar servicios, W12 dashboard.

**Hecho (14-oct-2026)**

- W11: reordenar categorías y servicios desde el catálogo web. Web lista los servicios con `fetchCatalogServices` (orden manual `sort_order`), igual que mobile y el bot.
- W12: Inicio de la web con ingresos, completadas, por atender y stock bajo del día, pendientes del dueño, próximas citas de hoy y servicios más pedidos (mes o siempre). Los datos viven en `dashboard/` del paquete (`fetchDashboardStats`, `fetchCompletedServiceRefs`, `computeTopServices`) y mobile los usa.
- Tests del paquete: 47 en verde (6 archivos).

**Hecho (15-oct-2026)**

- W10: `/panel/waba/promos` (pestaña «Promos» del WABA) con asistente de 3 pasos (mensaje e imagen, clientas, vista previa), progreso del envío, resultado con fallidas e historial con borrado. La lógica vive en `promos/` del paquete (`fetchPromoSegment`, `uploadPromoImage`, `createPromoBroadcast`, `sendPromoBroadcast`, `waitForPromoBroadcast`, `listPromoBroadcasts`, `deletePromoBroadcast`) y mobile la usa.
- El segmento filtra por `tenant_id` en todas las consultas y excluye bloqueados y `marketing_opt_out` (mobile no lo hacía). El borrado elimina primero los ítems (no hay FK a `promo_broadcasts`) y la imagen de Storage.
- `send-promo-whatsapp` responde CORS (preflight `OPTIONS`) para poder llamarse desde el navegador.
- El envío real ya estaba probado en prod (21-sep y 6-oct-2026, 279 enviadas sin fallas, creadas con service role). Falta el primer envío desde el asistente con la sesión del dueño (QA solo a `51999000978`–`999`).
- Tests del paquete: 70 en verde (10 archivos).

### Fase 3b — Alta de negocio en la web y PWA

W13. Un dueño entra a la landing, crea su cuenta y su negocio, configura lo básico e instala la PWA, sin APK y sin tienda.

**Punto de partida (15-oct-2026)**

- No hay alta de negocios. El onboarding de la app pide iniciar sesión con una cuenta que ya tiene tenant.
- El hook `custom_access_token_hook` lanza `profile_missing_tenant_id` si el perfil no tiene tenant. Por eso un `signUp` desde el cliente no sirve: el tenant y el perfil se crean en el servidor antes del primer login.
- No hay trigger en `auth.users`. `tenants` ya tiene `plan_code`, `subscription_status` y `trial_ends_at` (Plan 17).
- La PWA ya existe: manifest por tenant (`app/manifest.webmanifest/route.ts`), `public/sw.js` y `PwaRegister`. Falta invitar a instalarla.
- «Empezar gratis» en la landing lleva a `#precios` y no a un registro.
- `markConfigured` en mobile ignora un error de RLS y marca el negocio como configurado solo en el teléfono (AsyncStorage). La web no puede ver esa marca.

**Decisiones (15-oct-2026)**

- El dueño entra apenas se registra y confirma el correo después. Hasta confirmarlo ve un aviso, y la conexión de WhatsApp y las promos masivas quedan bloqueadas.
- Un negocio nuevo arranca en Pro con 14 días de trial (`subscription_status = trial`, `trial_ends_at = now() + 14 días`). Al vencer se avisa sin bloqueo duro, como en el Plan 17.
- Anti-abuso sin servicios externos: límite de altas por IP y por correo en la Edge Function. Turnstile se puede sumar después.

**Base de datos (migración)**

- `tenants.onboarding_completed_at` (null = falta configurar). Backfill con `now()` para los tenants existentes. Reemplaza la marca de AsyncStorage en las dos apps.
- Marca de correo confirmado del dueño (columna en `tenants` o `profiles`, se define al implementar).
- Tabla `signup_attempts` (hash de IP, hash de correo, fecha), solo para `service_role`.
- RPC `create_tenant_for_owner` (`SECURITY DEFINER`, ejecutable solo por `service_role`): en una transacción crea `tenants` (slug único a partir del nombre), `profiles` (rol `owner`) y `tenant_settings` (preset del rubro y moneda y zona horaria del país).
- `get_advisors` de seguridad después de aplicarla.

**Edge Function `signup-tenant`**

- Pública (`verify_jwt = false`), con CORS. Va a la matriz de `edge-functions.yml`.
- Recibe nombre del dueño, correo, contraseña, nombre del negocio, rubro y país. Valida y aplica el límite por IP y por correo.
- Crea el usuario con `auth.admin.createUser` y llama a `create_tenant_for_owner`. Si la RPC falla, borra el usuario para no dejar cuentas sin tenant.
- El cliente inicia sesión con correo y contraseña. El JWT ya trae `tenant_id`.
- El usuario se crea confirmado para Supabase (`email_confirm: true`) para que pueda entrar enseguida. La confirmación del correo es nuestra: `email_verified_at` vacío hasta que el dueño la complete.

**Confirmación del correo (código de 6 dígitos)**

- Con un código y no con un enlace: un enlace se abre en el navegador y no en la PWA instalada, y deja dos sesiones.
- En el panel, el aviso «Confirma tu correo» llama a `signInWithOtp({ email, shouldCreateUser: false })`. El dueño escribe el código ahí y `verifyOtp` lo valida. Una RPC marca `email_verified_at` solo si la sesión viene de un OTP (`amr` del JWT).
- La plantilla «Magic Link» de Supabase Auth se cambia para mostrar `{{ .Token }}` en vez del enlace. Se hace al implementar.
- Envío: SMTP propio de Supabase Auth con Resend (`smtp.resend.com:465`, remitente `GeemaStudio <no-responder@zmtechdev.com>`), configurado el 15-oct-2026. Dominio `zmtechdev.com` verificado en la cuenta de Resend de `alberto@zmtechdev.com` (DNS en Vercel, DMARC `p=none`). Límite de Auth: 30 correos por hora. Resend gratis: 3.000 al mes y 100 al día.
- El mismo SMTP sirve para «Olvidé mi contraseña», que entra en esta fase.

**Paquete `@geemastudio/data`, dominio `onboarding/`**

- `signupTenant` (llama a la Edge Function), guardado de cada paso (datos y colores, categorías iniciales del rubro, equipo) y `completeOnboarding` (fija `onboarding_completed_at`). Los errores se muestran y no se ignoran.
- Mobile migra `markConfigured` y `onboardingEmployeesService` al paquete. «Crear nuevo negocio» en la app usa el mismo alta: primero la cuenta y después el wizard.

**Web**

- `/registro`: alta de cuenta y negocio. Los CTA «Empezar gratis» de la landing llevan aquí.
- `/onboarding`, fuera de `/panel`: rubro, datos y colores, servicios y equipo, con el progreso guardado en la BD. Un owner con `onboarding_completed_at` null entra aquí al iniciar sesión. Staff nunca lo ve.
- Pantalla final con «Instalar la app»: `beforeinstallprompt` en Android y escritorio, e instrucciones de «Compartir → Agregar a inicio» en iOS Safari.
- Banner de instalación en el panel mientras no esté instalada (`display-mode: standalone`). Se puede descartar y el descarte se recuerda.
- Manifest con `start_url` en `/panel` para el dueño.

**Fuera de alcance**

- Cobro y checkout (siguen fuera, como en el Plan 17).
- Notificaciones push web. En iOS solo funcionan con la PWA instalada; se evalúa aparte.
- Invitar staff por correo desde el onboarding.

**Verificación**

- Alta completa con un correo de prueba en `geema.zmtechdev.com`: tenant, perfil y `tenant_settings` creados, trial Pro de 14 días y JWT con el `tenant_id` nuevo.
- RLS: el tenant nuevo no ve datos de `zm-lash-nails` y al revés.
- Límite: la cuarta alta desde la misma IP en una hora se rechaza, y un correo repetido también.
- Instalar la PWA en Android (Chrome) y en iOS (Safari) y abrir directo en el panel.
- Borrar los tenants de prueba al terminar.

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
