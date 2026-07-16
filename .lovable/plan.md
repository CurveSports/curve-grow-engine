
## Goals

1. Drop the "send to an audience" concept for surveys. Each survey has a public URL the org owner copies and pastes into their own email/text.
2. Drag-and-drop reordering for questions on both the org survey editor and the Curve admin question bank.
3. Fix the broken preview URL (`/nps/preview/:id` currently renders nothing when opened while signed out).

---

## 1. Public shareable survey link (replaces send flow)

**UI (`src/pages/retention/SurveyDetail.tsx`)**
- Remove: Send button, sendSurvey/sendTest handlers, test-email input, Send tab, audience segment picker in the Edit dialog.
- Replace with a prominent "Share link" card at the top: read-only input showing `https://os.curvesports.com/s/<public_slug>`, Copy button, Open button, QR code (reuse `QrCodeBlock`).
- Survey lifecycle simplifies to: `draft` (link inactive) → `open` (link live, accepting responses) → `closed` (link shows "This survey is closed"). Replace the Send button with an "Open survey" / "Close survey" toggle. Locking questions still triggers on first response.

**UI (`src/pages/retention/Surveys.tsx`)**
- Remove references to `sent`/audience. Show status badge and a quick "Copy link" action per row.

**Public page (`src/pages/NpsResponse.tsx`)**
- Add a new route `/s/:slug` that loads the survey by `public_slug` (no magic-link token, no contact binding).
- Keep `/nps/preview/:id` for authenticated previews.
- Keep `/nps/:token` intact for legacy magic-link responses (still works for anything already sent).
- When the survey is `closed` or `draft`, show a friendly "not accepting responses" screen.
- Since there is no per-recipient contact, the form must collect enough identity itself: name (required, already there), team, optional age group, optional email (new, optional — used only for org-side follow-up).

**Data model (migration)**
- `org_nps_surveys`:
  - Add `public_slug text unique` (default generated short random string, backfill for existing rows).
  - Add `is_open boolean not null default false` (or reuse `status` with new value `open`).
  - Keep `audience_segment_id` column for now (nullable, unused) to avoid data loss; stop writing to it.
- Add anon SELECT policy on `org_nps_surveys` limited to open surveys: `USING (is_open = true)` exposing only the columns needed by the public form. Simpler: create a `SECURITY DEFINER` function `get_public_survey(_slug text)` returning survey + org name + logo, and grant EXECUTE to anon. This avoids widening table-level RLS.
- Add anon SELECT on `organizations` name/logo via the same RPC (do not add a table policy).
- Add anon INSERT policy on `org_nps_responses` and `org_nps_answers` gated to responses whose survey is currently open. Prefer a `SECURITY DEFINER` RPC `submit_public_survey_response(_slug, payload jsonb)` for atomicity and to avoid loosening table RLS.

**Edge function**
- Keep `nps-send-survey` file in the repo for now but stop calling it from the UI. (Optional cleanup in a follow-up.)

---

## 2. Drag-and-drop question ordering

- Add `@dnd-kit/core` + `@dnd-kit/sortable` (already common in the stack; if not installed, add via `bun add`).
- Build a small `SortableQuestionList` component in `src/components/retention/` that wraps a list, exposes `onReorder(ids: string[])`, and renders a drag handle.
- Wire it in:
  - `src/pages/retention/SurveyDetail.tsx` — the "Your custom questions" card. Replace up/down arrow buttons. On drop, update `sort_order` for each affected row in a single batch (renumber 10, 20, 30, …). Disabled when the survey is locked.
  - `src/pages/admin/retention/AdminQuestionBank.tsx` — the version's question list. Same pattern. Update `sort_order` for all rows in the version after drop.
- Keep keyboard fallback (dnd-kit supports it) and add `aria-label` on the handle.

---

## 3. Fix the broken preview URL

Root cause: `/nps/preview/:id` runs `select * from org_nps_surveys` while the visitor is unauthenticated, and the only policy on `org_nps_surveys` is `Org members manage own nps surveys` (authenticated). Result: no rows returned, page stays on "Loading…".

