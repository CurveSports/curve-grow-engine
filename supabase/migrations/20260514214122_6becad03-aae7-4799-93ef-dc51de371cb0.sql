
ALTER TABLE public.org_brand_assets DROP CONSTRAINT IF EXISTS org_brand_assets_media_type_check;
ALTER TABLE public.org_brand_assets ADD CONSTRAINT org_brand_assets_media_type_check
  CHECK (media_type IN ('image','video','text','document'));

ALTER TABLE public.org_brand_assets ALTER COLUMN url DROP NOT NULL;

ALTER TABLE public.org_brand_assets ADD COLUMN IF NOT EXISTS ai_tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.org_brand_assets ADD COLUMN IF NOT EXISTS body_text text;
ALTER TABLE public.org_brand_assets ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.org_brand_assets ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE public.org_brand_assets ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS idx_brand_assets_asset_type ON public.org_brand_assets(org_id, asset_type) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_brand_assets_tags_gin ON public.org_brand_assets USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_brand_assets_aitags_gin ON public.org_brand_assets USING gin (ai_tags);

CREATE TABLE IF NOT EXISTS public.org_content_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_asset_id uuid REFERENCES public.org_brand_assets(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_collections_org ON public.org_content_collections(org_id);
ALTER TABLE public.org_content_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage content collections" ON public.org_content_collections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org members read content collections" ON public.org_content_collections
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org members write content collections" ON public.org_content_collections
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER trg_content_collections_updated
  BEFORE UPDATE ON public.org_content_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.org_content_collection_items (
  collection_id uuid NOT NULL REFERENCES public.org_content_collections(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.org_brand_assets(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, asset_id)
);
ALTER TABLE public.org_content_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage collection items" ON public.org_content_collection_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_content_collections c
    WHERE c.id = collection_id
      AND (c.org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.org_content_collections c
    WHERE c.id = collection_id
      AND (c.org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'::app_role))));
