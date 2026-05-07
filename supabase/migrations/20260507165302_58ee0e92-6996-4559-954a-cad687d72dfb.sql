ALTER TABLE public.acquisition_task_templates
ADD COLUMN IF NOT EXISTS state_filter text DEFAULT NULL;

UPDATE public.acquisition_task_templates
SET state_filter = 'Florida'
WHERE title ILIKE '%FDLE%' AND state_filter IS NULL;

-- Migrate any rows that used the old florida_only flag
UPDATE public.acquisition_task_templates
SET state_filter = 'Florida'
WHERE florida_only = true AND state_filter IS NULL;

INSERT INTO public.acquisition_task_templates (
  title, description, workstream, phase,
  priority, lead_role, suggested_days_from_close,
  is_system_template, state_filter, display_order
)
SELECT
  'Paid family medical leave — state reporting',
  'Minnesota requires employer reporting for paid family medical leave. Confirm reporting obligations and establish compliance process with Sikich.',
  'compliance', 'first_60',
  '1st', 'Finance Lead', 45,
  true, 'Minnesota', 100
WHERE NOT EXISTS (
  SELECT 1 FROM public.acquisition_task_templates
  WHERE title = 'Paid family medical leave — state reporting'
    AND state_filter = 'Minnesota'
);