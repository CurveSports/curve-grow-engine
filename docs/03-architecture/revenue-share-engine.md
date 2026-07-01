# Revenue Share Engine

The math that determines how much Curve gets paid.

## Inputs

- **`org_engagement_baselines.baseline_revenue`** — org's revenue at engagement start, captured at plan approval.
- **`org_engagement_contracts.contract_value`** — what the org agreed to pay Curve. Doubles as the "recovery threshold."
- **`org_revenue_entries`** — every new revenue event. Sources: sponsorship deals won (auto via trigger), manual entries by admin, task-linked entries.

## Rules

1. New revenue accumulates in `org_revenue_entries`.
2. Curve earns **0%** until cumulative new revenue equals `contract_value` (the "recovery" phase — this covers what the org has already agreed to pay).
3. Above the threshold, Curve earns **25%** of subsequent new revenue.

Both the threshold and the 25% rate live in `recalculate_revenue_share` — change them there and only there.

## Output — `org_revenue_share_summary`

Per-org row, updated on every write:

```
baseline_revenue         numeric
contract_value           numeric
total_new_revenue        numeric  -- sum of org_revenue_entries
recovery_amount          numeric  -- min(total_new_revenue, contract_value)
above_threshold_amount   numeric  -- max(0, total_new_revenue - contract_value)
curve_share_amount       numeric  -- above_threshold_amount * 0.25
org_share_amount         numeric  -- above_threshold_amount - curve_share_amount
current_org_revenue      numeric  -- baseline + total_new_revenue
```

## Recompute triggers

- After insert/update/delete on `org_revenue_entries`.
- After update on `org_engagement_contracts` (contract value changed).
- Nightly cron `revenue-share-recompute-nightly` — safety net.
- Manually via RPC `recalculate_revenue_share(_org_id)` from admin tools.

## Rollup

- **`curve_portfolio_summary`** (view) sums every org's summary row. Powers `/admin/marketing/portfolio` and the executive dashboard.

## Sponsorship deals

`sync_sponsorship_to_revenue` trigger: when `sponsorship_leads.stage` becomes `'won'` with a `deal_amount`, insert `org_revenue_entries { source: 'sponsorship', source_id: lead.id, amount: deal_amount, occurred_at: closed_at }`. Marking a deal not-won reverses the entry.

## Manual entries

Admin uses `/admin/revenue-share/:orgId` → Add Revenue button. Direct insert into `org_revenue_entries`. Categorized by source.

## Client mirror

`src/lib/revenue.ts` mirrors the recovery/25% math for optimistic UI previews (e.g., "if this deal closes, Curve earns $X"). **The SQL function is authoritative** — never diverge.

## Edge cases

- **Contract value increases mid-engagement** → threshold moves; already-earned Curve share stays (historic — snapshotted in the entry rows). Future entries above the new threshold earn 25% until the new number is met.
- **Baseline revenue is only for reporting**, not calculation — new revenue is what's shared.
- **Refunds/reversals** — insert negative `amount` in `org_revenue_entries`. Recompute picks it up.

## See also

- [`sponsorship-engine.md`](./sponsorship-engine.md)
- [`data-model.md`](./data-model.md)
