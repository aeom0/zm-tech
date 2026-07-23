# Webhooks on Deno / Supabase Edge Functions

Supabase Edge Functions run on Deno, which changes the setup slightly from a standard Node/Express server. This is the relevant path for `naturalforce-suite`'s planned Fase 4 (WABA bot via Supabase Edge Functions).

## Importing a Node library into Deno

Deno 1.25+ can import npm packages directly:

```js
import { WhatsAppAPI } from "npm:whatsapp-api-js";
```

For older Deno versions or if the direct npm specifier misbehaves, use the ESM CDN mirror instead:

```js
import { WhatsAppAPI } from "https://esm.sh/whatsapp-api-js";
```

## Deno-specific setup helper

`whatsapp-api-js` ships a Deno middleware + setup helper that maps directly onto `Deno.serve`:

```js
import { WhatsAppAPI } from "npm:whatsapp-api-js/middleware/deno";
import { Deno as DenoSetup } from "whatsapp-api-js/setup/deno";

const Whatsapp = new WhatsAppAPI(
  DenoSetup({
    token: Deno.env.get("CLOUD_API_ACCESS_TOKEN"),
    appSecret: Deno.env.get("M4D_APP_SECRET"),
    webhookVerifyToken: Deno.env.get("WEBHOOK_VERIFICATION_TOKEN"),
  })
);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    // Webhook verification handshake
    return new Response(Whatsapp.get(Object.fromEntries(url.searchParams)));
  }

  if (req.method === "POST") {
    // Incoming message/event
    return new Response(null, { status: await Whatsapp.handle_post(req) });
  }

  return new Response("Not found", { status: 404 });
});
```

Adapt the exact request/response shape to Supabase Edge Functions' handler signature (`Deno.serve` works the same way inside a Supabase function — the function entrypoint just wraps this pattern).

## Environment variables in Supabase Edge Functions

Set secrets via the Supabase CLI or dashboard rather than a `.env` file (Edge Functions don't read `.env` automatically the way local Node dev does):

```bash
supabase secrets set CLOUD_API_ACCESS_TOKEN=xxx
supabase secrets set M4D_APP_SECRET=xxx
supabase secrets set WEBHOOK_VERIFICATION_TOKEN=xxx
supabase secrets set WA_PHONE_NUMBER_ID=xxx
```

Access them inside the function via `Deno.env.get("VAR_NAME")`.

## Persisting conversation state

Edge Functions are stateless/ephemeral between invocations — any conversation context (what step of a flow a user is on, cart state, etc.) needs to live in the database (Supabase Postgres), not in memory. A typical shape:

- A `waba_conversations` table keyed by the user's WhatsApp number (`wa_id`), tracking current flow state
- The webhook handler reads state at the top of each invocation, processes the incoming message against that state, writes updated state back, then sends the reply

This mirrors the existing `movimientos_stock` immutable-history pattern already used elsewhere in the project — append-only event log plus a derived current-state table tends to be more debuggable than mutating a single state row in place.

## Signature verification specifically on Deno

`whatsapp-api-js`'s Deno setup uses the runtime's native `crypto.subtle` under the hood for HMAC verification — no extra polyfill needed, unlike older Node versions which required a ponyfill. If building the signature check manually instead of using the library, use `crypto.subtle.importKey` + `crypto.subtle.sign` with the raw request body bytes (read via `req.arrayBuffer()` before any JSON parsing — parsing first and re-serializing breaks the signature match).
