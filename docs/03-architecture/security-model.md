# Security Model

The rules that keep tenants isolated and secrets on the server.

## Three-role, module-gated model

- Roles in `user_roles` — never on `profiles`.
- Modules in `profiles.module_access text[]` — a UX gate primarily; RLS uses it selectively.

## The four RLS helpers

All `SECURITY DEFINER`, `STABLE`, safe inside policies:

- `has_role(_user_id uuid, _role app_role) returns boolean`
- `current_org_id() returns uuid`
- `has_module_access(_user_id uuid, _module text) returns boolean`
- `is_org_primary(_user_id uuid, _org_id uuid) returns boolean`

Never write a policy that queries `user_roles`, `profiles`, or `auth.users` directly — it will either recurse or leak.

## Policy shapes

**Org-scoped table (default):**
```sql
using (org_id = current_org_id() or has_role(auth.uid(), 'admin'))
```

**Admin-only:**
```sql
using (has_role(auth.uid(), 'admin'))
```

**Module-gated (acquisitions):**
```sql
using (has_role(auth.uid(), 'admin') and has_module_access(auth.uid(), 'acquisitions'))
```

**Token-gated public read (revenue audit):** No anon SELECT — access exclusively through a `SECURITY DEFINER` RPC that matches on an opaque token.

## Storage

Every bucket is either:
- **Public read + auth write** (e.g. `org-logos`) — documented in `@security-memory` as accepted risk.
- **Org-folder-scoped** — object key starts with the org UUID; policy matches on `(storage.foldername(name))[1] = current_org_id()::text`.
- **Admin-only** — `acquisition-documents`, `event-w9s`.

## Secrets

- **Never** on the client. Every external key (Resend, Twilio, Lovable AI, OAuth client secrets, composite worker secret) is an edge-function env var.
- The Supabase **anon** key is safe to expose (that's its purpose). The **service-role** key never leaves edge functions.

## Auth trust boundary

- The frontend trusts the JWT (`auth.uid()`) issued by Supabase Auth.
- RLS trusts `auth.uid()` and reads `profiles`/`user_roles` inside SECURITY DEFINER helpers.
- Edge functions that need to act as a specific user forward that user's JWT (`{ headers: { Authorization: authHeader } }`), so RLS still applies. Bypassing to service-role should be a deliberate, commented decision.

## `@security-memory`

Root-level file. Records accepted-risk annotations for scanner findings that are intentional:
- Public read on `org-logos` (needed for public marketing pages).
- Anon INSERT on `public_audit_leads` (funnel by design).
- Anon RPC `get_public_audit_report` (token-gated).

Update it whenever a security scanner flags something you deliberately allow.

## Cross-cutting rules

- **No impersonation.** Admins see org data via RLS admin policies — no session-switching UI.
- **No `SELECT *` on `auth.users`** anywhere — use `profiles`.
- **Every new table gets RLS enabled in the same migration.**
- **Every new edge function validates its body with zod.**

## See also

- [`../02-technical-guide/rls-and-grants.md`](../02-technical-guide/rls-and-grants.md)
- [`../02-technical-guide/auth-and-onboarding.md`](../02-technical-guide/auth-and-onboarding.md)
