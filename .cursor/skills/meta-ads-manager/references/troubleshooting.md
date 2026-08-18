# Meta Ads API — Troubleshooting & Gotchas

## Permission errors

**Error 1487202** — user/token lacks page-level permissions on the Facebook Page. Not a token validity issue. Fix by assigning Advertiser/Admin role on the Page within Business Manager, not by regenerating credentials.

## Frequency caps

`frequency_control_specs` are only **visible in API responses** when the ad set's `optimization_goal` is `REACH`. For other optimization goals (LINK_CLICKS, CONVERSIONS, CONVERSATIONS, etc.), frequency caps still function correctly — they're just not exposed through the API. Don't assume a frequency cap "isn't working" just because a `get_adset` call doesn't show it back.

**Verifying frequency caps are actually working** when you can't see the field directly:

- Check the `frequency` metric in ad insights
- Compare the ratio between `reach` and `impressions` over time
- Confirm visually in Meta Ads Manager UI

## Field visibility in general

Some fields don't appear in API responses even when explicitly requested and set — this doesn't necessarily mean the field isn't applied. The API filters out empty/default values to reduce payload size. If a field is missing:

- It may genuinely not be set
- It may be at its default value
- It may not be applicable given the current configuration

Best practice: for anything important, verify via **both** the API response and the Meta Ads Manager UI before concluding a setting failed.

## `destination_type` immutability

Once an ad set is created, `destination_type` cannot be changed via update. If it's wrong (e.g. built for `ON_PAGE` when it needed to be WhatsApp-destined), the only fix is creating a new ad set. Always confirm the destination with the user before ad set creation — this is a one-shot decision.

## Optimization goal consistency

Meta requires one consistent `optimization_goal` per campaign under lowest-cost bidding. Wanting both `LINK_CLICKS` and `CONVERSIONS` (or `CONVERSATIONS`) running simultaneously means **separate campaigns**, not separate ad sets within one campaign.

## Video creative thumbnails

`thumbnail_url` for video ad creatives must be a real public CDN URL. Get it via `get_ad_video`/`ads_get_ad_videos` requesting `fields=['id','title','picture']` — passing `image_hash` in its place gets rejected outright.

## Geographic targeting (especially LatAm)

City-level targeting needs a **region-level `key`**, not a raw city name string:

```json
{ "regions": [{ "country": "PE", "key": "2680", "name": "Lima" }] }
```

For country-wide targeting, use the `countries` list instead:

```json
{ "countries": ["PE"] }
```

Raw city-level keys generally aren't accepted directly — search for the correct region key via the geo-location search tool first (`search_geo_locations` or equivalent) rather than guessing.

## Legacy objective values

New campaigns reject legacy objective strings (`BRAND_AWARENESS`, `LINK_CLICKS`, `CONVERSIONS`, `APP_INSTALLS`, etc.) with a 400 error. See `campaign-objectives.md` for the full ODAX mapping table.

## Bulk insights and `conversions`

Don't trust the generic `conversions` field for messaging-app campaigns — see `insights-reading.md`.

## Uploading large files

Video files over ~1MB are impractical to pass through chat/base64 due to context limits. Have the user upload manually to Meta Ads Manager and hand you the resulting `video_id`/`image_hash` instead of trying to push the binary through the MCP tool.
