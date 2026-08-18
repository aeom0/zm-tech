# Motion — RepMAX

Valores del flow map (`UXStates / FlowMap` en `onboarding.pen`) y del prototipo HTML.

## Defaults

| Interacción | Duración | Easing / nota |
|-------------|----------|----------------|
| Cambio de pantalla | 180ms | opacity + translateY 12px, ease-out |
| Press selección | 120ms | scale → 0.96, spring |
| Progress fill | 300ms | width ease |
| Splash logo (sesión / logo tenant, futuro) | 600ms | fade-in |
| Splash tagline (sesión / logo tenant, futuro) | 400ms | (delay ~200ms) |
| Splash hold de sesión | ~1.0–1.2s | placeholder en prototipo HTML; no es el onboarding de primera vez |

## Reduced motion

Si `prefers-reduced-motion: reduce` (o setting del SO):

- Cortes instantáneos (sin translate)
- Sin loops decorativos
- Micro-feedback ≤ 120ms puede quedarse

## Reglas

- Feedback visual < 100ms al tap
- No animar layout width/height de pantallas enteras (solo opacity/transform)
- Progress y CTA loading: min visible 300ms una vez mostrado
