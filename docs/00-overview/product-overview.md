# Product Overview

**What this covers:** what Curve OS is, who uses it, and how Curve makes money from it. Read this before anything else — every architectural decision downstream is easier to understand once you know the business shape.

## Elevator pitch

Curve OS is the operating system Curve Sports runs its consulting engagements on. Curve is a growth partner for youth-sports organizations (clubs, leagues, events, and acquired businesses). The app replaces the spreadsheets, Notion pages, and shared drives a boutique consultancy would normally use with a single tenant-aware SaaS that:

1. **Assesses** a client org across six growth engines.
2. **Prescribes** a plan of concrete tasks derived from that assessment.
3. **Executes** the plan alongside the client — tasks flow from Curve admins to org users, with a marketing hub, sponsorship pipeline, and communications planner that the org actually uses day to day.
4. **Measures** the new revenue generated and computes Curve's revenue share automatically.
5. **Scales** to a separate line of business — Curve Acquisitions — where Curve buys or absorbs sports businesses and runs the 90-day integration playbook through the same platform.

## Who uses it

| Persona | Role in the app | Primary surface |
|---|---|---|
| Curve consultant / operator | `admin` | `/admin/*` — every org, every engagement |
| Org primary contact | `org_user` | `/dashboard`, `/plan`, `/marketing`, `/sponsorships`, `/communications` |
| Org staff (peer users invited by primary) | `org_user` | Same as above, minus onboarding gates the primary already cleared |
| Acquisition target's leadership | `seller_portal` | `/portal/seller/:acquisitionId` — read-only diligence room |
| Prospect on curvesports.com | (public, no account) | `/revenue-audit` funnel, embedded via iframe |
| Onboarding staff of an acquired business | (public, tokenized link) | `/onboard/:token` — self-serve compliance intake |

## The three lines of business inside one app

Access is gated per-org by `profiles.module_access text[]`. A given org can have any combination.

- **Allegiance** (`module_access` includes `'allegiance'`) — the flagship consulting engagement. Everything under Intake → Plan → Marketing → Sponsorship → Communications → Revenue Share.
- **Acquisitions** (`'acquisitions'`) — the Curve-owned integration playbook for businesses Curve has bought. Lives under `/admin/acquisitions/*` and the seller portal.
- **Revenue Audit** (public, no module) — the top-of-funnel product that runs on os.curvesports.com and is embedded on curvesports.com via iframe. Free assessment → tokenized report → book-a-call CTA.

## How Curve gets paid

The revenue-share engine is a first-class citizen because it is how the business works.

- Each Allegiance engagement has an `org_engagement_contracts` row: contract value + installment schedule.
- New revenue the org generates (sponsorships closed in the pipeline, revenue entries logged by the ops team) accumulates in `org_revenue_entries`.
- `public.recalculate_revenue_share(org_id)` runs on every relevant write. It:
  1. Sums new revenue.
  2. Applies it first against the contract value (recovery).
  3. Above that threshold, Curve earns 25% of subsequent new revenue.
- The resulting numbers roll up per-org into `org_revenue_share_summary` and across the whole book of business into `curve_portfolio_summary`.

## Where the boundary is between "Curve product" and "org tool"

The plan/tasks module is the seam. Curve admins triage the auto-generated draft plan, approve it, then release tasks to the org in waves ("projects"). Everything inside the marketing hub, communications planner, and sponsorship pipeline is intentionally org-facing — clubs use these day-to-day even after Curve tapers off active consulting.

## See also

- [`modules-map.md`](./modules-map.md) — how the three lines of business are wired.
- [`../03-architecture/revenue-share-engine.md`](../03-architecture/revenue-share-engine.md) — the money math.
- [`../01-user-guide/roles-and-access.md`](../01-user-guide/roles-and-access.md) — who sees what.
