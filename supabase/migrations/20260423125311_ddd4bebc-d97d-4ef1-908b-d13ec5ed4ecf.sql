-- Add columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_activated_revenue numeric(12,2),
  ADD COLUMN IF NOT EXISTS engagement_baseline_set boolean NOT NULL DEFAULT false;

-- Extend notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'sponsorship_closed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'sponsorship_stale';

-- ============================================
-- sponsorship_leads
-- ============================================
CREATE TABLE public.sponsorship_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  business_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  business_type text,
  city_state text,

  source text NOT NULL CHECK (source IN (
    'org_warm','org_cold','dsf_outreach','referral','inbound','other'
  )),
  source_other text,

  is_warm boolean NOT NULL DEFAULT false,
  warm_flagged_by_org boolean NOT NULL DEFAULT false,
  warm_flagged_by_dsf boolean NOT NULL DEFAULT false,
  warm_notes text,

  stage text NOT NULL DEFAULT 'new_lead' CHECK (stage IN (
    'new_lead','contacted','responded','meeting_scheduled',
    'proposal_sent','negotiating','closed_won','closed_lost'
  )),

  sponsorship_tier text CHECK (sponsorship_tier IN ('Presenting','Supporting','Community')),
  proposed_value numeric(10,2),
  closed_value numeric(10,2),

  assigned_to uuid,

  submitted_at timestamptz NOT NULL DEFAULT now(),
  last_stage_change_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,

  is_active boolean NOT NULL DEFAULT true,

  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsorship_leads_org ON public.sponsorship_leads(org_id);
CREATE INDEX idx_sponsorship_leads_stage ON public.sponsorship_leads(stage);
CREATE INDEX idx_sponsorship_leads_assigned ON public.sponsorship_leads(assigned_to);
CREATE INDEX idx_sponsorship_leads_warm ON public.sponsorship_leads(is_warm) WHERE is_warm = true;

ALTER TABLE public.sponsorship_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sponsorship_leads"
  ON public.sponsorship_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_sponsorship_leads_updated_at
  BEFORE UPDATE ON public.sponsorship_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-stamp stage change timestamps
CREATE OR REPLACE FUNCTION public.sponsorship_leads_stage_stamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.last_stage_change_at := now();
    IF NEW.stage IN ('closed_won','closed_lost') AND OLD.stage NOT IN ('closed_won','closed_lost') THEN
      NEW.closed_at := now();
    ELSIF NEW.stage NOT IN ('closed_won','closed_lost') THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sponsorship_leads_stage_stamps
  BEFORE UPDATE ON public.sponsorship_leads
  FOR EACH ROW EXECUTE FUNCTION public.sponsorship_leads_stage_stamps();

-- ============================================
-- sponsorship_lead_notes
-- ============================================
CREATE TABLE public.sponsorship_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.sponsorship_leads(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  is_client_visible boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsorship_lead_notes_lead ON public.sponsorship_lead_notes(lead_id);

ALTER TABLE public.sponsorship_lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sponsorship_lead_notes"
  ON public.sponsorship_lead_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "org members view client visible notes"
  ON public.sponsorship_lead_notes FOR SELECT TO authenticated
  USING (is_client_visible = true AND org_id = public.current_org_id());

-- ============================================
-- sponsorship_lead_stage_history
-- ============================================
CREATE TABLE public.sponsorship_lead_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.sponsorship_leads(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX idx_sponsorship_stage_history_lead ON public.sponsorship_lead_stage_history(lead_id);

ALTER TABLE public.sponsorship_lead_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sponsorship stage history"
  ON public.sponsorship_lead_stage_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "org members view own stage history"
  ON public.sponsorship_lead_stage_history FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

-- ============================================
-- org_engagement_baselines
-- ============================================
CREATE TABLE public.org_engagement_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  baseline_revenue numeric(12,2) NOT NULL,
  baseline_set_at timestamptz NOT NULL DEFAULT now(),
  baseline_set_by uuid NOT NULL,
  baseline_notes text,
  original_calculated_revenue numeric(12,2),
  was_manually_adjusted boolean NOT NULL DEFAULT false,
  adjustment_reason text
);

ALTER TABLE public.org_engagement_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage engagement baselines"
  ON public.org_engagement_baselines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================
-- org_sponsorship_summary
-- ============================================
CREATE TABLE public.org_sponsorship_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_leads integer NOT NULL DEFAULT 0,
  warm_leads integer NOT NULL DEFAULT 0,
  cold_leads integer NOT NULL DEFAULT 0,
  leads_contacted integer NOT NULL DEFAULT 0,
  leads_responded integer NOT NULL DEFAULT 0,
  meetings_scheduled integer NOT NULL DEFAULT 0,
  proposals_sent integer NOT NULL DEFAULT 0,
  deals_closed_won integer NOT NULL DEFAULT 0,
  deals_closed_lost integer NOT NULL DEFAULT 0,
  total_closed_value numeric(12,2) NOT NULL DEFAULT 0,
  curve_share_sponsorship numeric(12,2) NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_sponsorship_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage sponsorship summary"
  ON public.org_sponsorship_summary FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "org members view own sponsorship summary"
  ON public.org_sponsorship_summary FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

-- ============================================
-- Summary maintenance trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.recompute_sponsorship_summary(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.org_sponsorship_summary (org_id) VALUES (_org_id)
  ON CONFLICT (org_id) DO NOTHING;

  UPDATE public.org_sponsorship_summary s SET
    total_leads = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND is_active = true),0),
    warm_leads = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND is_active = true AND is_warm = true),0),
    cold_leads = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND is_active = true AND is_warm = false),0),
    leads_contacted = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage <> 'new_lead'),0),
    leads_responded = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage IN ('responded','meeting_scheduled','proposal_sent','negotiating','closed_won','closed_lost')),0),
    meetings_scheduled = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage IN ('meeting_scheduled','proposal_sent','negotiating','closed_won','closed_lost')),0),
    proposals_sent = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage IN ('proposal_sent','negotiating','closed_won','closed_lost')),0),
    deals_closed_won = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage = 'closed_won'),0),
    deals_closed_lost = COALESCE((SELECT count(*) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage = 'closed_lost'),0),
    total_closed_value = COALESCE((SELECT sum(closed_value) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage = 'closed_won'),0),
    curve_share_sponsorship = COALESCE((SELECT sum(closed_value) FROM public.sponsorship_leads WHERE org_id = _org_id AND stage = 'closed_won'),0) * 0.25,
    last_updated = now()
  WHERE s.org_id = _org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sponsorship_leads_summary_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_sponsorship_summary(OLD.org_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_sponsorship_summary(NEW.org_id);
    IF TG_OP = 'UPDATE' AND OLD.org_id IS DISTINCT FROM NEW.org_id THEN
      PERFORM public.recompute_sponsorship_summary(OLD.org_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_sponsorship_leads_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.sponsorship_leads
  FOR EACH ROW EXECUTE FUNCTION public.sponsorship_leads_summary_trigger();