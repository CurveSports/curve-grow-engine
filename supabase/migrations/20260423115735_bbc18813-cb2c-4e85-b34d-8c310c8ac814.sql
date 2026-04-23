
-- Org branding table for white-labeling
CREATE TABLE IF NOT EXISTS public.org_branding (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_url text,
  primary_hsl text,
  accent_hsl text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.org_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_branding"
  ON public.org_branding FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own branding"
  ON public.org_branding FOR SELECT
  TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY "org primary updates own branding"
  ON public.org_branding FOR UPDATE
  TO authenticated
  USING (public.is_org_primary(auth.uid(), org_id))
  WITH CHECK (public.is_org_primary(auth.uid(), org_id));

CREATE POLICY "org primary inserts own branding"
  ON public.org_branding FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_primary(auth.uid(), org_id));

CREATE TRIGGER update_org_branding_updated_at
  BEFORE UPDATE ON public.org_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for org logos (public read for use in app/exports)
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read org logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

CREATE POLICY "Org primary uploads own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_org_primary(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "Org primary updates own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_org_primary(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );

CREATE POLICY "Org primary deletes own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_org_primary(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
  );
