# Cursor — zm-tech

Skills y rules del monorepo. Misma fuente para Cursor y Claude Code.

## Estructura

```
.cursor/
├── README.md
├── skills/              # Fuente de verdad (git)
│   ├── SKILLS.md        # Entrada monorepo
│   ├── geemastudio.md
│   └── <skill>/SKILL.md
└── rules/               # Reglas .mdc (globs por producto)
    ├── arquitectura.mdc
    ├── business-logic.mdc
    ├── current-development.mdc
    ├── development-access.mdc
    ├── idioma.mdc
    ├── mobile-patterns.mdc
    ├── performance.mdc
    ├── supabase-mcp.mdc
    ├── testing.mdc
    └── ui-patterns.mdc
```

Raíz: `.cursorrules` (reglas globales del monorepo).

## Sync Cursor ↔ Claude

```
.cursor/skills/     ← fuente de verdad
.claude/skills      → symlink a ../.cursor/skills
```

Tras clone fresco:

```bash
rm -rf .claude/skills && ln -s ../.cursor/skills .claude/skills
```

`.gitignore`: ignora `.claude/*` salvo `!.claude/skills`.

## Docs

`docs/geemastudio/`, `docs/landing/`, `docs/odentalpro/` son documentación de producto.
**No** guardan skills ni rules — eso vive solo aquí.
