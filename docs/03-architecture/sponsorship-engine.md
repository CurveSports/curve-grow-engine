# Sponsorship Engine

Kanban pipeline + tier catalog + revenue integration.

## Tables

- **`org_sponsorship_tiers`** — packaged offers (Bronze / Silver / Gold …). Admin-curated (created in admin UI, org sees read-only).
- **`sponsorship_leads`** — the pipeline rows. Fields: company_name, contact, stage, is_warm, deal_amount, notes, closed_at, tier_id.
- **`sponsorship_activities`** — log per lead (email sent, meeting held, note added).

## Stages

`identified → contacted → meeting_set → proposal_sent → verbal_yes → won | lost`.

Kanban board at `/sponsorships` — drag-drop between columns updates `stage`.

## Warm leads

`is_warm` flag surfaces high-intent leads at the top of the board and in admin's daily inbox. Manually set by org.

## Won deals → revenue

`sync_sponsorship_to_revenue` trigger writes to `org_revenue_entries` when a lead flips to `won`. This is what makes sponsorship show up in revenue share automatically — no manual step required.

## AI lead prospecting

`generate-sponsorship-leads` edge function:
- Reads the org's location, sports, and past sponsors.
- Prompts Lovable AI (Gemini) for prospect suggestions.
- Inserts `sponsorship_leads` rows at stage `identified`.

Admin-triggered; not automated.

## Bulk outreach

`send-sponsorship-outreach` — bulk email to selected leads using an org-branded template. Goes through the standard email queue.

## Revenue attribution

Each won lead's `deal_amount` shows up in `org_revenue_share_summary.total_new_revenue`. The lead ID is preserved on the revenue entry (`source_id`), so admins can trace revenue back to the specific deal.

## See also

- [`revenue-share-engine.md`](./revenue-share-engine.md)
