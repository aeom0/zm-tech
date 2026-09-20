# 06 — Branding tenant: logo + design tokens

**Fecha:** 2026-08-29  
**Estado:** Planificado (track **S5-B**, paralelo a S5 WABA L3)  
**Repos:** `zm-tech` (Geema mobile), `ZM-Lash-and-Nails-Beauty` (migración Storage + sync docs)

---

## Contexto

- **ZM Lash** mobile usa tokens de color **estáticos** en `apps/mobile/constants/theme.ts` (~30 tokens light/dark, violeta `#7B2D8E` + oro `#D4AF37`). Correcto para un solo salón.
- **GeemaStudio** mobile forkó ese archivo y lo rebrandeó a **Lunaris** (turquesa `#40E0D0` / `#0B7B72`), con `createTheme()` que solo aplica **2** colores del tenant (`primaryColor`, `accentColor`) sobre una base fija.
- En prod compartida, `tenant_settings` para `zm-lash-nails` ya tiene `#7B2D8E` / `#D4AF37` (migración S2). Geema **lee** esos valores pero no los propaga igual que ZM en toda la UI.

**Decisión de producto:** plataforma Geema vs marca del salón.

| Superficie                                                                | Marca                                |
| ------------------------------------------------------------------------- | ------------------------------------ |
| Onboarding “crear negocio”, wordmark GeemaStudio, splash nativa APK       | **Geema** (Lunaris fijo)             |
| Login post-config, tabs, agenda, servicios, finanzas, ajustes del negocio | **Tenant** (logo + tokens derivados) |

---

## Logo del negocio

### Ya existe (Geema)

| Pieza                              | Ubicación                                           |
| ---------------------------------- | --------------------------------------------------- |
| Columna `tenant_settings.logo_url` | BD prod ✅                                          |
| Pantalla upload                    | `LogoNegocioScreen` — Más → Logo del negocio        |
| Hook upload                        | `useLogoUpload` → bucket `tenant-logos`, WebP 512px |
| Login con logo                     | `LoginScreen` muestra `config.logo` si existe       |

### Gaps

| #   | Gap                                                     | Acción                                       |
| --- | ------------------------------------------------------- | -------------------------------------------- |
| L1  | Bucket `tenant-logos` **no existe** en Supabase prod ZM | Migración Storage + RLS                      |
| L2  | Path upload usa `userId`; debe ser `tenant_slug`        | Fix `useLogoUpload`                          |
| L3  | Splash secundaria (React) usa `DiamondHero` genérico    | `<TenantLogo>` + fallback iniciales          |
| L4  | `HeaderTitle` usa inicial, no imagen (ZM usa PNG fijo)  | Logo 28×28 como ZM                           |
| L5  | Overlay OTA (si se porta)                               | Mismo componente                             |
| L6  | Sin `@sentry/react-native` en Geema                     | Backlog observabilidad (no bloquea branding) |

### Modelo Storage

```
tenant-logos/{tenant_slug}/logo.webp  →  tenant_settings.logo_url (URL pública)
```

RLS: `authenticated` con `tenant_slug = current_tenant_id()` — lectura/escritura admin del tenant.

---

## Push FCM — branding por tenant (bosquejo)

**Fecha bosquejo:** 2026-08-29  
**Estado:** Planificado — depende de S5B-1 (Storage) y S4 tenant-aware en Edge Functions

### Referencia ZM (single-tenant, hoy)

| Pieza              | Dónde                                                | Notas                                                                            |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Small icon Android | `apps/mobile/app.json` → plugin `expo-notifications` | `logo-positivo.png` + `color: #7B2D8E` — **compilado en el APK**, no por mensaje |
| Canales Android    | `hooks/useNotifications.ts`                          | Nombre fijo “ZM Lash & Nails · …”, `lightColor: Colors.light.primary`            |
| Envío FCM          | `supabase/functions/send-notification`               | Solo `title`, `body`, `channel_id` — sin `color` ni `image` por push             |

El **small icon** de Android debe ser silueta **blanca sobre transparente** (solo canal alpha). El `color` tiñe el círculo de fondo del icono en la barra de estado. Eso explica por qué ZM usa un asset dedicado (`logo-positivo.png`), no el logo a color del salón.

### Dos capas — no confundir

