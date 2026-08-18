# WABA Setup & Authentication

## Getting started checklist

1. Create/use a Meta Business App at developers.facebook.com, add the **WhatsApp** product
2. From the WhatsApp > API Setup dashboard, grab:
   - `WA_PHONE_NUMBER_ID` — the sending number's ID
   - `WA_BUSINESS_ACCOUNT_ID` — the WABA ID
   - A temporary access token (24h) for initial testing only
3. Generate a **permanent (system user) access token** for anything beyond local testing — see below
4. Get the App Secret from App Settings > Basic > App Secret — needed for webhook payload signature verification
5. Set up the webhook endpoint (see `webhooks-deno.md`) and configure it in WhatsApp > Configuration, subscribing to the `messages` field

## Permanent tokens — don't skip this

The default token shown in the API Setup dashboard is temporary and expires in 24 hours. For any real integration:

1. Create a System User in Business Settings (Business Manager)
2. Assign the WhatsApp Business Account asset to that System User
3. Generate a token for the System User with the `whatsapp_business_messaging` permission
4. Store this token as the long-lived `CLOUD_API_ACCESS_TOKEN` — this is what production code should use

Skipping this is the single most common reason a WhatsApp bot "works in testing, breaks in production a day later."

## Configuration reference (environment variables)

These map to the common config shape used across most WABA tooling, including `whatsapp-api-js`:

```
WA_BASE_URL=               # default: graph.facebook.com — override only for special routing
M4D_APP_ID=                # Meta for Developers app ID
M4D_APP_SECRET=            # Meta for Developers app secret
WA_PHONE_NUMBER_ID=        # sending phone number ID
WA_BUSINESS_ACCOUNT_ID=    # WABA ID
CLOUD_API_ACCESS_TOKEN=    # system user permanent access token
CLOUD_API_VERSION=v16.0    # or whatever current Graph API version
WEBHOOK_ENDPOINT=          # your webhook path, e.g. /webhook
WEBHOOK_VERIFICATION_TOKEN=# arbitrary string, must match Meta dashboard config
```

## Webhook verification handshake (GET)

Meta calls your webhook URL with a GET request containing `hub.mode`, `hub.verify_token`, and `hub.challenge` query params when the webhook is configured/saved in the dashboard. Your endpoint must:

1. Check `hub.verify_token` matches your configured `WEBHOOK_VERIFICATION_TOKEN`
2. If it matches, respond with the raw `hub.challenge` value (as plain text, status 200)
3. If it doesn't match, respond with 403

Get this wrong and the webhook subscription silently fails to save in the dashboard — there's no useful error message, just a rejected save.

## Payload signature verification (POST)

Every incoming webhook POST includes an `X-Hub-Signature-256` header — an HMAC-SHA256 signature of the raw request body, keyed with the App Secret. Verify this before trusting the payload; libraries like `whatsapp-api-js` handle this automatically when the app secret is passed in on init (pass the raw body string/bytes, not a re-serialized JSON object, or the signature check will fail even on legitimate payloads).
