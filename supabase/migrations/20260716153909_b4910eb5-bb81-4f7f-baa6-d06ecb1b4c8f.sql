
ALTER TABLE public.org_nps_surveys
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT false;

UPDATE public.org_nps_surveys
  SET public_slug = encode(gen_random_bytes(8), 'hex')
  WHERE public_slug IS NULL;

ALTER TABLE public.org_nps_surveys
  ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS org_nps_surveys_public_slug_key ON public.org_nps_surveys(public_slug);

ALTER TABLE public.org_nps_responses
  ADD COLUMN IF NOT EXISTS respondent_email text;

CREATE OR REPLACE FUNCTION public.get_public_survey(_slug text, _preview_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(row) FROM (
    SELECT s.id, s.name, s.question, s.master_version,
           s.collect_team, s.collect_age_group, s.is_open, s.public_slug,
           s.followup_question_promoter, s.followup_question_passive, s.followup_question_detractor,
           s.org_id, o.name AS org_name, b.logo_url AS org_logo_url
    FROM public.org_nps_surveys s
    JOIN public.organizations o ON o.id = s.org_id
    LEFT JOIN public.org_branding b ON b.org_id = s.org_id
    WHERE (_slug IS NOT NULL AND s.public_slug = _slug AND s.is_open = true)
       OR (_preview_id IS NOT NULL AND s.id = _preview_id)
    LIMIT 1
  ) row;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_survey(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_survey_response(
  _slug text,
  _respondent_name text,
  _team_id uuid,
  _team_name_text text,
  _age_group text,
  _email text,
  _answers jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey_id uuid;
  v_master_version int;
  v_is_open boolean;
  v_response_id uuid;
  v_nps int;
BEGIN
  SELECT id, master_version, is_open
    INTO v_survey_id, v_master_version, v_is_open
  FROM public.org_nps_surveys
  WHERE public_slug = _slug;

  IF v_survey_id IS NULL OR NOT v_is_open THEN
    RAISE EXCEPTION 'Survey not open';
  END IF;

  IF _respondent_name IS NULL OR btrim(_respondent_name) = '' THEN
    RAISE EXCEPTION 'Name required';
  END IF;

  SELECT (elem->>'answer_value')::int INTO v_nps
  FROM jsonb_array_elements(COALESCE(_answers, '[]'::jsonb)) elem
  JOIN public.survey_master_questions q
    ON q.id = (elem->>'question_id')::uuid
   AND q.version = v_master_version
   AND q.question_type = 'rating_10'
  WHERE elem->>'question_source' = 'master'
  LIMIT 1;

  INSERT INTO public.org_nps_responses (
    survey_id, respondent_name, team_id, team_name_text,
    age_group, respondent_email, score, responded_via
  ) VALUES (
    v_survey_id, btrim(_respondent_name), _team_id, NULLIF(btrim(COALESCE(_team_name_text,'')), ''),
    NULLIF(btrim(COALESCE(_age_group,'')), ''), NULLIF(btrim(COALESCE(_email,'')), ''),
    v_nps, 'public_link'
  )
  RETURNING id INTO v_response_id;

  INSERT INTO public.org_nps_answers (response_id, question_id, question_source, answer_value)
  SELECT v_response_id,
         (elem->>'question_id')::uuid,
         elem->>'question_source',
         elem->>'answer_value'
  FROM jsonb_array_elements(COALESCE(_answers, '[]'::jsonb)) elem
  WHERE COALESCE(elem->>'answer_value','') <> '';

  RETURN v_response_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_survey_response(text, text, uuid, text, text, text, jsonb) TO anon, authenticated;
