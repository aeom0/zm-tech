# Visual style — Industrial Dark

## Dirección

Producto B2B de piso de tienda: carbón, acero, naranja de acción. Dense pero respirable. Dark-first; light es la misma estructura con tokens invertidos.

## Paleta emocional

- **Trabajo:** negros y grises fríos (`$bg` → `$border`)
- **Acción:** un solo acento naranja (no competir con azul/verde de status)
- **Status:** verde / ámbar / rojo solo para inventario y errores

## Gradientes (permitidos)

Usar con moderación — atmósfera, no decoración:

| Uso | Receta |
|-----|--------|
| Splash | Radial `$accentSoft` → `$accentMuted` → `$bg` |
| Pantallas de paso | Linear top wash `$accentMuted` → `$bg` (~22%) |
| CTA primary | Linear `$accent` → `$accentHover` + sombra naranja suave |
| Card selected / VE featured | Linear `$surfaceElevated` → `$accentMuted` |
| Rocket / icon hero | Radial `$accentSoft` → `$surfaceElevated` |

**Prohibido:** purple/indigo glow, mesh genérico, glassmorphism por defecto.

## Elevación

- Dark: preferir borde 1–2px + contraste de superficie; sombra solo en featured / CTA / mock
- Light: sombra suave en cards (`#0000001A`) y CTA (`#E85C0040`)

## Tipografía

Inter en toda la UI. Jerarquía por tamaño/peso/color, no por familia display.

## Densidad

- Onboarding: una intención por pantalla; cards grandes
- Dashboard / POS: más denso; numerics tabulares cuando haya columnas

## Checklist de calidad

- [ ] Contraste AA body/CTA en dark **y** light
- [ ] Hit ≥ 44
- [ ] Selected = borde + color + icono (no solo color)
- [ ] Sin emoji Unicode
- [ ] Un solo acento competitivo por vista
