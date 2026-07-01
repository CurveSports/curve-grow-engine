# Data Access Patterns

Every table read/write follows one of four patterns. Pick the right one.

## 1. Direct table query via supabase-js (most common)

For anything the current user is allowed to see under RLS.

```ts
const { data, error } = await supabase
  .from('org_tasks')
  .select('*, org_projects(name)')
  .eq('org_id', orgId)
  .order('display_order');
```

Wrap in TanStack Query:

```ts
export function useOrgTasks(orgId: string) {
  return useQuery({
    queryKey: ['org', orgId, 'tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('org_tasks')…
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
```

RLS enforces access. Never trust `orgId` from URL params without also relying on the policy.

## 2. RPC (postgres function)

For anything that needs multi-table logic, aggregation, or bypassing RLS with a well-known contract.

```ts
const { data } = await supabase.rpc('get_public_audit_report', { _token: token });
```

Common RPCs:
- `has_role(_user_id, _role)` — security-definer, used inside RLS policies.
- `current_org_id()` — returns caller's org_id from JWT/profile.
- `has_module_access(_user_id, _module)` — module gate for RLS.
- `recalculate_revenue_share(_org_id)` — invoked on writes, but also callable from client to force a refresh.
- `task_phase_is_unlocked(_task_id)` — used by the completion trigger and by the UI to show lock state.
- `get_public_audit_report(_token)` — anon-safe read of `public_audit_leads`.
- `claim_pending_invitation(_email)` — used by `handle_new_user`.
- `update_acquisition_phases()` — cron-driven, callable manually.

## 3. Edge function

For anything that:
- Needs a server secret (Resend, Twilio, Lovable AI, Google/M365 OAuth token).
- Enforces business rules that can't be RLS-expressed.
- Composes multiple writes atomically.

Invoke from client:

```ts
const { data, error } = await supabase.functions.invoke('submit-revenue-audit', {
  body: { … },
});
```

See [`edge-functions.md`](./edge-functions.md).

## 4. Realtime channel

For live updates (currently: `communication_messages`, some sponsorship pipeline counters).

```ts
useEffect(() => {
  const ch = supabase
    .channel(`org:${orgId}:messages`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'communication_messages',
      filter: `org_id=eq.${orgId}`,
    }, (payload) => { … })
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [orgId]);
```

## The generated types

`src/integrations/supabase/types.ts` is generated from the live schema. Never hand-edit.

Use it aggressively:

```ts
type Task = Database['public']['Tables']['org_tasks']['Row'];
type TaskInsert = Database['public']['Tables']['org_tasks']['Insert'];
type Enum = Database['public']['Enums']['task_status'];
```

## Anti-patterns to avoid

- **Fetching in a component `useEffect`** without TanStack Query — leads to duplicate requests and stale caches.
- **Storing server data in `useState`** — same problem.
- **Bypassing RLS via `supabase-js` with a service role key on the client.** Never do this. If you need service-role, put the code in an edge function.
- **Assuming a query returned data.** Every `select` can return `[]`; every `maybeSingle()` can return `null`. Handle both.

## See also

- [`rls-and-grants.md`](./rls-and-grants.md)
- [`edge-functions.md`](./edge-functions.md)
