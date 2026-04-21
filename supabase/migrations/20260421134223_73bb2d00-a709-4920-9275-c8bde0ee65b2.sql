
ALTER TABLE public.organization_intake
  ADD COLUMN IF NOT EXISTS tournaments_revenue numeric,
  ADD COLUMN IF NOT EXISTS recruiting_events_revenue numeric,
  ADD COLUMN IF NOT EXISTS data_days_revenue numeric,
  ADD COLUMN IF NOT EXISTS other_events_revenue numeric,
  ADD COLUMN IF NOT EXISTS event_types_offered text[],
  ADD COLUMN IF NOT EXISTS lessons_revenue_gross numeric,
  ADD COLUMN IF NOT EXISTS lessons_revenue_model text,
  ADD COLUMN IF NOT EXISTS lessons_capture_pct numeric,
  ADD COLUMN IF NOT EXISTS annual_facility_rental_revenue numeric;

ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS event_revenue_mature_low numeric,
  ADD COLUMN IF NOT EXISTS event_revenue_mature_high numeric,
  ADD COLUMN IF NOT EXISTS facility_revenue_benchmark numeric,
  ADD COLUMN IF NOT EXISTS facility_revenue_gap numeric,
  ADD COLUMN IF NOT EXISTS facility_at_benchmark boolean,
  ADD COLUMN IF NOT EXISTS facility_opportunity_low numeric,
  ADD COLUMN IF NOT EXISTS facility_opportunity_high numeric,
  ADD COLUMN IF NOT EXISTS facility_score integer,
  ADD COLUMN IF NOT EXISTS lessons_revenue_org numeric;
