# Plan 05 — Comunicaciones: Correo, Chatbots/WABA, Notificaciones (Fase 3)

Objetivo: centralizar en el Hub la comunicación con clientes. Es la fase más abierta: cada bloque es una integración externa independiente y se prioriza al cerrar Fase 2, según lo que más duela. Este plan fija dirección, no implementación fina.

## Principios

- Las integraciones entran por **Edge Functions** en `llacowjutjfefboqgfnj` (webhooks / service-role), prefijo `hub-` en el nombre de la función. Nunca API de negocio (regla del monorepo).
- Secrets en Supabase Secrets, jamás en el repo.
- Cada bloque se puede construir y shippear por separado.

## Bloque A — Registro de chatbots/WABA

El más barato y de valor inmediato: inventario de bots por cliente.

- Tabla `hub_bots`: `client_id`, `project_id`, canal (`waba`/`telegram`/`web`), número/handle, proveedor de IA y modelo, token: dónde vive y **fecha de expiración** (enlazada a `hub_reminders`), estado.
- Seed: bot WABA ZM Lash (+51 981 444 430, Claude Haiku, token vence ~30 abr 2026).
- Sin integración runtime todavía — es registro + vencimientos.

## Bloque B — Correo (Gmail)

- Objetivo mínimo: desde la ficha de cliente, ver hilos recientes con ese email y redactar (mailto o Gmail API con OAuth de Alberto).
- Evaluar en su momento: Gmail API directa vs. registro manual de "última comunicación". Empezar por lo segundo si la API agrega demasiada fricción.

## Bloque C — Notificaciones de recordatorios

- Edge Function `hub-reminders-digest` con Supabase Scheduled Functions (cron): diario, busca `hub_reminders` que vencen en ≤7 días y envía resumen a Alberto (correo o WhatsApp vía WABA propio).
- Primer uso real de cron en el Hub; hasta aquí todo fue in-app.

## Bloque D — Entrada de tickets por canal (candidato)

- Webhook WABA/correo → crea `hub_tickets` automáticamente con `channel` correcto.
- Depende de A y de tener volumen real de soporte; no comprometer antes.

## Criterios de aceptación (mínimos de la fase)

- [ ] Bloque A completo (inventario de bots + vencimientos enlazados).
- [ ] Bloque C corriendo (digest de vencimientos).
- [ ] B y D: decisión explícita de hacerlos o posponerlos, documentada en el ROADMAP.

## Emojis

Excepción WABA vigente: en plantillas/copy de mensajes WhatsApp los emojis están permitidos (regla del monorepo). En la UI del Hub, no.
