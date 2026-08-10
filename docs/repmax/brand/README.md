# Brand — RepMAX

Identidad visual canónica. **Fuente de verdad de assets:** `apps/repmax-web/public/brand/` (esta carpeta `docs/repmax/brand/` es espejo de documentación + copia de SVGs).

## Wordmark oficial

Casing: **REPMAX** (todo mayúsculas). Split de color:

| Parte | Tratamiento |
|-------|-------------|
| **REP** | Degradado cromo (`#FFF` → acero → `#8A939C`) |
| **MAX** | Degradado marca (`#FFB060` → `#FF6B00` → `#C62800`) |

Tipografía del wordmark: itálica racing (paths vectoriales, no depende de fuentes web).

Tagline oficial (variante): *repuestos al máximo* — `#FF6B00`, itálica.

## Archivos

| Archivo | Uso |
|---------|-----|
| `wordmark-repmax.svg` | Logo principal (nav, footer, login, sidebar) |
| `wordmark-repmax-tagline.svg` | Wordmark + tagline (hero, splash, marketing) |
| `icon-rm.svg` | Monograma **RM** transparente (favicon flex, chrome chico) |
| `icon-rm-app.svg` | RM en tile `#080808` con radio (referencia app icon) |
| `icon-rm-app-flat.svg` | RM en cuadrado plano (export iOS/Android / favicons) |

### Mobile (`apps/repmax-mobile/assets/`)

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `icon.png` | 1024×1024 | Ícono Expo / iOS |
| `adaptive-icon.png` | 1024×1024 | Android adaptive foreground (transparente + safe zone) |
| `splash.png` | 1284×400 | Splash (wordmark; bg `#080808` en `app.json`) |
| `favicon.png` | 48×48 | Expo web |
| `notification-icon.png` | 96×96 | Push Android: **blanco + alpha** (se tiñe con `#FF6B00`) |

Regenerar notificación (criterio zetaeme):

```bash
# Preferido si hay sharp:
node apps/repmax-mobile/scripts/generate-notification-icon.mjs
```

### Web favicons (`apps/repmax-web`)

| Archivo | Uso |
|---------|-----|
| `src/app/icon.png` | Favicon pestaña (Next App Router) |
| `src/app/apple-icon.png` | Apple touch |
| `public/favicon.ico` | Legacy / crawlers |
| `public/favicon-16x16.png` / `favicon-32x32.png` | Densidades |

## En código (web)

Usar el componente:

```tsx
import { BrandLogo } from "@/components/brand/BrandLogo";

<BrandLogo variant="wordmark" height={28} />
<BrandLogo variant="tagline" height={56} />
<BrandLogo variant="icon" height={32} />
```

No recrear `REP`/`MAX` con spans de texto en chrome de producto.

## Colores de marca (token)

| Token | Hex | Uso |
|-------|-----|-----|
| Accent | `#FF6B00` | CTA, MAX, notificaciones |
| Accent hover | `#FF8C3A` | Hover |
| Bg industrial | `#080808` / `#0D0D0D` | Fondos dark |
| Chrome | blanco → `#8A939C` | REP / R |

Paridad con design system: [`../design-system/tokens.md`](../design-system/tokens.md).

## In-app mobile

Carpeta: `apps/repmax-mobile/assets/brand/`

| Archivo | Uso UI |
|---------|--------|
| `wordmark-repmax.png` | Login / headers |
| `wordmark-repmax-tagline.png` | Splash nativo / marketing |
| `icon-rm.png` | Mark compacto |

Componente: `src/components/brand/BrandLogo.tsx`

```tsx
import { BrandLogo } from '../../components/brand/BrandLogo';

<BrandLogo variant="wordmark" width={220} />
```

Pantallas cableadas: `LoginScreen`, `OnboardingSplash`.

## Variante futura

La **X** del wordmark queda reservada para animaciones / accent (loading, stickers). No es el ícono de app.

## Checklist al cambiar logo

1. Actualizar SVG en `apps/repmax-web/public/brand/`
2. Copiar a `docs/repmax/brand/`
3. Regenerar mobile assets + favicons si cambió RM
4. Verificar `BrandLogo` en nav / login / dashboard
