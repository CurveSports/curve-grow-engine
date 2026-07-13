
ALTER TABLE public.event_surveys
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_location text,
  ADD COLUMN IF NOT EXISTS w9_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS role_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS role_options text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.event_survey_responses
  ADD COLUMN IF NOT EXISTS role text;

CREATE INDEX IF NOT EXISTS event_survey_responses_survey_role_idx
  ON public.event_survey_responses(survey_id, role);
