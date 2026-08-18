# CTWA (Click-to-WhatsApp) & Messenger Ads

## Why the native "Meta Ads" connector won't work here

The native connector's `create_ad_creative` only supports standard link/video creatives. CTWA and Messenger-destination ads need the rich `page_welcome_message` object, which the native tool doesn't expose. **Use the Pipeboard connector (or any MCP explicitly built for CTWA) for these.**

## Required fields for a CTWA creative

```json
{
  "app_destination": "WHATSAPP",
  "call_to_action_type": "WHATSAPP_MESSAGE",
  "page_welcome_message": {
    "type": "...",
    "version": "...",
    "landing_screen_type": "...",
    "media_type": "...",
    "text_format": {
      "customer_action_type": "...",
      "message": {
        "text": "...",
        "autofill_message": {
          "content": "..."
        }
      }
    }
  }
}
```

**Do not submit a minimal/partial `page_welcome_message`** — a bare-bones form (e.g. just `{"text": "..."}`) gets rejected. The nested `text_format.message.autofill_message.content` structure needs to be complete.

## Ad set requirements

- `destination_type` must be set correctly at ad set creation (`ON_PAGE` for page-related destinations, or the WhatsApp-specific value depending on the connector's schema)
- **`destination_type` is immutable after ad set creation.** If you set it wrong, you must create a new ad set — there's no update path. Confirm the destination with the user _before_ creating the ad set, not after.
- Optimization goal for WhatsApp conversation campaigns is typically `CONVERSATIONS`

## Swapping the creative on a live CTWA ad (without touching ad set/campaign)

If the underlying video/image needs replacing but the ad set and campaign should stay untouched:

1. Upload/reference the new video and get its `video_id`
2. Get `thumbnail_url` via `get_ad_video` (or equivalent) — passing `image_hash` instead fails with a "Missing Thumbnail" error
3. Create a new creative (`create_ad_creative`) with the new `video_id` + thumbnail, replicating the exact same copy and `page_welcome_message` as the original
4. Call `update_ad(ad_id, creative_id=<new_creative_id>)` to swap it in

This avoids recreating the ad set (which would reset learning phase and lose historical ad set-level data).

## Common permission error

**Error 1487202** = the authenticated user/token lacks page-level permissions on the Facebook Page being used as the ad's destination. This is **not** an invalid-token error — don't waste time regenerating tokens. Fix: assign Advertiser or Admin role on the Page in Business Manager.

## Reading WhatsApp conversion signals

See `insights-reading.md` — the generic `conversions` metric doesn't isolate WhatsApp conversation starts or catalog orders; you need `actions` with specific `action_type` values.
