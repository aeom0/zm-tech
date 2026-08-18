# Inventario de features ZM Lash → implementar en GeemaStudio

> **Fuente:** audit de paridad 2026-08-07 (`docs/audit/03-AUDIT-paridad-zmlash-geema.md`) + inventario de pantallas/Edge Functions de ZM Lash v3.6–3.7.
>
> **Propósito:** lista accionable de lo que ZM Lash tiene hoy en producción y que Geema debe alcanzar (o decidir explícitamente no portar). No es un sprint plan: es el backlog de paridad funcional.
>
> **Repos:** `aeom0/ZM-Lash-and-Nails-Beauty` (referencia) · destino `aeom0/zm-tech` (`apps/geemastudio-*`).
>
> **Leyenda Geema hoy:** ✅ ya existe · 🟡 parcial / roto · ❌ ausente · ➖ N/A (Geema ya lo supera o no aplica)

---

## Cómo usar este doc

1. Cada fila = una **capacidad** verificada en ZM (no un “deseo”).
2. Columna **Ref ZM** = rutas canónicas para portar lógica (no copy-paste de branding).
3. Columna **Generalizar** = qué no debe llegar hardcodeado a Geema (moneda, “chica”, Vanessa, PE-only).
4. Prioridad sugerida al final (§ Oleadas) alinea con gaps P0–P2 del audit 03.

---

## 1. Núcleo operativo (mobile / gestión del salón)

