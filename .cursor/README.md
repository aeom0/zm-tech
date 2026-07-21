# Cursor Rules - GeemaStudio

Directrices y reglas de desarrollo para Cursor en este proyecto. Monorepo apps/mobile, apps/web, packages/shared-schema, packages/tenant-config. Backend 100% Supabase (proyecto `xidjomlxpuosupymcsaj`).

## Estructura

```
.cursor/
├── README.md           # Este archivo
├── mcp.json            # Dos MCP Supabase: supabase-zm + supabase-geemastudio
├── skills/             # Skills del proyecto (fuente de verdad; ver abajo)
│   ├── SKILLS.md       # Guía de conocimiento GeemaStudio (Claude + Cursor)
│   ├── whatsapp-business-api/
│   ├── ui-ux-pro-max/
│   ├── ui-styling/
│   ├── design-system/
│   ├── brand/
│   └── meta-ads-manager/
└── rules/
    ├── arquitectura.mdc       # Estructura repo, stack, patrones GeemaStudio
    ├── business-logic.mdc    # Negocio: citas, servicios, inventario, finanzas
    ├── ui-patterns.mdc       # Tema, componentes, diseño
    ├── mobile-patterns.mdc   # Expo/React Native, navegación, listas
    ├── performance.mdc      # Optimización cliente/servidor
    ├── testing.mdc          # Patrones de tests
    ├── current-development.mdc  # Estado actual (Lunaris web `theme.ts`, Vercel builds, onboarding, tenant_settings)
    ├── idioma.mdc            # Español, jerga venezolana
    ├── development-access.mdc   # Acceso .env y archivos de desarrollo
    └── supabase-mcp.mdc        # Uso de MCP Supabase (dos proyectos)
```

## Skills — sync Cursor ↔ Claude Code

**Fuente de verdad**: `.cursor/skills/` (versionado en git).

Claude Code lee el mismo contenido porque `.claude/skills` es un **symlink** a `../.cursor/skills`. No hay dos copias: editar `SKILLS.md` o cualquier skill en `.claude/skills/...` o en `.cursor/skills/...` es el mismo archivo.

Tras un clone fresco, si el symlink no existe (p. ej. Windows sin soporte):

```bash
rm -rf .claude/skills && ln -s ../.cursor/skills .claude/skills
```

`.gitignore` ignora `.claude/*` salvo `!.claude/skills` para versionar el symlink y no subir `settings.local.json`.

## Raíz del proyecto

- **`.cursorrules`**: Reglas globales (documentación, convenciones, stack, comandos, paths, MCP). Cursor las aplica siempre.

## Formato de los .mdc

Cada archivo en `rules/` usa frontmatter con `description`, `globs` y opcionalmente `alwaysApply: true`.

## MCP Supabase — Dos proyectos

El archivo `.cursor/mcp.json` define **dos** servidores:

| Clave en mcp.json   | Proyecto Supabase        | Uso en este repo (GeemaStudio)     |
|---------------------|---------------------------|----------------------------------|
| `supabase-geemastudio` | `xidjomlxpuosupymcsaj`    | **Sí** — BD, SQL, tipos, migraciones |
| `supabase-zm`       | `udelxwwnyivknslueerr`    | Solo referencia/consulta ZM     |

- Para trabajar en **GeemaStudio**: usar el servidor **supabase-geemastudio** (list_tables, execute_sql, apply_migration, generate_typescript_types). El proyecto ya viene configurado en la URL del MCP; no hace falta pasar `project_id`.
- Cursor puede mostrar nombres con prefijo del workspace (ej. `project-0-GeemaStudio (raíz)-supabase-geemastudio`). Elegir el que corresponda a GeemaStudio para no mezclar BDs.
- Autenticación: Cursor solicita login en Supabase la primera vez (OAuth en navegador).
