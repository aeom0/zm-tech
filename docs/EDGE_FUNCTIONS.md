# Edge Functions — SalonPro

## `whatsapp-webhook`

Webhook único de Meta WhatsApp Cloud API para **todos los tenants**. La URL es la misma en cada proyecto Supabase; el tenant se resuelve con `value.metadata.phone_number_id` del payload y la fila en `tenant_settings` (`waba_phone_number_id`, `features_waba = true`).

### Secrets (CLI)

```bash
# Firma HMAC de Meta (si implementás verificación de `X-Hub-Signature-256` en el futuro)
supabase secrets set META_APP_SECRET=<valor>

# Ya usados por la función
supabase secrets set SUPABASE_URL=<url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>

# Opcional — saludo / chat con Haiku
supabase secrets set ANTHROPIC_API_KEY=<key>
```

Los **tokens WABA por negocio** no van en secrets globales: van en `tenant_settings.waba_access_token` y `waba_verify_token` por fila.

### Deploy

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

Meta no envía JWT de Supabase; `--no-verify-jwt` es obligatorio.

### Verificación GET (suscripción del webhook)

Meta llama con `hub.mode`, `hub.verify_token`, `hub.challenge` y debés incluir **`phone_number_id`** en la query (ID del número en Meta), para que la función busque el tenant y compare `hub.verify_token` con `tenant_settings.waba_verify_token`.

Ejemplo:

`GET .../whatsapp-webhook?phone_number_id=<ID>&hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`

### Tenant de prueba (SQL manual)

```sql
UPDATE tenant_settings SET
  waba_phone_number_id = '<phone_number_id_meta>',
  waba_access_token = '<token>',
  waba_verify_token = '<verify_token>',
  features_waba = true,
  waba_business_hours = '{"weekday":[10,11,12,13,14,15,16,17,18],"sunday":[10,11,12]}',
  waba_payment_info = '{"methods":[{"label":"Yape/Plin","detail":"XXX XXX XXX"}],"contact_name":"<Nombre Negocio>"}'
WHERE id = '<uuid tenant>';
```

### T tamaño

Si el bundle supera el límite del MCP de Supabase, usar siempre deploy por CLI (como arriba).