| ID  | Feature                                    | Qué tiene ZM hoy                                                                                                  | Ref ZM                                                                        | Geema hoy                        | Generalizar                                                              |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| N01 | **Auth + roles** `dev` / `owner` / `staff` | Login email/password; `profiles.role`; gating tabs/menú; RLS por rol                                              | `AuthContext.tsx`, `profiles`                                                 | ✅ mobile · 🟡 web               | Roles OK; mensajes sin “solo Vanessa”                                    |
| N02 | **Dashboard** KPIs + accesos               | Ingresos, citas, stock bajo, ranking servicios, stagger, tablet 2 cols, deep link cita                            | `DashboardScreen.tsx`, `service-ranking.ts`, RPC `get_top_completed_services` | ✅ mobile · 🟡 web huérfano      | Moneda/`terminology` del tenant; no violeta ZM fijo                      |
| N03 | **Agenda** calendario 30 min               | Grid 9×`:00`/`:30`; multi-servicio; packs en cita; tablet por profesional; reprogramar; chip foto/link referencia | `screens/agenda/**`, `CalendarGrid.tsx`                                       | ✅ mobile · ❌ web               | Timezone IANA del tenant (Geema ya va por ahí)                           |
| N04 | **Crear/editar cita**                      | Cliente upsert; líneas `appointment_services` + `pack_id`; push a admins                                          | `useAppointments.ts`                                                          | ✅ mobile                        | Guard de solape también en app (ZM solo fuerte en WABA)                  |
| N05 | **Referencia visual en cita**              | Hasta 5 fotos + link; Storage `service-references`; badge tab; push `appointment_reference`                       | `reference_image_*`, Agenda mobile                                            | ❌ / 🟡                          | Paths/buckets por `tenant_id`                                            |
| N06 | **Servicios + categorías**                 | CRUD; precio Yape/Plin vs tarjeta; duración; límite título 24 (WABA); subcats                                     | `ServicesScreen.tsx`, `/servicios` web                                        | ✅                               | Límites WABA configurables; labels de precio por `currency`              |
| N07 | **Packs**                                  | 2+ servicios, precio pack; uso en citas y WABA                                                                    | `usePacks.ts`, `packs`                                                        | ✅                               | —                                                                        |
| N08 | **Promos (catálogo)**                      | `promotions` + `promotion_items` (rebaja por ítem); vigencia `valid_until`                                        | `usePromos.ts`, `usePromotionItems.ts`                                        | ✅                               | —                                                                        |
| N09 | **Inventario**                             | CRUD stock; `min_stock`; alerta Dashboard                                                                         | `InventoryScreen.tsx`                                                         | ✅ mobile · ❌ web               | —                                                                        |
| N10 | **Finanzas / pagos**                       | Período Hoy/Semana/Mes; CRUD pagos; abono/completar; vínculo a cita; gráfico                                      | `screens/finances/**`, `/finanzas`                                            | ✅ mobile · 🟡 web (marca ZM)    | **Rehacer web Geema**; `currency` tenant; sin gastos/cierre (tampoco ZM) |
| N11 | **Comisiones**                             | `%` por empleada; desglose generado/pagado/pendiente                                                              | `PersonalScreen`, `EmployeeBreakdown`                                         | ✅ mobile (Geema + salary/mixed) | Usar `terminology.staff`                                                 |
| N12 | **Personal / empleados**                   | CRUD; color; comisión; activo                                                                                     | `PersonalScreen.tsx`                                                          | ✅ mobile · ❌ web               | —                                                                        |
| N13 | **Clientas (CRM)**                         | Segmentos VIP/nuevas/en riesgo; búsqueda; sort; detalle; notas; categoría favorita                                | `screens/clients/**`                                                          | ✅ mobile · ❌ web               | —                                                                        |
| N14 | **Validación de pagos**                    | Cola `payment_submitted`; aprobar → WA confirmación + políticas + imagen tardanzas                                | `ValidacionPagosScreen.tsx`                                                   | ✅ mobile                        | Plantillas/assets por tenant                                             |
| N15 | **Asignar profesionales**                  | Citas WABA llegan sin `employee_id`; pantalla asigna en 7 días; badge                                             | `AsignarChicasScreen.tsx`                                                     | ✅ mobile                        | Naming “chicas” → staff                                                  |
| N16 | **Feriados del salón**                     | Tabla `salon_holidays`; UI admin; slots reducidos/cerrado; WABA consume misma tabla                               | `screens/holidays/**`, `peru-holidays.ts`                                     | ❌                               | Modelo por tenant; seed PE **opcional**, no único                        |
| N17 | **Configuración / perfil**                 | Tema Claro/Auto/Oscuro; versión/OTA; datos salón                                                                  | `settings/**`, `ProfileScreen`                                                | 🟡                               | Branding desde `tenant_settings`                                         |
| N18 | **Promo broadcast WA**                     | Stepper 5 pasos; segmentos; historial; Edge `send-promo-whatsapp`                                                 | `screens/promos/**`                                                           | ❌                               | Plantilla Meta por tenant; media_id cache                                |
| N19 | **Push FCM nativo**                        | Token → `profiles.push_token`; `send-notification` FCM v1; deep links                                             | `useNotifications.ts`, `send-notification`                                    | 🟡 roto E2E                      | Prioridad alta; ya hay stub en Geema                                     |

---

## 2. Web (ZM)

| ID  | Feature               | Qué tiene ZM hoy                                               | Ref ZM                   | Geema hoy             | Notas                                                                        |
| --- | --------------------- | -------------------------------------------------------------- | ------------------------ | --------------------- | ---------------------------------------------------------------------------- |
| W01 | Landing pública salón | CMS Sanity, hero, promos, galería, equipo                      | `apps/web` landing       | ➖                    | Geema tiene landing **SaaS** (otra función); landing por tenant = `s/[slug]` |
| W02 | Panel finanzas web    | Período, totales, nuevo pago                                   | `/finanzas`              | 🟡 contaminado        | Reemplazar, no portar textos ZM                                              |
| W03 | Panel servicios web   | Tabs categorías/servicios/packs/promos                         | `/servicios`             | ✅ `/panel/servicios` | Unificar shell navegación                                                    |
| W04 | Panel clientas web    | Ruta `/clientes`                                               | `app/clientes`           | ❌                    | Opcional si mobile-first                                                     |
| W05 | Panel WABA mensajes   | Hilo estilo WA; pausa bot; Reactivar; Haiku agenda; miniaturas | `/panel/waba/mensajes`   | ❌                    | Crítico para ops WA                                                          |
| W06 | Panel WABA campañas   | Imágenes CTWA / creativos CMS                                  | `/panel/waba/campanas`   | ❌                    |                                                                              |
| W07 | Panel WABA Haiku CMS  | Prompts, triggers, blocked phones, test preview                | `/panel/waba/haiku`      | ❌                    | Por tenant                                                                   |
| W08 | Panel WABA portafolio | Hasta 4 fotos/servicio; mover entre servicios                  | `/panel/waba/portafolio` | ❌                    |                                                                              |
| W09 | Panel WABA historial  | Historial campañas/mensajes                                    | `/panel/waba/historial`  | ❌                    |                                                                              |
| W10 | Legal                 | Términos, privacidad, libro reclamaciones                      | rutas legales            | ➖                    | Por jurisdicción del tenant                                                  |

