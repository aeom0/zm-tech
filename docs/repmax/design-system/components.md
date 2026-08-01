# Componentes — RepMAX (onboarding)

Definidos como `reusable: true` en `docs/repmax/design/onboarding.pen`. Instanciar con `ref` + `descendants`.

## Inventario

| Componente | Rol | Código mobile actual |
|------------|-----|----------------------|
| `ProgressBar` | 5 segmentos; filled = pasos hechos/actual | `OnboardingProgressBar` |
| `SelectionCard` | Opción idle | `SelectionCard` (selected=false) |
| `SelectionCardSelected` | Opción activa (borde accent + check) | `SelectionCard` (selected=true) |
| `ButtonPrimary` | CTA principal (gradiente accent) | Touchable footer |
| `ButtonSecondary` | CTA secundario / demo | Touchable outline |
| `ToastError` | Error demo/login | (parcial / alert) |
| `ScreenHeader` | Paso + título + subtítulo | Text locales en screens |

## Contratos

### ProgressBar
- 5 segmentos, gap `$spaceXs`, alto 4, radio full
- Activo: `$accent` · Pendiente: `$surfaceElevated`
- Animación fill: 300ms (ver `motion.md`)
- Override por pantalla vía `descendants` de cada segmento

### SelectionCard / Selected
- Row: icon 52 · textos · (check solo selected)
- Stroke 2 · radio `$radiusLg` · padding `$spaceBase`
- Press: scale 0.96 spring ~120ms
- Auto-advance en Vehículos / Negocio; en Tema solo marca selected
- Metadata: `onboarding.option_select`

### ButtonPrimary
- Alto 52 (≥44 hit) · radio `$radiusLg`
- Fill: linear `$accent` → `$accentHover`
- Label: `$textInverse`, semibold 16
- Disabled: `$surfaceElevated` + `$textDisabled`
- Metadata: `onboarding.cta_primary`

### ButtonSecondary
- Mismo hit que primary
- Fill surface / elevated sutil · stroke `$border`
- No competir con accent

### ScreenHeader
- Step label accent · título bold · subtítulo secondary
- El shell aplica gutter horizontal (20)

### ToastError
- Icon alert + mensaje · stroke `$error` · role alert
- Auto-dismiss ~4s en código

## Temas tenant (no son componentes de chrome)

Cards de identidad visual (Turbo / Acero / Terreno): swatch circular con color de marca del tenant. El chrome (bg, tipografía, CTA naranja del sistema) **no** cambia al elegir tema — solo acentos de producto / preview.
