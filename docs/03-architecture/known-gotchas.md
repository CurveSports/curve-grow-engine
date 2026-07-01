# Known Gotchas

Land mines a new engineer will step on. Read this before your first ticket.

## Auth / invites

- **`handle_new_user` runs once and there's no retry.** If it fails, the user has a session but no profile — `useAuth().profile` will be null forever. Instrument any change to it heavily.
- **Auth emails must include an unsubscribe token.** Resend rejects them otherwise. `admin-invite-link` handles this via `email_unsubscribe_tokens` — copy the pattern for new email code paths.
- **`redirect_to` on invite links defaults to the site root.** For new-user invites we force `/set-password` so users create a password immediately instead of being auto-signed-in with no idea what happened.

## RLS

- **Empty results usually mean RLS blocked you.** Repro as `service_role` in the SQL editor to confirm data exists, then fix the policy.
- **Never write a policy that queries `user_roles` directly** — use `has_role()`.
- **Draft tasks (`plan_status='draft'`) are visible to admins only.** The org-scoped read policy has an extra clause.

## Revenue share

- **Contract value = recovery threshold.** Changing contract value moves the threshold for future entries only; historic Curve share is preserved via the entry rows.
- **`recalculate_revenue_share` runs on triggers.** If you insert `org_revenue_entries` in a batch, it fires N times. Wrap batches in a single transaction.
- **`src/lib/revenue.ts` mirrors the SQL for optimistic UI.** The SQL function is authoritative — never let them diverge.

## Tasks / plans

- **`task_phase_is_unlocked` blocks completion via trigger.** Admins bypass. If you're adding a new completion pathway (e.g., bulk-complete), make sure it goes through the same trigger.
- **Deleting a project unassigns tasks (`project_id = null`)** rather than destroying them. This is intentional. Do not "clean up" by cascading.
- **Regenerating a plan is additive.** It doesn't delete existing tasks — only adds missing ones.

## Emails

- **Every email goes through `pgmq` + `process-email-queue`.** Never call Resend directly except from that function.
- **Sender is `Curve OS <noreply@os.curvesports.com>` on domain `notify.os.curvesports.com`.** Do not send from any other domain — it will not have deliverability.

## Storage

- **Bucket paths always start with the tenant UUID.** RLS enforces the match. If you change the path scheme, update every policy that mentions it.
- **PDF/image previews fetch as blobs.** `SharedFilesTab` bypasses browser header issues by not embedding signed URLs directly.

## UI

- **Never use raw hex or `text-white` / `bg-black`.** Use semantic tokens (`text-foreground`, `bg-background`, `text-volt`).
- **Public revenue-audit pages force dark theme** regardless of user preference.
- **Sidebar nav filters by module.** If a route is inaccessible, check `AppShell`'s filter before assuming a bug.

## Types

- **Do not edit `src/integrations/supabase/types.ts`.** It regenerates.
- **Use `Database['public']['Tables']['x']['Row']`** for row types.

## Migrations

- **Never edit a merged migration.** Add a new one.
- **Add RLS + at least one policy in the same migration as any new table.**

## Edge functions

- **CORS headers are mandatory** — even for admin-only functions, else the browser preflight fails.
- **Log with `[<function-name>]` prefix.** It's the only way to grep the noisy Lovable Cloud log stream.
- **Prefer the caller's JWT (`Authorization` header forwarding).** Service-role bypass is a deliberate, commented decision.

## Composite worker

- **Not on Lovable Cloud.** Lives on Railway. If designs stop rendering, check Railway first.

## Testing

- **Coverage is thin.** Manual smoke is the safety net. Read [`../02-technical-guide/testing.md`](../02-technical-guide/testing.md).

## Things that *look* broken but aren't

- **`profiles.module_access` is stored as `text[]`, not an enum.** Values are freeform strings; only the app enforces the vocabulary.
- **`organization_intake` has 100+ columns.** That's normal — it mirrors the questionnaire.
- **`derived_metrics.priority_engine` can differ from `fastest_path_engines[0]`.** Priority is where Curve advises focus long-term; fastest-path are quick wins.
