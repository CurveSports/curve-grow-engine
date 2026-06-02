## Goal

Give Curve admins full lifecycle control over projects (edit + delete) and introduce **phase-based gating** for tasks within a project, plus a dedicated detail page to manage assignees, due dates, and phases without spelunking through the existing Projects tab.

---

## 1. Project edit & delete (admin only)

**On the existing Projects tab card menu (`ProjectsTab.tsx`):**
- Add an "Edit project" action that opens the existing edit dialog (already exists as `editTarget`) — verify it still works for `active` and `completed` projects, not just draft.
- Add a new "Delete project" action behind a confirm dialog. On confirm:
  - Set `project_id = null` on every `org_tasks` row where `project_id = <id>` (tasks survive, drop back into the org pool).
  - Delete the `org_projects` row.
  - Toast + reload.
- Both actions gated to `has_role(auth.uid(), 'admin')`.

---

## 2. Phase-based task gating

**Model:** each task in a project belongs to a numbered **phase** (1, 2, 3…). All tasks in phase N must be `completed` before any task in phase N+1 can be marked complete. Phase 1 is unlocked by default.

**Schema changes (migration):**
- Add `phase int not null default 1` to `org_tasks`.
- Add `display_order int not null default 0` to `org_tasks` (for ordering inside a phase).
- Add a SECURITY DEFINER function `public.task_phase_is_unlocked(_task_id uuid) returns boolean` — returns true if the task's phase is 1, or if every task in the same project with a lower phase has `status = 'completed'`.
- Add a `BEFORE UPDATE` trigger on `org_tasks` that rejects a transition to `status = 'completed'` when `task_phase_is_unlocked(NEW.id)` is false **and** the actor is not an admin (`has_role(auth.uid(), 'admin')`). Admins can always override.

**UI:**
- Locked tasks render with a lock icon, muted styling, and the complete checkbox disabled (org users) or marked "Admin override" (admins).
- Tooltip explains: "Complete all Phase {N-1} tasks first."

---

## 3. Dedicated Project Detail page

**New route:** `/admin/orgs/:orgId/projects/:projectId` → `src/pages/admin/OrgProjectDetail.tsx`.

**Entry points:**
- "Open project" button on every project card in `ProjectsTab.tsx`.
- Inline quick-edit (assignee chip, due-date popover) stays on the card for fast tweaks.

**Detail page contents:**
- Header: project name, status, progress bar, edit/delete actions.
- **Phase board:** tasks grouped under "Phase 1", "Phase 2", … with:
  - Drag-or-dropdown to move a task between phases.
  - "+ Add Phase" button (just bumps max phase number).
  - Per-task inline editors: title, due date, priority, owner type, assignees (reuse `TaskAssigneePicker`), status.
  - Lock badge on tasks whose phase is gated.
- "Add task to project" button (reuse existing add-task flow, defaulted to this project + current phase).
- Activity sidebar (reuse existing task activity log on row click).

---

## 4. Technical details

**Files to add**
- `src/pages/admin/OrgProjectDetail.tsx` — new page.
- `src/components/admin/projects/PhaseColumn.tsx` — one phase group with its task list.
- `src/components/admin/projects/ProjectTaskRow.tsx` — inline-editable task row (title, due, assignee, status, phase selector, lock indicator).
- `src/components/admin/projects/DeleteProjectDialog.tsx` — confirm dialog explaining tasks will be preserved.
- Migration: `supabase/migrations/<ts>_project_phases_and_gating.sql`.

**Files to edit**
- `src/lib/tasks.ts` — add `phase` and `display_order` to `OrgTask`.
- `src/lib/projects.ts` — small helpers: `groupTasksByPhase`, `isPhaseUnlocked`.
- `src/components/admin/ProjectsTab.tsx` — add "Open", "Edit", "Delete" actions; show phase count on card.
- `src/components/tasks/TaskList.tsx` and `src/components/tasks/TaskDetailPanel.tsx` — render lock state, disable complete checkbox when locked.
- `src/App.tsx` — register the new route inside the admin section.

**Migration outline**
```sql
alter table public.org_tasks
  add column if not exists phase int not null default 1,
  add column if not exists display_order int not null default 0;

create index if not exists idx_org_tasks_project_phase
  on public.org_tasks(project_id, phase, display_order);

create or replace function public.task_phase_is_unlocked(_task_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with t as (select project_id, phase from public.org_tasks where id = _task_id)
  select case
    when (select phase from t) <= 1 then true
    when (select project_id from t) is null then true
    else not exists (
      select 1 from public.org_tasks ot, t
      where ot.project_id = t.project_id
        and ot.phase < t.phase
        and ot.status <> 'completed'
    )
  end;
$$;

create or replace function public.enforce_task_phase_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed'
     and (old.status is distinct from 'completed')
     and not public.task_phase_is_unlocked(new.id)
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Task is locked: earlier phase must be completed first';
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_task_phase_gate on public.org_tasks;
create trigger trg_enforce_task_phase_gate
  before update on public.org_tasks
  for each row execute function public.enforce_task_phase_gate();
```

(No new tables, so no new GRANTs needed.)

**Out of scope** (call out for follow-up):
- Cross-project dependencies.
- Per-task prerequisite picker (only phase-level gating for now).
- Notifications when a phase unlocks.