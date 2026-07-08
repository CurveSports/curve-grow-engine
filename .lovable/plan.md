## Problem

KSA Bombers' derived_metrics shows `revenue_per_player = 262,248` — identical to `calculated_total_revenue`. That happens when `total_players = 1` (the clamp floor).

The intake row is now correct (`total_players = 162` after last week's backfill), and `calc-metrics` already has the defensive fallback (`hs_players + youth_players`). But **derived_metrics was never recomputed after the backfill**, so it still holds the stale divide-by-1 result.

## Fix

Re-run the existing `calc-metrics` edge function for KSA Bombers (`org_id = 28b70e67-ddf6-4190-85e9-a5710543715d`). No code changes.

Expected after recompute:
- `revenue_per_player` ≈ 262,248 / 162 ≈ $1,619
- `hs_player_pct`, `non_dues_revenue_per_player`, `revenue_gap`, benchmark comparisons, opportunity numbers all realign

## Verification

Query `derived_metrics` for KSA and confirm `revenue_per_player` ≠ `calculated_total_revenue` and matches the expected ~$1,619.

## Out of scope

- No schema / calc changes (the bug was already fixed; only stale data remains).
- Not sweeping other orgs — if you want, I can also scan for any other rows where `revenue_per_player = calculated_total_revenue` and recompute those too. Say the word.
