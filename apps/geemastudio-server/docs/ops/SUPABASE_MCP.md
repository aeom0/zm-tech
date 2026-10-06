# Supabase MCP — nombres canónicos (ZM Lash / Geema)

## Proyecto

- **Ref**: `udelxwwnyivknslueerr` (ZM Lash = Geema, cuenta orta.1)
- **Nombre canónico** (Claude Desktop / Claude Code / Cursor): **`ClaudeSupabase`**
- **Config Claude**: `.mcp.json` → `ClaudeSupabase` (stdio + `SUPABASE_ZMLASH_PAT`)
- **Config Cursor**: `.cursor/mcp.json` → misma clave `ClaudeSupabase`

## Identificador en el agente Cursor

Tras Reload Window:

`project-0-ZM-Lash-and-Nails-Beauty-ClaudeSupabase`

(antes se llamaba `…-supabase-zm`). No usar `user-SupabaseZMTech` ni otros MCP de la cuenta zmtechdev para SQL de este salón.

Si no aparece: **Developer: Reload Window** y re-auth OAuth/PAT si Cursor lo pide.

## Otros nombres (no son esta BD)

| Nombre | Ref | Uso |
| --- | --- | --- |
| `SupabaseZMTech` | `llaco…` | Hub zm-tech |
| `SupabaseNaturalForce` | `ddfm…` | naturalforce-suite |
| `Supabase` | `laves…` | zetaeme-enterprise |
| `SupabaseYla` | `mwvg…` | pausado |

## Herramientas útiles

- `get_advisors` — `type`: `security` | `performance`
- `execute_sql` — `{ "query": "..." }`
- `list_tables`, `apply_migration`, etc.

## Alternativa sin MCP

`psql "$DATABASE_URL"` desde la raíz (`.env` con URL del pooler ZM).
