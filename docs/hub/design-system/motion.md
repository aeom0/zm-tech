# Motion — Hub

## Principios

- Motion comunica jerarquía y feedback, no decoración.
- Duración típica: **150–300ms**. Easing: `ease-out` para entradas, `ease-in-out` para toggles.
- Respetar `prefers-reduced-motion: reduce` — desactivar slides/fades no esenciales.

## Patrones

| Interacción              | Motion                             |
| ------------------------ | ---------------------------------- |
| Sidebar móvil open/close | translateX 200–250ms               |
| Hover nav / botones      | color 150ms                        |
| Login → panel            | navegación Next (sin splash largo) |
| Loading skeleton         | pulse opacity 1.2s loop            |
| Toast / error inline     | fade + 4px rise, 200ms             |

## Prohibido

- Animar `width` / `height` (usar transform/opacity)
- Parallax o partículas en el panel
- Spinners > 1s sin skeleton cuando hay layout conocido
