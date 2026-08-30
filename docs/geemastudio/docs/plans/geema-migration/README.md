# Plan 05 — Migración GeemaStudio + suite WABA multi-vertical

> **Fecha:** 2026-08-28  
> **Autor:** Alberto Orta + análisis Cursor (agentes)  
> **Estado:** S1–S3 cerrados en prod/código (ago 2026); S4+ pendiente. Shadow Geema ↔ ZM **OK core** (APK SDK 56, 29-ago); plan paridad mobile **S5-C** documentado.
> **BD compartida:** `udelxwwnyivknslueerr` (ZM Lash = tenant #1 `zm-lash-nails`)

Documentación del análisis de convergencia entre **ZM Lash & Nails** (referencia en producción) y **GeemaStudio** (SaaS multi-tenant en `zm-tech`). Incluye bloqueadores para el 2.º tenant, estandarización WABA para barberías/peluquerías/spas, y roadmap por sprints.

---

## Índice

| # | Documento | Contenido |
|---|-----------|-----------|
| 00 | [00-RESUMEN-EJECUTIVO.md](./00-RESUMEN-EJECUTIVO.md) | Una página: dónde estamos, qué falta, decisión recomendada |
| 01 | [01-ESTADO-ACTUAL-Y-ARQUITECTURA.md](./01-ESTADO-ACTUAL-Y-ARQUITECTURA.md) | Dos repos, un Supabase, modelos de tenant, paridad ZM ↔ Geema |
| 02 | [02-BLOQUEADORES-MULTI-TENANT.md](./02-BLOQUEADORES-MULTI-TENANT.md) | Plan 02 §11 + bloqueadores adicionales (P0) |
| 03 | [03-WABA-SUITE-ESTANDARIZACION.md](./03-WABA-SUITE-ESTANDARIZACION.md) | Capas L1–L4, matriz CMS vs código, presets por vertical |
| 04 | [04-ROADMAP-SPRINTS.md](./04-ROADMAP-SPRINTS.md) | Sprints 1–7+, DoD, dependencias, estimaciones |
| 05 | [05-ADR-modelo-tenant.md](./05-ADR-modelo-tenant.md) | Decisión bridge `tenants` ↔ `tenant_settings` |
| 06 | [06-BRANDING-LOGO-Y-DESIGN-TOKENS.md](./06-BRANDING-LOGO-Y-DESIGN-TOKENS.md) | Logo tenant, Storage, push FCM por tenant, tokens ZM ↔ Geema, S5-B |
| 07 | [07-PARIDAD-MOBILE-ZM.md](./07-PARIDAD-MOBILE-ZM.md) | Shadow test APK SDK 56, gaps packs/promos/finanzas/agenda, S5-C |
| — | [SYNC.md](./SYNC.md) | Cómo mantener esta carpeta sincronizada entre repos |

---

## Relación con otros planes

| Plan | Tema | Estado |
|------|------|--------|
| [02-PLAN-retrofit-tenant-id](../02-PLAN-retrofit-tenant-id.md) | `tenant_id` en BD + RLS | Fases A/B/C ✅; §11 pendiente |
| [03-PLAN-audit-paridad-zmlash-geema](../03-PLAN-audit-paridad-zmlash-geema.md) | Brief audit paridad | Audit ejecutado → `zm-tech/docs/audit/03-AUDIT-*.md` |
| [04-PLAN-ctwa-collages-cierre-intencion](../04-PLAN-ctwa-collages-cierre-intencion.md) | CTWA belleza (ZM) | Producto ZM; preset `spa-nails` en suite |

---

## Repos y paths

| Rol | Repo | Path local (WSL) |
|-----|------|------------------|
| **Referencia prod (WABA, panel)** | `aeom0/ZM-Lash-and-Nails-Beauty` | `/home/alber/ZM-Lash-and-Nails-Beauty` |
| **Producto SaaS** | `aeom0/zm-tech` | `/home/alber/zm-tech` |
| Apps Geema | — | `apps/geemastudio-{web,mobile,server}` |
| Presets vertical | — | `packages/tenant-config` |

---

## Sincronización entre repos

**Fuente canónica:** esta carpeta en ZM (`docs/plans/geema-migration/`).

**Espejo:** `zm-tech/docs/geemastudio/docs/plans/geema-migration/`.

Ver [SYNC.md](./SYNC.md) para el script y reglas de edición.
