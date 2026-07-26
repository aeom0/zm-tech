# Facebook Pages — Organic Posting

## Relationship to Instagram setup

Facebook Page posting shares the same Meta Developer App, Graph API infrastructure, and largely the same app-review gate as Instagram publishing. If the user already has an approved app for Instagram content publishing, extending to Facebook Page posts is mostly additive — same app, additional scope.

## Prerequisites

- A Facebook Page (not a personal profile — personal profile posting via API is not supported for third-party apps)
- Page Admin or Editor role on the account doing the posting
- The user/system account posting needs explicit **page-level permission** assigned in Business Manager — a common failure mode (see below) is a valid token that still gets rejected because the underlying user lacks page-level access, not because the token itself is invalid

## Publishing

- Standard feed posts: `POST /{page-id}/feed` with `message` and optionally `link`
- Photo posts: `POST /{page-id}/photos`
- Video posts: `POST /{page-id}/videos`
- Scheduled posts: include `published=false` and `scheduled_publish_time` (Unix timestamp) — the post is created as scheduled and Meta publishes it automatically at that time, no need to poll or re-trigger

## Common gotcha: page-level permission errors

If a call gets rejected with a permissions error even though the access token is confirmed valid, check whether the underlying user has been assigned an Advertiser/Admin/Editor role on the specific Page in Business Manager — token validity and page-level role are two separate things, and error messages for the latter often read like generic auth failures.

## Required scopes

- `pages_manage_posts` — create/edit/delete posts
- `pages_read_engagement` — read post-level engagement data
- `pages_show_list` — list the Pages the token has access to (needed to resolve `page-id` in the first place)

Same App Review process as Instagram scopes applies — screencast per permission, 2–4 week review cycles for Advanced Access.
