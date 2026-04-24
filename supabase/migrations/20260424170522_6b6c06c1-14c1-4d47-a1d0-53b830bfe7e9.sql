-- Drop and recreate storage policies for org-logos with safer admin handling and proper upsert support
DROP POLICY IF EXISTS "Org primary uploads own logo" ON storage.objects;
DROP POLICY IF EXISTS "Org primary updates own logo" ON storage.objects;
DROP POLICY IF EXISTS "Org primary deletes own logo" ON storage.objects;

-- INSERT: admin OR org primary of the folder uuid
CREATE POLICY "Org primary uploads own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND public.is_org_primary(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- UPDATE: needs both USING (which row can be touched) and WITH CHECK (resulting row),
-- so upsert: true works when overwriting an existing object.
CREATE POLICY "Org primary updates own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND public.is_org_primary(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND public.is_org_primary(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY "Org primary deletes own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND public.is_org_primary(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- Also add explicit admin INSERT policy on org_branding (the ALL policy already covers,
-- but make it explicit for clarity, and add an org-primary-friendly INSERT that's bulletproof).
DROP POLICY IF EXISTS "org primary inserts own branding" ON public.org_branding;
CREATE POLICY "org primary inserts own branding"
  ON public.org_branding FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_org_primary(auth.uid(), org_id)
  );

DROP POLICY IF EXISTS "org primary updates own branding" ON public.org_branding;
CREATE POLICY "org primary updates own branding"
  ON public.org_branding FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_org_primary(auth.uid(), org_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_org_primary(auth.uid(), org_id)
  );