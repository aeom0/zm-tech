# Guía de Deployment — GeemaStudio

GeemaStudio no tiene servidor propio. El backend es **Supabase** (Auth + PostgREST). Se despliegan solo el frontend web y la app móvil.

## Requisitos previos

- Node.js 22+, pnpm (ver `packageManager` en `package.json` raíz)
- Cuenta Supabase (proyecto `udelxwwnyivknslueerr`)
- Cuenta Vercel (web)
- Cuenta Expo/EAS (móvil)

## Backend (Supabase)

El “backend” ya está en Supabase:

- **Auth**: email/password; perfiles y RLS por rol (dev/owner/staff).
- **Base de datos**: schema aplicado con `pnpm db:push` o SQL Editor (ver [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md)).
- **tenant_settings**: configuración del negocio; se crea/actualiza desde el onboarding en la app.

No hay que desplegar ningún servidor Express ni Railway. Variables de Supabase (URL, anon key, service role) se usan en build/deploy de web y mobile.

## Deployment frontend web (Vercel)

### 1. Preparar

```bash
pnpm install
pnpm build:web
```

El output está en `apps/geemastudio-web/.next`.

### 2. Configurar Vercel

- Conectar el repo; **Root Directory**: `apps/geemastudio-web` o configurar build en raíz con `installCommand` que instale workspaces.
- Variables de entorno en Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL=https://udelxwwnyivknslueerr.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...` (anon key del proyecto)
  - (Opcional) Si se usan cookies SSR de Supabase, no requiere variables extra: se maneja con `@supabase/ssr` y cookies de sesión.

### 3. Deploy

```bash
vercel --prod
```

(o push a la rama conectada si está configurado el deploy automático).

**Build en Vercel (monorepo)**: en la raíz del repo, **`vercel.json` no usa `ignoreCommand`** para omitir builds por paths: cada push a la rama de producción (p. ej. `main`) dispara **`pnpm build:web`**. Motivo: los `git diff` contra `VERCEL_GIT_PREVIOUS_SHA` fallaban en checkouts **shallow** (`fatal: bad object`). Si necesitas ahorrar minutos, valorar otras estrategias (p. ej. Turborepo remote cache) en lugar de omitir el build por diff.

### Rutas protegidas (panel)

- `GET /login` — login del panel (email/password Supabase).
- `GET /panel/*` — guard SSR basado en cookies (sin sesión redirige a `/login`).

## Deployment móvil (EAS Build)

La configuración de EAS vive **solo** en `apps/geemastudio-mobile/eas.json` (no hay `eas.json` en la raíz del monorepo). Los comandos `eas build` / `eas update` deben ejecutarse desde `apps/geemastudio-mobile` (o con `--project-dir apps/geemastudio-mobile`).

### 1. Variables de entorno

En **expo.dev** (variables por entorno: development / preview / production) y, si aplica, en `apps/geemastudio-mobile/eas.json` bajo `build.<profile>.env`, definir:

- `EXPO_PUBLIC_SUPABASE_URL=https://udelxwwnyivknslueerr.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...`

### 2. Build

```bash
cd apps/geemastudio-mobile
eas build --platform android --profile production
# o
eas build --platform ios --profile production
# preview interno (APK Android)
pnpm --filter geemastudio-mobile build:preview:android

# CI / sin prompts (requiere EXPO_TOKEN en el entorno)
eas build --profile preview --platform android --non-interactive
```

El flag **`--non-interactive`** evita preguntas en terminal; en máquinas sin sesión `eas login`, define **`EXPO_TOKEN`** (Expo → Access tokens).

### 3. OTA (actualizaciones JS)

```bash
cd apps/geemastudio-mobile
npx eas-cli@latest update --branch production --message "Descripción"
# canal preview (builds con perfil preview)
npx eas-cli@latest update --branch preview --message "Descripción"
```

## Seguridad

- No commitear `.env` ni claves reales.
- En Vercel/EAS usar solo **anon key** en variables públicas (`EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`).
- La **service role key** solo para scripts locales o backend de confianza (p. ej. seeds); nunca en el cliente.

## Checklist pre-deployment

- [ ] Variables de entorno configuradas (Supabase URL + anon key)
- [ ] Schema y RLS aplicados en Supabase
- [ ] Build web (`pnpm build:web`) sin errores
- [ ] Build EAS o OTA probado en canal correspondiente

---

**Última actualización**: 2026-04-01
