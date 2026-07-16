# Retention & Referral Incentives — End-of-Season Parent Survey (v1)

Create a new top-level area **Retention & Referral Incentives** that will house the end-of-season parent survey now and a referral incentives module next round. The existing NPS code under `/marketing/nps` is not live, so we'll move it out of Marketing into the new area and rebuild it into the full survey system described below (rather than build a parallel module).

## Navigation & routing

- New top-level nav item **Retention** in `AppShell` (visible to org users with marketing/retention access and to admins).
- New route tree:
  - `/retention` — landing hub with two cards: **Parent Surveys** (built now) and **Referral Incentives** (coming soon placeholder).
  - `/retention/surveys` — list of survey instances (replaces `/marketing/nps`).
  - `/retention/surveys/:id` — survey detail (questions, audience, responses, benchmarks).
  - `/retention/surveys/:id/preview` — preview.
- Admin: `/admin/retention/surveys` (cross-org overview + benchmarks, replaces `/admin/marketing/nps`) and `/admin/retention/question-bank` (master template editor).
- Old `/marketing/nps*` routes redirect to `/retention/surveys*` so any existing links keep working.
- Remove the NPS card from `MarketingHub.tsx`; add a "Retention & Referrals" pointer instead.
- Public response URL stays `/nps/r/:token` (unchanged; already tokenized, no login).

## What the user gets

**1. Curve-owned core question bank (cross-org benchmarks)**
- Admin editor at `/admin/retention/question-bank` to manage the locked master question set (the 11 questions in the spec).
- Versioned: editing a live question creates a new version; existing survey instances stay on the version they were created with. New instances default to the latest version.

**2. Org survey builder** (`/retention/surveys/:id`)
- **Questions** tab: core questions read-only, grouped by category, followed by an "Org-added questions" section where the org can add/reorder/remove custom questions (rating 1–5, rating 0–10 / NPS, yes/no/maybe, open text).
- Bind the survey to an `org_seasons` row (existing) and an audience segment (existing). Optional open/close dates.
- **Lock rule**: once a survey has `status = sent` and ≥1 response, master version + org custom questions freeze; further edits require a new instance for the next season.

**3. Public response page** (`/nps/r/:token`, extended)
- Mobile-first. Org logo/name at top (existing branding hook).
- Required respondent fields: **name**, **team** (dropdown from `org_teams` for that season, or free text if none), optional **age group**.
- Renders master questions first (grouped by category), then org-added, in `sort_order`.
- Rating types render as star row (1–5), numeric button row (0–10), yes/no/maybe pills, or textarea.

**4. Org reporting** (survey detail page)
- Response table with **team filter** and respondent name/team columns.
- Per-question aggregates: avg rating for scale questions, NPS % for the 0–10 question (%promoters − %detractors), yes/no/maybe distribution, open-text lists.
- CSV export widened to include all answers.

**5. Curve admin benchmarks** (`/admin/retention/surveys`)
- Per core question: org score vs. network average — the sellable insight, surfaced prominently.
- Cross-org table with response counts and NPS. Drill-down into individual responses (open text especially). Manual close/reopen for any instance.

**6. Distribution**
- Existing `nps-send-survey` edge function (Lovable Cloud email on `notify.os.curvesports.com`, audience segment) reused unchanged.

## Out of scope
- Referral module (next round; area is being scaffolded now).
- Reusing prior respondent identity across seasons.
- SMS distribution.
- Automatic season triggers.

## Technical notes

**Migration** — extend, don't replace. All new public tables get the standard CREATE → GRANT → ENABLE RLS → POLICY block. Anon grants only where the public form requires them.

New tables:
- `survey_master_questions` — Curve-owned core bank. Cols: `id`, `version`, `question_text`, `question_type` (enum `rating_5|rating_10|yes_no_maybe|open_text`), `category`, `sort_order`, `is_required`, `is_active`, timestamps. Admin-only write; `SELECT` for authenticated + anon.
- `org_survey_questions` — org-added. Cols: `id`, `org_id`, `survey_id` (fk → `org_nps_surveys`), `question_text`, `question_type`, `sort_order`, `is_required`, timestamps. RLS: org members manage own via `current_org_id()`; anon `SELECT` where parent survey is `sent`.
- `org_nps_answers` — one row per (response, question). Cols: `id`, `response_id` (fk → `org_nps_responses`), `question_id`, `question_source` (`master|org`), `answer_value` (text). Anon `INSERT` guarded to responses whose survey is active; org `SELECT` via join.

Additions to `org_nps_surveys`: `season_id` (fk → `org_seasons`, nullable), `master_version` (int), `collect_team` (bool default true), `collect_age_group` (bool default false). Reuse existing `scheduled_for`/`closed_at`.

Additions to `org_nps_responses`: `respondent_name`, `team_id` (fk → `org_teams`, nullable), `team_name_text` (free-text fallback), `age_group`.

Locking enforced by a `BEFORE UPDATE/DELETE` trigger on `org_survey_questions` that checks the parent survey's status + response count.

Benchmarks: a `security definer` function `get_core_question_benchmarks(_org_id)` returning org avg + network avg per master question id, called from both the org detail page and the admin overview.

Seed the 11 master questions at `version = 1`.

**Files to change:**
- New migration (tables, columns, trigger, benchmark function, seed).
- `src/lib/surveys.ts` (new) — types, question-type helpers, NPS calc, CSV builder.
- `src/components/AppShell.tsx` + `src/components/TopNav.tsx` — add Retention nav.
- `src/App.tsx` — new routes + redirects from `/marketing/nps*`.
- `src/pages/retention/RetentionHub.tsx` (new) — landing hub with Surveys card + Referrals "coming soon".
- `src/pages/retention/Surveys.tsx` (new; moves logic from `src/pages/marketing/NpsSurveys.tsx`).
- `src/pages/retention/SurveyDetail.tsx` (new; moves + extends `src/pages/marketing/NpsSurveyDetail.tsx` — adds Questions tab, season/team pickers, per-question aggregates, wider CSV).
- `src/pages/NpsResponse.tsx` — render master + org questions, name/team/age header, submit into `org_nps_answers`.
- `src/pages/admin/retention/AdminSurveysOverview.tsx` (new; moves from `AdminNpsOverview.tsx` + benchmark view + drill-down).
- `src/pages/admin/retention/AdminQuestionBank.tsx` (new) — master question editor with versioning.
- `src/pages/marketing/MarketingHub.tsx` — remove NPS card.
- Delete old `src/pages/marketing/Nps*.tsx` and `src/pages/admin/marketing/AdminNpsOverview.tsx` after routes redirect.
- `supabase/functions/nps-send-survey/index.ts` — no behavior change; sanity check against new columns.

## Open questions
None — extending existing NPS tables under a new top-level Retention area with `/retention/*` routes.
