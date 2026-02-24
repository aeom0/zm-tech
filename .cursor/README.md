# Cursor Rules - ZM Lash & Nails Beauty

Directrices y reglas de desarrollo para Cursor en este proyecto. Sincronizadas con CLAUDE.md; monorepo apps/mobile, apps/web, packages/shared-schema; Supabase como backend de mobile.

## Estructura

```
.cursor/
├── README.md           # Este archivo
├── mcp.json            # MCP Supabase (proyecto udelxwwnyivknslueerr)
└── rules/
    ├── arquitectura.mdc       # Estructura repo, stack, patrones
    ├── business-logic.mdc    # Negocio: citas, servicios, inventario, finanzas
    ├── ui-patterns.mdc       # Tema, componentes, diseño
    ├── mobile-patterns.mdc   # Expo/React Native, navegación, listas
    ├── performance.mdc      # Optimización cliente/servidor
    ├── testing.mdc          # Patrones de tests (cuando se añadan)
    ├── current-development.mdc  # Estado actual (MVP, local, stack)
    ├── idioma.mdc            # Español, jerga, locale Perú/S/
    ├── development-access.mdc   # Acceso .env y archivos de desarrollo
    └── supabase-mcp.mdc        # Uso de MCP Supabase (list_tables, execute_sql, etc.)
```

## Raíz del proyecto

- **`.cursorrules`**: Reglas globales (documentación, convenciones, stack, comandos, paths). Cursor las aplica siempre.

## Formato de los .mdc

Cada archivo en `rules/` usa frontmatter:

```yaml
---
description: Descripción breve
globs:
  - "client/**/*"
  - "server/**/*"
alwaysApply: false   # true solo para reglas que deban aplicarse en todo el repo
---
```

- **globs**: Archivos o carpetas en los que la regla es relevante (ahora usan `apps/mobile/`, `apps/web/`, `packages/`).
- **alwaysApply**: Si es `true`, Cursor considera la regla en cualquier contexto (ej. `current-development.mdc`, `development-access.mdc`).

## MCP Supabase

El archivo `.cursor/mcp.json` configura el servidor MCP de Supabase scoped al proyecto ZM. Tras añadirlo, Cursor te pedirá autenticarte en Supabase (navegador). Luego podrás usar herramientas como `list_tables`, `execute_sql`, `generate_typescript_types` para explorar y trabajar con la BD.
