# Hub ZM Tech — documentación de producto

Panel interno de la fábrica de software: torre de control de **clientes, proyectos, contratos, soporte y comunicaciones** de ZM Tech. Usuario único al inicio (Alberto, rol `founder`), diseñado con roles para cuando exista equipo. **No es un producto para vender** — es operación interna.

Vive en el monorepo **zm-tech** (pnpm + Turborepo), compartiendo el proyecto Supabase **ZMTech** (`llacowjutjfefboqgfnj`) con landing, OdentalPro y RepMAX. Sigue el patrón RepMAX: sin carpeta `*-server`, migraciones en `docs/hub/supabase/migrations/`.

## Apps y packages (previstos)

| Path | Rol |
|------|-----|
| `apps/hub` | Next.js 16 App Router — panel interno (puerto **3004**) |
| `packages/hub-schema` | Drizzle schema `hub_*` + constantes (`@zmtech/hub-schema`) |

No hay app mobile en el MVP. Si más adelante hace falta, se agrega `apps/hub-mobile` siguiendo la simetría del monorepo.

## Arquitectura

```
UI (apps/hub) → Server Components / hooks → cliente Supabase → tablas hub_* (RLS)
```

- **Auth:** Supabase Auth (sin Express, sin JWT propio). RLS restringido a `hub_members`.
- **Datos:** tablas con prefijo `hub_` en `llacowjutjfefboqgfnj`.
- **Leads:** el Hub **lee** `contacts` y `quote_leads` (landing/cotizador, misma BD) como inbox de leads — solo `SELECT` + marca de conversión en tablas `hub_*`; nunca escribe en tablas de la landing.
- **Edge Functions:** solo a partir de Fase 3 (webhooks de correo/WABA), nunca API de negocio.

## Módulos

| Módulo | Fase | Descripción |
|--------|------|-------------|
| Clientes | 1 | CRM ligero: datos, vertical, estado, origen |
| Proyectos | 1 | Webs/apps entregadas: repo, stack, dominio, deploy, versión |
| Contratos | 1 | Monto, modelo 50/50, soporte mensual |
| Leads (inbox) | 1 | Vista de `contacts`/`quote_leads` → convertir a cliente |
| Tickets | 2 | Soporte por cliente, ligado al plan mensual |
| Recordatorios | 2 | Vencimientos: dominios, tokens (p. ej. WABA), renovaciones |
| Comunicaciones | 3 | Correo, chatbots/WABA centralizados, notificaciones |

## Comandos (raíz del monorepo, cuando exista la app)

```bash
pnpm install
pnpm dev:hub        # http://localhost:3004
pnpm build:hub
```

## Variables de entorno

| App | Archivo | Variables |
|-----|---------|-----------|
| Hub | `apps/hub/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Proyecto: `https://llacowjutjfefboqgfnj.supabase.co`

## Migraciones SQL

Migraciones Fase 1 aplicadas en `llacowjutjfefboqgfnj` (ago 2026): `hub_initial_schema`, `hub_rls`, `hub_rls_harden_helpers`. Borrador Fase 2: `03_hub_operacion.sql` — no aplicar sin instrucción.

**Excepción fuera de fases:** `20260818120000_hub_tasas_cambio.sql` — **aplicada** 2026-08-18. Crea `hub_tasas_bcv`/`hub_tasas_usdt` (RLS `SELECT` público, escritura solo `service_role`). No pertenece al CRM del Hub — son tablas de soporte para el paquete compartido `@zmtech/tasas`, consumidas hoy solo por RepMAX POS (`docs/repmax/plans/08-PLAN-tasas-bcv-usdt.md`). Prefijo `hub_` porque están pensadas para reutilizarse desde otros productos, no porque sean parte del CRM interno.

## Planes

| Plan | Fase | Contenido |
|------|------|-----------|
| [01-PLAN-scaffold-hub-web.md](./plans/01-PLAN-scaffold-hub-web.md) | 0 | `apps/hub` + `packages/hub-schema` + auth + layout |
| [02-PLAN-schema-rls-supabase.md](./plans/02-PLAN-schema-rls-supabase.md) | 1 | Schema `hub_*`, enums, RLS, helpers |
| [03-PLAN-clientes-proyectos-leads.md](./plans/03-PLAN-clientes-proyectos-leads.md) | 1 | CRUD clientes/proyectos/contratos + inbox leads + seed |
| [04-PLAN-operacion-tickets-recordatorios.md](./plans/04-PLAN-operacion-tickets-recordatorios.md) | 2 | Tickets y recordatorios/vencimientos |
| [05-PLAN-comunicaciones.md](./plans/05-PLAN-comunicaciones.md) | 3 | Correo, chatbots/WABA, notificaciones |

## Design system

**ZM Control** — misma familia visual que la landing (violeta + carbón). Dark-first, tokens light documentados.

| Recurso | Path |
|---------|------|
| Docs agentes | [design-system/](./design-system/) |
| Canvas / tokens TS | [design/](./design/) |
| Runtime app | `apps/hub/src/lib/theme.ts` · `apps/hub/src/app/globals.css` |

## Reglas críticas

- Prefijo `hub_` en tablas, enums, funciones, políticas y storage.
- `contacts` y `quote_leads` son de la landing: el Hub solo las **lee**. Nunca `UPDATE`/`DELETE`/`DROP` sobre tablas de otro producto.
- No aplicar migraciones a `llacowjutjfefboqgfnj` sin instrucción explícita.
- UI y nombres de negocio en español LATAM · TypeScript estricto · sin emojis Unicode en UI (Lucide).
- Visual: tokens ZM Control — no mezclar acentos de RepMAX/Odental/GeemaStudio.
- Mapa multi-BD del monorepo: [../SUPABASE.md](../SUPABASE.md).
