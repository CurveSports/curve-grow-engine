## Add drag-and-drop for tasks between phases

On the project detail page (`/admin/org/:orgId/projects/:projectId`), enable dragging task cards between phase sections to reassign their phase — replacing the current "Phase" dropdown as the primary reordering mechanism (dropdown stays as a fallback).

### Library
Use `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, already common in shadcn ecosystems).

### Behavior
- Each `PhaseSection` becomes a droppable container.
- Each `TaskRow` becomes a draggable item with a small drag handle (grip icon) on the left side of the card.
- On drop into a different phase: update `phase` on the dropped task; reorder `display_order` for tasks within the target phase.
- On drop into the same phase at a new position: just reorder `display_order`.
- Locked phases: still accept drops (admins can plan ahead); the gating trigger only blocks marking *completed*, not phase moves.
- Optimistic UI: update local `tasks` state immediately, then persist; revert on error.

### Persistence
Single batch update per drop:
- Update the moved task's `phase` + `display_order`.
- Recompute `display_order` for affected tasks in the target (and source) phase and update them via `upsert`.

### Files
- `src/pages/admin/OrgProjectDetail.tsx` — wrap content in `<DndContext>`, wrap each phase's task list in `<SortableContext>`, add drag handle to `TaskRow`, add `handleDragEnd` with reorder/persist logic.
- `package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

No DB schema changes — `phase` and `display_order` columns already exist.