| Capa                   | Dónde se ve                              | ¿Dinámico por tenant en una sola app Geema?  |
| ---------------------- | ---------------------------------------- | -------------------------------------------- |
| **Small icon**         | Barra de estado (silueta monocromática)  | ❌ Casi no — drawable **embebido en el APK** |
| **Rich image + color** | Notificación expandida + tinte de acento | ✅ Sí — campos FCM v1 por mensaje            |

FCM permite `android.notification.icon`, pero el valor es el **nombre de un drawable local** (`res/drawable/…`), no una URL. No hay API estándar para cambiar el small icon por tenant en runtime sin código nativo extra.

### Decisión de producto (Geema SaaS)

| Superficie push                                   | Marca                                                    |
| ------------------------------------------------- | -------------------------------------------------------- |
| Small icon barra de estado (APK Geema compartido) | **Geema** — silueta neutra fija en `app.json`            |
| Imagen expandida + color de acento en cada push   | **Tenant** — `logo_url` + `primary_color` desde BD       |
| APK white-label por cliente premium               | **Tenant** — `notification-icon.png` del tenant en build |

La clienta/staff ve sobre todo la **imagen expandida y el tinte**; el small icon genérico Geema es aceptable en v1 multi-tenant.

### Modelo Storage (extensión logo)

```
tenant-logos/{tenant_slug}/logo.webp                 →  tenant_settings.logo_url (color, UI + FCM image)
tenant-logos/{tenant_slug}/notification-icon.png     →  tenant_settings.notification_icon_url (monocromático)
```

| Asset                   | Spec                                                                      | Uso                                               |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `logo.webp`             | WebP 512px, a color                                                       | UI in-app, FCM `android.notification.image`       |
| `notification-icon.png` | PNG, silueta blanca `#FFFFFF`, fondo transparente, 96×96 y 192×192 export | Preview panel, builds white-label, futuro Notifee |
| `primary_color`         | Ya en BD                                                                  | FCM `android.notification.color`                  |

**Columna nueva (propuesta):** `tenant_settings.notification_icon_url` (text, default `''`). Opcional v2: `push_branding_manual` (bool) si el tenant subió el monocromático a mano.

### Pipeline auto-generación (al upload logo)

Disparo: mismo hook `useLogoUpload` post-S5B-2, o Edge Function `generate-push-assets` (preferible si Sharp pesa en mobile).

```
logo.webp (upload)
    → resize 512
    → extraer alpha / threshold silueta
    → rellenar silueta blanco puro, fondo transparente
    → export notification-icon.png (96 + 192)
    → subir Storage + UPDATE notification_icon_url
```

**Validación:** preview en `LogoNegocioScreen` — icono sobre círculo `#primary_color` (como se verá en Android). Botón “Subir versión manual” si el auto falla (logos muy finos, texto dentro del mark, etc.).

**Herramientas candidatas:** Sharp en Edge Function Deno (`imagescript` / WASM si Sharp no corre), o job post-upload vía GitHub Action — decidir en implementación.

### Envío FCM tenant-aware (Tier 1 — alto impacto, sin rebuild)

Extender `send-notification` (y callers que resuelvan tenant del destinatario):

```json
{
  "message": {
    "token": "...",
    "notification": { "title": "...", "body": "..." },
    "android": {
      "priority": "high",
      "notification": {
        "channel_id": "waba-chat",
        "color": "#7B2D8E",
        "image": "https://.../tenant-logos/zm-lash-nails/logo.webp"
      }
    },
    "apns": {
      "payload": { "aps": { "mutable-content": 1 } },
      "fcm_options": {
        "image": "https://.../tenant-logos/zm-lash-nails/logo.webp"
      }
    }
  }
}
```

| Campo FCM                    | Fuente BD                       | Efecto                                     |
| ---------------------------- | ------------------------------- | ------------------------------------------ |
| `android.notification.color` | `tenant_settings.primary_color` | Tinte acento Android                       |
| `android.notification.image` | `tenant_settings.logo_url`      | Logo a color en notificación expandida     |
| `apns.fcm_options.image`     | mismo URL                       | Rich notification iOS (requiere extensión) |

**Resolución tenant:** join `profiles.push_token` → `profiles.tenant_id` → `tenant_settings` (bridge S2 por `tenant_slug`). Fallback: color Geema Lunaris + sin image si tenant sin logo.

