# Plan 11 — CMS Mi Web

> **Ubicación canónica consolidada:** Plan 11. El archivo de origen se conserva temporalmente como referencia legacy.


> Estado: **parcialmente cerrado** (20-sep-2026). Editor mobile + panel web + Storage RLS + middleware Fase 3 listos; queda el "go live" de dominio propio (DNS + activar fila real) y migración de contenido real de ZM.

## Contexto

Tras [Fase 1](09-PLAN-landing-multitenant-fase1.md) (templates + secciones + mirror `zm-demo`), se implementó el CMS propio en `geemastudio-mobile` para que owner/dev editen columnas `web_*` de `tenant_settings`, con upload de imágenes al bucket `web-assets`.

**Piloto:** login ZM (`alberto@` / `vanessa@`) escribe en la fila `zm-lash-nails` (no en `zm-demo-*`). Preview Geema-hosted: `https://geema.zmtechdev.com/s/{slug}` cuando `web_enabled` + slug.

## Entregado (12-sep-2026)

### Storage

- Migración [`20260912142138_web_assets_storage_rls.sql`](../../../apps/geemastudio-server/supabase/migrations/20260912142138_web_assets_storage_rls.sql) aplicada en prod (`udelxwwnyivknslueerr`):
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
| **Migrar contenido real ZM**       | Textos y estructura ya migrados y verificados contra Sanity (29-sep-2026). Falta: imágenes a Storage y `web_enabled` (ver § Modo B — ejecución) | P2 — solo con OK de Vanessa/Alberto |
| **Sync catálogo → `web_services`** | Hoy lista curada aparte; opcional import desde `services`/`packs`                                                                         | backlog                             |
| **`web_mode` explícito**           | Panel/mobile siguen mapeando presencia vía `web_enabled` (+ slug/custom_domain); alinear UI a enum `own_domain` / `geema_hosted` / `none` | P2                                  |
| Smoke E2E con tenant QA            | Activar slug de prueba distinto de demos; no romper fila prod ZM sin plan de contenido                                                    | ops                                 |

## Decisión y riesgo: tenants con dominio y landing propios (29-sep-2026)

**Principio:** el tenant puede conservar su dominio y su landing y aun así gestionar su contenido desde Mi Web. Hay dos modos de servir ese contenido:

| Modo | Quién renderiza | Ejemplo |
| ---- | --------------- | ------- |
| **Hospedado en Geema** | `geemastudio-web` (`/s/[slug]` o `/_sites/[domain]`) | Tenants sin landing propia |
| **Landing propia que consume Mi Web** | El sitio del tenant lee las columnas `web_*` de su fila | ZM Lash (`zmlashnails.com`, hoy con Sanity) |

**Fase de prueba de ZM Lash:** pueden convivir la landing propia (`zmlashnails.com`) y la de Geema (`/s/zm-lash-nails`) porque son proyectos y URLs distintos. La de Geema sirve como vista previa; la fila `zm-lash-nails` es la única fuente de contenido.

**Riesgo del go-live por Modo A (apuntar el DNS de `zmlashnails.com` a `geemastudio-web`):** el middleware solo sirve `/` bajo un dominio propio y responde 404 en el resto. `zmlashnails.com` aloja hoy también, en el proyecto de Lash:

- Páginas legales: `/privacidad`, `/terminos-y-condiciones`, `/libro-de-reclamaciones` (el libro de reclamaciones es obligatorio en Perú).
- Panel web de Lash: `/panel/*`, `/finanzas`, `/clientes`, `/servicios`. Las alertas de WhatsApp ya enlazan a `zmlashnails.com/panel/waba/mensajes`.

Cambiar el DNS sin resolver esto dejaría todo eso en 404. Antes de cualquier go-live por Modo A hay que decidir dónde vive cada pieza (por ejemplo, subdominio para el panel de Lash y páginas legales dentro de la landing de Geema).

**Camino recomendado para ZM Lash (Modo B):** conservar `zmlashnails.com` en el proyecto de Lash y reemplazar Sanity por lectura de `tenant_settings.web_*` (mismo contenido que edita Mi Web). Requiere:

1. Política de lectura pública acotada a las columnas de contenido web de ese tenant (hoy `tenant_landing_public_read` exige `web_enabled = true`, y la fila de ZM está en `false`). Cambio en producción: requiere OK explícito.
2. Migrar el contenido real de Sanity a la fila `zm-lash-nails` (ver Pendiente).
3. Que la landing de Lash lea esos datos (con los valores actuales como respaldo si la lectura falla) y revalide en el servidor.

