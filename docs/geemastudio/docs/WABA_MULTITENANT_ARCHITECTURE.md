# Arquitectura multi-tenant del bot WABA

> Actualizado 12-oct-2026 contra el código de `apps/geemastudio-server/supabase/functions/`.
> Inventario de funciones, secrets y deploy: [`EDGE_FUNCTIONS.md`](../../../apps/geemastudio-server/docs/ops/EDGE_FUNCTIONS.md).

## Resumen

Una única Edge Function (`whatsapp-webhook`) atiende a todos los tenants. El
enrutamiento es por datos: no hay una función por tenant ni código duplicado.
Hoy hay un solo número (ZM Lash, `+51 981 444 430`) y el routing multi-tenant
está apagado (`waba_tenant_routing_enabled = false`), así que todo el tráfico
se atribuye a `zm-lash-nails`.

## Dónde viven las credenciales

| Dato | Dónde | Quién lo lee |
|------|-------|--------------|
| `phone_number_id` → `tenant_id` | Tabla `tenant_waba_numbers` (`is_active`) | `whatsapp-webhook/lib/tenant-resolver.ts`, `_shared/tenant-waba.ts` |
| Token de Meta por tenant | Vault, secret `waba_token_<tenant_id>`, vía RPC `get_tenant_waba_token` | Crons y envíos (`_shared/tenant-waba.ts`: nudges, recordatorios, retoque, promos) |
| Token y número globales | Secrets de Edge `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Webhook (`lib/notify.ts`) y respaldo de `tenant-waba.ts` si el token de Vault no es de Meta |
| Verify token del handshake | Secret de Edge `WHATSAPP_VERIFY_TOKEN` (global) | `whatsapp-webhook/lib/auth.ts` |
| Flag de routing | `waba_config.waba_tenant_routing_enabled` (`{"enabled": bool}`) del tenant candidato | `tenant-resolver.ts` |
| Reglas del bot (horario, abono, staff) | `waba_rules` (S5), editables en `/panel/waba/reglas` | Webhook |
| Agente Haiku | `waba_config.agent_enabled` y `agent_phone_allowlist` | Webhook (`routeAgentInbound`) |

Las columnas `waba_*` de `tenant_settings` (`waba_phone_number_id`,
`waba_access_token`, `waba_verify_token`) son del modelo anterior a S1/S4 y el
webhook ya no las usa para resolver el tenant.

## Cómo se resuelve el tenant en cada mensaje

**POST (mensajes entrantes)**: Meta incluye `metadata.phone_number_id`.
`resolveTenantFromPhoneNumberId()` busca ese número en `tenant_waba_numbers`
y lee el flag de routing del tenant candidato:

- Flag `false` (o error de lectura) → `zm-lash-nails` (`DEFAULT_TENANT_ID`).
- Flag `true` → el `tenant_id` de `tenant_waba_numbers`.

El resultado se cachea 5 min por número en el isolate (`lib/ttl-cache.ts`):
activar o apagar el flag tarda hasta 5 min en aplicarse.

**GET (handshake de Meta)**: compara `hub.verify_token` con el secret global
`WHATSAPP_VERIFY_TOKEN`. No hace falta `phone_number_id` en la URL.

## Checklist: dar de alta el WABA de un tenant nuevo

Requiere antes la F6 del traslado (parametrizar los textos y montos de ZM que
siguen en el código), ver
[Plan 04/10](plans/04-geema-migration/10-PLAN-traslado-waba-a-geema.md).

1. En Meta Business del tenant: `phone_number_id` y token permanente de System User.
2. Insertar la fila en `tenant_waba_numbers` (`tenant_id`, `phone_number_id`, `is_active = true`).
3. Crear el secret de Vault `waba_token_<tenant_id>` con el token.
4. Suscribir el número a la misma URL del webhook
   (`https://udelxwwnyivknslueerr.supabase.co/functions/v1/whatsapp-webhook`) con el verify token global.
5. Cargar `waba_rules` y `waba_config` del tenant (panel `/panel/waba/reglas`).
6. Activar `waba_tenant_routing_enabled` en ese tenant y esperar 5 min.
7. Smoke con un teléfono QA (`51999000978`–`999`) y confirmar que el mensaje
   queda en `wa_messages` con el `tenant_id` correcto.

## Pendiente

- No hay UI en el panel para dar de alta el número y el token: hoy es SQL + Vault.
- Smoke del flag de routing en un tenant QA (Plan 04 Track B).
