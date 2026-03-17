# Guía de Deployment — SalonPro

SalonPro no tiene servidor propio. El backend es **Supabase** (Auth + PostgREST). Se despliegan solo el frontend web y la app móvil.

## Requisitos previos

- Node.js 22+, Yarn 4
- Cuenta Supabase (proyecto `xidjomlxpuosupymcsaj`)
- Cuenta Vercel (web)
- Cuenta Expo/EAS (móvil)

## Backend (Supabase)

El “backend” ya está en Supabase:

- **Auth**: email/password; perfiles y RLS por rol (dev/owner/staff).
- **Base de datos**: schema aplicado con `yarn db:push` o SQL Editor (ver [DESARROLLO_LOCAL.md](DESARROLLO_LOCAL.md)).
- **tenant_settings**: configuración del negocio; se crea/actualiza desde el onboarding en la app.

No hay que desplegar ningún servidor Express ni Railway. Variables de Supabase (URL, anon key, service role) se usan en build/deploy de web y mobile.

## Deployment frontend web (Vercel)

### 1. Preparar

```bash
yarn install
yarn web:build
```

El output está en `apps/web/.next`.

### 2. Configurar Vercel

- Conectar el repo; **Root Directory**: `apps/web` o configurar build en raíz con `installCommand` que instale workspaces.
- Variables de entorno en Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL=https://xidjomlxpuosupymcsaj.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...` (anon key del proyecto)

### 3. Deploy

```bash
vercel --prod
```

(o push a la rama conectada si está configurado el deploy automático).

## Deployment móvil (EAS Build)

### 1. Variables de entorno

En el proyecto EAS o en `eas.json` (env en cada profile), definir:

- `EXPO_PUBLIC_SUPABASE_URL=https://xidjomlxpuosupymcsaj.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...`

### 2. Build

```bash
cd apps/mobile
eas build --platform android --profile production
# o
eas build --platform ios --profile production
```

### 3. OTA (actualizaciones JS)

```bash
cd apps/mobile
npx eas-cli@latest update --branch production --message "Descripción"
```

## Seguridad

- No commitear `.env` ni claves reales.
- En Vercel/EAS usar solo **anon key** en variables públicas (`EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`).
- La **service role key** solo para scripts locales o backend de confianza (p. ej. seeds); nunca en el cliente.

## Checklist pre-deployment

- [ ] Variables de entorno configuradas (Supabase URL + anon key)
- [ ] Schema y RLS aplicados en Supabase
- [ ] Build web (`yarn web:build`) sin errores
- [ ] Build EAS o OTA probado en canal correspondiente

---

**Última actualización**: 2026-03
