# Plan 11 — CMS Mi Web

> **Ubicación canónica consolidada:** Plan 11. El archivo de origen se conserva temporalmente como referencia legacy.


> Estado: **parcialmente cerrado** (20-sep-2026). Editor mobile + panel web + Storage RLS + middleware Fase 3 listos; queda el "go live" de dominio propio (DNS + activar fila real) y migración de contenido real de ZM.

## Contexto

Tras [Fase 1](09-PLAN-landing-multitenant-fase1.md) (templates + secciones + mirror `zm-demo`), se implementó el CMS propio en `geemastudio-mobile` para que owner/dev editen columnas `web_*` de `tenant_settings`, con upload de imágenes al bucket `web-assets`.

**Piloto:** login ZM (`alberto@` / `vanessa@`) escribe en la fila `zm-lash-nails` (no en `zm-demo-*`). Preview Geema-hosted: `https://geema.zmtechdev.com/s/{slug}` cuando `web_enabled` + slug.

## Entregado (12-sep-2026)

### Storage

- Migración [`20260912_web_assets_storage_rls.sql`](../../../apps/geemastudio-server/scripts/db/migrations/20260912_web_assets_storage_rls.sql) aplicada en prod (`udelxwwnyivknslueerr`):
  - `public_read_web_assets`
  - `owner_dev_insert_web_assets`
  - `owner_dev_delete_web_assets`
- Path: `{tenant_slug}/{gallery|team|promos|reviews}/{timestamp}.webp`

### Mobile

| Pieza    | Path                                                     |
| -------- | -------------------------------------------------------- |
| Tipos    | `apps/geemastudio-mobile/types/web-landing.ts`           |
| Servicio | `apps/geemastudio-mobile/services/webSettingsService.ts` |
| Upload   | `apps/geemastudio-mobile/lib/webAssets.ts`               |
| Hook     | `apps/geemastudio-mobile/hooks/web/useWebSettings.ts`    |
| UI       | `apps/geemastudio-mobile/screens/web/*`                  |
| Entry    | Más → Mi negocio → **Mi Web**                            |

Pantallas: hub, Presencia (activar / template / slug / custom_domain), Contenido, Galería, Equipo, Promos, Servicios web, Reseñas.

- No amplía `TenantConfig`; servicio dedicado + React Query (`['web_settings']`).
- Resolución de fila: `id = auth.uid()` o bridge `profiles.tenant_id` → `tenant_slug`.
- OTA preview publicada (update group `e6daa359-ba48-445a-9ff6-2ae13a1b7934`, runtime `exposdk:56.0.0`).

## Entregado (19-sep-2026)

### Web — `/panel/configuracion/web`

CMS equivalente al de mobile, en el panel web:

| Pieza    | Path                                                              |
| -------- | ----------------------------------------------------------------- |
| Servicio | `apps/geemastudio-web/src/hooks/web-config/webSettingsService.ts` |
| Hooks    | `apps/geemastudio-web/src/hooks/web-config/useWebSettings.ts`     |
| UI       | `apps/geemastudio-web/src/app/panel/configuracion/web/page.tsx`   |

- Una sola página con secciones: Contenido principal (hero tagline, about, marquee, videos), Contacto y redes (+ mapa embed), Estadísticas, Galería, Equipo, Promos, Reseñas, Servicios web — cada colección con editor de filas (agregar/quitar) y upload de imagen a `web-assets` (mismo bucket/convención de paths que mobile: `{tenant_slug}/{gallery|team|promos|reviews}/{timestamp}.{ext}`).
- Activar/desactivar landing, template, slug y dominio propio siguen en `/panel/configuracion` (sección "Presencia web"), que ahora enlaza a `/panel/configuracion/web` para el contenido.
- No agrega link en `PanelShell` (nav principal) — se accede desde el link en Configuración; evaluar si amerita entrada propia en el nav cuando haya más uso.

## Entregado (20-sep-2026)

### Fase 3 — middleware `custom_domain`

- [`apps/geemastudio-web/src/middleware.ts`](../../../apps/geemastudio-web/src/middleware.ts): si el `Host` no es de plataforma (`geema.zmtechdev.com` / `localhost` / `*.vercel.app`), reescribe **solo la raíz** (`/`) hacia `/_sites/[domain]`; cualquier otra ruta responde 404 en ese host (el panel nunca queda accesible bajo el dominio del tenant).
- [`apps/geemastudio-web/src/app/_sites/[domain]/page.tsx`](../../../apps/geemastudio-web/src/app/_sites/[domain]/page.tsx) + `not-found.tsx`: resuelve la landing vía `getTenantLandingByDomain(custom_domain)` (ya existía en `tenant-landing-service.ts`), mismo patrón que `/s/[slug]`.
- Lógica de selección de template/metadata extraída a [`apps/geemastudio-web/src/lib/tenant-landing-render.tsx`](../../../apps/geemastudio-web/src/lib/tenant-landing-render.tsx), compartida entre `/s/[slug]` y `/_sites/[domain]`.
- Diseño acordado (20-sep-2026), documentado en `docs/geemastudio/docs/WEB_ARCHITECTURE.md` §Modo A: sin repos aparte por tenant, panel siempre en `geema.zmtechdev.com`.
- **No incluye** el "go live" de ZM Lash: falta apuntar el DNS de `zmlashnails.com` al deploy de `geemastudio-web` y setear `custom_domain`/`web_enabled=true` en la fila real — eso sigue condicionado a OK de Vanessa/Alberto sobre el contenido (ver ítem "Migrar contenido real ZM" abajo).

## Pendiente

| Ítem                               | Notas                                                                                                                                     | Prioridad                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Fase 3 — go live dominio propio** | Middleware ya implementado (ver arriba). Falta: apuntar DNS `zmlashnails.com` → deploy `geemastudio-web`, y setear `custom_domain`/`web_enabled=true` en fila `zm-lash-nails` | P2 — solo con OK de Vanessa/Alberto |
| **Migrar contenido real ZM**       | Sanity (`zmlashnails.com`) → fila `zm-lash-nails` `web_*` (hoy vacía / `web_enabled=false`)                                               | P2 — solo con OK de Vanessa/Alberto |
| **Sync catálogo → `web_services`** | Hoy lista curada aparte; opcional import desde `services`/`packs`                                                                         | backlog                             |
| **`web_mode` explícito**           | Panel/mobile siguen mapeando presencia vía `web_enabled` (+ slug/custom_domain); alinear UI a enum `own_domain` / `geema_hosted` / `none` | P2                                  |
| Smoke E2E con tenant QA            | Activar slug de prueba distinto de demos; no romper fila prod ZM sin plan de contenido                                                    | ops                                 |

## Fuera de alcance (confirmado)

- Staff editando CMS (solo `owner` / `dev`).
- Activar `zmlashnails.com` → Geema en producción sin OK explícito de Vanessa/Alberto sobre el contenido (el middleware ya soporta el routing, pero el "go live" —DNS + flags— es un paso aparte, ver Pendiente).

## Cómo probar

1. APK canal `preview` (OTA) → login admin.
2. Más → Mi negocio → Mi Web.
3. Editar textos / subir foto → Presencia: activar + slug → Guardar.
4. Abrir `https://geema.zmtechdev.com/s/{slug}` (ISR ~5 min; hard refresh).
5. Verificar que `/s/zm-demo-elegant|warm|modern` no cambiaron.
