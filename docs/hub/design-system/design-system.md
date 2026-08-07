# Hub — Design System overview (ZM Control)

**Producto:** Panel interno ZM Tech (ops: clientes, proyectos, leads, tickets)  
**Estética:** ZM Control — familia landing (violeta + carbón)  
**Owner:** Alberto / ZM Tech  
**Actualizado:** 2026-08-01

## Stack UI

| Superficie | Stack |
|------------|-------|
| Web panel | Next.js 16 · React 19 · Tailwind v4 · Lucide · puerto 3004 |
| Diseño | pen.dev / Pencil (`.pen`) |
| Datos | Supabase Auth + RLS (`hub_*`) |

No hay app mobile en el MVP.

## Fuentes de verdad

| Capa | Path |
|------|------|
| Tokens + shell | `docs/hub/design/hub-shell.pen` |
| Tokens código | `docs/hub/design/tokens.ts` → espejo `apps/hub/src/lib/theme.ts` |
| CSS runtime | `apps/hub/src/app/globals.css` |
| Este sistema | `docs/hub/design-system/` |
| Paleta canónica marca | `apps/landing/src/app/globals.css` |

## Brand rápido

- **Marca:** ZM Tech · Hub (ZM Control)
- **Acento:** violeta `#8B5CF6` (dark) / `#7C3AED` (light)
- **Secundario:** azul `#3B82F6` (links / info, no CTA principal)
- **Fondo dark:** `#050505`
- **Tipo:** Space Grotesk (display) · Inter (body)
- **Voz:** español LATAM/VE, operativo, sin marketing fluff
- **Uso:** interno — no páginas públicas

## Iconografía

- **Lucide** en diseño y web
- Tamaños: 16 / 18 / 20 en nav; hit target ≥ 44
- Sin emoji Unicode en UI (excepción solo WABA copy, fuera del Hub UI)

## Breakpoints / artboards

| Target | Frame |
|--------|-------|
| Mobile | 390 × 844 |
| Desktop shell | 1280 × 800 |
| Sidebar | 256 px |
| Content gutter | 16 (mobile) / 24 (desktop) |

## Anti-patterns

- Naranja RepMAX (`#FF6B00`) o teal del scaffold (`#3d9a8b`)
- Purple-on-white genérico / glow excesivo
- Cards con sombra pesada en dark (preferir borde + contraste de superficie)
- Strings hardcodeados en JSX (usar `content.ts`)
