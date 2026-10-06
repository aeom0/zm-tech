# Guía de Deployment

Guía de despliegue del salón. La landing `zmlashnails.com` sale del repo ZM Lash. App, panel y Edge salen de zm-tech.

> El deploy de Edge es `.github/workflows/edge-functions.yml`. `ota-production.yml` y `yarn db:push` / `yarn deploy:*` de este archivo son del repo ZM anterior al 6-oct-2026. Schema: `pnpm db:push` desde la raíz de zm-tech.

## 📋 Requisitos Previos

- Node.js 22+
- Cuenta en Vercel (para frontend web: landing + panel)
- Cuenta en Supabase (BD + Edge Functions)
- Token permanente de WhatsApp Business API (secrets en Supabase)

## 🌐 Deployment Frontend (Vercel)

### 1. Preparar el Proyecto

```bash
# Build del frontend web (Next.js en apps/web)
yarn web:build

# El output está en apps/web/.next
```

La carpeta `web-build/` en raíz ya no se usa; la landing es Next.js (apps/web). Si en el futuro generas el build web de la app móvil con `expo export:web` desde apps/mobile, el output irá a `apps/mobile/dist/` (ignorado en .gitignore).

### 2. Configurar Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Login
vercel login

# Deploy producción
vercel deploy --prod --yes
```

### 3. Variables de Entorno en Vercel

En el dashboard de Vercel, configurar:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 4. Configuración Automática

El archivo `vercel.json` ya está configurado con:

- `installCommand`: `corepack enable && yarn install`
- `buildCommand`: `yarn web:build`
- `ignoreCommand`: `if [ "$VERCEL_ENV" != "production" ]; then exit 0; fi; npx turbo-ignore web` (ver § 5). Primero corta TODOS los deploys que no sean producción — el equipo no usa preview deploys de Vercel y su volumen agotaba el cupo del plan — y solo para el push/merge a `main` delega en `turbo-ignore` para saltar el build si el commit no afecta `apps/web`. El repo tiene un `turbo.json` mínimo en la raíz (solo para que `turbo`/`turbo-ignore` puedan calcular el grafo de dependencias — no cambia cómo se ejecuta el build real, que sigue siendo `yarn web:build`).

### 5. Lecciones / incidentes conocidos — Ignored Build Step

**Solución vigente (03-ago-2026): cortar previews por `VERCEL_ENV` + `turbo-ignore web` solo en producción**

El requisito real del equipo no es "optimizar previews" sino **no generarlos nunca** — cada preview deploy (aunque termine en `READY`) consume cupo del plan Hobby de Vercel y no se usa para nada, así que el `ignoreCommand` corta primero por entorno: `if [ "$VERCEL_ENV" != "production" ]; then exit 0; fi` salta cualquier deploy que no sea el de `main` (`VERCEL_ENV` es una variable de sistema de Vercel, documentada como disponible en el `ignoreCommand`). Solo cuando `VERCEL_ENV=production` se evalúa `turbo-ignore web`, que a su vez evita reconstruir en `main` cuando el merge no tocó nada relevante para `apps/web` (ej. un PR que solo cambia `docs/` o `supabase/functions/`).

**Confirmado en vivo (commit `1a4f288`, PR #38)**: push a la rama del PR (no `main`) con este `ignoreCommand` salió `CANCELED` (`dpl_5Q2JAHpbTRq25vNzdBiDCvYSXbHB`) — cero previews desde este cambio.

Tras dos reincidencias del mismo bug con un `ignoreCommand` casero basado en `git diff` (ver historial abajo), se reemplazó por [`turbo-ignore`](https://turborepo.dev/docs/reference/turbo-ignore), la herramienta oficial de Vercel/Turborepo para este caso exacto. A diferencia del script casero, `turbo-ignore` compara contra el último commit **realmente desplegado** en Vercel para esa rama (vía las variables `VERCEL_GIT_*` que la plataforma expone), no contra `HEAD^` del clon local — evita por diseño el problema de shallow clone que rompió los dos intentos anteriores.

Dos detalles no obvios descubiertos al validar en vivo (PR #38, commits `3740aac`→`85b22b8`→`c4c8f3b` aprox.):

1. **Sí requiere `turbo.json`** (a diferencia de lo asumido inicialmente): sin él, `turbo-ignore` no puede calcular el grafo de dependencias, tira `UNKNOWN_ERROR` / "Could not find turbo.json" y cae a **construir siempre** (fail-safe, pero un no-op — nunca salta nada). Se agregó un `turbo.json` mínimo en la raíz solo con la task `build` (el repo no se convirtió en un Turborepo "de verdad": `buildCommand` en `vercel.json` sigue siendo `yarn web:build`, no `turbo run build`).
2. **El argumento de `turbo-ignore` es el *nombre del workspace* (`name` en su `package.json`, `"web"`), no la ruta** (`apps/web`). `npx turbo-ignore apps/web` no matchea ningún paquete (turbo usa `--filter=apps/web...`, y como no existe un paquete llamado literalmente `apps/web`, el filtro no encuentra nada relevante) — el comando correcto es `npx turbo-ignore web`.
3. **El primer deploy de una rama nueva siempre construye**: `turbo-ignore` necesita un deploy previo de esa misma rama para comparar; sin eso, construye por defecto (correcto, no es bug).

**Validado en vivo (PR #38, 03-ago-2026)**: tras el fix de `turbo.json` + nombre de workspace, control A (commit que solo toca `docs/DEPLOYMENT.md`, sin tocar `apps/web` ni archivos raíz globales) salió `CANCELED` con `errorLink` a "Ignored Build Step" — saltado correctamente. Control B (commit con cambio real en `apps/web/next.config.ts`, misma rama) salió `READY` — build normal, no saltado. Ambos casos confirmados vía la API de deployments de Vercel (no solo el check genérico de GitHub, que no distingue build real de build saltado).

**Historial — `IGNORE_BUILD_STEP_SILENT_SKIP`: no usar `ignoreCommand` con `git diff -- apps/web` a mano (reincidencia confirmada 03-ago-2026, 2ª vez)**

Dos intentos separados de un `ignoreCommand` casero fallaron de la misma forma:

- **feb 2026** (`fa841a1` → `20b713d` → `b7fb3a7` → revertido en `4aebd7e`): versión simple con `git diff --quiet HEAD^ HEAD -- apps/web`. El shallow clone de Vercel no tiene `HEAD^` disponible → diff rompía → se interpretaba como "sin cambios" y saltaba builds con cambios reales.
- **ago 2026** (PR #35, mergeado `319e685`, revertido en PR #37): se agregó un fallback pensado para resolver justo ese problema (`git fetch --unshallow --quiet 2>/dev/null || git fetch --deepen=50 --quiet 2>/dev/null; git rev-parse --verify HEAD^ >/dev/null 2>&1 || exit 1; git diff --quiet HEAD^ HEAD -- apps/web`). Se validó localmente contra commits reales del historial (clon completo, no shallow) y pasó. Al probarlo en vivo con el PR #36 (un comentario benigno en `apps/web/next.config.ts`, cambio real dentro de `apps/web`), el check de Vercel salió **"Canceled by Ignored Build Step"** — el mismo bug de feb 2026, reincidiendo pese al fallback.

**Hipótesis de causa raíz** (de los dos intentos con `git diff` casero): el `git fetch --unshallow` / `--deepen=50` probablemente falla en silencio (stderr redirigido a `/dev/null` a propósito, para no romper el build por un fetch fallido) dentro del entorno restringido en el que Vercel ejecuta el Ignored Build Step (permisos de red/git limitados, sin credenciales del remoto, o timeout). Sin historial real disponible, `git rev-parse --verify HEAD^` termina resolviendo contra un commit "fantasma" en el límite del shallow clone en vez de fallar como se esperaba, y el diff subsiguiente da un falso "sin cambios".

**Regla**: no volver a un `ignoreCommand` basado en `git diff` casero contra `HEAD^`/`HEAD~N` en este proyecto — usar `turbo-ignore` (§ arriba) o, si deja de funcionar, investigar primero por qué antes de reintentar cualquier variante manual.

## 🧩 Backend (Supabase)

En este proyecto **no hay servidor Express**. La app web y mobile consumen Supabase directo (Auth + PostgREST) y la lógica del bot corre en Edge Functions.

### Base de datos (schema)

```bash
# Aplicar schema Drizzle a Supabase
yarn db:push
```

### Edge Functions (deploy)

```bash
yarn deploy:whatsapp-webhook
# o: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx --yes supabase@latest functions deploy whatsapp-webhook --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

