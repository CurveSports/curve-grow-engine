-- PART 1: Update organization_intake apparel fields
ALTER TABLE public.organization_intake
  DROP COLUMN IF EXISTS apparel_revenue,
  DROP COLUMN IF EXISTS apparel_margin,
  DROP COLUMN IF EXISTS apparel_model;

ALTER TABLE public.organization_intake
  ADD COLUMN IF NOT EXISTS uniform_vendor text,
  ADD COLUMN IF NOT EXISTS uniform_package_cost text,
  ADD COLUMN IF NOT EXISTS uniform_markup text,
  ADD COLUMN IF NOT EXISTS hard_goods_purchased text,
  ADD COLUMN IF NOT EXISTS hard_goods_spend text,
  ADD COLUMN IF NOT EXISTS hard_goods_markup text,
  ADD COLUMN IF NOT EXISTS team_store_status text,
  ADD COLUMN IF NOT EXISTS addon_soft_goods_spend text;

-- PART 4: Update derived_metrics
ALTER TABLE public.derived_metrics
  DROP COLUMN IF EXISTS apparel_margin_pct,
  DROP COLUMN IF EXISTS apparel_profit,
  DROP COLUMN IF EXISTS apparel_revenue_per_player,
  DROP COLUMN IF EXISTS event_revenue_mature_low,
  DROP COLUMN IF EXISTS event_revenue_mature_high;

ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS audience_score numeric,
  ADD COLUMN IF NOT EXISTS asset_score numeric,
  ADD COLUMN IF NOT EXISTS fmv_per_sponsor_low numeric,
  ADD COLUMN IF NOT EXISTS fmv_per_sponsor_high numeric,
  ADD COLUMN IF NOT EXISTS uniform_margin_gap_per_player numeric,
  ADD COLUMN IF NOT EXISTS hard_goods_margin_per_player_low numeric,
  ADD COLUMN IF NOT EXISTS hard_goods_margin_per_player_high numeric,
  ADD COLUMN IF NOT EXISTS event_revenue_target numeric,
  ADD COLUMN IF NOT EXISTS retention_health text,
  ADD COLUMN IF NOT EXISTS retention_referral_opportunity_low numeric,
  ADD COLUMN IF NOT EXISTS retention_referral_opportunity_high numeric,
  ADD COLUMN IF NOT EXISTS revenue_protected_per_pct numeric;