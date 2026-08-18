# Design System — Hub ZM Tech (ZM Control)

Sistema visual del panel interno de la fábrica. Familia de marca **landing ZM Tech** (violeta + carbón). Dark-first; light vía tokens.

## Cómo usarlo (agentes)

1. Leer este `README.md`
2. Leer [`design-system.md`](./design-system.md) (stack, brand, punteros)
3. Abrir solo el archivo que necesite la tarea (`tokens.md`, `components.md`, etc.)

## Archivos

| Archivo                                  | Cuándo                                   |
| ---------------------------------------- | ---------------------------------------- |
| [`design-system.md`](./design-system.md) | Siempre — overview, stack                |
| [`tokens.md`](./tokens.md)               | Color, espacio, tipo, radio              |
| [`components.md`](./components.md)       | Botones, input, sidebar, badges, empty   |
| [`visual-style.md`](./visual-style.md)   | Estética ZM Control, grid, anti-patterns |
| [`motion.md`](./motion.md)               | Transiciones UI                          |
| [`voice.md`](./voice.md)                 | Copy VE / LATAM, CTAs, errores           |

## Fuentes de verdad

| Capa                        | Path                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Paleta origen (gana en hex) | `apps/landing/src/app/globals.css`                                                                |
| Tokens TS / CSS             | [`../design/tokens.ts`](../design/tokens.ts) · `apps/hub/src/lib/theme.ts` · `globals.css`        |
| Canvas (layout / comps)     | [`../design/hub-shell.pen`](../design/hub-shell.pen) · [`hub-shell.png`](../design/hub-shell.png) |

Si el `.pen` diverge en hex, **código y `tokens.md` mandan** (landing `#8B5CF6` / `#050505`).

## Principios

1. **Misma familia que la landing** — acento violeta `#8B5CF6`, no naranja RepMAX ni teal del scaffold.
2. **Dark first.** Light es variante de tokens (`mode: light`), no un rediseño.
3. **Sin emojis en UI.** Lucide.
4. **Código alineado.** Cambios de token → actualizar `.pen` variables, `tokens.ts` y `globals.css`.

## Estado

| Pieza                | Estado                                            |
| -------------------- | ------------------------------------------------- |
| Design system docs   | v0.1 — 2026-08-01                                 |
| Tokens TS dark/light | Listo                                             |
| Canvas shell         | Ver `../design/`                                  |
| Toggle light en app  | Pendiente (tokens documentados; app arranca dark) |
