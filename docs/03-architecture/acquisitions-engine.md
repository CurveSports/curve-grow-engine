# Acquisitions Engine

Separate playbook for Curve-owned integrations. Fully isolated from Allegiance data.

## Lifecycle

`acquisition_projects.phase`: `pre_close → closing_day → first_30 → first_60 → first_90 → complete`.

`public.update_acquisition_phases()` runs daily via `run-acquisition-phase-check`:
- Reads `closing_date` and `now()`.
- Advances phase when the elapsed-days threshold is crossed AND workstream completion targets are met.

## Workstreams

Every `acquisition_tasks` row is tagged with one of:
`integration, financial, legal, hr_culture, marketing, testing, it, data_assets, compliance`.

Percent-complete per workstream is stored in `acquisition_projects.workstream_progress jsonb` and recomputed by a trigger on `acquisition_tasks` update.

## Staff onboarding

- `acquisition_staff` — one row per employee/coach at the target.
- `generate-staff-onboarding-token` — creates an `acquisition_staff_tokens` row (7-day expiry).
- Curve sends a link `/onboard/:token`.
- Staff self-serve profile info + W-9 upload + compliance items → `submit-staff-onboarding`.
- Compliance items land in `acquisition_compliance_items` (background check, concussion training, coaching cert, etc.).

## Meetings & transcripts

- `fathom-webhook` / `fireflies-webhook` — receive raw transcripts, write `acquisition_meeting_transcripts`.
- `process-meeting-transcript` — LLM extraction (Gemini) writes:
  - `acquisition_meeting_action_items` (assignee, due date, workstream)
  - `acquisition_meeting_decisions`
  - `acquisition_meeting_risks`
- Admin reviews at `/admin/acquisitions/meetings/:id` → confirms/edits/discards each extraction → confirmed action items become `acquisition_tasks`.

## Portal (seller-facing)

- `acquisition_portal_users` — email ↔ acquisition_id.
- Users have `seller_portal` role.
- Route `/portal/seller/:acquisitionId`.
- Read-only view of phase, workstream %, meetings, shared docs.
- Can comment on action items via `acquisition_meeting_action_items.seller_comment`.

## Documents

`acquisition_documents` metadata + `acquisition-documents` storage bucket. `visible_to_seller boolean` gates portal access.

## Weekly rollup

`send-acquisition-rollup` (Mondays):
- Snapshots current phase + workstream % + open risks into `acquisition_weekly_rollups`.
- Emails a summary to the integration lead.

## Boundary with Allegiance

An acquisition is **not** an `organizations` row. If an acquired business later becomes a customer, that's a separate `organizations` row — no automatic linkage today.

## See also

- [`../01-user-guide/acquisitions-workflows.md`](../01-user-guide/acquisitions-workflows.md)
- [`../01-user-guide/seller-portal-workflows.md`](../01-user-guide/seller-portal-workflows.md)
