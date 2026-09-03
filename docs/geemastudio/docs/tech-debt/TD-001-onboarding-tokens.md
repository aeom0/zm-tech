# TD-001 — Migrar valores mágicos a tokens en OnboardingBusinessTypeScreen

**Estado:** Resuelto (2026-04-03) — tokens `Onboarding`, `BorderRadius.card`, `Colors.*.backgroundSubtle`; layout alineado a `Onboarding.canvasBackground`.

**Archivo:** `apps/geemastudio-mobile/screens/onboarding/OnboardingBusinessTypeScreen.tsx`  
**Detectado por:** Cursor Agent (post-implementación subtypes, 2026-04-03)  
**Prioridad:** Baja — no afecta funcionalidad ni tipos  
**Bloquea beta:** No

---

## Problema

El componente tiene valores hardcodeados que deberían usar tokens del design system
(`BorderRadius`, `Spacing`, colores del tema) para mantener consistencia y facilitar
cambios globales.

## Valores a migrar

| Línea (aprox.)           | Valor actual                                | Token correcto                                                |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------- |
| `styles.card`            | `borderRadius: 20`                          | `BorderRadius.lg` (16) o nuevo token `BorderRadius.card` (20) |
| `styles.iconBg`          | `borderRadius: 24`                          | `BorderRadius.full` o `width/2` calculado                     |
| `CHIP_PILL_RADIUS = 999` | `999`                                       | `BorderRadius.full` (9999)                                    |
| `styles.check`           | `borderRadius: 11`                          | `BorderRadius.full` o `width/2` calculado                     |
| `styles.badge`           | `color: '#40E0D0'`                          | `theme.primary` o token `Colors.lunarisCyan`                  |
| `styles.titulo`          | `color: '#FFFFFF'`                          | `theme.text`                                                  |
| `styles.cardNombre`      | `color: '#FFFFFF'`                          | `theme.text`                                                  |
| `styles.subtitulo`       | `color: 'rgba(255,255,255,0.55)'`           | `theme.textMuted`                                             |
| `styles.cardDesc`        | `color: 'rgba(255,255,255,0.5)'`            | `theme.textMuted`                                             |
| `chipInactivo`           | `backgroundColor: 'rgba(255,255,255,0.06)'` | `theme.backgroundSecondary` o token                           |
| `chipInactivo`           | `borderColor: 'rgba(255,255,255,0.12)'`     | `theme.border`                                                |
| `card`                   | `borderColor: 'rgba(255,255,255,0.10)'`     | `theme.border`                                                |
| `card`                   | `backgroundColor: 'rgba(255,255,255,0.04)'` | `theme.backgroundSubtle`                                      |

## Notas

- `BorderRadius.full` en `constants/theme.ts` actualmente es `9999` — `CHIP_PILL_RADIUS`
  puede reemplazarse directamente.
- `borderRadius: 20` en las cards no tiene token equivalente hoy. Evaluar si se añade
  `BorderRadius.card = 20` al design system o se unifica a `BorderRadius.xl` (24).
- Los colores de texto inline (`#FFFFFF`, `rgba(255,255,255,0.55)`) son seguros en
  onboarding (fondo siempre oscuro `#111318`), pero idealmente deben venir de `theme`
  para soportar posibles variantes de tema futuras.
- El badge `#40E0D0` (turquesa Lunaris) no tiene token en `theme` — evaluar añadir
  `theme.accent2` o `Colors.lunarisAccent` en el pase de tokens.

## Alcance del fix

1. Revisar/ampliar `BorderRadius` en `apps/geemastudio-mobile/constants/theme.ts` si hace falta
2. Reemplazar todos los valores de la tabla en `OnboardingBusinessTypeScreen.tsx`
3. `pnpm check:types` — no debe haber errores
4. Smoke test visual en Android: cards, chips activos/inactivos, check mark