### Secrets (Supabase Dashboard / CLI)

Configurar en Supabase → Edge Functions → Secrets (o `npx supabase secrets set … --project-ref udelxwwnyivknslueerr`):

| Secret                                          | Notas                                                                                                                                                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WHATSAPP_ACCESS_TOKEN`                         | Token **permanente** del System User para **WABA** (webhook, recordatorios, nudges). Permisos: `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`. **No** usar token temporal de API Setup (~24 h). |
| `WHATSAPP_PHONE_NUMBER_ID`                      | ID Meta del número **WABA / bot** (`+51 981 444 430`). No es el 932 (staff). Listar: `GET /{WABA_ID}/phone_numbers`.                                                                                                                         |
| `FCM_SERVICE_ACCOUNT`                           | JSON service account FCM v1                                                                                                                                                                                                                  |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_ADMIN_API_KEY` | Haiku webhook / cost report                                                                                                                                                                                                                  |
| `META_SYSTEM_USER_TOKEN`                        | Token System User **zm-bot** para **Graph Marketing API** (`act_2097809460557755`): cron `sync-meta-ads-spend`, `waba-pricing-sync`, y **operación Ads desde Cursor/Claude Code** (listar/insights/editar vía curl). Permisos verificados 24-ago-2026: `ads_read` + `ads_management`. **Puede ser el mismo string que `WHATSAPP_ACCESS_TOKEN` o un token distinto**. **No** Pipeboard ni MCP `mcp.facebook.com/ads`. Nunca loguear el valor. **Confirmado 19-sep-2026**: en `.env` (raíz) **no existe** una var separada `META_SYSTEM_USER_TOKEN` — para operar la Graph Marketing API por curl desde el agente, usar `$WHATSAPP_ACCESS_TOKEN` (mismo token, ya tiene los permisos de Ads). Si en el futuro se rota y deja de servir para Ads, recién ahí agregar `META_SYSTEM_USER_TOKEN` como var separada. |
| `WABA_ID`                                       | ID cuenta WhatsApp Business (ej. `1271330085100222`)                                                                                                                                                                                         |
| `WABA_SYNC_SECRET`                              | Header `X-Sync-Secret` para invocar `waba-pricing-sync`; duplicado en **Supabase Vault** (`waba_pricing_sync_secret`) para el cron semanal                                                                                                   |
| `GCP_SERVICE_ACCOUNT_BASE64`                    | Plan 06 look-preview — JSON SA GCP en base64. Ver [`VERTEX_AI_LOOK_PREVIEW.md`](VERTEX_AI_LOOK_PREVIEW.md)                                                                                                                                    |
| `GCP_LOCATION`                                  | Región Vertex (ej. `us-central1`)                                                                                                                                                                                                            |
| `GEMINI_IMAGE_MODEL`                            | Modelo imagen (ej. `gemini-2.5-flash-image`)                                                                                                                                                                                                 |

