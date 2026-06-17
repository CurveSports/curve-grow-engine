# Simplify to a single "Events" engine at $450/player/year

Yes, that makes sense — it collapses two overlapping inputs (events + facility rental) into one cleaner benchmark that better reflects what families actually spend on tournaments, showcases, and league/event play.

## Changes

### 1. Audit form (`src/pages/public/RevenueAudit.tsx`)
- **Money Flow step**: Remove the "Facility rental revenue" input. Keep a single "Events revenue (annual)" field.
- **Live Revenue Leak panel**: Replace the combined "Events & Facility" line with a single **"Events"** line.
  - Benchmark: `players × $450`
  - Opportunity = `max(0, benchmark − currentEventsRevenue)`
- **Share-of-Wallet math**: Drop `facilityRev` from `currentInHouse`. Events revenue still counts.

### 2. Report (`src/pages/public/RevenueAuditReport.tsx`)
- Rename any "Events & Facility" labels to **"Events"**.
- Remove facility references from copy/tooltips.

### 3. Edge function (`supabase/functions/submit-revenue-audit/index.ts`)
- Remove `facilityRevenue` from `AuditInputs` (or accept + ignore for backward compat).
- Replace events-gap + facility-gap logic with:
  ```ts
  const eventsBenchmark = players * 450;
  const eventsOpportunity = Math.max(0, eventsBenchmark - eventsRevenue);
  ```
- Update the detail/description text to reference Events only, at $450/player.
- Drop `facilityRev` from `currentInHouse` sum used for wallet capture %.

## Notes
- No DB schema changes needed; the stored payload just won't include `facilityRevenue` going forward.
- Benchmark constants summary after this change:
  - Apparel: $150/player
  - Sponsorships: $150/player × market multiplier
  - Training: $1,200/player/year ($100/mo × 12)
  - **Events: $450/player/year (new)**
