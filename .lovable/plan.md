## Goal

Replace the current `/revenue-audit` form (per-engine $ boxes + dead maturity sliders + loose math) with a 3-minute, public-facing **mirror** of the existing Curve OS Intake → Calculators → Report flow. The live opportunity panel becomes the *output of a real revenue leak model*, not a guess.

Look & feel stays exactly as-is (dark, lime accent, Archivo/Oswald). Only the *content of the audit* and the *math behind the live number* change.

---

## What changes for the user

**Before** (today): 5 form cards, per-engine toggles + $ box + 1–5 maturity slider, top-3 priorities. The $ boxes and sliders don't visibly affect the live number, which confuses the user.

**After**: 4 short steps, ~3 minutes, no dead inputs. Every field moves the live "Revenue Leak" number. At the end they get a real report that mirrors Curve OS Report.tsx in miniature.

### The 4 steps

1. **Your org** (30s) — Org, contact, email, phone, city/state, role, sport. *(Lead capture only — same as today.)*
2. **The base** (45s) — Total players, HS vs. youth split, # teams, avg annual fee, current YoY retention %, # current sponsors, total sponsorship revenue.
3. **Where money flows today** (60s) — 6 short numeric inputs that mirror the OS intake fields the calculators actually read:
   - Apparel & hard-goods revenue
   - Camps / clinics / tournaments revenue (one combined field)
   - Facility rental revenue
   - Training / player-dev revenue
   - Est. avg outside spend per family / yr (slider, default $15k)
   - Market type (small / mid / major metro — drives sponsor FMV benchmark)
4. **Your priorities** (15s) — Pick top 3 of the 7 engines (kept from today — this orders the report, doesn't change math).

That's it. The per-engine toggles, per-engine $ boxes, and per-engine maturity sliders are **removed** entirely.

---

## The live "Revenue Leak" panel

The sticky right-side panel becomes the public-facing version of the 5 Curve OS calculators, rolled into one number with a per-engine breakdown. It updates as the user types.

Formulas (lifted from the existing calculators so the public number matches what they'd see inside Curve OS):

- **Pricing** — `players × fee × 5%` lift at 98% retention assumption (from `PricingSensitivityCalculator`).
- **Retention & Referrals** — `(targetRetention − currentRetention) × players × fee` + referral multiplier (from `RetentionImpactCalculator`).
- **Apparel & Hard Goods** — `players × $120 × 30% margin − currentApparelRevenue` (from `RosterGrowthCalculator` apparel logic).
- **Sponsorships** — `(benchmarkSponsors × FMVmid) − currentSponsorshipRevenue`, FMV scaled by market type (from `SponsorshipValueCalculator`).
- **Training / Player Dev** — `players × $60 captured − currentTrainingRevenue`.
- **Events** — `players × $40 − currentEventsRevenue` + facility benchmark gap.
- **Share of Wallet** — `players × outsideSpend × 3% recapture` (meta-engine, displayed last).

Each line shows: engine name, $ leak, and a small bar vs. total. Total at top in big lime numerals. Below the total: a one-line "Share of wallet captured today: X%" derived from `(currentInHouseRevenue) / (players × outsideSpend)`.

This is the "revenue leak report" — the calculator output **is** the value delivered.

---

## The final report page (`/revenue-audit/report/:token`)

Mirror Curve OS `Report.tsx` in a tighter, public skin:

1. **Hero**: Org name + "Estimated annual revenue leak: $X" + share-of-wallet ring.
2. **7-engine breakdown** (ordered by user's top-3 first, then the rest): each engine = $ leak + 1-sentence "what we'd do" + maturity indicator inferred from their inputs (not asked).
3. **Share-of-wallet snapshot**: captured % vs. potential %, dollar gap.
4. **Next steps** (Act 4 — unchanged): Book a Growth Partner call · Email me my report · Forward to my board.

No new pages. Same routes.

---

## Files changed

- `src/pages/public/RevenueAudit.tsx` — replace step 4 (engines) and step 5 (priorities) with the new step 3 (money-flow inputs) and step 4 (priorities). Remove `engines` state shape; replace with flat numeric fields matching OS intake column names. Rewrite `estimateOpportunity()` to use the 5-calculator formulas above.
- `src/pages/public/RevenueAuditReport.tsx` — restyle 7-engine breakdown to read from the new payload; add share-of-wallet ring + captured-% line.
- `supabase/functions/submit-revenue-audit/index.ts` — extend `inputs` shape (additive) to accept the new money-flow fields; mirror the same formulas server-side so the emailed/stored report matches the live preview. No breaking changes to existing rows.

No DB migrations, no new components beyond what already exists, no design-system changes.

---

## Out of scope (call out so we don't drift)

- Real Curve OS auth / handoff (this stays a public lead-gen funnel).
- Industry benchmarks per sport — we use the same defaults the OS calculators use today.
- Saving scenarios, share modal, PDF export.
- Any visual redesign — look & feel stays.

---

## Open question to confirm before build

The OS intake collects ~40 fields; this plan picks 6 money-flow numbers (apparel, events, facility, training, outside spend, market type) as the minimum set the 5 calculators need to produce a non-trivial leak number. If you'd rather trade 30 more seconds for sharper math, we can add: HS vs. youth split, # current sponsors, and avg sponsor deal size. Say the word and I'll fold them into step 2.