---

## 3. Bot WhatsApp (WABA) — capacidades

### 3.1 Core conversacional

| ID  | Feature                        | Qué tiene ZM hoy                                       | Ref ZM                                   | Geema hoy                      |
| --- | ------------------------------ | ------------------------------------------------------ | ---------------------------------------- | ------------------------------ |
| B01 | Webhook Meta + sesiones        | `whatsapp_sessions`, `wa_messages`, carrito JSON       | `whatsapp-webhook/`                      | 🟡 base multi-tenant           |
| B02 | Catálogo en chat               | Categorías, servicios, packs, promos                   | `services-catalog` / menu handlers       | ✅ scoped tenant               |
| B03 | Booking L–S directo            | Selector fecha/hora 30 min; confirma sin abono         | `booking-flow`, `agenda`                 | 🟡                             |
| B04 | Domingo adelanto 20%           | Flujo pago + screenshot + verificación                 | `payment.ts`                             | 🟡 verificar                   |
| B05 | Capacidad global 1 cita/slot   | `countOverlappingAppointments` (no por `employee_id`)  | `handlers/agenda.ts`                     | ❌ bug probable                |
| B06 | Re-chequeo cupo al pagar       | Antes de crear cita domingo                            | `processPaymentScreenshot`               | ❌                             |
| B07 | Mi cita / reprogramar          | Pending appointments; corrección hora                  | `pending-appointment.ts`                 | 🟡                             |
| B08 | Haiku IA (asesora)             | Precio 2 pasos, carrito, portfolio, fallback 932       | `ai-assistant.ts`, `haiku-prompt.ts`     | 🟡 más simple                  |
| B09 | Saludo Haiku + franjas         | Orgánico vs CTWA; CMS defaults                         | `haiku-greeting.ts`                      | 🟡                             |
| B10 | Identidad post-cita            | Nombre + DNI/CE si falta (no bloquea)                  | `client-identity.ts`                     | ❌                             |
| B11 | No-show / same-day button      | Motivo → Mi cita                                       | `no-show.ts`                             | ❌                             |
| B12 | Foto diseño → staff takeover   | Pausa bot; ack 7–21; push; panel resume                | `inbound-image.ts`, `waba-staff-session` | ❌                             |
| B13 | Staff echo app WA Business     | `smb_message_echoes` → `staff_app` + pausa             | `staff-echo.ts`                          | ❌                             |
| B14 | BSUID / CTWA sin teléfono      | Clave `PE.…`; envío `recipient`                        | `_shared/wa-recipient.mjs`               | ❌                             |
| B15 | Coalesce inbound + phone-lock  | Ventana 4.5s; claim `wa_action_debounce`               | `inbound-gate.ts`                        | ❌                             |
| B16 | Portafolio en chat             | `show_portfolio`; match caption; foto proactiva precio | `lib/portfolio.ts`                       | ❌                             |
| B17 | Tratamiento formal / un ¡Hola! | Srta. + tope 2×; sin apodos                            | `client-address.ts`                      | Generalizar tono por tenant    |
| B18 | Reclamo / garantía gate        | Anti `add_to_cart` + keywords                          | `matchesComplaintIntent`                 | Regla de producto configurable |
| B19 | Feriados en slots WABA         | Misma tabla / seed                                     | `peru-holidays.ts`                       | ❌                             |
| B20 | `wa_error_log` + push error    | Retención 7d; alerta FCM                               | `error-log.ts`                           | ❌                             |
| B21 | Debounce listas interactivas   | Memoria + BD ~30s                                      | `wa-api.ts`                              | ❌                             |
| B22 | QA phones + cleanup            | Rango 978–999; suites `waba:validate*`                 | `qa-phone.mjs`, scripts                  | Portar patrón por proyecto     |

