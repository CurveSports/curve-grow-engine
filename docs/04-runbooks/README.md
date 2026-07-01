# Runbooks

Step-by-step procedures for the ops tasks you'll actually run.

## Invitations & auth

### "The user isn't getting the invite email"

1. Open `/admin/system/wiring-status` — is `process-email-queue` green?
2. If not, check edge function logs for the last error.
3. Query `admin_error_log where function_name = 'admin-invite-link' or 'process-email-queue'` for the last hour.
4. Check `q_transactional_emails` depth. If growing, cron isn't running or Resend is failing.
5. Check Resend dashboard for delivery errors (bounces, complaints, domain issues).
6. If Resend delivered but user reports nothing, check spam folder and confirm domain reputation.
7. Resend the invite via `AdminUsers` → the button now surfaces the actual error message inline.

### "The user set a password but has no profile"

1. `handle_new_user` trigger failed silently. Query `admin_error_log` for the timestamp.
2. Check `pending_invitations` for a matching email row — is `accepted_at` set?
3. Manually run:
   ```sql
   select public.claim_pending_invitation('user@example.com');
   ```
4. If that succeeds, the profile+role should appear. Have the user sign out and back in.

## Data ops

### Deleting an organization

1. Confirm with a lead first — this is destructive.
2. `/admin/orgs` → the org → Delete.
3. Type org name to confirm.
4. Under the hood: `delete-organization` edge function calls `admin_cascade_delete_org` RPC first (all app tables), then cleans `auth.users` for members, then storage objects. Reordered flow is essential.
5. If it fails, read the error toast — the flow surfaces edge function errors verbatim now.

### Regenerating a plan

1. `/admin/org/:orgId` → Intake tab → Regenerate Derived Metrics (calls `regenerate-derived-metrics`).
2. Then → Regenerate Plan (calls `generate-plan-from-templates`).
3. **Existing tasks are not deleted** — new templates are appended as drafts.
4. Manually archive obsolete tasks before regenerating if the intake changed materially.

### Fixing revenue share

1. `/admin/revenue-share/:orgId` → Recompute button → calls `recalculate_revenue_share(_org_id)`.
2. If numbers still look wrong, query `org_revenue_entries` for that org — often a deal was double-logged or a lead was marked won twice.
3. Insert a negative-amount entry to correct rather than deleting historical entries.

## Acquisitions

### A meeting transcript came in but nothing extracted

1. `/admin/acquisitions/meetings/:transcriptId`.
2. Click Reprocess — calls `process-meeting-transcript` again.
3. If it fails, check the raw transcript is populated in `acquisition_meeting_transcripts.raw_text`.
4. LLM failures log to `admin_error_log`.

### Staff onboarding link expired

1. `/admin/acquisitions/:id` → Staff tab → the staff row → Regenerate Token.
2. New token, new URL, old one dead.

## Revenue Audit

### A lead came in with no report generated

1. Confirm `public_audit_leads` row exists.
2. Open `/revenue-audit-report/<token>` directly — usually renders fine; the "no report" report is often just an email delivery issue.
3. Resend the report email via `revenue-audit-email-report` edge function (there's an admin button in `/admin/revenue-audits/:id`).

## Composite worker

### Designs aren't rendering

1. Check `/admin/system/wiring-status` — composite worker section.
2. Railway dashboard: is the service healthy? Check logs.
3. Redeploy if it's stuck. Instance is small and occasionally OOMs on large designs.

## Cron

### A scheduled job hasn't fired

1. Query `cron.job` and `cron.job_run_details` in the Supabase SQL editor.
2. Confirm the job is active and check the last run.
3. Manually invoke the edge function once to unstick things.

## Emergency

### Site is down

1. Lovable Cloud status page.
2. If green, check DNS in Cloudflare.
3. If DNS is fine, check for a bad recent deploy — rollback via Lovable UI.

### Data leak suspected

1. Freeze — do not delete anything.
2. Rotate any secrets that may have leaked (Resend, Twilio, Lovable AI, OAuth clients).
3. Audit `admin_error_log` and Postgres logs for the timeframe.
4. Notify affected orgs per contractual obligations.
