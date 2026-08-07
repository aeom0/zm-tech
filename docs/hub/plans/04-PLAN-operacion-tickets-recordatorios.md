# Plan 04 — Operación: Tickets y Recordatorios (Fase 2)

Objetivo: que el soporte mensual y los vencimientos dejen de vivir en la memoria/skills. Requiere Fase 1 cerrada (todo cuelga de `hub_clients` / `hub_projects`).

Schema: tablas `hub_tickets` y `hub_reminders` ya definidas en [02-PLAN-schema-rls-supabase.md](./02-PLAN-schema-rls-supabase.md) (migración borrador `03_hub_operacion.sql`).

## Tickets

| Ruta | Contenido |
|------|-----------|
| `/tickets` | Lista filtrable (estado, prioridad, cliente); abiertos primero |
| `/tickets/[id]` | Detalle + cambio de estado + notas |

- Alta manual en el MVP (los tickets llegan por WhatsApp/correo y Alberto los registra). La entrada automática por canal es Fase 3.
- Ligados a cliente (obligatorio) y proyecto (opcional).
- La ficha de cliente muestra sus tickets y si `support_active` está vigente — un ticket de un cliente sin soporte activo se marca visualmente (candidato a cobro por módulo).
- Métricas simples en dashboard: abiertos, tiempo medio de resolución (sobre `opened_at`/`resolved_at`).

## Recordatorios / vencimientos

| Ruta | Contenido |
|------|-----------|
| `/recordatorios` | Lista por `due_date` ascendente; vencidos y próximos 30 días resaltados |

- Tipos: dominio, token, soporte, certificado, pago, otro.
- Recurrencia `mensual`/`anual`: al marcar `hecho`, la app crea la siguiente ocurrencia (sin cron en esta fase).
- Seed inicial de recordatorios reales:
  - **Token WABA ZM Lash** — vence ~30 abr 2026 → siguiente renovación (recurrente, ligado al proyecto zm-lash-nails).
  - Renovaciones de dominios: `zmtechdev.com`, `zmlashnails.com`, `guataparobr.com` (fechas a confirmar por Alberto).
  - Soportes mensuales activos ($30/mes) como recordatorio recurrente de cobro por cliente.
- Dashboard: widget "Próximos vencimientos" (7/30 días).

## Criterios de aceptación

- [ ] Migración `03_hub_operacion.sql` aplicada (con instrucción explícita) y RLS verificado.
- [ ] Ticket: crear → en_progreso → resuelto, visible en ficha de cliente.
- [ ] Recordatorio recurrente genera su siguiente ocurrencia al completarse.
- [ ] Dashboard muestra vencimientos próximos y tickets abiertos.

## Fuera de alcance

- Notificaciones push/correo de recordatorios (Fase 3).
- Portal para que el cliente cree sus propios tickets (Fase 4 / candidato).
