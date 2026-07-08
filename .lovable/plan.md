## Problem

KSA Bombers intake has `hs_players=36` and `youth_players=126` but `total_players` is NULL. `total_players` is a **separately entered** field on the intake form — it isn't derived from HS + Youth. When it's missing, `calc-metrics` clamps it to 1 (`Math.max(num(intake.total_players), 1)`), which corrupts every downstream metric (revenue per player, opportunity sizing, tier, plan generation).

## Fix (3 parts)

### 1. Make Total Players auto-derived on the intake form
In `src/pages/Intake.tsx` (step 1, "Player & team counts"):
- Replace the editable `Total Players` NumberField with a **read-only computed display** that shows `hs_players + youth_players`.
- On every change to `hs_players` or `youth_players`, `set("total_players", hs + youth)` so it saves correctly.
- Keep the "must be accurate" callout, reworded to explain it's the sum of the two segments.

### 2. Backfill existing intakes where `total_players` is NULL but segments exist
One-off data update:
```
UPDATE organization_intake
SET total_players = COALESCE(hs_players,0) + COALESCE(youth_players,0)
WHERE total_players IS NULL
  AND (COALESCE(hs_players,0) + COALESCE(youth_players,0)) > 0;
```

### 3. Defensive fallback in `calc-metrics`
In `supabase/functions/calc-metrics/index.ts` (line ~124), change:
```ts
const total_players = Math.max(num(intake.total_players), 1);
```
to fall back to `hs + youth` before clamping:
```ts
const total_players = Math.max(
  num(intake.total_players) || (num(intake.hs_players) + num(intake.youth_players)),
  1
);
```

### 4. Re-run metrics + plan for KSA Bombers
After the backfill, invoke `calc-metrics` (and, if the admin wants, `generate-plan-from-templates`) for org `28b70e67-ddf6-4190-85e9-a5710543715d` so `derived_metrics` reflects `total_players = 162`.

## Out of scope
- No schema changes (column stays nullable; form guarantees it's populated going forward).
- No changes to any other intake fields or calculators — they already read `intake.total_players`.

## Summary of files touched
- `src/pages/Intake.tsx` — total_players becomes derived/read-only
- `supabase/functions/calc-metrics/index.ts` — defensive fallback
- Data update on `organization_intake` (backfill) + re-run `calc-metrics` for KSA Bombers