**Vault (crons pg_cron, no en repo):**

| Secret Vault                    | Uso                                                                 |
| ------------------------------- | ------------------------------------------------------------------- |
| `cron_secret`                   | Mismo valor que el secret de Edge `CRON_SECRET`. Wrapper `invoke_cron_edge_function()` |
| `waba_pricing_sync_service_jwt` | JWT `service_role` para `pg_net` → `waba-pricing-sync`              |
| `waba_pricing_sync_secret`      | Mismo valor que `WABA_SYNC_SECRET`                                  |

Configurar en Dashboard → Database → Vault (o SQL `vault.create_secret`). **No** guardar el service_role JWT ni `CRON_SECRET` en `cron.job` ni en migraciones. `pg_cron` llama `SELECT public.invoke_cron_edge_function('…')` (allowlist; `REVOKE EXECUTE` de `anon`/`authenticated`).

Los scripts QA siguen usando `CRON_SECRET` del `.env` contra las Edge Functions directo — eso no cambia.

**Números WhatsApp (no confundir):**

| Número            | Rol                                                      |
| ----------------- | -------------------------------------------------------- |
| `+51 981 444 430` | Bot Cloud API (WABA) — envíos de Edge Functions          |
| `+51 932 535 512` | Staff / coordinación humana (`STAFF_COORDINATION_PHONE`) |

