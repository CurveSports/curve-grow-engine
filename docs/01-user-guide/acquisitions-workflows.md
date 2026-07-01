# Acquisitions Workflows

The Curve-owned integration playbook for businesses Curve buys or absorbs. Fully separate data tables from Allegiance.

## Roles inside acquisitions

- **Curve admin** — full control at `/admin/acquisitions/*`.
- **Seller portal user** — the target's leadership. `seller_portal` role. Sees `/portal/seller/:acquisitionId`.
- **Acquisition staff** — coaches/employees at the target. No login required — they use tokenized `/onboard/:token` links.

## Lifecycle: Pre-Close → Complete

A single `acquisition_projects` row moves through phases: `pre_close → closing_day → first_30 → first_60 → first_90 → complete`. Transitions run via `public.update_acquisition_phases()` on a schedule (via the `pg_cron` job that also triggers `daily-task-digest`).

## Workstreams

Each `acquisition_tasks` row has a `workstream` tag. Percent-complete rolls up per workstream on the project detail page. Workstreams:

`integration`, `financial`, `legal`, `hr_culture`, `marketing`, `testing`, `it`, `data_assets`, `compliance`.

## Daily admin flow

1. **`/admin/acquisitions`** — portfolio dashboard: every active acquisition, phase, percent-complete, next milestone.
2. **`/admin/acquisitions/meetings`** — new transcripts from Fathom/Fireflies. Click one → `process-meeting-transcript` uses Lovable AI Gateway to extract:
   - `acquisition_meeting_action_items`
   - `acquisition_meeting_decisions`
   - `acquisition_meeting_risks`
3. **`/admin/acquisitions/compliance`** — every open `acquisition_compliance_items` row across all acquisitions, filterable by requirement (background check, concussion training, etc.).
4. **`/admin/acquisitions/:id`** — a single acquisition. Tabs: Overview, Tasks, Staff, Compliance, Meetings, Documents, Portal Users.

## Onboarding a new staff cohort

1. Admin bulk-imports staff via CSV in `/admin/acquisitions/:id` → Staff tab.
2. For each `acquisition_staff` row, `generate-staff-onboarding-token` creates an `acquisition_staff_tokens` row.
3. Curve sends an SMS/email with `/onboard/:token`.
4. The staff member fills profile info, uploads W-9, completes compliance requirements → data flows back into `acquisition_staff` and `acquisition_compliance_items`.
5. Once compliance % hits threshold, the staff member is marked "cleared to work."

## Seller portal

- Sellers signed in as `seller_portal` role see project progress, meeting recaps, uploaded docs. Read-only.
- Adding a seller: admin adds an `acquisition_portal_users` row with their email → invites them via `/admin/invite` with role `seller_portal` → on signup, `handle_new_user` links them.

## Weekly rollup

`send-acquisition-rollup` runs Mondays. Snapshots current phase, workstream percent-complete, open risks into `acquisition_weekly_rollups`. Emails the summary to the Curve integration lead.

## See also

- [`../03-architecture/acquisitions-engine.md`](../03-architecture/acquisitions-engine.md)
