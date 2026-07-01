# Edge Functions

Deno-runtime functions in `supabase/functions/<name>/index.ts`. 60+ of them. Grouped below by purpose.

## Conventions

- **Filename = function name = URL slug.** Kebab-case.
- **Every function returns CORS headers** — use the shared `_shared/cors.ts` when present.
- **Validate every body with zod.** Return 400 with a legible message on failure.
- **Log with `console.log('[<name>] …')`.** Lovable Cloud captures stdout.
- **Prefer the anon key when the caller's identity matters** (RLS applies). Use `SUPABASE_SERVICE_ROLE_KEY` only when bypassing RLS is required.

## Grouped inventory

### Auth & invitations
- `admin-invite-link` — create pending_invitation, generate Supabase invite link, enqueue email.
- `send-team-invite` — primary-user invites a peer.
- `set-user-role`, `update-user-module-access` — admin-only role/module changes.

### Email plumbing
- `process-email-queue` — cron every minute, drains `q_transactional_emails` and `q_auth_emails` via Resend.
- `send-email` — generic wrapper enqueueing an email (used by other functions).
- `resend-webhook` — Resend delivery/open/click events → updates `org_marketing_sends`.
- `send-nps-survey`, `process-nps-response`.
- `send-weekly-focus-email`, `send-weekly-rollup`, `daily-task-digest`.
- `notify-new-message` — DM notifications.

### Plan & tasks
- `generate-plan-from-templates` — reads `derived_metrics` + `task_templates`, writes draft `org_tasks`.
- `activate-action-plan` — flips `plan_status`, sets baseline/contract, creates initial project.
- `calc-metrics` — engine scoring from `organization_intake` → `derived_metrics`.
- `regenerate-derived-metrics` — force recompute (admin tool).
- `run-website-audit`, `run-social-audit` — score public presence for marketing/platform engines.

### Sponsorships & revenue
- `sync-sponsorship-revenue` — manual reconciliation (trigger handles the normal case).
- `generate-sponsorship-leads` — AI-assisted lead prospecting (Lovable AI Gateway).
- `send-sponsorship-outreach` — bulk email out of the pipeline.

### Marketing
- `draft-marketing-email` — Gemini-backed subject+body generation, seeded with `org_brand_voice`.
- `send-marketing-send`, `send-sms`, `cron-run-sequences`.
- `generate-marketing-insights` — weekly summary → `org_marketing_summary`.
- `import-contacts`, `import-schools`.

### Acquisitions
- `fathom-webhook`, `fireflies-webhook` — ingest transcripts.
- `process-meeting-transcript` — LLM extraction of action items / decisions / risks.
- `generate-staff-onboarding-token`, `submit-staff-onboarding`.
- `send-acquisition-rollup`.
- `run-acquisition-phase-check` — nudge for `update_acquisition_phases()`.

### Revenue audit (public funnel)
- `submit-revenue-audit` — the whole funnel: zod-validate, honeypot, compute leak, insert `public_audit_leads`, dual email (internal + prospect).
- `revenue-audit-email-report` — resend report link on demand.

### Design / flyers
- `render-design` — calls the composite-worker on Railway to render Fabric.js JSON to PNG.
- `generate-design-background` — Lovable AI image generation.
- `list-design-templates`.

### Admin ops
- `delete-organization` — cascade delete via `admin_cascade_delete_org` RPC, then clean auth.users, then storage. Reordered flow is essential — RPC first.
- `merge-organizations`.
- `admin-cascade-delete-user`.
- `system-wiring-status` — powers `/admin/system/wiring-status`.

### Integrations
- `google-oauth-callback`, `microsoft-oauth-callback` — for `org_email_connections`.
- `twilio-status-webhook`.

## Invoking from the client

```ts
const { data, error } = await supabase.functions.invoke('submit-revenue-audit', {
  body: payload,
});
if (error) toast({ variant: 'destructive', title: 'Failed', description: error.message });
```

## Invoking on a schedule

`pg_cron` jobs in the migrations schedule functions via `pg_net.http_post`. See migrations named `*_cron_*` for the wiring.

## Debugging

- Console logs surface in Lovable Cloud's function log viewer.
- Errors also go to `admin_error_log` when the function wraps its handler in the shared error logger.
- The `/admin/system/wiring-status` page shows last-success timestamps for every critical function.

## See also

- [`email-system.md`](./email-system.md)
- [`background-jobs.md`](./background-jobs.md)
- [`integrations.md`](./integrations.md)
