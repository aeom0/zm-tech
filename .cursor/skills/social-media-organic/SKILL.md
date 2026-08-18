---
name: social-media-organic
description: Best practices for publishing and managing organic (non-paid) content on Instagram, Facebook Pages, and TikTok via their official content-publishing APIs — container-based publishing flows, OAuth scopes, app review requirements, rate limits, and common rejection errors. Use this skill whenever the user asks to publish, schedule, or automate posts/reels/stories/carousels on Instagram or Facebook Pages, post videos or photo carousels to TikTok via the Content Posting API, debug organic-posting API errors (container status failures, domain verification, scope rejections), or decide between building directly on these APIs vs. using a third-party posting layer. Trigger this even without the word "skill" — any mention of Instagram Graph API, Facebook Page posting, TikTok Content Posting API, Direct Post, media containers, or organic content scheduling should load this skill first. This is NOT for Meta/TikTok Ads — see the meta-ads-manager skill for paid campaigns.
---

# Social Media Organic Publishing

Playbook for publishing organic content programmatically to Instagram, Facebook Pages, and TikTok. Distilled from official platform documentation (2026). This is distinct from paid advertising — see `meta-ads-manager` for Meta Ads campaigns.

## 1. Instagram (Graph API — Content Publishing)

See `references/instagram.md` for the full container flow, Reels specs, and error handling.

**Quick facts:**

- Only **Business or Creator** accounts can publish via API — personal accounts cannot, and must convert + link to a Facebook Page first
- Required scopes (current, as of 2026): `instagram_business_basic` + `instagram_business_content_publish`. The older `instagram_basic`/`instagram_content_publish` scope names were deprecated Jan 27, 2025 — if you see code referencing those, it needs updating
- Two-step publish: create a media container (`POST /{ig-user-id}/media`), poll its `status_code` until `FINISHED`, then publish (`POST /{ig-user-id}/media_publish`)
- **Rate limit: 100 published posts per rolling 24-hour window** per account, enforced at the publish endpoint (not container creation) — carousels count as one post
- App Review is mandatory for production use on accounts you don't own; expect 2–4 weeks per submission, each with its own screencast

## 2. Facebook Pages

See `references/facebook-pages.md`. Page posting shares infrastructure with the Graph API and largely the same app-review gate as Instagram — if the user already has an approved app for one, extending to the other reuses most of the setup.

## 3. TikTok (Content Posting API)

See `references/tiktok.md` for Direct Post vs. Creator Post (inbox upload), domain verification, and chunked upload mechanics.

**Quick facts:**

- Two flows: **Direct Post** (publishes immediately, no manual step) vs. **Creator Post/Inbox Upload** (lands in the creator's TikTok inbox for manual confirmation) — for full automation, Direct Post is what the user wants
- **Unaudited apps are heavily restricted**: max 5 users per 24h, all posts forced to `SELF_ONLY` (private) viewership. To publish publicly, the API client needs a **compliance audit** — this isn't optional for any real-world use case
- **Domain/URL verification is required** before using `PULL_FROM_URL` as a video/photo source — the exact host serving the media must be verified in the TikTok Developer Portal (DNS record or meta tag). Pre-signed URLs from an unverified bucket fail with `url_ownership_unverified`
- Posting cap: ~15 posts/24h per creator account, shared across all API clients using Direct Post for that account
- No edit endpoint after publish — a typo means delete + re-upload, not an edit call

## 4. Cross-platform decision: build direct vs. use a posting layer

Building directly against these APIs means owning OAuth flows, app review, token refresh, rate-limit handling, and container/status polling per platform — each platform is a separate multi-week project. This is the right call when:

- There's a compliance requirement ruling out third-party middleware
- The integration only needs one platform with deep platform-specific functionality

A third-party unified posting API (the user may mention Blotato, Zernio, Postproxy, Ayrshare, or similar) makes sense when organic posting is one feature of a broader product and the team wants to skip weeks of app-review cycles. These wrap the same official APIs under the hood — they don't bypass platform rules, just the integration overhead. If the user is evaluating this tradeoff, lay out both paths rather than assuming one.

## 5. General gotchas across all three platforms

- **Tokens expire.** Instagram/Facebook long-lived tokens expire every 60 days — build refresh logic in from day one, don't bolt it on later.
- **Development vs. Live mode.** All three platforms gate unreviewed apps to test/sandbox users only. If posts silently stop reaching real users, check whether the app is still in development/sandbox mode.
- **Retry discipline.** For failed uploads, retry only 1–2 times within a short window (Meta recommends 30s–2min); if it still fails, generate a new container/upload session rather than retrying the same one indefinitely.
- **Aspect ratio / duration limits are platform-tab-specific, not upload-blocking.** E.g. an Instagram video outside 9:16 / 5–90s still uploads fine, it just won't appear in the Reels tab — it publishes as a regular video post instead. Don't assume an upload failure when the real issue is tab eligibility.
