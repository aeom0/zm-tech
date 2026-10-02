# Changelog — zm-tech (monorepo)

Cambios a nivel monorepo: infraestructura compartida, configuración raíz, dependencias comunes, releases cross-producto. Los cambios específicos de cada producto se documentan en `docs/<producto>/CHANGELOG.md`.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Unreleased]

### Documentación

- Plan 11 (Mi Web CMS, Modo B/D): Fase 5 con datos cargados (8 reseñas reales de Google, `web_stat_rating` 5.0) y código en PR de Lash; `web_team` con 2 chicas confirmado como intencional.

### Añadido

- **`@zmtech/tenant-config`**: `COUNTRY_PRESETS` + `salon-holidays` (catálogos PE/VE, franja efectiva); UNIQUE `salon_holidays (tenant_id, date)` en shared BD.
- Documentación raíz del monorepo: `README.md`, `ROADMAP.md`, `CLAUDE.md`, `CHANGELOG.md`.

### Cambiado

- **Skills y rules — centralización** _(jul 2026)_: consolidados en `.cursor/skills/` y `.cursor/rules/*.mdc` como fuente única, con `.claude/skills` como symlink para Claude Code.
- **OdentalPro — apps dedicadas** _(jul 2026)_: scaffold de `apps/odentalpro-web`, `apps/odentalpro-mobile`, `apps/odentalpro-server` y `packages/@odentalpro/dental-schema`, con Supabase propio multi-tenant.

### Histórico

- Configuración inicial del monorepo `zm-tech` (workspace pnpm, Turborepo, lockfile) y aplanado de GeemaStudio dentro de la estructura monorepo.
