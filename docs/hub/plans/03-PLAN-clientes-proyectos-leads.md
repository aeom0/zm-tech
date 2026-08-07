# Plan 03 — Clientes, Proyectos, Contratos e Inbox de Leads (Fase 1)

Objetivo: con schema aplicado (plan 02), construir el corazón del Hub: CRUD de clientes/proyectos/contratos, inbox de leads y seed del inventario real. Al cerrar, todo lo que hoy vive en el skill `zmtech-dev` es consultable en el Hub.

## Rutas

| Ruta | Contenido |
|------|-----------|
| `/dashboard` | Resumen: clientes activos, proyectos por estado, leads sin atender, soporte activo |
| `/clientes` | Lista filtrable (estado, vertical) + alta |
| `/clientes/[id]` | Ficha: datos, proyectos, contratos, notas |
| `/proyectos` | Lista filtrable (estado, tipo, cliente) + alta |
| `/proyectos/[id]` | Ficha: repo, stack, deploys, versión, Supabase ref |
| `/leads` | Inbox: `contacts` + `quote_leads` de la landing, más recientes primero |

## Inbox de leads

- Lectura combinada de `contacts` (formulario) y `quote_leads` (cotizador) — solo `SELECT`.
- Un lead ya convertido se detecta porque algún `hub_clients.source_contact_id` / `source_quote_lead_id` apunta a él (la landing nunca se modifica).
- Acción **"Convertir a cliente"**: precarga nombre/email/teléfono → crea `hub_clients` con `source` = `landing`/`cotizador` y la ref suave.
- Estados visuales: nuevo / convertido / descartado (descartes en columna local `hub_clients` no — usar tabla ligera `hub_lead_dismissals(lead_source, lead_id)` si hace falta; decidir en implementación con lo mínimo).

## Formularios y validación

- Zod por entidad en `apps/hub/lib/validation/` con tipos derivados de `@zmtech/hub-schema`.
- Mutaciones vía Server Actions + cliente Supabase server-side (patrón repmax-web).
- Strings de UI en `content.ts`.

## Seed — inventario real (agosto 2026)

Script `scripts/seed-hub.ts` (service role, correr una vez, idempotente por `slug`):

**Clientes:** ZM Lash and Nails Beauty (Vanessa, Lima, beauty, activo) · Guataparo Bienes Raíces (Morelba Hernández, Valencia VE, inmobiliaria, activo) · YLA — Yoga con Lógica y Alma (Yube Karina, wellness, activo) · ZetaEme Cosméticos (enterprise, activo).

**Proyectos (con cliente):** zm-lash-nails (fullstack, produccion, `udelxwwnyivknslueerr`) · guataparobr (web, desarrollo) · yla-mvp (web, produccion landing) · zetaeme-enterprise-suite (fullstack, produccion, v2.23.1).

**Proyectos propios (sin cliente):** landing zmtechdev.com (produccion) · GeemaStudio (desarrollo) · OdentalPro (desarrollo) · RepMAX (desarrollo) · CondoApp (desarrollo) · IA Scout360 (desarrollo).

**Contratos:** Guataparo $435 50/50 + $30/mes · ZM Lash y demás según datos reales que confirme Alberto al correr el seed.

## Criterios de aceptación

- [x] CRUD completo de las tres entidades, usable en 375px.
- [x] Lead del cotizador → cliente en un clic, con trazabilidad (ref suave visible en la ficha).
- [x] Seed corrido: los 10 proyectos y 4 clientes visibles en el Hub.
- [x] Dashboard muestra conteos reales.
- [x] Sin strings hardcodeados; TypeScript y ESLint limpios.
