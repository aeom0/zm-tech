# Instagram Graph API — Content Publishing

## Prerequisites

- Instagram **Business or Creator** account (personal accounts have zero API access — confirmed dead end, must convert)
- The Instagram account must be **linked to a Facebook Page** — without this, media publishing, comment moderation, and insights are all unavailable regardless of other setup
- A registered Meta Developer App with the Instagram Graph API product added
- OAuth via either:
  - **Instagram Business Login** — simpler, direct Instagram auth, no Facebook Page connection required at auth time (good for single-account/consumer-facing tools)
  - **Facebook Login for Business** — auth goes through Facebook, which then accesses the linked Instagram account

## Required scopes (current)

- `instagram_business_basic` — basic profile info, required before other permissions work
- `instagram_business_content_publish` — create containers and publish

These replaced `instagram_basic` / `instagram_content_publish`, deprecated January 27, 2025. If maintaining older code, update the scope names.

Add `instagram_manage_comments` if the workflow also needs to publish a first comment on new posts — a commonly missed scope for that specific use case.

**App Review**: each permission needs its own submission with a screencast demonstrating the complete user flow (connect account → request permission → use it). Expect 2–4 weeks per submission. Until approved, the app is in Development mode and only explicitly-added test users can connect.

## Publishing flow (container model)

All content — images, carousels, Reels, Stories — follows the same two-step pattern:

1. **Create a container**: `POST /{ig-user-id}/media` with the media URL and type-specific params
2. **Poll status**: `GET /{container-id}?fields=status_code` until it returns `FINISHED` (not `IN_PROGRESS` or `ERROR`)
3. **Publish**: `POST /{ig-user-id}/media_publish` with `creation_id={container-id}`

## Reels specifics

- `media_type=REELS` on container creation, with a public `video_url`
- **Reels tab eligibility**: 9:16 aspect ratio, 5–90 seconds duration, H.264 or HEVC encoding
- Videos outside those bounds still publish successfully — they just land as a regular video post instead of appearing in the Reels tab. This is not an error; don't debug it as one.
- API cap is 90 seconds for Reels even though the native app now supports longer Reels — the Graph API hasn't caught up to that native-app feature
- Cover/thumbnail options:
  - `cover_url` — external image URL, recommended 1080×1920 (9:16). If it doesn't match 9:16, Instagram center-crops the middle 9:16 rectangle
  - The cover displays as a center-cropped 1080×1080 square on the profile grid — make sure the center of the cover image looks good at that crop, not just the full 9:16 frame

## Rate limits

- **General API calls**: ~200 calls per user per hour
- **Publishing specifically: 100 published posts per rolling 24-hour window**, enforced at the `media_publish` endpoint (not at container creation — containers can be created freely, only publishing is throttled)
- Carousels count as a **single** post against this limit regardless of how many images/videos they contain

## Error handling

- Meta's own guidance on upload failures: retry only 1–2 times within 30 seconds to 2 minutes. If still failing, create a brand-new container rather than retrying the same `creation_id` repeatedly.
- A container stuck in `IN_PROGRESS` for an extended period usually means the media file itself has a problem (codec, size, or aspect ratio at the edge of what's accepted) — check the source file before assuming an API bug.
