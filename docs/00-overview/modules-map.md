# Modules Map

**What this covers:** how the three product lines (Allegiance, Acquisitions, Revenue Audit) share one codebase and one database while staying isolated.

## The gate: `profiles.module_access`

Every org user has a `profiles` row with a `module_access text[]` column. Common values: `'allegiance'`, `'acquisitions'`. Admins are gated by the same column — an admin without `'acquisitions'` won't see the acquisitions nav.

Client-side: `useAuth().hasModule('allegiance')` is the single check. It's used in `AppShell` for nav, in `ProtectedRoute` for whole routes, and inside `RouteResolver` to pick the right admin home (`/admin/acquisitions` vs `/admin`).

Server-side: the security-definer function `public.has_module_access(_user_id, _module)` is available for RLS if a table needs it, but most tables gate on `current_org_id()` and `has_role()` instead — the module gate is primarily a UX gate.

## Allegiance

The flagship engagement.

- **Entry route:** `/dashboard` (org) or `/admin` (Curve).
- **Data spine:** `organizations` → `organization_intake` → `derived_metrics` → `org_tasks` → `org_projects` → `org_revenue_entries` → `org_revenue_share_summary`.
- **Sub-modules:** Marketing Hub (`/marketing/*`), Sponsorships (`/sponsorships`), Communications (`/communications`), Calculators (`/calculators`), Files (`/files`), Team (`/team`).
- **Weekly cadence:** admin sets weekly focus (`org_weekly_focus`) → daily/weekly digests via `daily-task-digest` and `send-weekly-rollup` edge functions.

## Acquisitions

Independent playbook for Curve-owned integrations. Doesn't touch the Allegiance tables.

- **Entry route:** `/admin/acquisitions`.
- **Data spine:** `acquisition_projects` → `acquisition_tasks` (workstream-tagged) → `acquisition_staff` → `acquisition_compliance_items` → `acquisition_meeting_*` → `acquisition_weekly_rollups`.
- **Portal:** the target's leadership gets a `seller_portal` login (`acquisition_portal_users`) and the target's staff self-serve onboarding via tokenized `/onboard/:token` links (`acquisition_staff_tokens`).
- **Phase auto-advance:** `public.update_acquisition_phases()` transitions projects across `pre_close → closing_day → first_30 → first_60 → first_90 → complete`.

## Revenue Audit

Public lead-gen funnel, no auth required.

- **Entry route:** `/revenue-audit` (public), typically embedded on curvesports.com in an iframe.
- **Data spine:** form submission → `submit-revenue-audit` edge function → `public_audit_leads` row with a `report_token`.
- **Report:** `/revenue-audit-report/:token` calls the security-definer RPC `public.get_public_audit_report(_token)` — bypasses RLS by matching only on the opaque token.
- **Admin view:** `/admin/revenue-audits` lists submissions.
- **Terminal CTA:** single Book-a-Call button linking to the Curve Google Calendar scheduler.

## Cross-cutting concerns (shared by all three)

- **Auth** — `useAuth`, `handle_new_user` trigger, `claim_pending_invitation` RPC.
- **Email** — pgmq queues + `process-email-queue` edge function + Resend on `notify.os.curvesports.com`.
- **Files/storage** — Supabase Storage buckets (`org-logos`, `brand-assets`, `acquisition-documents`, `design-renders`, `event-w9s`).
- **AI** — Lovable AI Gateway for generation (drafts, brand voice, lead generation, transcript processing).

## See also

- [`../03-architecture/module-boundaries.md`](../03-architecture/module-boundaries.md) — implementation of the gating.
- [`../03-architecture/security-model.md`](../03-architecture/security-model.md) — why `has_role` and `current_org_id` are the two functions to know.
