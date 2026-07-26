# zm-tech

Monorepo de productos **ZM Tech** — pnpm + Turborepo.

## Productos

| Producto | Apps | Packages | Docs |
|---|---|---|---|
| **Landing** | `apps/landing` | — | [docs/landing](docs/landing/README.md) |
| **GeemaStudio** | `apps/geemastudio-web`, `apps/geemastudio-mobile`, `apps/geemastudio-server` | `@geemastudio/shared-schema`, `@geemastudio/tenant-config` | [docs/geemastudio](docs/geemastudio/README.md) |
| **OdentalPro** | `apps/odentalpro-web`, `apps/odentalpro-mobile`, `apps/odentalpro-server` | `@odentalpro/dental-schema` | [docs/odentalpro](docs/odentalpro/) |

Cada producto tiene su propia documentación (`README.md`, `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`) dentro de `docs/<producto>/`. Este README es solo el punto de entrada al monorepo.

## Requisitos

- Node 22+, pnpm 11 (`packageManager` en `package.json`)
- WSL Ubuntu (entorno de desarrollo del equipo)

## Inicio rápido

```bash
pnpm install

pnpm dev:landing        # apps/landing
pnpm dev:web            # apps/geemastudio-web
pnpm dev:mobile         # apps/geemastudio-mobile
pnpm dev:server         # apps/geemastudio-server
pnpm dev:odental:web    # apps/odentalpro-web
pnpm dev:odental:mobile # apps/odentalpro-mobile

pnpm build              # build de todo (turbo)
pnpm lint
pnpm check:types
```

Ver todos los scripts en [package.json](package.json).

## Estructura

```
apps/        # 3 productos, cada uno con sus apps (web/mobile/server)
packages/    # código compartido entre apps de un mismo producto
docs/        # documentación por producto (no skills/rules)
.cursor/     # skills y rules del monorepo — fuente de verdad para Cursor y Claude Code
```

## Claude Code / Cursor

Reglas y skills del monorepo viven en `.cursor/` (ver [.cursor/README.md](.cursor/README.md) y [.cursorrules](.cursorrules)); `.claude/skills` es symlink a `.cursor/skills`. Contexto adicional para Claude Code en [CLAUDE.md](CLAUDE.md).

## Changelog

Cambios a nivel monorepo (infra compartida, dependencias raíz, releases cross-producto) en [CHANGELOG.md](CHANGELOG.md). Cambios específicos de cada producto en `docs/<producto>/CHANGELOG.md`.
