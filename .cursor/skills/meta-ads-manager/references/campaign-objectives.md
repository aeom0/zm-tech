# Campaign Objectives — ODAX (Outcome-Driven Ad Experiences)

Meta's Marketing API only accepts outcome-based objectives for **new** campaigns. Legacy objective strings cause a 400 error.

## Valid objective values

- `OUTCOME_AWARENESS`
- `OUTCOME_TRAFFIC`
- `OUTCOME_ENGAGEMENT`
- `OUTCOME_LEADS`
- `OUTCOME_SALES`
- `OUTCOME_APP_PROMOTION`

## Legacy → ODAX mapping

| Legacy objective (rejected) | Correct ODAX value |
|---|---|
| `BRAND_AWARENESS` | `OUTCOME_AWARENESS` |
| `REACH` | `OUTCOME_AWARENESS` |
| `LINK_CLICKS`, `TRAFFIC` | `OUTCOME_TRAFFIC` |
| `POST_ENGAGEMENT`, `PAGE_LIKES`, `EVENT_RESPONSES`, `VIDEO_VIEWS` | `OUTCOME_ENGAGEMENT` |
| `LEAD_GENERATION` | `OUTCOME_LEADS` |
| `CONVERSIONS`, `CATALOG_SALES`, `MESSAGES` (sales-focused flows) | `OUTCOME_SALES` |
| `APP_INSTALLS` | `OUTCOME_APP_PROMOTION` |

When the user asks for a "PAGE_LIKES campaign" or similar legacy phrasing, use this table to pick the right `objective` value, but keep `optimization_goal` at the ad set level matching their actual intent (e.g. `optimization_goal=PAGE_LIKES` still exists for ad sets under `OUTCOME_ENGAGEMENT` — it's the *campaign-level objective enum* that changed, not every field downstream).

## PAGE_LIKES ad sets specifically

A PAGE_LIKES-optimized ad set requires all three together:
- `optimization_goal=PAGE_LIKES`
- `destination_type=ON_PAGE`
- `promoted_object={'page_id': 'XXX'}`

## Campaign creation example

```json
{
  "name": "2025 - Product Line - Awareness",
  "account_id": "act_123456789012345",
  "objective": "OUTCOME_AWARENESS",
  "special_ad_categories": [],
  "status": "PAUSED",
  "buying_type": "AUCTION",
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
  "daily_budget": 10000
}
```

Note `daily_budget`/`lifetime_budget` are in account-currency **cents** (integer), not decimal units — a $100 daily budget is `10000`, not `100`.

## Bid strategy values

- `LOWEST_COST_WITHOUT_CAP`
- `LOWEST_COST_WITH_BID_CAP` (requires `bid_amount`)
- `COST_CAP` (requires `bid_amount`)
- `LOWEST_COST_WITH_MIN_ROAS` (requires `bid_constraints`, e.g. `{"roas_average_floor": 20000}`)

## Optimization goal conflicts

Meta enforces a **consistent optimization goal per campaign** under lowest-cost bidding. If the user wants both `LINK_CLICKS` and `CONVERSIONS` (or `CONVERSIONS` and `CONVERSATIONS`/messaging) running, these need **separate campaigns**, not separate ad sets in the same campaign.
