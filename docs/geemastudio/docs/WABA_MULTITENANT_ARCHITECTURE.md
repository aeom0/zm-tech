# Arquitectura multi-tenant del bot WABA

## Resumen

Una única Edge Function (`whatsapp-webhook`) atiende a todos los tenants. El
enrutamiento es 100% por datos: no hay una función por tenant ni código duplicado.

## Dónde viven las credenciales

Cada tenant tiene su propio WABA modelado como columnas en su fila de
`tenant_settings`:

- `waba_phone_number_id`
- `waba_access_token`
- `waba_verify_token`
- `waba_admin_phones`
- `waba_business_hours`
- `waba_payment_info`
- `features_waba` (interruptor — debe estar en `true` para que el tenant reciba tráfico)

Fuente SQL: `supabase/migrations/20260406_waba_multitenant.sql`. Resolución en runtime:
`supabase/functions/whatsapp-webhook/lib/tenant-resolver.ts`.

> **Nota operativa**: también hay detalle de secrets, deploy y SQL de prueba en
> [`EDGE_FUNCTIONS.md`](./EDGE_FUNCTIONS.md). Este documento es la guía de alta
> multi-tenant y del handshake GET con `phone_number_id`.

## Cómo se resuelve el tenant en cada mensaje

**POST (mensajes entrantes)**: Meta incluye `metadata.phone_number_id` en el payload.
`lib/tenant-resolver.ts` → `resolveTenantFromPhoneNumberId()` busca ese valor en
`tenant_settings` y devuelve las credenciales correspondientes. Automático, sin
configuración adicional por request.

**GET (handshake de verificación de Meta)**: Meta NO incluye `phone_number_id` en
este payload — solo `hub.mode`, `hub.verify_token`, `hub.challenge`. Por eso
`validateGetVerify()` en `lib/auth.ts` exige `phone_number_id` como **query param
en la URL misma**.

## Checklist: dar de alta el WABA de un tenant nuevo

1. Crear o vincular la app de Meta Business del tenant, obtener:
   - `phone_number_id`
   - `access_token` (permanente, tras verificación de Meta Business)
   - Definir un `verify_token` propio para ese tenant (cualquier string secreto)
2. Insertar/actualizar la fila en `tenant_settings` con esos tres valores +
   `features_waba = true`.
3. En el dashboard de Meta, configurar el webhook con esta URL exacta:

   ```
   https://udelxwwnyivknslueerr.supabase.co/functions/v1/whatsapp-webhook?phone_number_id=<ID_DEL_TENANT>
   ```

   Usando como "Verify token" el mismo valor guardado en `waba_verify_token` para
   ese tenant.

4. Confirmar el handshake (Meta debe aceptar la verificación).
5. Enviar un mensaje de prueba y confirmar que llega al `wa_messages` del tenant
   correcto.

**Error común**: si el `phone_number_id` en la URL no coincide con el guardado en
`tenant_settings`, el handshake falla en silencio (403) sin mensaje de error claro
del lado de Meta. Verificar primero ahí si un tenant nuevo no logra activar WABA.

## Pendiente

- No existe UI en el panel web para dar de alta estas credenciales — hoy es manual
  vía SQL o Supabase Dashboard. Evaluar si el formulario de alta de WABA debe
  formar parte de PR-11 (`/panel/waba/configuracion`).
- Capacidad ZM v3.0 (anti-doble-reserva global, silence-watchdog, portafolio,
  referencia visual) y motor de reenganche: ver PR-10 / PR-10B en `ROADMAP.md`.
