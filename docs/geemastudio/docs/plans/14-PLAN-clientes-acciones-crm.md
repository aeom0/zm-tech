# Plan 14 — CRM y acciones de clientes

> **Ubicación canónica consolidada:** Plan 14. El archivo de origen se conserva temporalmente como referencia legacy.


> **Estado: HECHO P0+P1** (24-sep-2026). P2 pendiente.  
> App: `apps/geemastudio-mobile` · Pantalla: `ClientsScreen` + `screens/clients/*`  
> Paridad de referencia: ZM Lash `ClientsScreen` / `ClientDetailModal` (sin WABA reengage Edge hasta que exista en Geema).

---

## Problema

La tab Clientes era un **listado informativo**: buscar, segmentar, ver KPIs e historial. No permitía contactar, editar, dar de alta ni agendar desde la ficha. Poco útil en mostrador.

## Objetivo

Convertir Clientes en herramienta de operación diaria del salón: **ver → actuar** en pocos taps.

## Alcance por fase

### P0 — Acciones desde la ficha (hoy)

| # | Feature | Detalle |
|---|---------|---------|
| 1 | WhatsApp | Abrir `wa.me` con teléfono normalizado (prefijo del país del tenant) |
| 2 | Llamar | `tel:` con el mismo número |
| 3 | Agendar | Navegar a tab Agenda con prefijo de nombre/teléfono y abrir modal nueva cita |
| 4 | Editar ficha | Modal/form: nombre, teléfono, email, notas → `UPDATE clients` + invalidar queries |

### P1 — Operación diaria (hoy)

| # | Feature | Detalle |
|---|---------|---------|
| 5 | Alta rápida | FAB / botón Agregar → `INSERT clients` con `tenant_id` |
| 6 | Recontactar (en riesgo) | CTA en ficha (y hint en card) → WA con mensaje corto prellenado (sin Edge WABA aún) |
| 7 | Ordenar | Chips: última visita · gasto · nombre |

### P2 — Después (no hoy)

- Selección múltiple / exportar teléfonos para campaña  
- Servicio favorito por **nombre** (join) en listado  
- Reengage WABA vía Edge (paridad `send-retouch-reengage` de ZM) cuando el bot Geema esté listo  
- Banner global “N en riesgo” con deep-link al filtro  

## Decisiones

- **Teléfono internacional**: dígitos + dial code según `config.locale.country` (VE→58, PE→51, …). Si el número ya trae el código país, no duplicar.  
- **Agendar**: params de tab `Agenda: { prefillClient?: { name, phone } }` — no acoplar a `client_id` en el form actual (Agenda usa nombre/teléfono denormalizados).  
- **Recontactar**: `Linking` + texto plantilla en español neutro; no invocar Edge Functions inexistentes en Geema.  
- **UI**: Lucide/Feather, sin emojis Unicode; copy sin voseo.

## Archivos tocados (previstos)

- `docs/geemastudio/docs/plans/14-PLAN-clientes-acciones-crm.md` (este)
- `screens/ClientsScreen.tsx`  
- `screens/clients/types.ts`  
- `screens/clients/hooks/useClientsData.ts`  
- `screens/clients/hooks/useClientsMutations.ts` (nuevo)  
- `screens/clients/utils/phoneContact.ts` (nuevo)  
- `screens/clients/components/ClientDetailModal.tsx`  
- `screens/clients/components/ClientFormModal.tsx` (nuevo)  
- `screens/clients/components/ClientSortBar.tsx` (nuevo)  
- `navigation/MainTabNavigator.tsx` + `screens/AgendaScreen.tsx` (prefill)

## Criterios de aceptación

- [x] Desde detalle: WA / llamar / agendar / editar funcionan  
- [x] Alta de cliente invalida lista y aparece en búsqueda  
- [x] Cliente en riesgo muestra CTA “Recontactar”  
- [x] Orden por última visita / gasto / nombre cambia el listado  
- [x] `tsc --noEmit` en geemastudio-mobile OK  

## Checklist implementación

- [x] Plan documentado  
- [x] P0 detalle accionable (WA / llamar / agendar / editar)  
- [x] P1 FAB + sort + recontactar  
- [x] Prefill Agenda (`prefillClient`)  
- [x] Typecheck (`tsc --noEmit`)  

## Notas de implementación (24-sep-2026)

- Prefijo telefónico por `config.locale.country` en `screens/clients/utils/phoneContact.ts`.  
- Recontactar = `wa.me` + texto plantilla (sin Edge WABA).  
- Alta/edición vía `useClientsMutations` + invalidación de `clients` / métricas / `agenda_clients`.  
