GRANT SELECT ON public.event_surveys TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.event_survey_responses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_surveys TO authenticated;