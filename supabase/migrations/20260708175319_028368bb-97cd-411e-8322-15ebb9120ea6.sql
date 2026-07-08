UPDATE public.derived_metrics dm
SET
  revenue_per_player = ROUND((dm.calculated_total_revenue::numeric / NULLIF(oi.total_players,0))::numeric, 2),
  non_dues_revenue_per_player = ROUND((dm.non_dues_revenue::numeric / NULLIF(oi.total_players,0))::numeric, 2),
  add_on_revenue_per_player = ROUND((dm.add_on_revenue::numeric / NULLIF(oi.total_players,0))::numeric, 2),
  hs_player_pct = ROUND((oi.hs_players::numeric / NULLIF(oi.total_players,0))::numeric, 4),
  revenue_gap = GREATEST(0, dm.revenue_benchmark - (dm.calculated_total_revenue::numeric / NULLIF(oi.total_players,0))),
  revenue_protected_per_pct = ROUND((0.01 * oi.total_players * (dm.calculated_total_revenue::numeric / NULLIF(oi.total_players,0)))::numeric, 2),
  event_revenue_target = oi.total_players * 500,
  facility_revenue_benchmark = oi.total_players * 2400,
  audience_score = LEAST(10, (oi.total_players * 4)::numeric / 1000),
  retention_referral_opportunity_low = ROUND((oi.total_players * 0.05 * (dm.calculated_total_revenue::numeric / NULLIF(oi.total_players,0)))::numeric, 2),
  retention_referral_opportunity_high = ROUND((oi.total_players * 0.10 * (dm.calculated_total_revenue::numeric / NULLIF(oi.total_players,0)))::numeric, 2),
  estimated_returning_players = ROUND(oi.total_players * (COALESCE(oi.retention_pct,0)::numeric/100)),
  estimated_churned_players = oi.total_players - ROUND(oi.total_players * (COALESCE(oi.retention_pct,0)::numeric/100))
FROM public.organization_intake oi
WHERE dm.org_id = oi.org_id
  AND dm.org_id = '28b70e67-ddf6-4190-85e9-a5710543715d'
  AND oi.total_players > 0;