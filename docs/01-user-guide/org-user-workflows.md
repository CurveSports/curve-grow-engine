# Org User Workflows

What a customer org sees, in the order they encounter it.

## First-time flow

1. **Email invite** from `Curve OS <noreply@os.curvesports.com>` → click link → land on `/set-password`.
2. **Set password**, then land on `/intake` (primary user only) or `/dashboard` (peer users).
3. **Intake questionnaire** — ~10 steps, saves each step to `organization_intake`. Includes website URL and social media URLs for the audit engines. Progress is preserved (they can leave and resume).
4. On submit, `calc-metrics` runs → `derived_metrics` populated → the org sees a "Your report is being built" state until Curve approves the plan.

## Once the plan is approved

Left-side nav (from `AppShell`) shows the modules the org has access to:

- **Dashboard** (`/dashboard`) — priority engine, weekly focus, most-recent messages, latest KPI numbers.
- **Plan** (`/plan`) — the currently-released projects and their tasks. Locked phases show a lock icon; hovering explains which task must complete first.
- **Marketing Hub** (`/marketing`) — contacts, segments, campaigns, drafts, sends, NPS, insights. Full sub-nav.
- **Sponsorships** (`/sponsorships`) — leads pipeline (kanban) + admin-approved tiers.
- **Communications** (`/communications`) — DM thread with Curve.
- **Calculators** (`/calculators`) — revenue-leak, sponsorship-value, apparel-margin calculators.
- **Files** (`/files`) — shared bucket with Curve (`org-shared-files`).
- **Team** (`/team`) — invite peer users, see who's assigned to what.
- **Settings** (`/settings`) — profile, notification preferences, brand assets (logo, colors, fonts).

## Completing a task

1. Click a task in `/plan`.
2. TaskDetail drawer opens. If the task is in a locked phase, the CTA is disabled with a tooltip explaining the block.
3. Mark complete → optimistic UI → row flips to `completed`. Any `org_revenue_entries` linked to that task via `source_task_id` are locked in and revenue share recalculates.

## Marketing hub — the flows that get used most

- **Compose email** — `/marketing/drafts/new`. Rich text editor. Segment picker. Send via Curve email, or via the org's connected Gmail/M365 if `org_send_platforms` has one.
- **Schedule campaign** — a Sequence launched by admin appears as a `campaign_sequences` row; org can pause/edit steps.
- **NPS survey** — `/marketing/nps`. Admin creates, org monitors responses in real time. Response categorization runs in `process-nps-response`.
- **Insights** — `/marketing/insights` calls `generate-marketing-insights` (Lovable AI Gateway) for a plain-English weekly summary.

## Sponsorships

- Pipeline stages: `identified → contacted → meeting_set → proposal_sent → verbal_yes → won / lost`.
- Marking a lead `won` prompts for deal amount + close date → writes `org_revenue_entries` via `sync_sponsorship_to_revenue` trigger.
- Warm-lead flag surfaces high-intent leads at the top of the board.

## Files

`SharedFilesTab` — uploads go to the `org-shared-files` bucket under the org's folder. PDFs and images preview inline (fetched as blobs to bypass browser header issues). Admins see the same list from `/admin/org/:orgId` → Files tab.

## Settings

- Notification prefs live in `notification_preferences`.
- Brand kit (`org_brand_kits`) drives colors/fonts across the Marketing Hub composer and Design generator.

## See also

- [`../03-architecture/task-plan-engine.md`](../03-architecture/task-plan-engine.md) — why locked phases behave the way they do.
