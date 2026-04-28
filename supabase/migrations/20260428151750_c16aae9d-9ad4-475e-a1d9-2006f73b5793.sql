CREATE OR REPLACE FUNCTION public.recalculate_revenue_share(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_baseline numeric(12,2) := 0;
  v_contract_value numeric(10,2) := 0;
  v_total_paid numeric(10,2) := 0;
  v_recovery_threshold numeric(10,2) := 0;
  v_total_new_revenue numeric(12,2) := 0;
  v_revenue_toward_recovery numeric(12,2) := 0;
  v_revenue_above_threshold numeric(12,2) := 0;
  v_curve_share numeric(12,2) := 0;
  v_total_invoiced numeric(12,2) := 0;
  v_total_collected numeric(12,2) := 0;
  v_outstanding numeric(12,2) := 0;
BEGIN
  SELECT COALESCE(SUM(contract_value), 0), COALESCE(SUM(total_paid_to_date), 0)
    INTO v_contract_value, v_total_paid
  FROM public.org_engagement_contracts
  WHERE org_id = p_org_id AND contract_status = 'active';

  v_recovery_threshold := GREATEST(v_contract_value, 0);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_new_revenue
  FROM public.org_revenue_entries WHERE org_id = p_org_id;

  v_revenue_toward_recovery := LEAST(v_total_new_revenue, v_recovery_threshold);
  v_revenue_above_threshold := GREATEST(v_total_new_revenue - v_recovery_threshold, 0);
  v_curve_share := ROUND(v_revenue_above_threshold * 0.25, 2);

  SELECT COALESCE(SUM(curve_share_this_period), 0),
         COALESCE(SUM(CASE WHEN status = 'paid' THEN curve_share_this_period ELSE 0 END), 0)
    INTO v_total_invoiced, v_total_collected
  FROM public.org_revenue_share_invoices WHERE org_id = p_org_id;

  v_outstanding := GREATEST(v_total_invoiced - v_total_collected, 0);

  INSERT INTO public.org_revenue_share_summary (
    org_id, baseline_total, contract_value, total_paid_to_contract,
    recovery_threshold, total_new_revenue, revenue_toward_recovery,
    revenue_above_threshold, curve_share_earned, total_invoiced,
    total_collected, outstanding_balance, last_calculated_at
  ) VALUES (
    p_org_id, v_baseline, v_contract_value, v_total_paid,
    v_recovery_threshold, v_total_new_revenue, v_revenue_toward_recovery,
    v_revenue_above_threshold, v_curve_share, v_total_invoiced,
    v_total_collected, v_outstanding, now()
  )
  ON CONFLICT (org_id) DO UPDATE SET
    contract_value = EXCLUDED.contract_value,
    total_paid_to_contract = EXCLUDED.total_paid_to_contract,
    recovery_threshold = EXCLUDED.recovery_threshold,
    total_new_revenue = EXCLUDED.total_new_revenue,
    revenue_toward_recovery = EXCLUDED.revenue_toward_recovery,
    revenue_above_threshold = EXCLUDED.revenue_above_threshold,
    curve_share_earned = EXCLUDED.curve_share_earned,
    total_invoiced = EXCLUDED.total_invoiced,
    total_collected = EXCLUDED.total_collected,
    outstanding_balance = EXCLUDED.outstanding_balance,
    last_calculated_at = now();

  IF v_recovery_threshold > 0 AND v_total_new_revenue >= v_recovery_threshold THEN
    UPDATE public.org_engagement_contracts
    SET investment_fully_recovered = true,
        investment_recovered_at = COALESCE(investment_recovered_at, now())
    WHERE org_id = p_org_id AND investment_fully_recovered = false;
  END IF;

  UPDATE public.curve_portfolio_summary SET
    total_orgs_active = (SELECT count(*) FROM public.org_engagement_contracts WHERE contract_status = 'active'),
    total_investment_deployed = (SELECT COALESCE(SUM(contract_value), 0) FROM public.org_engagement_contracts WHERE contract_status = 'active'),
    total_investment_recovered = (SELECT COALESCE(SUM(revenue_toward_recovery), 0) FROM public.org_revenue_share_summary),
    total_new_revenue_generated = (SELECT COALESCE(SUM(total_new_revenue), 0) FROM public.org_revenue_share_summary),
    total_curve_share_earned = (SELECT COALESCE(SUM(curve_share_earned), 0) FROM public.org_revenue_share_summary),
    total_invoiced = (SELECT COALESCE(SUM(total_invoiced), 0) FROM public.org_revenue_share_summary),
    total_collected = (SELECT COALESCE(SUM(total_collected), 0) FROM public.org_revenue_share_summary),
    total_outstanding = (SELECT COALESCE(SUM(outstanding_balance), 0) FROM public.org_revenue_share_summary),
    new_revenue_this_month = (SELECT COALESCE(SUM(amount), 0) FROM public.org_revenue_entries WHERE revenue_date >= date_trunc('month', CURRENT_DATE)),
    new_revenue_this_quarter = (SELECT COALESCE(SUM(amount), 0) FROM public.org_revenue_entries WHERE revenue_date >= date_trunc('quarter', CURRENT_DATE)),
    curve_share_this_month = (SELECT COALESCE(SUM(curve_share_this_period), 0) FROM public.org_revenue_share_invoices WHERE status = 'paid' AND paid_at >= date_trunc('month', CURRENT_DATE)),
    curve_share_this_quarter = (SELECT COALESCE(SUM(curve_share_this_period), 0) FROM public.org_revenue_share_invoices WHERE status = 'paid' AND paid_at >= date_trunc('quarter', CURRENT_DATE)),
    last_updated = now()
  WHERE id IS NOT NULL;
END;
$$;