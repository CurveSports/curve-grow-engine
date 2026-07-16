## Goal
Let an org choose, per survey, which Curve template (master) questions to include — instead of every active master question being shown automatically. NPS scoring still works as long as the org keeps the NPS rating_10 question selected.

## Approach
Add a single array column `included_master_question_ids uuid[]` to `org_nps_surveys`. `NULL` = "include all active master questions for this version" (backward compatible for existing surveys). A non-null array = only those specific master question IDs are shown.

## Database (one migration)
- Add column `included_master_question_ids uuid[]` on `public.org_nps_surveys`, default `NULL`.
- Update `public.get_public_survey(...)` to also return the array so the public respondent page can filter.
- No new tables, no RLS changes.

## UI — org survey detail (`src/pages/retention/SurveyDetail.tsx`)
In the "Core questions (Curve — cross-org benchmark)" card:
- Show every active master question for the survey's version with a checkbox to include/exclude it.
- Add a warning next to the NPS (rating_10) question: "Excluding this removes the NPS score from this survey."
- Persist selection on toggle by writing the resulting `uuid[]` to `included_master_question_ids` (write `NULL` when every question is checked so defaults keep working).
- Lock the checkboxes when the survey is locked (has responses).
- Filter the master list rendered elsewhere on the page (per-question results, CSV export) to the selected IDs.

## UI — public respondent page (`src/pages/NpsResponse.tsx`)
- Read `included_master_question_ids` from the RPC payload.
- After loading master questions for the version, filter to the selected IDs (fall back to "all" when null).
- Keep NPS-derived scoring conditional on the rating_10 master question actually being included.

## Reports / CSV
- `SurveyDetail` already passes the `master` array into `buildResponseCsv` and the results tab — filtering that array upstream is enough; no changes to `src/lib/surveys.ts`.

## Admin question bank
- No changes. Admins still manage the master template globally; per-survey selection is an org-level choice.

## Out of scope
- Reordering master questions per survey (org can still reorder their own custom questions; global master order is set in the admin question bank).
- Migrating already-sent surveys — they keep `NULL` and behave exactly as today.