Fix:
- Use the same `get_public_survey` RPC for preview (accept either a slug or an id). For preview, require the caller to hit `/nps/preview/:id` — the RPC allows fetching by id without the `is_open` check but only returns non-sensitive fields (name, question, org name, logo, master_version, collect_team, collect_age_group). No responses are ever inserted in preview mode.
- Update `NpsResponse.tsx` to call the RPC instead of selecting the table directly, for both preview and public flows.

---

## Technical details

**New/changed routes (`src/App.tsx`)**
- Add `<Route path="/s/:slug" element={<NpsResponse />} />`.
- Keep `/nps/:token` and `/nps/preview/:id`.

**Migration outline**
```sql
ALTER TABLE public.org_nps_surveys
  ADD COLUMN public_slug text UNIQUE,
  ADD COLUMN is_open boolean NOT NULL DEFAULT false;

UPDATE public.org_nps_surveys
  SET public_slug = encode(gen_random_bytes(8), 'hex')
  WHERE public_slug IS NULL;

CREATE OR REPLACE FUNCTION public.get_public_survey(_slug text, _preview_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(row) FROM (
    SELECT s.id, s.name, s.question, s.master_version,
           s.collect_team, s.collect_age_group, s.is_open,
           s.followup_question_promoter, s.followup_question_passive, s.followup_question_detractor,
           s.org_id, o.name AS org_name, o.logo_url AS org_logo_url
    FROM public.org_nps_surveys s
    JOIN public.organizations o ON o.id = s.org_id
    WHERE (_slug IS NOT NULL AND s.public_slug = _slug AND s.is_open = true)
       OR (_preview_id IS NOT NULL AND s.id = _preview_id)
    LIMIT 1
  ) row;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_survey(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_survey_response(
  _slug text, _respondent_name text, _team_id uuid, _team_name_text text,
  _age_group text, _email text, _answers jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_survey record; v_response_id uuid; v_nps int;
BEGIN
  SELECT id, org_id, is_open, master_version INTO v_survey
  FROM public.org_nps_surveys WHERE public_slug = _slug;
  IF NOT FOUND OR NOT v_survey.is_open THEN RAISE EXCEPTION 'Survey not open'; END IF;
  -- derive NPS score from the rating_10 master answer if present
  SELECT (value->>'answer_value')::int INTO v_nps
  FROM jsonb_array_elements(_answers) value
  JOIN public.survey_master_questions q
    ON q.id = (value->>'question_id')::uuid
   AND q.version = v_survey.master_version
   AND q.question_type = 'rating_10'
  WHERE value->>'question_source' = 'master'
  LIMIT 1;
  INSERT INTO public.org_nps_responses (survey_id, respondent_name, team_id, team_name_text,
    age_group, respondent_email, score, responded_via)
  VALUES (v_survey.id, _respondent_name, _team_id, _team_name_text, _age_group, _email, v_nps, 'public_link')
  RETURNING id INTO v_response_id;
  INSERT INTO public.org_nps_answers (response_id, question_id, question_source, answer_value)
  SELECT v_response_id, (value->>'question_id')::uuid, value->>'question_source', value->>'answer_value'
  FROM jsonb_array_elements(_answers) value;
  RETURN v_response_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_public_survey_response(text, text, uuid, text, text, text, jsonb) TO anon, authenticated;
```
(Add `respondent_email` column to `org_nps_responses` in the same migration.)

**Files to change**
- Migration: new file under `supabase/migrations/`.
- `src/App.tsx` — add `/s/:slug` route.
- `src/pages/NpsResponse.tsx` — RPC-based load, submit via RPC, optional email field, handle `/s/:slug` vs `/nps/preview/:id`, closed state.
- `src/pages/retention/SurveyDetail.tsx` — replace send UI with share-link card + open/close toggle; swap up/down arrows for dnd-kit sortable.
- `src/pages/retention/Surveys.tsx` — remove send/audience references; add "Copy link" per row; drop status filter on `sent`.
- `src/pages/admin/retention/AdminQuestionBank.tsx` — dnd-kit sortable list, batch renumber on drop.
- New `src/components/retention/SortableQuestionList.tsx`.
- `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` if missing.

**Out of scope**
- Removing `nps-send-survey` edge function (leave for a later cleanup).
- Referral module (next round).
