-- Add calculator_share to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'calculator_share';

-- Calculator scenarios table: stores best/worst case snapshots per calculator per org
CREATE TABLE public.org_calculator_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calculator_type text NOT NULL CHECK (calculator_type IN (
    'pricing_sensitivity',
    'sponsorship_value',
    'family_wallet_share',
    'roster_growth',
    'retention_impact'
  )),
  scenario_label text NOT NULL CHECK (scenario_label IN ('best_case', 'worst_case')),
  input_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  saved_by uuid NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, calculator_type, scenario_label)
);

CREATE INDEX idx_org_calculator_scenarios_org ON public.org_calculator_scenarios(org_id);

ALTER TABLE public.org_calculator_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage calculator scenarios"
ON public.org_calculator_scenarios
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own scenarios"
ON public.org_calculator_scenarios
FOR SELECT
TO authenticated
USING (org_id = public.current_org_id());

CREATE POLICY "org members insert own scenarios"
ON public.org_calculator_scenarios
FOR INSERT
TO authenticated
WITH CHECK (org_id = public.current_org_id() AND saved_by = auth.uid());

CREATE POLICY "org members update own scenarios"
ON public.org_calculator_scenarios
FOR UPDATE
TO authenticated
USING (org_id = public.current_org_id());

CREATE POLICY "org members delete own scenarios"
ON public.org_calculator_scenarios
FOR DELETE
TO authenticated
USING (org_id = public.current_org_id());

CREATE TRIGGER update_org_calculator_scenarios_updated_at
BEFORE UPDATE ON public.org_calculator_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();