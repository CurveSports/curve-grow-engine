ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS calculated_total_revenue numeric;