# Roles & Access

Curve OS has **three auth roles** and one **module gate**. Every access decision reduces to those two axes.

## The three roles (`user_roles.role`)

| Role | Who gets it | Assigned by |
|---|---|---|
| `admin` | Curve staff | Manually — `user_roles` insert by another admin, or via `/admin/users`. |
| `org_user` | Anyone at a customer organization | Automatically by `handle_new_user` trigger when someone accepts an invite with `pending_invitations` matching their email. |
| `seller_portal` | Leadership at a Curve-Acquisitions target | Manually added to `acquisition_portal_users` — matched on email at signup. |

Roles are stored in a **separate `user_roles` table** (not `profiles`) so RLS can safely use `has_role(auth.uid(), 'admin')` without recursion. This is a hard rule — never put a `role` column on `profiles`.

## Module access (`profiles.module_access text[]`)

Values in use: `'allegiance'`, `'acquisitions'`, plus experimental `'marketing'` and `'events'`.

- **Client:** `useAuth().hasModule('allegiance')`
- **Route gating:** `<ProtectedRoute role="admin" module="allegiance">`
- **`ProtectedRoute` fall-through:** If a user lacks the required module, they're redirected to a module they *can* access — an admin without allegiance but with acquisitions lands on `/admin/acquisitions`, an org user lands on `/dashboard`.

## The primary-user distinction

`organizations.primary_user_id` marks the single org user who can:
- Complete the initial intake questionnaire.
- Approve the plan (indirectly — Curve admin does the final approval, but only the primary sees the plan-preview call to action).
- Update org-wide settings.

`useAuth().isPrimary` is `true` when `session.user.id === organizations.primary_user_id`.

## What each role can see, at a glance

### `admin`
- Everything under `/admin/*` (gated by module).
- Full read/write on every org (RLS: `has_role(auth.uid(), 'admin')`).
- The `/curve/*` internal-tools routes (roadmap, weekly-focus, task tracker).
- `/admin/system/wiring-status` — health of the edge functions and queues.

### `org_user`
- Their own org's data only, enforced by `current_org_id()` RLS on every org-scoped table.
- Sees `/dashboard`, `/plan`, `/marketing/*`, `/sponsorships`, `/communications`, `/calculators`, `/files`, `/team`, `/settings` — but only if the org's module_access includes the parent module.
- Cannot see draft tasks (`plan_status='draft'`) or unreleased projects (`status='draft'`).

### `seller_portal`
- Only `/portal/seller/:acquisitionId` for the acquisitions they're linked to via `acquisition_portal_users`.
- Read-only view of `acquisition_projects` progress and `acquisition_documents` shared to them.

### Public (no auth)
- `/revenue-audit` — the questionnaire.
- `/revenue-audit-report/:token` — token-gated report page.
- `/onboard/:token` — acquisition staff self-onboarding.
- `/auth`, `/set-password`, `/reset-password`, `/set-password/invite/:token` — auth flows.

## Invitation flow (end-to-end)

1. Admin fills the invite form (`/admin/invite` or `/admin/users`).
2. `admin-invite-link` edge function:
   - Inserts a `pending_invitations` row with the requested `org_id`, `role`, `module_access`.
   - Generates or reuses an unsubscribe token in `email_unsubscribe_tokens` (Resend requirement).
   - Calls `supabase.auth.admin.generateLink({ type: 'invite', redirectTo: '/set-password' })`.
   - Sends the invite via the shared email path (`process-email-queue` → Resend on `notify.os.curvesports.com`, from `noreply@os.curvesports.com` / "Curve OS").
3. User clicks link → lands on `/set-password` → creates a password → session established.
4. `handle_new_user` trigger fires:
   - Creates `profiles` row copying `org_id`, `module_access` from `pending_invitations`.
   - Creates `user_roles` row with the invited role.
   - Marks the invitation `accepted_at`.

If a matching `acquisition_portal_users` row exists, they're granted `seller_portal` instead and linked to the acquisition.

## See also

- [`../02-technical-guide/auth-and-onboarding.md`](../02-technical-guide/auth-and-onboarding.md)
- [`../03-architecture/security-model.md`](../03-architecture/security-model.md)
