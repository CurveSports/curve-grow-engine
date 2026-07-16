CREATE TABLE public.org_retention_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_name_options text[] NOT NULL DEFAULT '{}',
  age_group_options text[] NOT NULL DEFAULT ARRAY['8U','10U','12U','14U','16U','18U'],
  default_collect_team boolean NOT NULL DEFAULT true,
  default_collect_age_group boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_retention_settings TO authenticated;
GRANT SELECT ON public.org_retention_settings TO anon;
GRANT ALL ON public.org_retention_settings TO service_role;

ALTER TABLE public.org_retention_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage own retention settings"
  ON public.org_retention_settings
  FOR ALL
  TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can read retention settings for active surveys"
  ON public.org_retention_settings
  FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.org_nps_surveys s
    WHERE s.org_id = org_retention_settings.org_id
      AND s.status = 'sent'
  ));

CREATE TRIGGER update_org_retention_settings_updated_at
  BEFORE UPDATE ON public.org_retention_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
