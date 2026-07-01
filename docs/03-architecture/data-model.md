# Data Model

The schema is large (150+ tables). This page groups tables by domain and highlights the relationships that matter.

## Core

- **`profiles`** (1↔1 with `auth.users`) — `user_id`, `org_id`, `email`, `full_name`, `module_access text[]`.
- **`user_roles`** (many-to-one) — `user_id`, `role app_role`. Separate table so RLS `has_role()` can be non-recursive.
- **`organizations`** — the customer. `primary_user_id`, `name`, `city`, `state`, `website_url`, `social_urls jsonb`, `plan_activated_at`.
- **`pending_invitations`** — email, org_id, role, module_access, is_primary, accepted_at.

## Allegiance — intake, plan, tasks, revenue

- **`organization_intake`** — 100+ columns. One row per org. Source of truth for `calc-metrics`.
- **`derived_metrics`** — one row per org. Engine scores 1–10, priority_engine, fastest_path_engines, calculated_total_revenue.
- **`task_templates`** — reusable task blueprints keyed by engine + score band.
- **`org_tasks`** — the plan. FK to `organizations`, `org_projects` (nullable), owner ('curve'|'org'), assignee, phase, display_order, plan_status ('draft'|'active'|'archived'), status ('open'|'in_progress'|'blocked'|'completed').
- **`org_projects`** — waves of tasks. status ('draft'|'active'|'complete').
- **`org_engagement_baselines`** — baseline_revenue captured at plan approval.
- **`org_engagement_contracts`** — contract_value, installments jsonb.
- **`org_revenue_entries`** — new revenue events. source ('sponsorship'|'manual'|'…'), source_task_id, amount, occurred_at.
- **`org_revenue_share_summary`** — computed rollup per org.
- **`curve_portfolio_summary`** — view aggregating across all orgs.

## Marketing hub

- **`org_contacts`**, **`org_contact_relationships`** (parent↔child, coach↔team).
- **`org_contact_segments`** — system + team + custom segments.
- **`org_teams`** — trigger auto-creates a segment per team.
- **`org_marketing_drafts`**, **`org_marketing_sends`** — email lifecycle.
- **`org_sms_sends`**.
- **`campaign_sequence_templates`** (admin-curated) → **`campaign_sequences`** (per-org) → **`campaign_sequence_steps`**.
- **`org_nps_surveys`**, **`org_nps_responses`**.
- **`org_send_platforms`**, **`org_email_connections`** (encrypted OAuth tokens).
- **`org_brand_voice`**, **`org_brand_kits`**.
- **`org_marketing_summary`** — cached AI insights.

## Sponsorships

- **`org_sponsorship_tiers`** — admin-approved packaged offers.
- **`sponsorship_leads`** — pipeline rows. stage, is_warm, deal_amount, closed_at.
- **`sponsorship_activities`** — log per lead.
- **Trigger `sync_sponsorship_to_revenue`** on won → `org_revenue_entries`.

## Communications

- **`communication_threads`** — one per topic per org.
- **`communication_messages`** — realtime-enabled.

## Files

- Postgres side: **`org_files`** metadata table pointing at storage objects.
- Storage: buckets `org-shared-files`, `brand-assets`, `design-assets`, `design-renders`, `org-logos`, `acquisition-documents`, `event-w9s`.

## Acquisitions

- **`acquisition_projects`** — phase, workstream_progress jsonb.
- **`acquisition_tasks`** — workstream tag.
- **`acquisition_staff`**, **`acquisition_staff_tokens`** — onboarding tokens.
- **`acquisition_compliance_items`**.
- **`acquisition_meetings`**, **`acquisition_meeting_transcripts`**, **`acquisition_meeting_action_items`**, **`acquisition_meeting_decisions`**, **`acquisition_meeting_risks`**.
- **`acquisition_documents`** — visible_to_seller flag.
- **`acquisition_portal_users`** — email ↔ acquisition_id.
- **`acquisition_weekly_rollups`**.

## Revenue audit (public)

- **`public_audit_leads`** — one row per submission. `report_token uuid` for shareable URL.
- No anon SELECT policy — reads via `get_public_audit_report(_token)` RPC only.

## Email / queue plumbing

- **`q_auth_emails`**, **`q_transactional_emails`** (pgmq).
- **`email_unsubscribe_tokens`**, **`email_unsubscribes`**.
- **`admin_error_log`** — every edge function's wrapped errors.

## Naming rules

- `org_*` — org-scoped (RLS uses `current_org_id()`).
- `acquisition_*` — acquisitions module (RLS uses module + role).
- `curve_*` — platform-wide, admin-only.
- `public_*` — anon-accessible (via RPC only).
- No prefix — cross-cutting (profiles, user_roles, pending_invitations).

## See also

- [`security-model.md`](./security-model.md)
- [`storage.md`](./storage.md)
- [`revenue-share-engine.md`](./revenue-share-engine.md)
