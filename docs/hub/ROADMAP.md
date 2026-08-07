# ROADMAP — Hub ZM Tech

Torre de control interna de la fábrica. Estado general: **documentación cerrada, desarrollo no iniciado**.

Orden de fases: primero la entidad `cliente`/`proyecto` (todo lo demás cuelga de ahí), luego operación (tickets/recordatorios), y al final comunicaciones (cada una es integración externa).

## Fase 0 — Scaffold ✧ cerrada (ago 2026)

Plan: [plans/01-PLAN-scaffold-hub-web.md](./plans/01-PLAN-scaffold-hub-web.md)

- `apps/hub` (Next.js 16, puerto 3004) + `packages/hub-schema` registrados en Turborepo. ✅
- Supabase Auth con login por email + `hub_members` (solo Alberto). ✅
- Layout base: sidebar de módulos, shell responsive (375px como referencia). ✅

**Criterio de cierre:** `pnpm dev:hub` levanta, login funciona, rutas protegidas redirigen.

## Fase 1 — Clientes, Proyectos y Leads ✧ cerrada (ago 2026)

Planes: [02-PLAN-schema-rls-supabase.md](./plans/02-PLAN-schema-rls-supabase.md) · [03-PLAN-clientes-proyectos-leads.md](./plans/03-PLAN-clientes-proyectos-leads.md)

- Schema `hub_*` aplicado (members, clients, projects, contracts) con RLS. ✅
- CRUD de clientes, proyectos y contratos. ✅
- Inbox de leads leyendo `contacts`/`quote_leads` → convertir a cliente con un clic. ✅
- Seed con el inventario real (clientes y proyectos actuales de ZM Tech). ✅

**Criterio de cierre:** todo el inventario de la fábrica consultable en el Hub; un lead del cotizador se convierte en cliente sin tocar SQL.

## Fase 2 — Operación (Tickets y Recordatorios) ✧ pendiente

Plan: [04-PLAN-operacion-tickets-recordatorios.md](./plans/04-PLAN-operacion-tickets-recordatorios.md)

- `hub_tickets`: soporte por cliente/proyecto, ligado al plan mensual de $30.
- `hub_reminders`: vencimientos de dominios, tokens (p. ej. WABA ZM Lash ~30 abr 2026), renovaciones de soporte; recurrencia mensual/anual.
- Dashboard con vencimientos próximos y tickets abiertos.

**Criterio de cierre:** ningún vencimiento vive solo en la memoria o en un skill; el dashboard lo muestra antes de que ocurra.

## Fase 3 — Comunicaciones ✧ pendiente

Plan: [05-PLAN-comunicaciones.md](./plans/05-PLAN-comunicaciones.md)

- Correo (hilos por cliente) — integración Gmail.
- Chatbots/WABA centralizados: estado de bots por cliente, tokens, plantillas.
- Notificaciones (recordatorios → correo/WhatsApp).
- Aquí entran las primeras Edge Functions (webhooks), nunca API de negocio.

**Criterio de cierre:** se define al cerrar Fase 2 — el alcance exacto depende de qué integración duela más en ese momento.

## Fuera de alcance (por ahora)

- App mobile del Hub.
- Portal de cliente (que el cliente vea sus tickets) — candidato a Fase 4.
- Facturación/cobros automatizados.
