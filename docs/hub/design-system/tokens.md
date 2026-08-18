# Tokens — Hub (ZM Control)

Nombres canónicos = variables Pencil (`$name`). Paridad con `docs/hub/design/tokens.ts` y `apps/hub/src/lib/theme.ts`.

Eje de tema: `mode: dark | light`.

Origen marca: `apps/landing/src/app/globals.css` (`--primary: #8b5cf6`, `--background: #050505`).

## Color — superficies

| Token              | Dark                     | Light     | Uso                         |
| ------------------ | ------------------------ | --------- | --------------------------- |
| `$bg`              | `#050505`                | `#F7F7FA` | Fondo de pantalla           |
| `$surface`         | `#0F0F14`                | `#FFFFFF` | Sidebar, paneles, cards     |
| `$surfaceElevated` | `#1A1A2E`                | `#F0F0F5` | Inputs, elevated / selected |
| `$border`          | `rgba(255,255,255,0.10)` | `#E4E4EC` | Bordes, separadores         |

## Color — texto

| Token            | Dark      | Light     | Uso                  |
| ---------------- | --------- | --------- | -------------------- |
| `$textPrimary`   | `#F5F5F7` | `#0F0F14` | Títulos, body fuerte |
| `$textSecondary` | `#8B97A8` | `#5B6475` | Subtítulos, hints    |
| `$textDisabled`  | `#55555F` | `#9AA1AC` | Disabled             |
| `$textInverse`   | `#050505` | `#FFFFFF` | Sobre `$accent`      |

## Color — marca y semántica

| Token          | Dark                    | Light     | Uso                      |
| -------------- | ----------------------- | --------- | ------------------------ |
| `$accent`      | `#8B5CF6`               | `#7C3AED` | CTA, nav activo, focus   |
| `$accentHover` | `#A78BFA`               | `#6D28D9` | Hover CTA                |
| `$accentSoft`  | `rgba(139,92,246,0.14)` | `#F3E8FF` | Wash / nav active bg     |
| `$secondary`   | `#3B82F6`               | `#2563EB` | Info / links secundarios |
| `$success`     | `#34D399`               | `#059669` | OK / resuelto            |
| `$warning`     | `#FBBF24`               | `#D97706` | Vencimiento próximo      |
| `$danger`      | `#F87171`               | `#DC2626` | Error / urgente          |
| `$info`        | `#60A5FA`               | `#2563EB` | Info neutra              |

**Regla:** no raw hex en componentes de app; usar CSS vars / `theme.ts`.

## Espacio

| Token            | px                        |
| ---------------- | ------------------------- |
| `$spaceXs`       | 4                         |
| `$spaceSm`       | 8                         |
| `$spaceMd`       | 12                        |
| `$spaceBase`     | 16                        |
| `$spaceLg`       | 20                        |
| `$spaceXl`       | 24                        |
| `$space2xl`      | 32                        |
| `$contentGutter` | 16 (móvil) / 24 (desktop) |

## Radio

| Token         | px   |
| ------------- | ---- |
| `$radiusSm`   | 4    |
| `$radiusMd`   | 8    |
| `$radiusLg`   | 12   |
| `$radiusFull` | 9999 |

## Tipografía

| Token            | Valor           |
| ---------------- | --------------- |
| `$fontDisplay`   | `Space Grotesk` |
| `$fontBody`      | `Inter`         |
| `$textTitle`     | 28 / semibold   |
| `$textCardTitle` | 18 / semibold   |
| `$textSubtitle`  | 16 / regular    |
| `$textButton`    | 14 / semibold   |
| `$textLabel`     | 13 / medium     |
| `$textNote`      | 12 / regular    |

Pesos: 400 · 500 · 600 · 700.

## Mapa a CSS (`globals.css`)

| Token              | CSS variable         |
| ------------------ | -------------------- |
| `$bg`              | `--background`       |
| `$surface`         | `--surface`          |
| `$surfaceElevated` | `--surface-elevated` |
| `$border`          | `--border`           |
| `$textPrimary`     | `--foreground`       |
| `$textSecondary`   | `--muted`            |
| `$accent`          | `--accent`           |
| `$accentHover`     | `--accent-hover`     |
| `$accentSoft`      | `--accent-soft`      |
| `$danger`          | `--danger`           |
