# Auth & Onboarding

## Identity source of truth

`useAuth()` hook in `src/hooks/useAuth.tsx`. Wraps everything.

It exposes:

```ts
{
  session, user, profile,
  role: 'admin' | 'org_user' | 'seller_portal' | null,
  isPrimary: boolean,          // user is org's primary contact
  hasModule(m),                // 'allegiance' | 'acquisitions' | …
  signOut(), refresh()
}
```

Loads on mount:
1. `supabase.auth.getSession()` for the JWT.
2. In parallel: `profiles` row (org_id, module_access, name, email) + `user_roles` rows.
3. If `profile.org_id`, fetch `organizations.primary_user_id` to compute `isPrimary`.

Subscribes to `onAuthStateChange` — refetches profile+roles when the session changes.

## Sign-in

- `/auth` page — email+password. No magic links (removed to reduce support surface).
- Password reset: `/reset-password` triggers `supabase.auth.resetPasswordForEmail` → user gets link → `/set-password` finalizes.

## Invitation flow (admin-triggered)

1. Admin fills invite form.
2. Frontend calls `admin-invite-link` edge function.
3. That function:
   - Upserts `pending_invitations` (email, org_id, role, module_access, is_primary).
   - Generates/reuses an `email_unsubscribe_tokens` row (required by Resend).
   - Calls `supabase.auth.admin.generateLink({ type: 'invite', redirectTo: '<origin>/set-password' })`.
   - Enqueues an email in `q_transactional_emails` with the invite link, sender `Curve OS <noreply@os.curvesports.com>`.
4. `process-email-queue` (cron every minute) drains the queue via Resend on `notify.os.curvesports.com`.
5. Invitee clicks link → session established via the invite JWT → lands on `/set-password`.
6. `/set-password` calls `supabase.auth.updateUser({ password })` — session persists.
7. **`handle_new_user` trigger** on `auth.users` insert:
   - Looks up matching `pending_invitations` by email.
   - Creates `profiles` row with `org_id`, `full_name`, `module_access`.
   - Creates `user_roles` row with the invited `role`.
   - If `is_primary`, sets `organizations.primary_user_id = new.id`.
   - If matching `acquisition_portal_users` row, sets role to `seller_portal` and links to the acquisition.
   - Marks `pending_invitations.accepted_at = now()`.
8. Frontend redirects based on role.

The **crucial invariant:** `handle_new_user` runs once, atomically, at signup. There is no fallback code path — if it fails, the user has a session but no profile, and `useAuth().profile` will be null forever. That is why `AdminInvite` shows loud red banners on failure and why the trigger is heavily instrumented.

## Peer invites

An org's primary user can invite peers via `/team` → `send-team-invite` edge function. Same flow, but `role='org_user'` and `is_primary=false`.

## The Curve-Admin-becomes-org-user "shadow" (not implemented)

There is no impersonation. Admins see org data via RLS `has_role='admin'` policies, not by switching sessions. Any UI that says "view as org" is a client-side filter, not a session change.

## Sign-out

`useAuth().signOut()` clears session + hard-navigates to `/auth`.

## Sessions

- Supabase auth stores JWT in `localStorage` under `supabase.auth.token`.
- Refresh handled automatically by the client.
- No refresh-token rotation issues currently — if you see stale sessions, it's usually the RLS policy, not auth.

## See also

- [`../01-user-guide/roles-and-access.md`](../01-user-guide/roles-and-access.md)
- [`email-system.md`](./email-system.md)
- [`../03-architecture/security-model.md`](../03-architecture/security-model.md)
