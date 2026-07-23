---
name: meta-ads-manager
description: Best practices for creating, managing, and troubleshooting Meta Ads (Facebook & Instagram) campaigns via MCP tools — whether the native "Meta Ads" connector or "Meta Ads Pipeboard". Use this skill whenever the user asks to create/update/duplicate campaigns, ad sets, or ads; build CTWA (Click-to-WhatsApp) or Messenger creatives; debug Meta API errors (permission errors, rejected fields, frequency caps); read insights/conversion metrics; or decide which Meta Ads MCP tool fits a given task. Trigger this even if the user doesn't say "skill" explicitly — any mention of Meta Ads, Facebook Ads, Instagram Ads, CTWA, WhatsApp ads, ad creative, ad set, campaign objective, or Meta Ads MCP tool errors should load this skill first.
---

# Meta Ads Manager

Operational playbook for running Meta Ads (Facebook/Instagram) campaigns through MCP tooling. Distilled from the open-source `pipeboard-co/meta-ads-mcp` server (the engine behind the "Meta Ads Pipeboard" connector) plus accumulated field experience across CTWA/WhatsApp campaign builds.

## 1. Which tool to use — native "Meta Ads" vs "Meta Ads Pipeboard"

These two MCP connectors are **not interchangeable**. Check which the user has connected before picking one.

| Task | Use |
|---|---|
| Standard campaigns/ad sets/ads with LINK_CLICKS, CONVERSIONS, standard optimization goals | Either — native is fine |
| **CTWA (Click-to-WhatsApp) or Messenger-destination ads** | **Pipeboard only.** Native `create_ad_creative` cannot produce CTWA ads — it lacks the `page_welcome_message` rich format. See `references/ctwa-whatsapp.md`. |
| PAGE_LIKES / engagement-objective campaigns | Either, but see `references/campaign-objectives.md` for the ODAX mapping — legacy objective names like `PAGE_LIKES` are rejected by the API now |
| Bulk operations (many creatives/ads/audiences at once) | Pipeboard — it has `bulk_create_ad_creatives`, `bulk_create_ads`, `bulk_update_*` |
| Video ad creatives | Either, but **`thumbnail_url` must be a real public CDN URL** — retrieve via `get_ad_video`/`ads_get_ad_videos` with `fields=['id','title','picture']`. Passing `image_hash` instead of a thumbnail is rejected. |

If the user hasn't specified which connector to use and both are available, ask — don't guess, since picking wrong mid-workflow means starting over (`destination_type` is immutable after ad set creation, see below).

## 2. Standard creation workflow (staged, reviewable)

Never go straight to ACTIVE. The safe, reviewable sequence:

1. **Create campaign** — `status: PAUSED` (default anyway, but be explicit)
2. **Create ad set(s)** — `status: PAUSED`, define targeting/budget/optimization_goal
3. **Create creative(s)** — for bulk work: `bulk_create_ad_creatives`
4. **Create ad(s)** — `status: PAUSED` — for bulk work: `bulk_create_ads`
5. **Review with the user** — share campaign/ad set/ad IDs, ask for explicit go-ahead
6. **Activate** — `update_ad`/`bulk_update_ads` with `status: ACTIVE`, only after confirmation

This lets the user catch copy/targeting mistakes before any spend happens. Treat activating a paused ad as a **write action requiring explicit confirmation** per standard safety rules — never activate without the user saying so.

## 3. Campaign objectives (ODAX only)

Meta now rejects legacy objective values on new campaigns. See `references/campaign-objectives.md` for the full outcome-based mapping table (`OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_APP_PROMOTION`) and which legacy names map to which.

**Rule of thumb:** if the user says an old-style objective ("brand awareness", "page likes", "conversions", "app installs"), silently translate it to the correct `OUTCOME_*` value — don't pass the legacy string through and let the API 400.

## 4. CTWA / WhatsApp ads

See `references/ctwa-whatsapp.md` for:
- Full `page_welcome_message` JSON spec (minimal forms get rejected)
- `destination_type=ON_PAGE`/`WHATSAPP` + `call_to_action_type` requirements
- Why `destination_type` can't be changed after ad set creation
- Swapping a creative on a live CTWA ad without touching the ad set/campaign

## 5. Reading insights correctly

The generic `conversions` field in bulk insights calls is **not** what you want for messaging-app campaigns — it's an aggregate (purchase+lead+post_save mixed). For WhatsApp conversation/order signals, read the `actions` field and look for the specific `action_type` entries. See `references/insights-reading.md`.

## 6. Common errors & gotchas

See `references/troubleshooting.md` for the full list — highlights:
- Error 1487202 = missing page-level permission, not an invalid token
- `frequency_control_specs` only visible in API responses when `optimization_goal=REACH` (works either way, just not visible)
- Peru/LatAm geo-targeting: region-level `key` required for cities, `countries` list for country-wide
- Mixing `LINK_CLICKS` and `CONVERSIONS` optimization goals needs separate campaigns (lowest-cost bidding requires one consistent goal per campaign)

## 7. Video creative prep (aspect ratio fixes)

If a source video mixes scenes with different native compositions (e.g. some already widescreen, some square) and needs to become a clean 9:16 Reel without cropping content, use the blurred-background technique rather than a centered crop:

```
ffmpeg -i input.mp4 -filter_complex \
"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=25[bg]; \
[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg]; \
[bg][fg]overlay=(W-w)/2:(H-h)/2[out]" \
-map "[out]" -map 0:a? output.mp4
```

This preserves 100% of the content from every scene without cutting off either side — a centered crop would lose content whenever a scene's original framing doesn't match the target ratio.

Uploading large video files (>1MB) via chat/base64 is impractical for context reasons — have the user upload the file manually in Meta/Ads Manager and pass you the resulting `video_id`.
