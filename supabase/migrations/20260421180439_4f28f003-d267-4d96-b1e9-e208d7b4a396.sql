-- PART 6: Database schema updates for dues model restructure

-- Remove old fee/total fields from organization_intake
ALTER TABLE public.organization_intake
  DROP COLUMN IF EXISTS avg_hs_player_fee,
  DROP COLUMN IF EXISTS avg_youth_player_fee,
  DROP COLUMN IF EXISTS total_annual_revenue;

-- Add new dues model fields
ALTER TABLE public.organization_intake
  ADD COLUMN IF NOT EXISTS dues_model text,
  ADD COLUMN IF NOT EXISTS spring_youth_players integer,
  ADD COLUMN IF NOT EXISTS spring_youth_fee numeric,
  ADD COLUMN IF NOT EXISTS summer_hs_players integer,
  ADD COLUMN IF NOT EXISTS summer_hs_fee numeric,
  ADD COLUMN IF NOT EXISTS summer_youth_players integer,
  ADD COLUMN IF NOT EXISTS summer_youth_fee numeric,
  ADD COLUMN IF NOT EXISTS fall_hs_players integer,
  ADD COLUMN IF NOT EXISTS fall_hs_fee numeric,
  ADD COLUMN IF NOT EXISTS fall_youth_players integer,
  ADD COLUMN IF NOT EXISTS fall_youth_fee numeric,
  ADD COLUMN IF NOT EXISTS monthly_hs_fee numeric,
  ADD COLUMN IF NOT EXISTS monthly_youth_fee numeric,
  ADD COLUMN IF NOT EXISTS avg_months_active integer,
  ADD COLUMN IF NOT EXISTS tournament_fee_structure text,
  ADD COLUMN IF NOT EXISTS tournaments_per_hs_player text,
  ADD COLUMN IF NOT EXISTS tournaments_per_youth_player text,
  ADD COLUMN IF NOT EXISTS tournament_fee_per_player numeric,
  ADD COLUMN IF NOT EXISTS alacarte_annual_hs_spend numeric,
  ADD COLUMN IF NOT EXISTS alacarte_annual_youth_spend numeric,
  ADD COLUMN IF NOT EXISTS flat_annual_hs_fee numeric,
  ADD COLUMN IF NOT EXISTS flat_annual_youth_fee numeric,
  ADD COLUMN IF NOT EXISTS mixed_annual_hs_fee numeric,
  ADD COLUMN IF NOT EXISTS mixed_annual_youth_fee numeric,
  ADD COLUMN IF NOT EXISTS revenue_verification text,
  ADD COLUMN IF NOT EXISTS revenue_needs_review boolean DEFAULT false;

-- Add new derived_metrics fields
ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS annual_hs_equivalent numeric,
  ADD COLUMN IF NOT EXISTS annual_youth_equivalent numeric,
  ADD COLUMN IF NOT EXISTS blended_annual_fee_overall numeric,
  ADD COLUMN IF NOT EXISTS pricing_benchmark_hs_low numeric,
  ADD COLUMN IF NOT EXISTS pricing_benchmark_hs_high numeric,
  ADD COLUMN IF NOT EXISTS pricing_benchmark_youth_low numeric,
  ADD COLUMN IF NOT EXISTS pricing_benchmark_youth_high numeric,
  ADD COLUMN IF NOT EXISTS hs_fee_vs_market text,
  ADD COLUMN IF NOT EXISTS youth_fee_vs_market text;