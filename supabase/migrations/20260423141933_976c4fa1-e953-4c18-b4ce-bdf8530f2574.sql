
CREATE TABLE public.org_sponsorship_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  presenting_amount numeric NOT NULL,
  supporting_amount numeric NOT NULL,
  community_amount numeric NOT NULL,
  fmv_per_sponsor_mid numeric,
  source_inputs jsonb,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_sponsorship_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_sponsorship_tiers"
  ON public.org_sponsorship_tiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "org members view own sponsorship tiers"
  ON public.org_sponsorship_tiers
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE TRIGGER update_org_sponsorship_tiers_updated_at
  BEFORE UPDATE ON public.org_sponsorship_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
