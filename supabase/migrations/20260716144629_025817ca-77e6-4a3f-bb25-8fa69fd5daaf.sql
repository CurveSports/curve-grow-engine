
-- =====================================================================
-- 1. Question type enum
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE public.survey_question_type AS ENUM ('rating_5', 'rating_10', 'yes_no_maybe', 'open_text');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. Curve-owned master question bank
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.survey_master_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  question_text text NOT NULL,
  question_type public.survey_question_type NOT NULL,
  category text NOT NULL DEFAULT 'overall',
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_survey_master_questions_version ON public.survey_master_questions(version, sort_order);

GRANT SELECT ON public.survey_master_questions TO anon, authenticated;
GRANT ALL ON public.survey_master_questions TO service_role;
ALTER TABLE public.survey_master_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active master questions" ON public.survey_master_questions;
CREATE POLICY "Anyone can read active master questions"
  ON public.survey_master_questions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage master questions" ON public.survey_master_questions;
CREATE POLICY "Admins manage master questions"
  ON public.survey_master_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_survey_master_questions_updated_at
  BEFORE UPDATE ON public.survey_master_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 3. Extend org_nps_surveys with season + master version + collectors
-- =====================================================================
ALTER TABLE public.org_nps_surveys
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.org_seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS master_version integer,
  ADD COLUMN IF NOT EXISTS collect_team boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS collect_age_group boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_nps_surveys_season ON public.org_nps_surveys(season_id);

-- =====================================================================
-- 4. Org-added custom questions per survey
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.org_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  survey_id uuid NOT NULL REFERENCES public.org_nps_surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type public.survey_question_type NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_survey_questions_survey ON public.org_survey_questions(survey_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_survey_questions TO authenticated;
GRANT SELECT ON public.org_survey_questions TO anon;
GRANT ALL ON public.org_survey_questions TO service_role;
ALTER TABLE public.org_survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read org questions for sent surveys" ON public.org_survey_questions;
CREATE POLICY "Public read org questions for sent surveys"
  ON public.org_survey_questions FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_nps_surveys s
    WHERE s.id = org_survey_questions.survey_id
      AND s.status IN ('sent', 'draft')
  ));

DROP POLICY IF EXISTS "Org members manage own survey questions" ON public.org_survey_questions;
CREATE POLICY "Org members manage own survey questions"
  ON public.org_survey_questions FOR ALL
  TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_org_survey_questions_updated_at
  BEFORE UPDATE ON public.org_survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock trigger: no edits once survey has responses (admins can override)
CREATE OR REPLACE FUNCTION public.enforce_org_survey_question_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_survey_id uuid;
  v_status text;
  v_response_count int;
BEGIN
  v_survey_id := COALESCE(NEW.survey_id, OLD.survey_id);
  SELECT status, COALESCE(response_count, 0) INTO v_status, v_response_count
    FROM public.org_nps_surveys WHERE id = v_survey_id;
  IF v_status = 'sent' AND v_response_count > 0
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'This survey has responses and its question set is locked. Create a new survey to change questions.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_org_survey_questions_lock ON public.org_survey_questions;
CREATE TRIGGER trg_org_survey_questions_lock
  BEFORE UPDATE OR DELETE ON public.org_survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_org_survey_question_lock();

-- =====================================================================
-- 5. Extend org_nps_responses with respondent identity
-- =====================================================================
ALTER TABLE public.org_nps_responses
  ADD COLUMN IF NOT EXISTS respondent_name text,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.org_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_name_text text,
  ADD COLUMN IF NOT EXISTS age_group text;

CREATE INDEX IF NOT EXISTS idx_nps_responses_team ON public.org_nps_responses(team_id);

-- Make score nullable so surveys can exist without the legacy 0-10 as their only measurement
ALTER TABLE public.org_nps_responses ALTER COLUMN score DROP NOT NULL;

-- =====================================================================
-- 6. Answers table (one row per response × question)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.org_nps_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.org_nps_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  question_source text NOT NULL CHECK (question_source IN ('master', 'org')),
  answer_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nps_answers_response ON public.org_nps_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_nps_answers_question ON public.org_nps_answers(question_id, question_source);

