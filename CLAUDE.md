# CLAUDE.md — zm-tech (monorepo)

Contexto para Claude Code en la raíz del monorepo `zm-tech` (pnpm + Turborepo, 3 productos: Landing, GeemaStudio, OdentalPro).

## Prioridad de lectura

1. **[.cursorrules](.cursorrules)** — reglas globales del monorepo (paths, comandos, comportamiento AI). Fuente de verdad, compartida con Cursor.
2. `.cursor/skills/SKILLS.md` + skill del producto en el que estás trabajando (`geemastudio.md`, `odentalpro-dev`, `zmtech-dev`) — vía `.claude/skills` (symlink a `.cursor/skills`).
3. Rules en `.cursor/rules/*.mdc` según el glob del archivo que estás tocando.
4. `docs/<producto>/CLAUDE.md` si existe, para contexto específico de ese producto (p. ej. [docs/landing/CLAUDE.md](docs/landing/CLAUDE.md)).

## Overview de producto

Ver [README.md](README.md) para la tabla de productos/apps/packages y comandos de arranque, y [ROADMAP.md](ROADMAP.md) para el estado de cada uno.

## Reglas rápidas

- No crear `.md` sin que se pida explícitamente.
- No mezclar schema de un producto con otro (`@geemastudio/*` vs `@odentalpro/*`).
- No modificar Supabase de producción sin instrucción explícita.
- UI y nombres de negocio en español LATAM — TypeScript estricto.
- **Sin emojis Unicode en UI** (web, mobile, panel, OdentalPro): usar íconos SVG (Lucide en web; `@expo/vector-icons` o Lucide en mobile). **Excepción única:** contenido o plantillas de mensajes **WABA** (WhatsApp Business API), cuando exista esa integración — ahí los emojis pueden formar parte del copy del chat.

Detalle completo de estas reglas en [.cursorrules](.cursorrules).
