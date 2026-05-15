## Problem

When creating a new organization, a trigger chain fires:
`organizations INSERT → trg_seed_org_marketing_defaults → seed_org_system_segments → recompute_org_segment_counts → count_segment_contacts`

Inside `count_segment_contacts`, the dynamic SQL compares an enum column to a text value:

```sql
and ($2->>''team_role'' is null or tm.role = $2->>''team_role'')
```

`org_team_memberships.role` is the enum `public.team_member_role`, and `$2->>'team_role'` is `text`. Postgres has no implicit cast, so it raises:

> operator does not exist: team_member_role = text

This blocks org creation entirely.

## Fix

Recreate `public.count_segment_contacts(_segment_id uuid)` with `tm.role::text = $2->>'team_role'` (cast the enum to text in the comparison). No other behavior change.

```sql
CREATE OR REPLACE FUNCTION public.count_segment_contacts(_segment_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
... (same body, but with)
    and ($2->>''team_role'' is null or tm.role::text = $2->>''team_role'')
...
$function$;
```

Single migration, no schema changes, no app code changes.

## Verification

After the migration, creating a new org should succeed without the enum/text operator error, and segment counts continue to populate correctly for the system + team segments.
