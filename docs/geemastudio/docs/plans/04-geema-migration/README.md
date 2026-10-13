# Plan 04 — Migración GeemaStudio + suite WABA multi-vertical

> **Fecha:** 2026-08-28 · **Actualizado:** 2026-10-12
> **Autor:** Alberto Orta + análisis Cursor (agentes)
> **Estado:** S1–S5 ✅ (S4 crons/RPCs, PR #151, 27-sep; S5 reglas, PR #154–#156, 28-sep). Traslado de la suite WABA a `geemastudio-server` F0–F5 ✅ (6-oct, [10](./10-PLAN-traslado-waba-a-geema.md)); el bot y las Edge Functions se despliegan solo desde zm-tech. Agente Haiku 5.5 atiende el WABA de ZM Lash desde el 8-oct (Fases 1–2; Fase 3 pendiente). Pendiente: F6 (parametrizar hardcodes de ZM), smoke de `waba_tenant_routing_enabled` (hoy `false`), S6 (presets L4) y S7 (2.º tenant + loop Meta Ads).
> **BD compartida:** `udelxwwnyivknslueerr` (ZM Lash = tenant #1 `zm-lash-nails`)

Fuente canónica del análisis de convergencia entre **ZM Lash & Nails** (tenant #1, origen del producto) y **GeemaStudio** (SaaS multi-tenant en `zm-tech`). Incluye bloqueadores para el 2.º tenant, estandarización WABA para barberías/peluquerías/spas, y roadmap por sprints. El resumen ejecutivo y el roadmap de esta carpeta son la única fuente del estado de migración; los documentos específicos de WABA y panel mantienen el detalle de implementación.

---

## Índice

| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | [00-RESUMEN-EJECUTIVO.md](./00-RESUMEN-EJECUTIVO.md) | Una página: dónde estamos, qué falta, decisión recomendada |
| 01 | [01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) | Dos repos, un Supabase, modelos de tenant, paridad ZM ↔ Geema |
| 02 | [02-BLOQUEADORES-MULTI-TENANT.md](./02-BLOQUEADORES-MULTI-TENANT.md) | Plan 02 §11 + bloqueadores adicionales (P0) |
| 03 | [03-WABA-SUITE-ESTANDARIZACION.md](./03-WABA-SUITE-ESTANDARIZACION.md) | Capas L1–L4, matriz CMS vs código, presets por vertical |
| 04 | [04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md) | Sprints 1–7+, DoD, dependencias, estimaciones |
| 05 | [05-ADR-modelo-tenant.md](./05-ADR-modelo-tenant.md) | Bridge `tenants` ↔ `tenant_settings`; addendum país (sin `countries`) + wallclock vs UTC |
| 06 | [06-BRANDING-LOGO-Y-DESIGN-TOKENS.md](./06-BRANDING-LOGO-Y-DESIGN-TOKENS.md) | Logo tenant, Storage, push FCM por tenant, tokens ZM ↔ Geema, S5-B |
| 07 | [07-PARIDAD-MOBILE-ZM.md](./07-PARIDAD-MOBILE-ZM.md) | Shadow APK; S5C P0 ✅; schema canónico; multi-servicio PR #31 (sin SQL CREATE en prod) |
| 08 | — | Retirado (12-oct-2026): duplicaba el [Plan 15](../15-PLAN-retail-productos.md) |
| 09 | [09-WEBHOOK-PROD-RECONCILE.md](./09-WEBHOOK-PROD-RECONCILE.md) | Track C ✅ (histórico): drift del webhook resuelto el 22-sep; superado por el traslado (10) |
| 10 | [10-PLAN-traslado-waba-a-geema.md](./10-PLAN-traslado-waba-a-geema.md) | Traslado de la suite WABA a `geemastudio-server` ✅ F0–F5 (6-oct); F6 pendiente |

---

## Relación con otros planes

| Plan | Tema | Estado |
|------|------|--------|
| [02-PLAN-retrofit-tenant-id](../02-PLAN-retrofit-tenant-id.md) | `tenant_id` en BD + RLS | Fases A/B/C ✅; §11 ✅ (S1) |
| [03-PLAN-audit-paridad-zmlash-geema](../03-PLAN-audit-paridad-zmlash-geema.md) | Brief audit paridad | Audit ejecutado → `zm-tech/docs/audit/03-AUDIT-*.md` |
| [05-PLAN-ctwa-collages-cierre-intencion](../05-PLAN-ctwa-collages-cierre-intencion.md) | CTWA belleza (ZM) | Producto ZM; preset `spa-nails` en suite |

---

## Repos y paths

| Rol | Repo | Path local (WSL) |
|-----|------|------------------|
| **Producto SaaS** (app, panel, Edge/WABA, migraciones) | `aeom0/zm-tech` | `/home/alber/zm-tech` |
| Apps Geema | — | `apps/geemastudio-{web,mobile,server}` |
| Landing `zmlashnails.com` + docs operativos del salón | `aeom0/ZM-Lash-and-Nails-Beauty` | `/home/alber/ZM-Lash-and-Nails-Beauty` |
| Presets vertical | — | `packages/tenant-config` |

---

## Fuente de verdad

Esta carpeta vive **solo en Geema** (`zm-tech`). Desde oct-2026 ZM ya no guarda
copia ni hay script de sync; los cambios se editan aquí directamente.
