## Goal

On a survey's Questions tab, let the org owner reorder the Curve **core (template) questions** by drag-and-drop — same interaction they already have for their own custom questions. The chosen order flows through to the public link, the preview, and the report/CSV. Custom questions keep their existing drag-and-drop.

## Approach

Master questions are shared across orgs, so their global `sort_order` can't change per survey. Instead, store a per-survey override array of master question IDs on `org_nps_surveys`.

### Database

Add one column to `org_nps_surveys`:

- `master_question_order uuid[] DEFAULT NULL` — ordered list of master question IDs for this survey. `NULL` = use the master version's default `sort_order`.

Update the `get_public_survey` RPC to return this column alongside `included_master_question_ids`.

### Shared ordering helper

Add a small helper in `src/lib/surveys.ts`:

```
orderMasterQuestions(master, order):
  if order is null → return master sorted by sort_order (unchanged)
  else → return [ ...master matching order in that sequence,
                  ...any remaining master questions in default order ]
```

Any new master questions added later automatically appear at the end until the org reorders again.

### Admin/org SurveyDetail (`src/pages/retention/SurveyDetail.tsx`)

- Compute `orderedMaster = orderMasterQuestions(master, survey.master_question_order)`.
- Replace the current `master.map(...)` block inside the "Core questions" card with `SortableQuestionList`:
  - Items = `orderedMaster`.
  - Each row keeps its checkbox (include/exclude), badge, label, type, NPS warning.
  - `disabled={locked}` — no reordering after responses arrive.
- `onReorder(ids)`: optimistic update of `survey.master_question_order`, persist to `org_nps_surveys.master_question_order`, revert + toast on error, `load()` on success. Same pattern as the existing custom-question `reorderQs`.
- Downstream views that already read `selectedMaster` (per-question results, CSV export) switch to `orderedMaster.filter(isMasterIncluded)` so results and CSV columns follow the new order.

### Public survey page (`src/pages/NpsResponse.tsx`)

- Read `master_question_order` from the RPC payload.
- Apply `orderMasterQuestions(allMaster, master_question_order)` before filtering by `included_master_question_ids`.

### Preview page

Preview reuses the same component/data, so it inherits the new order automatically.

## Out of scope

- Reordering core questions from the Curve admin question bank (already exists there).
- Mixing core and custom questions into one combined drag list — they stay in two sections.
- Backfilling ordering for surveys that already have responses (locked).

## Files touched

- `supabase/migrations/<new>.sql` — add column + update `get_public_survey`.
- `src/lib/surveys.ts` — add `orderMasterQuestions` helper.
- `src/pages/retention/SurveyDetail.tsx` — sortable core-question list + persistence.
- `src/pages/NpsResponse.tsx` — apply order to public render.
- `src/integrations/supabase/types.ts` — regenerated after migration.
