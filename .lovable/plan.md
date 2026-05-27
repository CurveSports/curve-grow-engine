## Goal
Invited users should land on the existing `/set-password` screen instead of `/` (where they get auto-signed-in with no password and have to use "forgot password" later).

## Changes

1. **`supabase/functions/admin-invite-link/index.ts`**
   - When `linkType === "invite"` (brand-new email, no password yet), force `redirectTo = ${origin}/set-password` regardless of what the caller passed. For `magiclink` (existing confirmed user), keep the caller's `redirect_to`.
   - Pass the resolved redirect through to `generateLink` so the action_link Supabase emails carries the right `redirect_to` param.

2. **Callers** — leave the three callers as-is (they already pass `${origin}/`); the edge function override handles invites. No client changes needed.

3. **`src/pages/SetPassword.tsx`**
   - After successful `updateUser({ password })`, navigate to `/` (already does this) — `RouteResolver` then sends them to the right module. No change needed unless we want to verify.

4. **Sanity check `/set-password` route** — already exists in `App.tsx` line 114 behind `ProtectedRoute`. The invite link signs the user in before redirecting, so the protected route will admit them. ✓

## Deploy
Redeploy `admin-invite-link` after the edit.

## Result
- New invitee clicks email link → auto-signed-in → lands on `/set-password` → sets password → routed to their dashboard.
- Existing user resends (magic link) → still goes to `/` as before.
- "Curve OS <noreply@os.curvesports.com>" sender unchanged.