GRANT SELECT, INSERT ON public.org_nps_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_nps_answers TO authenticated;
GRANT ALL ON public.org_nps_answers TO service_role;
ALTER TABLE public.org_nps_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert answers for active surveys" ON public.org_nps_answers;
CREATE POLICY "Anyone can insert answers for active surveys"
  ON public.org_nps_answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.org_nps_responses r
    JOIN public.org_nps_surveys s ON s.id = r.survey_id
    WHERE r.id = org_nps_answers.response_id
      AND s.status IN ('sent', 'draft')
  ));

DROP POLICY IF EXISTS "Org members read own survey answers" ON public.org_nps_answers;
CREATE POLICY "Org members read own survey answers"
  ON public.org_nps_answers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.org_nps_responses r
    JOIN public.org_nps_surveys s ON s.id = r.survey_id
    WHERE r.id = org_nps_answers.response_id
      AND (s.org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

-- Also permit public response page to insert into org_nps_responses even without a contact link.
-- Existing insert policy already allows public inserts; ensure anon has grant.
GRANT INSERT ON public.org_nps_responses TO anon;

-- =====================================================================
-- 7. Benchmarks function
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_core_question_benchmarks(_org_id uuid)
RETURNS TABLE(
  question_id uuid,
  version integer,
  question_text text,
  category text,
  question_type public.survey_question_type,
  org_avg numeric,
  org_responses integer,
  network_avg numeric,
  network_responses integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    q.id,
    q.version,
    q.question_text,
    q.category,
    q.question_type,
    ROUND(AVG(NULLIF(a_org.answer_value, '')::numeric)::numeric, 2) AS org_avg,
    COUNT(a_org.id)::int AS org_responses,
    ROUND(AVG(NULLIF(a_all.answer_value, '')::numeric)::numeric, 2) AS network_avg,
    COUNT(a_all.id)::int AS network_responses
  FROM public.survey_master_questions q
  LEFT JOIN public.org_nps_answers a_all
    ON a_all.question_id = q.id AND a_all.question_source = 'master'
   AND q.question_type IN ('rating_5', 'rating_10')
  LEFT JOIN public.org_nps_responses r_all ON r_all.id = a_all.response_id
  LEFT JOIN public.org_nps_surveys s_all ON s_all.id = r_all.survey_id
  LEFT JOIN public.org_nps_answers a_org
    ON a_org.question_id = q.id AND a_org.question_source = 'master'
   AND q.question_type IN ('rating_5', 'rating_10')
   AND EXISTS (
     SELECT 1 FROM public.org_nps_responses r2
     JOIN public.org_nps_surveys s2 ON s2.id = r2.survey_id
     WHERE r2.id = a_org.response_id AND s2.org_id = _org_id
   )
  WHERE q.is_active = true
  GROUP BY q.id, q.version, q.question_text, q.category, q.question_type, q.sort_order
  ORDER BY q.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_core_question_benchmarks(uuid) TO authenticated;

-- =====================================================================
-- 8. Seed the 11 core Curve questions (version 1)
-- =====================================================================
INSERT INTO public.survey_master_questions (version, question_text, question_type, category, sort_order, is_required)
SELECT 1, q.question_text, q.question_type::public.survey_question_type, q.category, q.sort_order, q.is_required
FROM (VALUES
  ('Overall, how satisfied were you with your experience this season?', 'rating_5', 'overall', 10, true),
  ('How would you rate the quality of coaching and player development?', 'rating_5', 'coaching', 20, true),
  ('How would you rate communication (schedules, updates, expectations)?', 'rating_5', 'communication', 30, true),
  ('How would you rate the value for what you paid?', 'rating_5', 'value', 40, true),
  ('Did your player have fair, transparent playing time opportunities?', 'rating_5', 'fairness', 50, true),
  ('Were tournament/event selections aligned with your expectations?', 'rating_5', 'events', 60, true),
  ('How likely are you to return to this organization next season?', 'yes_no_maybe', 'retention', 70, true),
  ('How likely are you to recommend this organization to another family? (0–10)', 'rating_10', 'nps', 80, true),
  ('What did the organization do best this season?', 'open_text', 'qualitative', 90, false),
  ('What is one thing they could improve?', 'open_text', 'qualitative', 100, false),
  ('Anything else you would like to share? (optional)', 'open_text', 'qualitative', 110, false)
) AS q(question_text, question_type, category, sort_order, is_required)
WHERE NOT EXISTS (SELECT 1 FROM public.survey_master_questions WHERE version = 1);