### 3.2 Edge Functions / crons (ZM prod)

| ID  | Función                                                    | Rol                                    | Geema hoy                    |
| --- | ---------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| E01 | `whatsapp-webhook`                                         | Bot principal                          | 🟡 existe (sin capa v3)      |
| E02 | `send-whatsapp-notification`                               | Texto/imagen/plantilla a clienta       | ❌                           |
| E03 | `send-promo-whatsapp`                                      | Broadcast plantilla                    | ❌                           |
| E04 | `appointment-reminders` + `send-appointment-reminder`      | Recordatorio ~24h                      | ❌                           |
| E05 | `same-day-appointment-reminder` + `send-same-day-reminder` | Recordatorio ~3h                       | ❌                           |
| E06 | `retouch-reminders` + `send-retouch-reengage`              | Reenganche retoque                     | ❌ (feature opcional/config) |
| E07 | `cart-nudge`                                               | Carrito abandonado 9–22 Lima           | ❌                           |
| E08 | `silence-watchdog`                                         | Silencio 5–12 min, 24/7                | ❌                           |
| E09 | `ads-bounce-nudge`                                         | CTWA sin 2.º msg                       | ❌                           |
| E10 | `browse-reengage`                                          | Browse sin carrito                     | ❌                           |
| E11 | `chat-quality-review`                                      | Push “Revisar YA” (no habla a clienta) | ❌                           |
| E12 | `waba-staff-session`                                       | Reactivar bot / Haiku agenda           | ❌                           |
| E13 | `send-notification`                                        | FCM admins                             | ❌ (invocado pero ausente)   |
| E14 | `waba-pricing-sync`                                        | Costos Meta → Finanzas                 | ❌ (nice-to-have)            |
| E15 | `sync-anthropic-billing`                                   | Costo Haiku Finanzas                   | ❌                           |
| E16 | `test-haiku-preview`                                       | Panel Haiku                            | ❌                           |
| E17 | `abandoned-cart-reminders`                                 | Legacy paralelo a cart-nudge           | ➖ **no portar** (deuda ZM)  |
| E18 | `send-push-notification`                                   | Expo Push (sin uso)                    | ➖ no portar                 |

---

## 4. Infra / plataforma (no “pantalla”, pero bloquea producto)

| ID  | Capacidad                      | ZM                                   | Geema                      | Acción                                               |
| --- | ------------------------------ | ------------------------------------ | -------------------------- | ---------------------------------------------------- |
| I01 | `tenant_id` + RLS apps gestión | Plan 02 en prod (1 tenant)           | Solo WABA bien scoped      | **P0** portar patrón a todas las tablas/hooks        |
| I02 | Auth Hook JWT claims tenant    | Sí                                   | Verificar                  | Alinear                                              |
| I03 | Horario semanal configurable   | Hardcode + feriados                  | `/panel/horarios` + mobile | OK Geema; sumar feriados (N16)                       |
| I04 | `tenant-config` presets        | N/A (marca fija)                     | 4 presets                  | Mantener; fix `es-VE`→locale real                    |
| I05 | Onboarding wizard              | ❌                                   | ✅ mobile                  | Geema ya adelante; conectar subtype a efectos reales |
| I06 | CI deploy Edge Functions       | `ota-production.yml` lista funciones | —                          | Toda EF nueva → workflow                             |

---

## 5. UX / design system a portar como **calidad**, no como marca

Capacidades de producto UX que ZM ya resolvió y Geema mobile parcialmente tiene:

