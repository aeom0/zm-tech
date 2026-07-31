# ROADMAP — zm-tech

Índice de roadmaps por producto. El detalle de cada uno vive en su propia carpeta; este archivo solo da la vista consolidada del estado del monorepo.

## Landing

Sitio corporativo bilingüe + cotizador + propuestas. En producción ([zmtechdev.com](https://zmtechdev.com)).

Próximo foco: iterar proof/casos reales. Ver [docs/landing/ROADMAP.md](docs/landing/ROADMAP.md) y [docs/landing/UX-BACKLOG.md](docs/landing/UX-BACKLOG.md).

## GeemaStudio

Objetivo actual: llegar a beta v1.5 de producción.

Ver [docs/geemastudio/ROADMAP.md](docs/geemastudio/ROADMAP.md) para el detalle de sprints y criterios de aceptación.

## OdentalPro

Apps dedicadas + schema dental multi-tenant. Fases 0–2 hechas; cerrar historia clínica y avanzar a planes / consentimientos / beta tenant #1.

Ver [docs/odentalpro/ROADMAP.md](docs/odentalpro/ROADMAP.md). Arquitectura: [docs/odentalpro/03-PLAN-odentalpro-apps-dedicadas.md](docs/odentalpro/03-PLAN-odentalpro-apps-dedicadas.md).

## Monorepo (transversal)

- Skills y rules centralizados en `.cursor/` con sync a `.claude/skills` — hecho (jul 2026).
- Convención: cada producto tiene `docs/<producto>/ROADMAP.md` (+ README / CHANGELOG / CLAUDE según aplique).
- Ver [CHANGELOG.md](CHANGELOG.md) para el historial de cambios de infraestructura compartida.
