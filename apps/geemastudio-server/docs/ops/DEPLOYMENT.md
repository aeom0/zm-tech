# Deploy — Edge Functions y BD (GeemaStudio)

Deploy del backend de GeemaStudio (proyecto Supabase `udelxwwnyivknslueerr`).
Web (Vercel) y mobile (EAS/OTA): [`docs/geemastudio/docs/DEPLOYMENT.md`](../../../../docs/geemastudio/docs/DEPLOYMENT.md).
La landing `zmlashnails.com` se despliega desde el repo ZM Lash.

No hay servidor Express: web y mobile consumen Supabase directo (Auth + PostgREST)
y la lógica del bot corre en Edge Functions.

## Edge Functions

Único deployer: `.github/workflows/edge-functions.yml` (desde el 6-oct-2026).

- Push a `main` que toque `apps/geemastudio-server/supabase/functions/**` → corre
  `deno check` (webhook y `held-slot-watch`), valida el inventario y despliega
  todas las funciones de la matriz. Agrupar los cambios en un solo push.
- Una sola función: `workflow_dispatch` con el input `function`.
- Función nueva: agregarla a la matriz del workflow (el guard de inventario falla si falta).
- `verify_jwt` se toma de la matriz (`jwt: false` → `--no-verify-jwt`).
  `whatsapp-webhook` debe quedar en `false`.
- No desplegar a mano por CLI ni por MCP salvo emergencia: el próximo push lo pisa.

## Base de datos

- Schema Drizzle: `pnpm db:push` desde la raíz de zm-tech.
- Migraciones SQL: `apps/geemastudio-server/supabase/migrations/`, 1:1 con
  `supabase_migrations.schema_migrations` (ver `.cursor/rules/supabase-migrations.mdc`).
- DDL en producción solo con confirmación explícita.

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

Al rotar tokens: actualizar `.env` (raíz), el **secret correspondiente** en Supabase (no hace falta redeploy) y el secret de Vault `waba_token_<tenant_id>` que leen los crons (ver [`WABA_MULTITENANT_ARCHITECTURE.md`](../../../../docs/geemastudio/docs/WABA_MULTITENANT_ARCHITECTURE.md)). **WABA** → `WHATSAPP_ACCESS_TOKEN`. **Ads/pricing** → `META_SYSTEM_USER_TOKEN`. Si unificas en un solo token nuevo, actualiza ambos secrets a la vez. Validar:

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
2. Actualizar `WHATSAPP_PHONE_NUMBER_ID` en los secrets de Edge y en `tenant_waba_numbers`

## Referencias

- [Edge Functions — inventario y detalle](EDGE_FUNCTIONS.md)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)

---

**Última actualización**: 2026-10-12 — deploy por workflow de zm-tech; retiradas las secciones Vercel/yarn del repo ZM.