| ID  | Capacidad UX                                     | ZM                  | Prioridad en Geema                              |
| --- | ------------------------------------------------ | ------------------- | ----------------------------------------------- |
| U01 | Tokens + dark mode real end-to-end               | ✅ mobile           | Mantener `createTheme`; web debe heredar tenant |
| U02 | Empty states / skeletons / “Guardado ✓”          | ✅ varias pantallas | Homogeneizar                                    |
| U03 | Badges vivos (validación, sin asignar, refs)     | ✅                  | Ya parcialmente                                 |
| U04 | Tablet layouts Dashboard/Agenda/Finanzas         | ✅                  | Ya en Dashboard Geema                           |
| U05 | Preview hilo WhatsApp en panel                   | ✅ MessageThread    | Al construir W05                                |
| U06 | Contadores límite Meta (24 chars) en formularios | ✅                  | Portar a Servicios Geema                        |
| U07 | Shell web admin unificado                        | ❌ (fractura ZM)    | **No copiar el error**: un solo PanelShell      |

---

## 6. Explicitamente NO portar tal cual

| Ítem ZM                                                    | Por qué                               |
| ---------------------------------------------------------- | ------------------------------------- |
| Branding ZM / Vanessa / zmlashnails.com / violeta-oro fijo | Producto multi-tenant                 |
| Moneda `S/` + `es-PE` hardcode                             | `tenant-config.locale`                |
| Terminología “chicas”                                      | `terminology.staff`                   |
| Número 932 / plantillas `*_zm`                             | Credenciales y templates por tenant   |
| Lista feriados PE como única fuente                        | `salon_holidays` + seed opcional      |
| `FALLBACK_BLOCKED_PHONE_NUMBERS` Entel sin comentario      | Override regional                     |
| `abandoned-cart-reminders` legacy                          | Competiría con `cart-nudge`           |
| Creativos CTWA 15% / pack Manos+Pies específicos           | Config de campaña del tenant          |
| Política de garantía concreta de Vanessa                   | Regla configurable (texto + keywords) |

---

## 7. Oleadas sugeridas de implementación

### Oleada 0 — vender sin mezclar datos (bloquea 2.º tenant)

- I01 aislamiento `tenant_id` web+mobile+RLS
- W02 limpiar/rehacer `/finanzas` web
- N19 push FCM E2E
- B05 capacidad global WABA

### Oleada 1 — paridad operativa del día a día

- N16 feriados
- N05 referencia visual en citas
- W05 panel mensajes + E12 `waba-staff-session`
- E02 `send-whatsapp-notification`
- E04 / E05 recordatorios 24h + same-day
- B10 identidad post-cita
- B12 foto diseño → pausa

### Oleada 2 — funnel WA = ZM v3

- E07–E11 nudges + quality review (+ guards cruzados)
- B14 BSUID · B15 coalesce · B20 error log
- W06–W09 campañas / haiku / portafolio / historial
- B16 portafolio chat
- N18 promo broadcast

### Oleada 3 — nice-to-have / analytics

- E14 WABA pricing sync + card Finanzas
- E15 Anthropic billing
- W04 clientas web / agenda web (si se vende panel desktop)
- Retoque reengage (E06) como módulo **opcional** por vertical

---

## 8. Checklist compacto (copiar a issues)

**Mobile ya OK en Geema (no rehacer; endurecer tenant + UX):**  
N01–N04, N06–N15 (revisar scoping), onboarding.

**Faltan o rotas (implementar):**  
N05, N16, N18, N19 · W05–W09 · B05–B06, B10–B16, B19–B21 · E02–E16 (salvo E17–E18).

**Geema ya supera a ZM:**  
Onboarding multi-tipo · presets · payment_mode salary/mixed · landing SaaS multi-país.

---

## 9. Referencias

- Audit paridad: [`docs/audit/03-AUDIT-paridad-zmlash-geema.md`](./03-AUDIT-paridad-zmlash-geema.md)
- Plan: [`docs/geemastudio/docs/03-PLAN-audit-paridad-zmlash-geema.md`](../geemastudio/docs/03-PLAN-audit-paridad-zmlash-geema.md)
- ZM Plan 02 tenant: repo ZM `docs/02-PLAN-retrofit-tenant-id.md`
- ZM Edge Functions: repo ZM `docs/EDGE_FUNCTIONS.md`

_Última actualización: 2026-08-08._
