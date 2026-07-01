# RLS & Grants

Every table in `public` has RLS enabled. If you add one without a policy, the app breaks — reads return nothing, writes 403.

## The two functions to memorize

Both are `SECURITY DEFINER`, `STABLE`, and safe to call inside policies (no recursion, no auth.users reads).

### `public.has_role(_user_id uuid, _role app_role) returns boolean`

- Reads `user_roles`. Returns true if user has that role.
- **Always use this instead of a subquery on `user_roles`** inside a policy.

### `public.current_org_id() returns uuid`

- Reads `profiles.org_id` for `auth.uid()`.
- Cached per statement — safe to call multiple times.

Plus:
- `public.has_module_access(_user_id uuid, _module text) returns boolean`
- `public.is_org_primary(_user_id uuid, _org_id uuid) returns boolean`

## The canonical org-scoped policy

Almost every `org_*` table uses this shape:

```sql
alter table org_tasks enable row level security;

create policy "org users read own"
  on org_tasks for select
  using (org_id = current_org_id() or has_role(auth.uid(), 'admin'));

create policy "org users write own"
  on org_tasks for insert
  with check (org_id = current_org_id() or has_role(auth.uid(), 'admin'));

create policy "org users update own"
  on org_tasks for update
  using (org_id = current_org_id() or has_role(auth.uid(), 'admin'))
  with check (org_id = current_org_id() or has_role(auth.uid(), 'admin'));

create policy "admins delete"
  on org_tasks for delete
  using (has_role(auth.uid(), 'admin'));
```

Notes:
- Admins can do everything on every org — that's how the entire `/admin/*` surface works.
- Delete is admin-only on nearly every table.
- Some tables (draft tasks, unreleased projects) add an extra `plan_status <> 'draft'` clause on the org read policy so org users don't see admin work-in-progress.

## Acquisitions

`acquisition_*` tables gate on module + role:

```sql
using (
  has_role(auth.uid(), 'admin') and has_module_access(auth.uid(), 'acquisitions')
)
```

Portal users get a narrower policy tied to `acquisition_portal_users`.

## Public (anon) reads

`public_audit_leads` — no anon SELECT policy. Reads happen exclusively through the `get_public_audit_report(_token)` RPC (SECURITY DEFINER) which matches by token.

## Storage RLS

Bucket policies live in `storage.objects`. Pattern for org-scoped buckets (`brand-assets`, `design-assets`, `design-renders`, `org-shared-files`):

```sql
create policy "org members read their folder"
  on storage.objects for select
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = current_org_id()::text
  );
```

Public buckets (`org-logos`) allow anon read but only authenticated write.

## Grants

Rarely edit these directly. Defaults:
- `anon`, `authenticated` roles have SELECT on tables where RLS allows.
- `service_role` (edge functions) bypasses RLS.
- `authenticator` role owns nothing.

If you find yourself writing a `grant`, you're probably doing it wrong — write a policy instead.

## Testing RLS

The only reliable test is to hit the API as an anon/authenticated user with a known JWT. There's no unit-test coverage for RLS today — see [`testing.md`](./testing.md).

## Common failure modes

- **"missing FROM-clause entry"** in a policy → you referenced a column from a table you didn't join. Use a subquery or a function.
- **Policy on `auth.users`** → forbidden. Use `profiles` and `user_roles`.
- **Recursion errors** → your policy queries the same table it's on. Use a `SECURITY DEFINER` function.
- **Silent empty results** → RLS blocked the read. Check `select * from ...` as `service_role` to confirm data exists, then fix the policy.

## See also

- [`../03-architecture/security-model.md`](../03-architecture/security-model.md)
- Root `@security-memory` for accepted-risk annotations.
