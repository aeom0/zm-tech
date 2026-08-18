# Visual style — ZM Control

## Dirección

Panel ops de la fábrica ZM Tech: misma familia visual que la landing (carbón profundo + violeta de acción). Dense pero legible. Dark-first; light es la misma estructura con tokens invertidos.

## Paleta emocional

- **Trabajo:** negros y violetas muy oscuros (`$bg` → `$surfaceElevated`)
- **Acción:** un solo acento violeta (CTA / nav activo)
- **Secundario:** azul solo para info / links, nunca compitiendo con el CTA
- **Status:** verde / ámbar / rojo solo para estados de negocio

## Atmósfera (permitida)

| Uso           | Receta                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Fondo app     | Radial wash `$accentSoft` esquina superior derecha → `$bg` (como `hero-gradient` landing, más sutil) |
| Opcional grid | Grid 40px al 3% opacidad (landing); en panel preferir sin grid o muy suave                           |
| Nav activo    | Borde izquierdo `$accent` + fondo `$accentSoft`                                                      |
| CTA primary   | Relleno `$accent` → hover `$accentHover`                                                             |

**Prohibido:** naranja RepMAX, teal scaffold, mesh purple genérico, glow neón, glassmorphism por defecto.

## Elevación

- Dark: borde 1px `$border` + contraste de superficie; sombra mínima
- Light: sombra suave en paneles (`#00000012`); CTA sin sombra pesada

## Tipografía

- Display (marca, títulos de página): Space Grotesk
- Body / forms / tablas: Inter
- Jerarquía por tamaño/peso/color

## Densidad

- Login: centrado, una card, mucho aire
- Panel: sidebar fija + main; listas densas con padding 12–16
- Empty states: un icono, título, una línea de ayuda — sin ilustraciones decorativas

## Checklist de calidad

- [ ] Contraste AA body/CTA en dark **y** light
- [ ] Hit ≥ 44
- [ ] Selected = borde + color + icono (no solo color)
- [ ] Sin emoji Unicode
- [ ] Un solo acento competitivo por vista
- [ ] Móvil 390 sin scroll horizontal
