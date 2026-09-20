# CLAUDE.md — zm-tech

@AGENTS.md

## Claude Code

- Skills: `.claude/skills` → symlink a `.cursor/skills` (entrada: `SKILLS.md`, skills de producto).
- MCP de este repo (`.mcp.json`): `ClaudeSupabase`, `SupabaseZMTech`. No confundir con conectores de claude.ai.
- Conectores de claude.ai desactivados: `disableClaudeAiConnectors: true` en `~/.claude/settings.json` (global). Apaga Gmail/Drive/Slack/etc. que inflaban el contexto; **no** afecta los MCP de Supabase. Para un conector puntual: poner `false` y recargar.
- Product instructions: default `claude-md-or-agents-md` — este archivo importa `AGENTS.md`; no hace falta el modo "and". Nested: `docs/<producto>/CLAUDE.md` también importa su `AGENTS.md` local.
