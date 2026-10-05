# Consolidación documental ZM Lash → GeemaStudio

> **Estado (5-oct-2026): consolidación ejecutada.** Geema es la única fuente de
> verdad de planes y migración. ZM conserva solo docs operativos de lo que sigue
> corriendo allí (landing, Edge Functions/WABA, BD compartida).

## Qué se hizo

- Serie canónica única `plans/01–18` en `docs/geemastudio/docs/plans/`
  (el detalle de migración vive en `plans/04-geema-migration/`).
- Eliminadas las copias con numeración antigua, el espejo `plans/geema-migration/`
  y los docs históricos (`GEEMASTUDIO_MIGRATION_GUIDE`, `GEEMASTUDIO_V1.3_PLAN`,
  `MONOREPO_MIGRACION`, `tech-debt/TD-001`).
- Los planes 06/07 y anexos de Look Preview se trajeron de ZM (más recientes).
- Retirado el sync ZM ↔ Geema (script + workflow); ZM ya no guarda `docs/plans/`.

## Equivalencias de numeración antigua

Los textos y CHANGELOGs anteriores a oct-2026 pueden citar el número viejo.

| Cita antigua | Plan vigente |
|---|---|
| ZM Plan 04 (CTWA collages) | 05 |
| Geema Plan 08 (comisiones) | 09 |
| Geema Plan 09 (landing multi-tenant) | 10 |
| Geema Plan 10 (CMS Mi Web) | 11 |
| Geema Plan 11 (suite WABA) | 12 |
| Geema Plan 12 (paridad panel) | 13 |
| Geema Plan 13 (CRM clientes) | 14 |
| `geema-migration/08-PLAN-retail-productos` | 15 |
| ZM `docs/plans/geema-migration/` | `plans/04-geema-migration/` |

Planes 01–03, 05–08 y 15–18 conservan su número.

## Reglas

1. Planes nuevos: siguiente número libre de la serie, en `plans/`. Sin terceras numeraciones.
2. Un tema = un documento activo. Si se reemplaza, borrar el viejo (el historial queda en git).
3. Lo que dependa del tenant ZM (copy, horarios, precios) se marca `tenant reference`.
4. Traslado de la suite WABA a Geema: ver `plans/04-geema-migration/10-PLAN-traslado-waba-a-geema.md`.
