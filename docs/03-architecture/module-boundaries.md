# Module Boundaries

How three product lines (Allegiance, Acquisitions, Revenue Audit) share the same database and codebase without stepping on each other.

## The gate

`profiles.module_access text[]`.

- Client: `useAuth().hasModule('acquisitions')`
- Route guard: `<ProtectedRoute module="acquisitions">`
- RLS (rare): `has_module_access(auth.uid(), 'acquisitions')`

## Table-level isolation

- **Allegiance** owns every `org_*` table.
- **Acquisitions** owns every `acquisition_*` table. It **never** joins to `organizations` — an acquisition target is a separate entity.
- **Revenue Audit** owns `public_audit_leads`. Standalone.

## Route-level isolation

- `/admin/*` (no acquisitions prefix) → allegiance.
- `/admin/acquisitions/*` → acquisitions.
- `/revenue-audit`, `/revenue-audit-report/:token` → public.
- `/portal/seller/:id` → acquisitions (seller portal role).

## Component-level isolation

- `src/components/admin/` — allegiance admin surfaces.
- `src/components/acquisitions/` — acquisitions.
- `src/components/revenue-audit/` — public funnel.

Shared: `src/components/shared/`, `src/components/ui/`, `src/hooks/useAuth.tsx`, `src/lib/formatters.ts`, `src/lib/utils.ts`.

## When to break the boundary

Never automatically. Cases where it's been considered:

- Sharing a contact between an org and an acquisition → punt to a new bridging table.
- Cross-line reporting → build a view/materialized view; don't reach across in application code.

## Adding a new module

Rough template:

1. Add `'newmodule'` as a valid `module_access` value (no enum change needed — it's `text[]`).
2. Create `newmodule_*` tables with RLS.
3. Namespace routes: `/admin/newmodule/*` and (if org-facing) `/newmodule/*`.
4. Namespace components: `src/components/newmodule/`.
5. Update `ProtectedRoute`'s fall-through logic if the module has an admin dashboard.
6. Update `AppShell` navigation.
7. Document in `docs/00-overview/modules-map.md`.

## See also

- [`security-model.md`](./security-model.md)
- [`../00-overview/modules-map.md`](../00-overview/modules-map.md)
