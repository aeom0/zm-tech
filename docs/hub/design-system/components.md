# Components — Hub

Specs mínimas para el shell y Fase 1. Estados: default / hover / active / disabled / focus.

## Button primary

| Prop       | Default        | Hover          | Active                | Disabled           |
| ---------- | -------------- | -------------- | --------------------- | ------------------ |
| Background | `$accent`      | `$accentHover` | `$accent` (press 96%) | `$surfaceElevated` |
| Text       | `$textInverse` | igual          | igual                 | `$textDisabled`    |
| Radius     | `$radiusMd`    |                |                       |                    |
| Height     | 44             |                |                       |                    |
| Font       | `$textButton`  |                |                       |                    |

Uso: submit login, “Guardar”, “Convertir a cliente”.

## Button secondary / ghost

- Secondary: borde `$border`, texto `$textPrimary`, hover borde `$accent`
- Ghost: sin borde, texto `$textSecondary`, hover texto `$textPrimary`

## Input

| Prop        | Default            | Focus                | Error     |
| ----------- | ------------------ | -------------------- | --------- |
| Background  | `$surfaceElevated` | igual                | igual     |
| Border      | `$border`          | `$accent` + ring 1px | `$danger` |
| Text        | `$textPrimary`     |                      |           |
| Placeholder | `$textSecondary`   |                      |           |
| Height      | 44                 |                      |           |
| Radius      | `$radiusMd`        |                      |           |

Label siempre visible encima (no placeholder-only).

## Sidebar nav item

| Estado                 | Estilo                                                   |
| ---------------------- | -------------------------------------------------------- |
| Idle                   | texto `$textSecondary`, icono 20, padding 10–12          |
| Hover                  | texto `$textPrimary`                                     |
| Active                 | borde-l 2px `$accent`, bg `$accentSoft`, texto `$accent` |
| Disabled (fase futura) | opacidad 50%, cursor not-allowed, badge “Próximamente”   |

Ancho sidebar: 256px. Overlay móvil + slide.

## Badge de estado

Chips compactos (cliente / proyecto / ticket):

| Variante | Fondo              | Texto            |
| -------- | ------------------ | ---------------- |
| Neutral  | `$surfaceElevated` | `$textSecondary` |
| Accent   | `$accentSoft`      | `$accent`        |
| Success  | soft green         | `$success`       |
| Warning  | soft amber         | `$warning`       |
| Danger   | soft red           | `$danger`        |

Radius `$radiusFull` o `$radiusSm`. Sin emoji.

## Empty state

- Icono Lucide 20–24 en caja `$accentSoft`
- Título `$textCardTitle`
- Body `$textSecondary` máx. 2 líneas
- CTA opcional (primary o secondary)

## Table / list row

- Altura fila ~48–56
- Separador `$border`
- Hover: `$surfaceElevated` sutil
- Columnas densas; números tabulares si hay montos USD
