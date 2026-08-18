# Onboarding — patrones

Flujo V2 (auth choice + 6 pantallas de wizard). Diseño: `design/onboarding.pen`. Spec: `design/onboarding-ux-spec.md`. Prototype: `design/prototype/index.html`.

## Pasos

| # | Pantalla | Avance |
|---|----------|--------|
| 00 | Auth choice | Crear cuenta → wizard \| Iniciar sesión → Login directo \| Explorar demo |
| 01 | Splash | Auto ~1.1s |
| 02 | País | Tap card (VE destacada; grid otros) |
| 03 | Vehículos | Tap card → auto |
| 04 | Negocio | Tap card → auto |
| 05 | Tema | Select + CTA Continuar |
| 06 | Preview | Mock dashboard + CTA completa onboarding directo |

Ruta cableada en `apps/repmax-mobile`: `AppNavigator` decide Auth choice → wizard/Login (ver `OnboardingAuthChoice.tsx`, `OnboardingNavigator.tsx`). La antigua pantalla "07 - Decisión" fue removida del código (sigue en el `.pen` como referencia); sus dos funciones (crear cuenta, demo) quedaron en Preview y en Auth choice respectivamente.

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
- Preview: “Así luce tu tienda” / CTA “Se ve brutal — ¡empecemos!” (completa el onboarding)
- Auth choice: “Gestiona tu tienda de repuestos” / “Crear cuenta” / “Iniciar sesión” / “Explorar con demo”

## Países (sin emoji)

VE featured · CO · PE · EC · DO — badge de código, no banderas.

## Opciones de datos

Ver `apps/repmax-mobile/src/constants/onboarding.ts` (`VEHICLE_OPTIONS`, `BUSINESS_OPTIONS`, `THEMES`, `COUNTRIES`).

## Cableado próximo

Alinear pantallas RN a este high-fi: tokens nuevos, ProgressBar segmentado, SelectionCard estados, CTAs con gradiente, timings de splash.
