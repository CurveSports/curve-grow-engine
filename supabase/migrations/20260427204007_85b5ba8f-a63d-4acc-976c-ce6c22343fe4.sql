-- Re-run with NULL-safe SELECT INTO (orgs may not have a contract yet)

CREATE TABLE public.org_engagement_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_value numeric(10,2) NOT NULL,
  contract_signed_date date,
  contract_notes text,
  installment_count integer DEFAULT 1,
  installment_amount numeric(10,2),
  installment_frequency text CHECK (installment_frequency IN ('monthly','quarterly','annual','custom')),
  total_paid_to_date numeric(10,2) NOT NULL DEFAULT 0,
  investment_fully_recovered boolean NOT NULL DEFAULT false,
  investment_recovered_at timestamptz,
  contract_status text NOT NULL DEFAULT 'active' CHECK (contract_status IN ('active','completed','paused','cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.org_engagement_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage engagement contracts" ON public.org_engagement_contracts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_engagement_contracts_updated BEFORE UPDATE ON public.org_engagement_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.org_contract_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.org_engagement_contracts(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount numeric(10,2) NOT NULL,
  due_date date,
  paid_date date,
  is_paid boolean NOT NULL DEFAULT false,
  payment_notes text,
  logged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contract_installments_contract ON public.org_contract_installments(contract_id);
ALTER TABLE public.org_contract_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage contract installments" ON public.org_contract_installments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_installments_updated BEFORE UPDATE ON public.org_contract_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.org_revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engine text NOT NULL CHECK (engine IN ('Pricing','Sponsorship','Apparel','Events','Add-Ons','Retention','Facility','Affiliate','Platform','Marketing','Other')),
  amount numeric(10,2) NOT NULL,
  description text NOT NULL,
  revenue_date date NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('auto','manual')),
  sponsorship_lead_id uuid REFERENCES public.sponsorship_leads(id) ON DELETE SET NULL,
  period_start date,
  period_end date,
  supporting_notes text,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid,
  verified_at timestamptz,
  logged_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_revenue_entries_org ON public.org_revenue_entries(org_id);
CREATE INDEX idx_revenue_entries_org_date ON public.org_revenue_entries(org_id, revenue_date DESC);
CREATE INDEX idx_revenue_entries_lead ON public.org_revenue_entries(sponsorship_lead_id);
ALTER TABLE public.org_revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage revenue entries" ON public.org_revenue_entries
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_revenue_entries_updated BEFORE UPDATE ON public.org_revenue_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.org_revenue_share_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  revenue_baseline numeric(12,2) NOT NULL DEFAULT 0,
  contract_value numeric(10,2) NOT NULL DEFAULT 0,
  total_paid_to_date numeric(10,2) NOT NULL DEFAULT 0,
  sponsorship_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  pricing_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  apparel_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  events_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  addon_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  retention_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  facility_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  affiliate_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  other_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  total_new_revenue numeric(12,2) NOT NULL DEFAULT 0,
  recovery_threshold numeric(10,2) NOT NULL DEFAULT 0,
  revenue_toward_recovery numeric(12,2) NOT NULL DEFAULT 0,
  investment_recovered_pct numeric(5,2) NOT NULL DEFAULT 0,
  investment_fully_recovered boolean NOT NULL DEFAULT false,
  revenue_above_threshold numeric(12,2) NOT NULL DEFAULT 0,
  curve_share_earned numeric(12,2) NOT NULL DEFAULT 0,
  total_invoiced numeric(12,2) NOT NULL DEFAULT 0,
  total_collected numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(12,2) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.org_revenue_share_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage revenue share summary" ON public.org_revenue_share_summary
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_rev_share_summary_updated BEFORE UPDATE ON public.org_revenue_share_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.org_revenue_share_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  new_revenue_this_period numeric(12,2) NOT NULL,
  recovery_threshold numeric(10,2) NOT NULL,
  revenue_toward_recovery_prior numeric(12,2) NOT NULL,
  revenue_toward_recovery_after numeric(12,2) NOT NULL,
  revenue_above_threshold_this_period numeric(12,2) NOT NULL,
  curve_share_this_period numeric(12,2) NOT NULL,
  total_new_revenue_to_date numeric(12,2) NOT NULL,
  total_curve_share_to_date numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','void')),
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  paid_amount numeric(12,2),
  payment_notes text,
  invoice_notes text,
  revenue_entry_ids jsonb,
  generated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rev_share_invoices_org ON public.org_revenue_share_invoices(org_id);
CREATE INDEX idx_rev_share_invoices_status ON public.org_revenue_share_invoices(status);
ALTER TABLE public.org_revenue_share_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage revenue share invoices" ON public.org_revenue_share_invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_rev_share_invoices_updated BEFORE UPDATE ON public.org_revenue_share_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.curve_portfolio_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_orgs_active integer NOT NULL DEFAULT 0,
  total_investment_deployed numeric(12,2) NOT NULL DEFAULT 0,
  total_investment_recovered numeric(12,2) NOT NULL DEFAULT 0,
  total_new_revenue_generated numeric(12,2) NOT NULL DEFAULT 0,
  total_curve_share_earned numeric(12,2) NOT NULL DEFAULT 0,
  total_invoiced numeric(12,2) NOT NULL DEFAULT 0,
  total_collected numeric(12,2) NOT NULL DEFAULT 0,
  total_outstanding numeric(12,2) NOT NULL DEFAULT 0,
  new_revenue_this_month numeric(12,2) NOT NULL DEFAULT 0,
  curve_share_this_month numeric(12,2) NOT NULL DEFAULT 0,
  new_revenue_this_quarter numeric(12,2) NOT NULL DEFAULT 0,
  curve_share_this_quarter numeric(12,2) NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.curve_portfolio_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage portfolio summary" ON public.curve_portfolio_summary
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.curve_portfolio_summary DEFAULT VALUES;

-- =====================================================================
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
  v_eng_sponsorship numeric(12,2) := 0;
  v_eng_pricing numeric(12,2) := 0;
  v_eng_apparel numeric(12,2) := 0;
  v_eng_events numeric(12,2) := 0;
  v_eng_addon numeric(12,2) := 0;
  v_eng_retention numeric(12,2) := 0;
  v_eng_facility numeric(12,2) := 0;
  v_eng_affiliate numeric(12,2) := 0;
  v_eng_other numeric(12,2) := 0;
BEGIN
  SELECT COALESCE(baseline_revenue, 0) INTO v_baseline
  FROM public.org_engagement_baselines WHERE org_id = p_org_id ORDER BY baseline_set_at DESC LIMIT 1;
  v_baseline := COALESCE(v_baseline, 0);

  SELECT COALESCE(contract_value, 0), COALESCE(total_paid_to_date, 0)
    INTO v_contract_value, v_total_paid
  FROM public.org_engagement_contracts WHERE org_id = p_org_id;
  v_contract_value := COALESCE(v_contract_value, 0);
  v_total_paid := COALESCE(v_total_paid, 0);

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Sponsorship'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Pricing'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Apparel'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Events'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Add-Ons'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Retention'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Facility'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine = 'Affiliate'), 0),
    COALESCE(SUM(amount) FILTER (WHERE engine NOT IN ('Sponsorship','Pricing','Apparel','Events','Add-Ons','Retention','Facility','Affiliate')), 0),
    COALESCE(SUM(amount), 0)
  INTO v_eng_sponsorship, v_eng_pricing, v_eng_apparel, v_eng_events, v_eng_addon,
       v_eng_retention, v_eng_facility, v_eng_affiliate, v_eng_other, v_total_new_revenue
  FROM public.org_revenue_entries WHERE org_id = p_org_id;

  v_recovery_threshold := v_contract_value;
  v_revenue_toward_recovery := LEAST(v_total_new_revenue, v_recovery_threshold);
  v_revenue_above_threshold := GREATEST(0, v_total_new_revenue - v_recovery_threshold);
  v_curve_share := v_revenue_above_threshold * 0.25;

  SELECT
    COALESCE(SUM(curve_share_this_period) FILTER (WHERE status IN ('sent','paid','overdue')), 0),
    COALESCE(SUM(COALESCE(paid_amount, curve_share_this_period)) FILTER (WHERE status = 'paid'), 0)
  INTO v_total_invoiced, v_total_collected
  FROM public.org_revenue_share_invoices WHERE org_id = p_org_id;

  INSERT INTO public.org_revenue_share_summary (
    org_id, revenue_baseline, contract_value, total_paid_to_date,
    sponsorship_new_revenue, pricing_new_revenue, apparel_new_revenue, events_new_revenue,
    addon_new_revenue, retention_new_revenue, facility_new_revenue, affiliate_new_revenue, other_new_revenue,
    total_new_revenue, recovery_threshold, revenue_toward_recovery,
    investment_recovered_pct, investment_fully_recovered,
    revenue_above_threshold, curve_share_earned,
    total_invoiced, total_collected, outstanding_balance,
    last_calculated_at
  ) VALUES (
    p_org_id, v_baseline, v_contract_value, v_total_paid,
    v_eng_sponsorship, v_eng_pricing, v_eng_apparel, v_eng_events,
    v_eng_addon, v_eng_retention, v_eng_facility, v_eng_affiliate, v_eng_other,
    v_total_new_revenue, v_recovery_threshold, v_revenue_toward_recovery,
    CASE WHEN v_recovery_threshold > 0 THEN ROUND((v_revenue_toward_recovery / v_recovery_threshold) * 100, 2) ELSE 0 END,
    v_recovery_threshold > 0 AND v_total_new_revenue >= v_recovery_threshold,
    v_revenue_above_threshold, v_curve_share,
    v_total_invoiced, v_total_collected, GREATEST(0, v_total_invoiced - v_total_collected),
    now()
  )
  ON CONFLICT (org_id) DO UPDATE SET
    revenue_baseline = EXCLUDED.revenue_baseline,
    contract_value = EXCLUDED.contract_value,
    total_paid_to_date = EXCLUDED.total_paid_to_date,
    sponsorship_new_revenue = EXCLUDED.sponsorship_new_revenue,
    pricing_new_revenue = EXCLUDED.pricing_new_revenue,
    apparel_new_revenue = EXCLUDED.apparel_new_revenue,
    events_new_revenue = EXCLUDED.events_new_revenue,
    addon_new_revenue = EXCLUDED.addon_new_revenue,
    retention_new_revenue = EXCLUDED.retention_new_revenue,
    facility_new_revenue = EXCLUDED.facility_new_revenue,
    affiliate_new_revenue = EXCLUDED.affiliate_new_revenue,
    other_new_revenue = EXCLUDED.other_new_revenue,
    total_new_revenue = EXCLUDED.total_new_revenue,
    recovery_threshold = EXCLUDED.recovery_threshold,
    revenue_toward_recovery = EXCLUDED.revenue_toward_recovery,
    investment_recovered_pct = EXCLUDED.investment_recovered_pct,
    investment_fully_recovered = EXCLUDED.investment_fully_recovered,
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
    last_updated = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_revenue_share_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_revenue_share(OLD.org_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalculate_revenue_share(NEW.org_id);
  IF TG_OP = 'UPDATE' AND OLD.org_id IS DISTINCT FROM NEW.org_id THEN
    PERFORM public.recalculate_revenue_share(OLD.org_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_revenue_entry_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.org_revenue_entries
FOR EACH ROW EXECUTE FUNCTION public.trigger_revenue_share_recalc();

CREATE OR REPLACE FUNCTION public.trigger_contract_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_revenue_share(OLD.org_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalculate_revenue_share(NEW.org_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_contract_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.org_engagement_contracts
FOR EACH ROW EXECUTE FUNCTION public.trigger_contract_recalc();

CREATE TRIGGER trg_invoice_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.org_revenue_share_invoices
FOR EACH ROW EXECUTE FUNCTION public.trigger_revenue_share_recalc();

CREATE OR REPLACE FUNCTION public.roll_up_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_total numeric(10,2);
BEGIN
  v_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.org_contract_installments WHERE contract_id = v_contract_id AND is_paid = true;
  UPDATE public.org_engagement_contracts SET total_paid_to_date = v_total WHERE id = v_contract_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_installments_rollup
AFTER INSERT OR UPDATE OR DELETE ON public.org_contract_installments
FOR EACH ROW EXECUTE FUNCTION public.roll_up_installments();

CREATE OR REPLACE FUNCTION public.sync_sponsorship_to_revenue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'closed_won' AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM 'closed_won') THEN
    INSERT INTO public.org_revenue_entries (
      org_id, engine, amount, description, revenue_date,
      entry_type, sponsorship_lead_id, is_verified, logged_by
    ) VALUES (
      NEW.org_id, 'Sponsorship', COALESCE(NEW.closed_value, 0),
      'Sponsorship deal closed — ' || COALESCE(NEW.business_name, 'Unknown'),
      COALESCE(NEW.closed_at::date, CURRENT_DATE),
      'auto', NEW.id, true, COALESCE(NEW.assigned_to, NEW.created_by)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.stage = 'closed_won' AND NEW.stage = 'closed_won'
     AND COALESCE(OLD.closed_value, 0) <> COALESCE(NEW.closed_value, 0) THEN
    UPDATE public.org_revenue_entries
    SET amount = COALESCE(NEW.closed_value, 0), updated_at = now()
    WHERE sponsorship_lead_id = NEW.id AND entry_type = 'auto';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.stage = 'closed_won' AND NEW.stage <> 'closed_won' THEN
    DELETE FROM public.org_revenue_entries
    WHERE sponsorship_lead_id = NEW.id AND entry_type = 'auto';
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sponsorship_revenue_sync
AFTER INSERT OR UPDATE ON public.sponsorship_leads
FOR EACH ROW EXECUTE FUNCTION public.sync_sponsorship_to_revenue();

INSERT INTO public.org_revenue_entries (
  org_id, engine, amount, description, revenue_date,
  entry_type, sponsorship_lead_id, is_verified, logged_by
)
SELECT
  sl.org_id, 'Sponsorship', COALESCE(sl.closed_value, 0),
  'Sponsorship deal closed — ' || COALESCE(sl.business_name, 'Unknown'),
  COALESCE(sl.closed_at::date, CURRENT_DATE),
  'auto', sl.id, true, COALESCE(sl.assigned_to, sl.created_by)
FROM public.sponsorship_leads sl
WHERE sl.stage = 'closed_won' AND sl.closed_value IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.org_revenue_entries re
    WHERE re.sponsorship_lead_id = sl.id AND re.entry_type = 'auto'
  );
