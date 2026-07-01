# Task Plan Engine

How an intake questionnaire becomes an executable plan.

## Sources

- **`organization_intake`** — the raw questionnaire responses.
- **`task_templates`** — the library of reusable tasks, keyed by `engine` + `score_band` (`low`|`mid`|`high`).

## Pipeline

```
intake submitted
   │
   ├─► calc-metrics (edge fn)
   │       ├─ engine scores 1–10 per pillar
   │       ├─ priority_engine
   │       ├─ fastest_path_engines[]
   │       └─ calculated_total_revenue
   │            ↓ writes
   │       derived_metrics
   │
   ├─► generate-plan-from-templates (edge fn)
   │       for each engine:
   │         pick score_band → template rows
   │         create org_tasks with plan_status='draft'
   │
   └─► admin reviews /admin/org/:orgId → Plan tab
           ↓ approves
       activate-action-plan (edge fn)
           ├─ sets organizations.plan_activated_at
           ├─ flips draft tasks to plan_status='active'
           ├─ writes org_engagement_baselines
           ├─ writes org_engagement_contracts
           └─ creates initial org_projects row (or leaves empty)
```

## Engines

`ENGINES` constant in `src/lib/tasks.ts` — do not hardcode strings elsewhere:

```
Fundraising · Sponsorship · Marketing · Operations · Platform · Community
```

Each engine has a color, icon, and slug. Score-bands are computed the same way for every engine (1–4 = low, 5–7 = mid, 8–10 = high).

## Projects & phases

- Once the plan is active, admins group tasks into **projects** (`org_projects`).
- Each task in a project has a `phase` (integer, default 1).
- `task_phase_is_unlocked(_task_id)`:
  ```
  returns true if there are no incomplete tasks
  in the same project with a lower phase number
  ```
- The **`task_completion_gate` trigger** on `org_tasks` blocks `status → completed` transitions when the task's phase is locked. Admins bypass via `has_role`.
- The UI (`OrgProjectDetail`, `TaskDetail`) also checks the same predicate for tooltips and CTA disabling.

## Drag-and-drop reordering

`OrgProjectDetail` uses `@dnd-kit`. On drop:
- Update `phase` if the task moved to a new phase column.
- Update `display_order` for all tasks in the affected phase.
- Batch update in a single Postgres round-trip.

## Deletion

Deleting a project sets `org_tasks.project_id = null` — tasks live on, unassigned. Deleting a task hard-deletes. Choose carefully.

## What the org sees

- Only tasks whose `plan_status = 'active'`.
- Only tasks whose `project_id IS NULL` OR whose `project.status = 'active'`.
- Locked tasks are visible but disabled.

## Regenerating

`regenerate-derived-metrics` and re-running `generate-plan-from-templates` are safe idempotent operations, but they **do not delete existing tasks** — they only add missing ones. Cleanup is manual.

## See also

- [`../01-user-guide/org-user-workflows.md`](../01-user-guide/org-user-workflows.md)
- [`../01-user-guide/admin-workflows.md`](../01-user-guide/admin-workflows.md)
