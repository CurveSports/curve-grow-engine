## Problem

When an org user creates a Communication Calendar season, the app inserts the season row plus a batch of auto-generated calendar items into `org_calendar_items`. Those generated items are flagged `is_system_item = true, is_custom = false`, but the only INSERT policy available to org members requires `is_custom = true AND is_system_item = false`. The insert is therefore rejected with "new row violates row-level security policy for table org_calendar_items". Admins are unaffected because the `admins manage org_calendar_items` policy covers everything.

## Fix

Add an RLS INSERT policy on `public.org_calendar_items` that lets org members create system-generated items for their own org (i.e. the seeded season calendar), while keeping the existing narrower "custom items" policy intact.

New policy (INSERT):
- `org_id = current_org_id()`
- `created_by = auth.uid()`
- `is_system_item = true`
- `is_custom = false`

No changes to SELECT/UPDATE/DELETE policies — org members can already read and update their org's items, and season deletion is admin-driven.

No frontend changes required. Once the policy is in place, the "Build My Calendar" flow in `SeasonSetupModal` will succeed for org users on their own org.

## Out of scope

- Any changes to `is_custom` / `is_system_item` semantics.
- Adjustments to the admin or delete policies.
- Backfilling the failed season attempt (user can retry after the policy is deployed).