**Límites FCM:** imagen ≤ ~1 MB; URL pública HTTPS con extensión válida (`.webp` / `.png`).

### Mobile Geema — canales Android

Paridad con ZM, pero dinámico:

```ts
// Bosquejo — useNotifications.ts (Geema)
Notifications.setNotificationChannelAsync(id, {
  name: `${tenantDisplayName} · ${channelLabel}`,
  lightColor: config.primaryColor,
  importance: AndroidImportance.MAX,
})
```

Recrear canales si cambia `primary_color` (raro) o al login tras cargar `tenant_settings`.

### Tier 2 — small icon distinto por tenant (backlog, no v1 SaaS)

| Enfoque                                                                                              | Viabilidad  | Cuándo                                            |
| ---------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------- |
| Icono Geema neutro en APK + rich image por push                                                      | ✅ v1       | S5B-8…10                                          |
| APK white-label: `expo-notifications.icon` = `notification-icon.png` del tenant en EAS build profile | ✅ Premium  | S7+                                               |
| Notifee + descargar PNG al login + notificación local (data-only FCM)                                | ⚠️ Complejo | Solo si producto exige barra de estado por tenant |
| URL remota como small icon vía FCM                                                                   | ❌          | No soportado                                      |

### Tier 3 — iOS rich image

Requiere **Notification Service Extension** (config plugin Expo o bare). Mismo URL que Android. Sin extensión, iOS muestra solo título/cuerpo + icono de la app (Geema).

### Impacto ZM legacy

**Sin cambio** hasta convergencia apps (S7+). ZM sigue con icono embebido en su APK. Opcionalmente, ZM puede adoptar `color` + `image` en `send-notification` antes (mejora rich push sin tocar el small icon).

---

## Design tokens — choque ZM ↔ Geema

### ZM (referencia)

```
useTheme() → Colors[light|dark]   // 100% estático, sin tenant
```

Tokens clave: `primary`, `accent`, `primaryLight`, `accentLight`, `backgroundSecondary`, `backgroundTertiary`, `cardShadow`, `caution`, `statusInfo`, `whatsapp`, sombras con tinte violeta.

### Geema (hoy)

```
useTheme() → createTheme(config, isDark)
  → base Colors[light|dark]   // base Lunaris (primary default #0B7B72)
  → override: primary, accent, violet, link, tabIconSelected, info, gold, warning
```

**Problema:** derivados y gradientes **no** siguen al tenant. Hardcodes `#40E0D0`, `Gradients.onboarding`, `Colors.light.violet` en ~15 archivos (onboarding, modals, badges).

### Objetivo — `createTheme()` completo

A partir de `primaryColor` + `accentColor` (+ `isDark`), generar el mismo set semántico que ZM:

| Token                                                                     | Fuente                                        |
| ------------------------------------------------------------------------- | --------------------------------------------- |
| `primary`, `accent`, `link`, `tabIconSelected`, `info`, `gold`, `warning` | Seeds tenant                                  |
| `primaryLight`, `accentLight`                                             | Mezcla hex / HSL desde seeds                  |
| `backgroundSecondary`, `backgroundTertiary`, `border`                     | Tinte suave del primary                       |
| `cardShadow`, `Shadows.*.shadowColor`                                     | Primary con alpha                             |
| Dark mode                                                                 | `lightenHex()` (ya existe) + ajuste contraste |

Semánticos **fijos** cross-tenant (no derivar): `success`, `error`, `caution`, `statusInfo`, `whatsapp`.

### Fase 2 — paquete compartido

Extraer `@zmtech/design-tokens`:

- **Fijos:** Spacing, BorderRadius, Typography, Fonts, semánticos
- **Dinámico:** `createTheme(TenantConfig, scheme): Theme`
- ZM mobile migra cuando converja apps (S7+): de `Colors[scheme]` fijo → `createTheme` leyendo `tenant_settings`

Evita divergencia futura entre `apps/mobile/constants/theme.ts` y `geemastudio-mobile/constants/theme.ts`.

### Gradientes

| Token                     | Uso                                                      |
| ------------------------- | -------------------------------------------------------- |
| `Gradients.onboarding`    | Solo shell Geema (wizard nuevo negocio)                  |
| `Gradients.brand(config)` | CTA login, tabs, settings — derivado de primary → accent |