Pendiente de decidir: si el Modo B se ofrece como capacidad general (lectura pública del contenido web por tenant) para futuros tenants con landing propia. Recomendación: sí, mediante la vista `tenant_landing_public` descrita abajo.

## Modo B — ejecución para ZM Lash (29-sep-2026)

> Nomenclatura: en [`WEB_ARCHITECTURE.md`](../WEB_ARCHITECTURE.md) este modo se llama **Modo D** (landing propia que consume Mi Web), porque allí "Modo B" es Geema-hosted (`/s/[slug]`). Es el mismo modo.

### Estado verificado (SELECT de solo lectura en prod + dataset público de Sanity `9yt27c72`)

- La fila `zm-lash-nails` ya tiene el contenido en `web_*` y coincide con Sanity: hero (tagline, subtítulo, botón, video), marquesina (texto, velocidad 55), banner de promos, galería (14, mismo orden), promos (4, mismos badges y mensajes), reseñas (5), stats, dirección, mapa, redes, `business_hours` (L-S 10:00-18:00, D 10:30-13:00). `promosSection` no existe en Sanity (nada que migrar).
- Diferencias: `web_team` (editado en Geema, más nuevo) tiene especialidades distintas a Sanity; Andreina está inactiva en Sanity y ausente en `web_team` (correcto). `web_promo_banner_alt` es nulo y `web_salon_video_url` es nulo.
- Las 21 imágenes (14 galería, 2 equipo, 4 promos, 1 banner) siguen en `cdn.sanity.io`. En Storage solo existe `web-assets/zm-lash-nails/team/1789945830238.webp`, sin referenciar.
- `web_enabled = false` (**desde el 1-oct-2026 es `true`**, intencional). La única política anon es `tenant_landing_public_read` (fila completa, `web_enabled = true`).
- **Riesgo de seguridad (corregido el 2-oct-2026 con la migración `20261002120954_revoke_anon_table_grants`: `anon` sin escritura y con SELECT solo sobre columnas web; ver Plan 13 § Validación Corte 1):** `anon` tiene SELECT, INSERT y UPDATE sobre las 69 columnas de `tenant_settings`, incluidas `waba_access_token`, `waba_verify_token`, `waba_payment_info`, `waba_admin_phones`, `commission_*` y `contact_info`. Hoy ninguna fila guarda tokens y las 3 filas públicas son demos, pero activar `web_enabled` con la política actual expondría la fila completa a anon. La lectura pública del Modo B va por una vista acotada, no por `web_enabled` sobre la tabla.
- SEO: las 5 reseñas son de relleno (no reales). El JSON-LD no tiene `aggregateRating` ni `review` (correcto mientras sean de relleno), muestra cierre 19:00 (real 18:00) y usa el teléfono WABA. *(Actualización 2-oct-2026: reseñas reales cargadas, `aggregateRating` agregado; cierre 18:00 y teléfono de staff ya corregidos en Lash #161. `web_team` solo con Vanessa y Stephani es intencional: Karelis y Alejandra no son personal fijo de ZM.)*

### Decisiones (29-sep-2026)

1. Las imágenes de Sanity se copian a Storage.
2. `web_whatsapp` = `51932535512` (línea de staff). La WABA `51981444430` queda solo para Ads.
3. Lectura pública por vista, no por política de fila completa.
4. La landing de Lash lee `web_*` con respaldo a Sanity y hardcode.
5. Fuente de verdad del equipo: `web_team`; confirmar especialidades con Vanessa/Alberto antes del go-live.

### Fases

Toda escritura en prod requiere OK explícito en ese momento. Código de Lash en una sola rama y un solo PR.

| Fase | Contenido | Repo | Estado |
| ---- | --------- | ---- | ------ |
| 0 | Documentación (este plan, `WEB_ARCHITECTURE`, CHANGELOG) | zm-tech / Lash | Completado |
| 1 | Copiar las 21 imágenes a `web-assets/zm-lash-nails/{gallery,team,promos,banner}/{ts}.webp`, actualizar URLs en `web_gallery`, `web_team`, `web_promos`, `web_promo_banner_url`. Primero dry-run y respaldo de las columnas. Completar `web_promo_banner_alt`; decidir `web_salon_video_url` (`Reel_Promo_IG_opt.mp4` ya está en `web-assets`) | script en scratchpad | Completado (21 imgs en storage) |
| 2 | Vista `public.tenant_landing_public` (`security_invoker = false`, solo columnas web + `business_name`, `slug`, `tagline`, `custom_domain`, `business_hours`, `currency_symbol`, `web_template`, filtrada por `web_enabled = true`) con `GRANT SELECT` a anon. Migración versionada en Lash y espejo en `apps/geemastudio-server/supabase/migrations/20261002030902_tenant_landing_public_view.sql`. Endurecimiento aparte: `REVOKE INSERT, UPDATE` de anon en `tenant_settings` y evaluar quitar SELECT de anon sobre columnas sensibles, verificando antes que ningún cliente anon use `select *`. Luego `web_enabled = true` en `zm-lash-nails` | ambos | Completado (`tenant_landing_public` activa; endurecimiento de `anon` aplicado el 2-oct-2026; las vistas públicas eran escribibles y ahora son solo `SELECT`; `web_enabled = true` en `zm-lash-nails` desde el 1-oct) |
| 3 | `apps/web`: `lib/tenant-landing.ts` sobre la vista; `page.tsx` usa `web_*` ?? Sanity ?? hardcode; los componentes de galería, equipo, promos y reseñas pasan de `urlFor` a URL directa; ubicación, footer, stats y `count(services)` desde `web_*`; `remotePatterns` para `udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/web-assets/**`; revalidación al guardar en Mi Web o `revalidate` más corto | Lash | Completado (build + types OK) |
| 4 | SEO: JSON-LD con teléfono de staff, horario de `business_hours` (18:00), dirección y `sameAs`; metadata desde `web_hero_tagline` y `web_about` | Lash | Completado |
| 5 | Reseñas reales de Google: cargar en `web_reviews`, alinear `web_stat_rating` con la nota real, agregar `aggregateRating` y `review` al JSON-LD solo con datos verificables del perfil. Datos cargados el 2-oct-2026: `web_reviews` con 8 reseñas reales (de las 27 del perfil, todas 5★; nombre + inicial del apellido) reemplaza las 5 de relleno y `web_stat_rating` pasa de 4.9 a 5.0. El código (mapeo `author`/`role`/`photoUrl` y `aggregateRating` 5.0 / 27 en el JSON-LD, sin `review` individuales porque Google solo da fechas relativas) va en la rama `claude/honest-reviews-7c4d2e` de Lash | Lash + BD | Datos ✅; código en PR (pendiente de merge) |
| 6 | Retiro de Sanity (`sanity.ts`, `schemas/`, `sanity.config.ts`, `@sanity/*`, `api/revalidate`). `zmlashnails.com` se queda en el proyecto de Lash; `custom_domain` de la fila permanece nulo, así que el middleware de Geema no interviene y las páginas legales y `/panel` no cambian | Lash | Posterior |

### Verificación

1. Fase 1: 0 URLs `cdn.sanity.io` en `web_*` y las nuevas responden 200.
2. Fase 2: como anon, la vista devuelve solo columnas web; tras el endurecimiento, leer `waba_access_token` como anon falla; demos y `geemastudio-web` siguen resolviendo.
3. Fase 3: `yarn check:types`, `yarn lint`, comparación visual con Sanity apagado y encendido, cambio de texto en Mi Web reflejado tras revalidar, y respaldo cuando la vista no responde.
4. Fase 4: validación del JSON-LD en la prueba de resultados enriquecidos de Google sobre el preview de Vercel.

## Fuera de alcance (confirmado)

- Staff editando CMS (solo `owner` / `dev`).
- Activar `zmlashnails.com` → Geema en producción sin OK explícito de Vanessa/Alberto sobre el contenido (el middleware ya soporta el routing, pero el "go live" —DNS + flags— es un paso aparte, ver Pendiente).

## Cómo probar

1. APK canal `preview` (OTA) → login admin.
2. Más → Mi negocio → Mi Web.
3. Editar textos / subir foto → Presencia: activar + slug → Guardar.
4. Abrir `https://geema.zmtechdev.com/s/{slug}` (ISR ~5 min; hard refresh).
5. Verificar que `/s/zm-demo-elegant|warm|modern` no cambiaron.
