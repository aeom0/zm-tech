# Reading Meta Ads Insights Correctly

## The `conversions` field trap

When calling bulk/standard insights endpoints, the generic `conversions` field is an **aggregate** that mixes purchase events, lead events, and post-save events together. For messaging-app campaigns (CTWA/WhatsApp, Messenger), this field is **not useful** — it won't tell you how many actual conversations or orders happened.

## What to use instead

Request `fields=["actions"]` and read specific `action_type` entries:

| `action_type`                                         | Meaning                                                                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onsite_conversion.messaging_conversation_started_7d` | Real WhatsApp conversations initiated — the actual engagement signal for CTWA campaigns                                                                                                       |
| `onsite_conversion.messaging_order_created_v2`        | An order was created in the WhatsApp catalog — a strong purchase-intent signal, but **not yet wired as a trackable optimization event** unless Commerce Manager conversion tracking is set up |

## Attribution windows

Use `action_attribution_windows` (e.g. `["1d_click", "1d_view", "7d_click", "7d_view"]`) when the user needs to compare attribution models. Note: the `value` field on actions always reflects **7d_click** attribution regardless of which windows you requested — the extra windows just add parallel fields for comparison, they don't change what `value` means.

## Optimizing toward real purchases (not just conversations)

To move a WhatsApp CTWA campaign from optimizing for "conversation started" to optimizing for actual purchases, two things need to be true first:

1. The catalog purchase event must be connected as a trackable conversion in **Commerce Manager**
2. The ad set needs sufficient volume (roughly ~50 events/week) before changing `optimization_goal` — switching too early re-enters the learning phase and can stall delivery entirely

## Opportunity Score (native connector only)

The native "Meta Ads" connector's `ads_get_opportunity_score`/`get_opportunity_score` tool gives account-level recommendations with a `lift_estimate` — useful as a periodic health check before making changes to live campaigns. Note it's **account-level, not campaign/ad-set level**, and recommendations never auto-apply — each one requires a manual action (fixing an event, resubmitting a creative, etc.).
