# Landing multi-tenant — Fase 2: CMS “Mi Web” (mobile)

> Estado: **parcialmente cerrado** (12-sep-2026). Editor mobile + Storage RLS listos; queda panel web, Fase 3 y migración de contenido real de ZM.

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

| Pieza | Path |
|-------|------|
| Tipos | `apps/geemastudio-mobile/types/web-landing.ts` |
| Servicio | `apps/geemastudio-mobile/services/webSettingsService.ts` |
| Upload | `apps/geemastudio-mobile/lib/webAssets.ts` |
| Hook | `apps/geemastudio-mobile/hooks/web/useWebSettings.ts` |
| UI | `apps/geemastudio-mobile/screens/web/*` |
| Entry | Más → Mi negocio → **Mi Web** |

Pantallas: hub, Presencia (activar / template / slug / custom_domain), Contenido, Galería, Equipo, Promos, Servicios web, Reseñas.

- No amplía `TenantConfig`; servicio dedicado + React Query (`['web_settings']`).
- Resolución de fila: `id = auth.uid()` o bridge `profiles.tenant_id` → `tenant_slug`.
- OTA preview publicada (update group `e6daa359-ba48-445a-9ff6-2ae13a1b7934`, runtime `exposdk:56.0.0`).

## Pendiente

| Ítem | Notas | Prioridad |
|------|--------|-----------|
| **Fase 3 — dominio propio** | Middleware Next.js para `custom_domain`; hoy es informativo | P2 |
| **Migrar contenido real ZM** | Sanity (`zmlashnails.com`) → fila `zm-lash-nails` `web_*` (hoy vacía / `web_enabled=false`) | P2 — solo con OK de Vanessa/Alberto |
| **`/panel/configuracion/web`** | CMS equivalente en panel web (galería, team, etc.) | P2 |
| **Sync catálogo → `web_services`** | Hoy lista curada aparte; opcional import desde `services`/`packs` | backlog |
| **`web_mode` explícito** | Panel/mobile siguen mapeando presencia vía `web_enabled` (+ slug/custom_domain); alinear UI a enum `own_domain` / `geema_hosted` / `none` | P2 |
| Smoke E2E con tenant QA | Activar slug de prueba distinto de demos; no romper fila prod ZM sin plan de contenido | ops |

## Fuera de alcance (confirmado)

- Staff editando CMS (solo `owner` / `dev`).
- Routing de `zmlashnails.com` hacia Geema sin decisión de Fase 3.

## Cómo probar

1. APK canal `preview` (OTA) → login admin.
2. Más → Mi negocio → Mi Web.
3. Editar textos / subir foto → Presencia: activar + slug → Guardar.
4. Abrir `https://geema.zmtechdev.com/s/{slug}` (ISR ~5 min; hard refresh).
5. Verificar que `/s/zm-demo-elegant|warm|modern` no cambiaron.