---

## Tareas (S5-B)

| ID     | Tarea                                                                              | Repo                | Esfuerzo |
| ------ | ---------------------------------------------------------------------------------- | ------------------- | -------- |
| S5B-1  | Migración bucket `tenant-logos` + políticas RLS por `tenant_slug`                  | ZM migrations       | S        |
| S5B-2  | `useLogoUpload`: path `{tenant_slug}/logo.webp`                                    | zm-tech             | S        |
| S5B-3  | Componente `TenantLogo` (sizes: 28 / 80 / 280, fallback iniciales)                 | zm-tech             | S        |
| S5B-4  | Cablear logo: `HeaderTitle`, `SplashScreen` React, overlay OTA                     | zm-tech             | M        |
| S5B-5  | `createTheme()` completo (derivados + shadows)                                     | zm-tech             | M        |
| S5B-6  | `Gradients.brand` + audit grep `#40E0D0` / `Colors.light.violet`                   | zm-tech             | M        |
| S5B-7  | Paquete `@zmtech/design-tokens` + consumo Geema                                    | zm-tech (+ ZM S7+)  | L        |
| S5B-8  | Columna `notification_icon_url` + path Storage `notification-icon.png`             | ZM migrations       | S        |
| S5B-9  | Generador monocromático post-upload (Edge o hook) + preview en `LogoNegocioScreen` | zm-tech (+ Edge ZM) | M        |
| S5B-10 | `send-notification` tenant-aware: `color` + `image` desde `tenant_settings`        | ZM Edge             | M        |
| S5B-11 | Canales Android Geema con nombre tenant + `lightColor` dinámico                    | zm-tech             | S        |
| S5B-12 | iOS Notification Service Extension (rich image)                                    | zm-tech             | L        |

### DoD

- [ ] Owner ZM sube logo en Geema → visible login, headers y splash secundaria
- [ ] UI operativa (agenda/servicios) usa violeta/oro ZM sin turquesa Lunaris residual
- [ ] Segundo tenant (preset barbershop) ve su primary en tabs sin redeploy
- [ ] Push a staff Geema muestra logo a color del tenant expandido + tinte `primary_color`
- [ ] Panel preview del small icon monocromático generado (o upload manual)
- [ ] ZM app legacy **sin cambio** hasta convergencia explícita

---

## Validación shadow (Alberto, ago 2026)

Tras APK preview **SDK 56** (`exposdk:56.0.0`) + OTAs en branch `preview`:

1. Login `alberto@zmlashnails.com` → datos ZM vía bridge S2
2. Colores: primary/accent desde BD; gradientes onboarding pueden seguir Lunaris (esperado pre-S5B)
3. Logo: upload fallará hasta S5B-1 (bucket)

**Build preview (29-ago):** `34ec3bc3-5f08-41a9-9991-642489e044a7` — ✅ **FINISHED** SDK 56. [Instalar](https://expo.dev/accounts/aeom0/projects/geemastudio-mobile/builds/34ec3bc3-5f08-41a9-9991-642489e044a7). Pendiente: smoke login ZM en dispositivo.

---

## Referencias

- [05-ADR-modelo-tenant.md](./05-ADR-modelo-tenant.md) — `tenant_settings.logo_url`, `primary_color`, `accent_color`
- ZM push hoy: `apps/mobile/app.json` (plugin `expo-notifications`), `hooks/useNotifications.ts`, `supabase/functions/send-notification/index.ts`
- [FCM — Customize across platforms](https://firebase.google.com/docs/cloud-messaging/customize-messages/cross-platform) — `color`, `image`, límites Android/iOS
- [Expo Notifications — Android icon](https://docs.expo.dev/versions/latest/sdk/notifications/#android) — silueta blanca, `color` en plugin
- ZM tokens: `apps/mobile/constants/theme.ts`
- Geema tokens: `zm-tech/apps/geemastudio-mobile/constants/theme.ts` → `createTheme()`
- Preset spa-nails: `zm-tech/packages/tenant-config/src/presets/spa-nails.ts`
- Doc upload (espejo): `zm-tech/docs/geemastudio/docs/DESARROLLO_LOCAL.md` § logo