Al rotar tokens: actualizar `.env` (raíz) y el **secret correspondiente** en Supabase (no hace falta redeploy). **WABA** → `WHATSAPP_ACCESS_TOKEN`. **Ads/pricing** → `META_SYSTEM_USER_TOKEN`. Si unificas en un solo token nuevo, actualiza ambos secrets a la vez. Validar:

```bash
set -a && source .env && set +a
curl -s "https://graph.facebook.com/v22.0/me" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
curl -s "https://graph.facebook.com/v22.0/$WHATSAPP_PHONE_NUMBER_ID?fields=display_phone_number,verified_name" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
# Ads (cuenta ZM) — mismo META_SYSTEM_USER_TOKEN que usa el agente
curl -s "https://graph.facebook.com/v22.0/act_2097809460557755/campaigns?fields=id,name,status,objective&limit=5" \
  -H "Authorization: Bearer $META_SYSTEM_USER_TOKEN"
```

Docs Meta: [Access tokens (WhatsApp)](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens).

## 🔒 Seguridad Post-Deployment

### 1. HTTPS

- **Vercel**: HTTPS automático
- **Custom domain**: Configurar SSL certificate

### 2. Variables Sensibles

⚠️ **NUNCA** commitear:

- `.env` con tokens reales
- Credenciales de base de datos
- Tokens de WhatsApp

Usar variables de entorno en las plataformas.

## 📊 Monitoreo

### Logs

```bash
# Vercel Functions
vercel logs
```

## 🔄 Actualizaciones

### Frontend

```bash
yarn web:build
vercel deploy --prod --yes
```

### Edge Functions (WhatsApp bot)

```bash
yarn deploy:whatsapp-webhook
# o: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx --yes supabase@latest functions deploy whatsapp-webhook --project-ref udelxwwnyivknslueerr --no-verify-jwt
```

### Base de Datos

```bash
# Migrar schema
yarn db:push

# Actualizar datos
psql postgresql://... -f scripts/db/nuevo-script.sql
```

## 🆘 Troubleshooting

### Error: "Cannot connect to database"

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Probar conexión
psql $DATABASE_URL -c "SELECT 1"
```

### Error: "WhatsApp webhook not working"

1. Verificar que `whatsapp-webhook` esté **ACTIVE** y con **Verify JWT = Off**
2. Revisar logs en Supabase (Edge Functions)
3. Verificar configuración del webhook en Meta (URL y verify token)
4. Confirmar secrets en Supabase: token System User válido + `WHATSAPP_PHONE_NUMBER_ID` del **981** (bot), no del 932
5. Si Graph responde `Application has been deleted` → el token es de una app Meta borrada; regenerar System User token (ver § Secrets)

### Error: envíos WABA fallan / phone id inválido

1. `GET /{WABA_ID}/phone_numbers` con el token actual — usar el `id` del número **981 444 430**
2. Actualizar `WHATSAPP_PHONE_NUMBER_ID` en secrets + `.env` + `apps/web/.env.local`

### Error: "Web build fails"

```bash
# Limpiar cache (Next.js en apps/web)
rm -rf apps/web/.next node_modules
npm install
npm run web:build
```

## 📚 Referencias

- [Railway Docs](https://docs.railway.app/)
- [Vercel Docs](https://vercel.com/docs)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)

## ✅ Checklist Pre-Deployment

- [ ] Tests pasando
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Webhook de WhatsApp configurado
- [ ] Dominios DNS configurados
- [ ] SSL/HTTPS habilitado
- [ ] Monitoreo configurado
- [ ] Backups de base de datos configurados

---

**Última actualización**: 2026-03-26

> App móvil y OTA: ya no se despliegan desde este repo (ahora Geema, ver `zm-tech`).
