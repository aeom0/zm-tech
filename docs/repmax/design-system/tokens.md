# Tokens — RepMAX

Nombres canónicos = variables Pencil (`$name`). Paridad esperada con `apps/repmax-mobile/src/utils/theme.ts`.

Eje de tema: `mode: dark | light`.

## Color — superficies

| Token              | Dark      | Light     | Uso                              |
| ------------------ | --------- | --------- | -------------------------------- |
| `$bg`              | `#0D0D0D` | `#F7F7F8` | Fondo de pantalla                |
| `$surface`         | `#1A1A1A` | `#FFFFFF` | Cards, paneles                   |
| `$surfaceElevated` | `#242424` | `#F0F1F3` | Elevated / selected / icon boxes |
| `$border`          | `#2E2E2E` | `#DADDE2` | Bordes, separadores              |

## Color — texto

| Token            | Dark      | Light     | Uso                    |
| ---------------- | --------- | --------- | ---------------------- |
| `$textPrimary`   | `#F5F5F5` | `#111318` | Títulos, body fuerte   |
| `$textSecondary` | `#9E9E9E` | `#5A6270` | Subtítulos, hints      |
| `$textDisabled`  | `#555555` | `#9AA1AC` | Disabled / legal menor |
| `$textInverse`   | `#0D0D0D` | `#FFFFFF` | Sobre `$accent`        |

## Color — marca y semántica

| Token           | Dark      | Light     | Uso                              |
| --------------- | --------- | --------- | -------------------------------- |
| `$accent`       | `#FF6B00` | `#E85C00` | CTA, progress activo, selected   |
| `$accentHover`  | `#FF8C3A` | `#FF7A26` | Hover / extremo de gradiente CTA |
| `$accentMuted`  | `#1A120E` | `#FFF3EB` | Wash de fondo / card selected    |
| `$accentSoft`   | `#24160F` | `#FFE8D6` | Glow radial splash / rocket      |
| `$gradientEdge` | `#0D0D0D` | `#F7F7F8` | Extremo de gradiente de pantalla |
| `$steel`        | `#607D8B` | `#607D8B` | Icono idle                       |
| `$steelLight`   | `#90A4AE` | `#78909C` | Icono secundario                 |
| `$success`      | `#4CAF50` | igual     | Stock OK                         |
| `$warning`      | `#FFC107` | igual     | Stock bajo                       |
| `$error`        | `#F44336` | igual     | Error / toast                    |
| `$info`         | `#2196F3` | igual     | Info / “nuevo”                   |

**Regla:** no raw hex en nodos renderizados del `.pen` (salvo swatches de tema tenant Turbo/Acero/Terreno).

## Espacio

| Token            | px  |
| ---------------- | --- |
| `$spaceXs`       | 4   |
| `$spaceSm`       | 8   |
| `$spaceMd`       | 12  |
| `$spaceBase`     | 16  |
| `$spaceLg`       | 20  |
| `$spaceXl`       | 24  |
| `$space2xl`      | 32  |
| `$contentGutter` | 20  |

Ritmo de bloques en onboarding: 16 / 20 / 24 según prioridad.

## Radio

| Token         | px   |
| ------------- | ---- |
| `$radiusSm`   | 4    |
| `$radiusMd`   | 8    |
| `$radiusLg`   | 12   |
| `$radiusXl`   | 16   |
| `$radiusFull` | 9999 |

## Tipografía

| Token            | Valor   |
| ---------------- | ------- |
| `$fontBody`      | `Inter` |
| `$textTitle`     | 28      |
| `$textCardTitle` | 18      |
| `$textSubtitle`  | 16      |
| `$textButton`    | 16      |
| `$textLabel`     | 13      |
| `$textNote`      | 12      |

Pesos: regular 400 · medium 500 · semibold 600 · bold 700.  
Título pantalla: máx. 2 líneas. Subtítulo: 1–2 líneas.

## Mapa a código mobile

| Pencil             | `theme.ts`                 |
| ------------------ | -------------------------- |
| `$bg`              | `colors.bg.primary`        |
| `$surface`         | `colors.bg.secondary`      |
| `$surfaceElevated` | `colors.bg.elevated`       |
| `$border`          | `colors.bg.border`         |
| `$textPrimary`     | `colors.text.primary`      |
| `$textSecondary`   | `colors.text.secondary`    |
| `$accent`          | `colors.brand.orange`      |
| `$accentHover`     | `colors.brand.orangeLight` |
| `$steel`           | `colors.brand.steel`       |

Tokens Pencil nuevos (`accentMuted`, `accentSoft`, `gradientEdge`) aún no existen en `theme.ts` — añadir al cablear high-fi.
