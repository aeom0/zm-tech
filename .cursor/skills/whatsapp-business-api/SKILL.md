---
name: whatsapp-business-api
description: Best practices for building on the WhatsApp Business Platform (Cloud API / WABA) — webhook setup and signature verification, message templates, sending/receiving messages, media handling, and Deno/Supabase Edge Function integration patterns. Use this skill whenever the user asks to build a WhatsApp bot, integrate WABA (WhatsApp Business Account), send template messages, handle incoming WhatsApp webhooks, debug Cloud API errors, or connect WhatsApp messaging to a Supabase/Deno backend. Trigger this even without the word "skill" — any mention of WhatsApp Cloud API, WABA, WhatsApp Business Platform, message templates, WhatsApp webhook, or WhatsApp Edge Function should load this skill first. This is distinct from Click-to-WhatsApp *ads* — see meta-ads-manager's CTWA reference for the paid-ads side; this skill covers the messaging/bot backend itself.
---

# WhatsApp Business API (Cloud API / WABA)

Playbook for building on Meta's WhatsApp Business Platform. Draws on `whatsapp-api-js` (an actively-maintained, dependency-free TypeScript library with first-class Deno support) plus the official Cloud API's core patterns.

## 1. Prerequisites and setup

See `references/setup-and-auth.md` for the full checklist. Quick version:
- A Meta Developer App with WhatsApp product added
- A **system user permanent access token** — do not build production flows on a temporary token, it expires in 24h and will silently break the integration
- `WA_PHONE_NUMBER_ID` (sender) and `WA_BUSINESS_ACCOUNT_ID`
- App secret, for verifying incoming webhook payload signatures
- A webhook endpoint (GET for verification handshake, POST for receiving events) and a **verify token** string that must match between your server config and Meta's dashboard config

## 2. Choosing your integration layer

Two viable paths:

1. **Call the Graph API directly** (`https://graph.facebook.com/{version}/{phone_number_id}/messages`) — full control, no dependency, but you own message payload construction, retries, and webhook signature verification yourself.
2. **Use a maintained wrapper library** — `whatsapp-api-js` is a solid pick: TypeScript, zero dependencies, actively maintained, and has purpose-built setup helpers for Node (15/18/19+), **Deno**, and Bun. Given most of this ecosystem's Node SDKs are either archived (Meta's own official Node.js SDK was archived) or heavier, this is the more durable choice for new builds.

**For Supabase Edge Functions specifically** (Deno runtime): see `references/webhooks-deno.md` for the exact middleware/setup pattern — it maps cleanly onto `Deno.serve`.

## 3. Sending messages

See `references/messaging-templates.md`. Key distinction to get right immediately:

- **Free-form messages** (text, image, document, etc.) can only be sent within a **24-hour customer service window** that opens when the user messages you first, or replies to a message.
- **Template messages** (pre-approved by Meta) are the only way to *initiate* a conversation outside that window — e.g. order confirmations, reminders, marketing outreach to a user who hasn't messaged recently.
- Templates require submission and approval through Meta Business Manager before use — budget review time similar to other Meta app-review flows, though typically faster (often within a day, but can take longer).

## 4. Webhooks

- Verify the `X-Hub-Signature-256` header against the app secret on every incoming POST — don't process unverified payloads
- The GET verification handshake (subscribe/challenge/verify_token) must be implemented correctly or Meta will refuse to activate the webhook subscription at all
- Subscribe specifically to the `messages` event in the WhatsApp > Configuration section of the app dashboard — a very common setup miss is having the webhook URL configured but not subscribed to the right event, so nothing arrives

## 5. Common failure modes

See `references/troubleshooting.md` for the full list, including:
- Sending outside the 24h window without a template (rejected)
- Unapproved/misformatted templates
- Media ID reuse across requests (media IDs expire)
- Rate limiting and messaging tiers tied to phone number quality rating
