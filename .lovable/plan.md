# Revenue Audit — Reframe to Share-of-Wallet

You're right: in the new flow, we only ask revenue questions about the 3 engines they pick — so we no longer have a reliable sum to use as the numerator for "captured %". We need to ask for total annual revenue directly.

## 1. New field: Total annual revenue
- Add one required input near the top: **"Approximate total annual revenue for your organization"** (single dollar field, with helper text: "Dues, programs, apparel, sponsorships, events — everything that comes through the club.")
- This becomes the numerator for Share-of-Wallet.

## 2. Engine picker gates deep questions
- Move "Top 3 engines you want to grow" earlier, make it required.
- Only the 3 picked engines render one diagnostic question each:
  - **Pricing** — current annual fee per player + last raise date
  - **Sponsorships** — # sponsors + sponsorship revenue
  - **Apparel/Gear** — parent spend per player/yr (default $600) + how much flows through the club
  - **Retention** — % of players who return year-over-year
  - **Training** — training/camp/clinic revenue
  - **Events** — event/tournament revenue
- The other 4 engines show as locked teaser cards — no inputs, no dollars.

## 3. Math
- **Share-of-Wallet % captured** = `totalAnnualRevenue / (players × outsideSpendPerFamily)`
- **Dollars Leaving the Building** = `(players × outsideSpendPerFamily) − totalAnnualRevenue`
- Per-engine gap (for the 3 picked) uses that engine's benchmark vs. the number they entered — directional only, shown as "opportunity" not "you're losing exactly $X".

## 4. Report
- Hero: two stats side by side — **% captured** (ring) and **$ leaving/year** (big number).
- 3 picked engines: benchmark, current, gap, one-line directional insight.
- 4 unpicked engines: locked cards with "Unlock on the call" CTA.
- Footer CTA unchanged.

## Files
- `src/pages/public/RevenueAudit.tsx` — add total-revenue field, gate questions by picked engines, drop the per-stream revenue inputs that aren't tied to a picked engine.
- `src/pages/public/RevenueAuditReport.tsx` — two-stat hero, locked cards for unpicked engines.
- `supabase/functions/submit-revenue-audit/index.ts` — accept `totalAnnualRevenue` + `parentApparelSpendPerPlayer`; compute SoW from total revenue; mark unpicked engines `locked: true`.

Out of scope: DB schema changes, email/PDF redesign.