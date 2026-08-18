# TikTok — Content Posting API

## Direct Post vs. Creator Post (Inbox Upload)

- **Direct Post**: publishes immediately to the creator's profile feed, no manual step. This is the flow for full automation.
- **Creator Post / Inbox Upload**: sends the video to the creator's TikTok inbox; the account owner must open the TikTok app and manually confirm before it goes live. Use this when the workflow intentionally wants human editorial review before publishing, not for hands-off automation.

Both require OAuth 2.0 — each creator account must individually authorize the app for the `video.publish` scope before either flow works.

## The audit gate (read this before promising automation timelines)

**Unaudited API clients are heavily restricted**, regardless of how well the integration works technically:

- Maximum 5 users can post in a 24-hour window
- All posted content is forced to `SELF_ONLY` (private) viewership
- To make content public later, the account owner must first switch their account visibility to public, then manually change each individual post's privacy to "Everyone"

**To lift these restrictions, the API client must pass a compliance audit** verifying it follows TikTok's Terms of Service (authentic creators posting original content, not a bulk-repost tool limited to internal use). This is not optional for any real client-facing or production use case — budget for it in the timeline. Realistic schedule for a from-scratch build: ~1 week domain verification + OAuth plumbing, ~1 week base app review, ~1 week response/resubmission, ~1 week Content Posting audit with demo video — call it 3-4 weeks minimum, longer if anything gets flagged.

## Domain/URL verification (required for `PULL_FROM_URL`)

If the video/photo source is a URL rather than a local file upload, the exact domain or URL prefix serving that media **must be verified** in the TikTok Developer Portal (via DNS record or meta tag). Consequences of skipping this:

- Pre-signed URLs from an unverified S3/R2/CDN bucket fail immediately with `url_ownership_unverified` — before the upload even starts
- Verification is prefix-scoped: verifying `https://example.com/videos/user/` covers `https://example.com/videos/user/123/x.mp4` but does **NOT** cover `https://example.com/videos/2023/user/123/x.mp4` — a sibling path outside the verified prefix stays unverified

If the media lives on a CDN the developer doesn't control DNS for directly, proxy it through a domain they do own and verify that instead.

## Upload mechanics

- `source: FILE_UPLOAD` when the video is local (uploaded via chunked PUT to the returned `upload_url`)
- `source: PULL_FROM_URL` when TikTok should fetch it from a verified URL — the URL must stay accessible for the whole download, which times out after 1 hour
- Chunked upload rules: each chunk between 5MB–64MB (final chunk can be up to 128MB to absorb remainder), chunks uploaded sequentially, 1–1000 chunks total
- Supported formats: MP4/WebM, up to 4GB, 3–600 seconds
- Photo carousels: up to 35 images, `autoAddMusic` and `photoCoverIndex` supported; picking a specific TikTok song/sound is **not** available through the Content Posting API
- Normalize photo carousel images to 1080×1920 JPEG (or another TikTok-standard aspect/size) before upload — oversized or unusual dimensions can pass initial validation and TikTok's first acceptance, then fail later with `picture_size_check_failed`. Reconcile after publish by polling for `PUBLISH_COMPLETE` status rather than trusting the initial 200 response.

## Posting caps

~15 posts per 24-hour window per creator account, shared across **all** API clients posting to that account via Direct Post (not per-client).

## No edit endpoint

Once published, there's no API path to edit a post. A typo in the caption means delete + re-upload, not a patch call.

## Required scopes (typical)

- `user.info.basic`, `user.info.profile`, `user.info.stats` — account identification and analytics
- `video.list` — read existing published videos
- `video.publish` — the actual posting scope; request only this set, not `video.upload` (draft-only), if the goal is direct publishing without a manual inbox step
