ALTER TABLE public.organization_intake
  ADD COLUMN IF NOT EXISTS has_affiliates boolean,
  ADD COLUMN IF NOT EXISTS number_of_affiliates integer,
  ADD COLUMN IF NOT EXISTS affiliate_players_charged integer,
  ADD COLUMN IF NOT EXISTS affiliate_fee_per_player numeric,
  ADD COLUMN IF NOT EXISTS affiliate_apparel_revenue numeric,
  ADD COLUMN IF NOT EXISTS operates_multiple_brands boolean,
  ADD COLUMN IF NOT EXISTS number_of_brands integer,
  ADD COLUMN IF NOT EXISTS brand_descriptions text;

ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS affiliate_fee_revenue numeric,
  ADD COLUMN IF NOT EXISTS affiliate_total_revenue numeric,
  ADD COLUMN IF NOT EXISTS affiliate_revenue_per_affiliate numeric,
  ADD COLUMN IF NOT EXISTS affiliate_score integer,
  ADD COLUMN IF NOT EXISTS affiliate_fee_opportunity_low numeric,
  ADD COLUMN IF NOT EXISTS affiliate_fee_opportunity_high numeric;

-- Add 'Affiliate' to task_engine enum if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Affiliate' AND enumtypid = 'public.task_engine'::regtype) THEN
    ALTER TYPE public.task_engine ADD VALUE 'Affiliate';
  END IF;
END$$;