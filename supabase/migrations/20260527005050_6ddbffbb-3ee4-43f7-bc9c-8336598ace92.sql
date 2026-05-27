
-- 1) Tighten SELECT policies on acquisition tables to require acquisitions module access
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'acquisition_budget_items',
    'acquisition_documents',
    'acquisition_communications',
    'acquisition_weekly_rollups',
    'acquisition_seller_sentiment'
  ])
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "acq module can read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.has_module_access(auth.uid(), ''acquisitions''))',
      t
    );
  END LOOP;
END$$;

-- 2) acquisition-documents storage: restrict reads to acquisitions module users
DROP POLICY IF EXISTS "acq docs read" ON storage.objects;
CREATE POLICY "acq docs read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'acquisition-documents'
  AND public.has_module_access(auth.uid(), 'acquisitions')
);

-- 3) brand-assets: require org folder ownership on write/update/delete
DROP POLICY IF EXISTS "brand_assets_write" ON storage.objects;
DROP POLICY IF EXISTS "brand_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "brand_assets_delete" ON storage.objects;

CREATE POLICY "brand_assets_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (public.current_org_id())::text
  )
);

CREATE POLICY "brand_assets_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (public.current_org_id())::text
  )
);

CREATE POLICY "brand_assets_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (public.current_org_id())::text
  )
);

-- 4) design-assets: require org folder ownership on update/delete
DROP POLICY IF EXISTS "Authenticated users can update their design assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their design assets" ON storage.objects;

CREATE POLICY "Authenticated users can update their design assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'design-assets'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (public.current_org_id())::text
  )
);

CREATE POLICY "Authenticated users can delete their design assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'design-assets'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (public.current_org_id())::text
  )
);

-- 5) design-renders: require org folder ownership on write
DROP POLICY IF EXISTS "design_renders_write" ON storage.objects;
CREATE POLICY "design_renders_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'design-renders'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (public.current_org_id())::text
  )
);
