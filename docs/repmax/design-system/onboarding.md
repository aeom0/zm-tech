# Onboarding — patrones

Flujo V2 (7 pantallas). Diseño: `design/onboarding.pen`. Spec: `design/onboarding-ux-spec.md`. Prototype: `design/prototype/index.html`.

## Pasos

| # | Pantalla | Avance |
|---|----------|--------|
| 01 | Splash | Auto ~1.1s |
| 02 | País | Tap card (VE destacada; grid otros) |
| 03 | Vehículos | Tap card → auto |
| 04 | Negocio | Tap card → auto |
| 05 | Tema | Select + CTA Continuar |
| 06 | Preview | Mock dashboard + CTA |
| 07 | Decisión | Crear cuenta \| Explorar demo → Auth |

## Shell por pantalla (02–06)

1. Status bar  
2. `ProgressBar` (step N/5)  
3. `ScreenHeader`  
4. Contenido  
5. Footer CTA solo si el paso lo requiere (05, 06)

## Copy canónico (VE)

- País: “¿Desde dónde operas?” / “Configuramos tu tienda para tu mercado.”
- Vehículos: “¿Con qué trabajas?” / “Cuadramos el sistema para tu inventario real.”
- Negocio: “¿Qué tipo de negocio tienes?”
- Tema: “Escoge tu identidad visual”
- Preview: “Así luce tu tienda” / CTA “Se ve brutal, continuar”
- Decisión: “Tu tienda está lista para arrancar” / “Crear mi cuenta gratis” / “Explorar con demo”

## Países (sin emoji)

VE featured · CO · PE · EC · DO — badge de código, no banderas.

## Opciones de datos

Ver `apps/repmax-mobile/src/constants/onboarding.ts` (`VEHICLE_OPTIONS`, `BUSINESS_OPTIONS`, `THEMES`, `COUNTRIES`).

## Cableado próximo

Alinear pantallas RN a este high-fi: tokens nuevos, ProgressBar segmentado, SelectionCard estados, CTAs con gradiente, timings de splash.
