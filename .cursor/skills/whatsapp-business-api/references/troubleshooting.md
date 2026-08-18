# WABA Troubleshooting

## "Message failed to send" outside the 24h window

If a free-form (non-template) message send fails, first check whether the user has messaged within the last 24 hours. If not, this is expected behavior, not a bug — switch to a template message instead.

## Template rejected or stuck in review

- `MARKETING` category templates get more scrutiny than `UTILITY` — if a template is really transactional in nature (order confirmation, appointment reminder), categorize it as `UTILITY` rather than `MARKETING`; it'll both review faster and typically cost less per conversation
- Templates with unclear/generic variable placeholders (e.g. no example values provided) are a common rejection reason — always fill in the example values field when submitting

## Media ID errors ("media not found" / expired)

Media IDs are not permanent references — don't store a `media_id` in a database expecting to reuse it weeks later for a _new_ outbound message. Re-upload the media file to get a fresh ID if the original upload happened more than a short while ago. (Inbound media, i.e. something a user sent you, should be downloaded and stored in your own storage — e.g. Supabase Storage — promptly rather than relying on Meta's media URL staying valid.)

## Webhook not receiving anything

Checklist, in order of likelihood:

1. Webhook URL configured but **not subscribed to the `messages` field** in WhatsApp > Configuration — this is the most common miss
2. Verify token mismatch during the GET handshake — the subscription never actually saved even though the dashboard might not show an obvious error
3. Signature verification failing silently and the handler returning a non-200, causing Meta to eventually back off retries
4. App still in Development mode with the sending number not added as a tester

## Rate limits / messaging tiers

WhatsApp Business accounts have **messaging tier limits** (e.g. 1K/10K/100K unique conversations per 24h) that scale up automatically based on the phone number's quality rating and volume history. A new number starts at the lowest tier. If a campaign needs high send volume, check the current tier in WhatsApp Manager before assuming the integration is broken when sends get throttled — this is a phone-number-level limit, not a code bug.

## Phone number quality rating dropping

High block/report rates from recipients degrade the number's quality rating, which can cap messaging tier growth or trigger restrictions. Mitigations:

- Never message someone who hasn't opted in or messaged first (outside legitimate template use cases)
- Keep template content genuinely relevant to what the user expects — generic/spammy templates get reported more
- Watch the quality rating in WhatsApp Manager as a leading indicator, not just delivery/read rates

## Error code 131047 (message failed — re-engagement)

The specific error code for "outside 24h window, no valid template" rejections. If seeing this, the fix is always: switch to a template send, not a retry of the same free-form message.
