-- Designs: support new skin system + AI hero pipeline
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS skin_id TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_seed TEXT,
  ADD COLUMN IF NOT EXISTS style_modifier TEXT,
  ADD COLUMN IF NOT EXISTS field_values JSONB DEFAULT '{}'::jsonb;

-- Public storage bucket for AI-generated hero images & background-removed photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-assets', 'design-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to design-assets under their org folder
CREATE POLICY "Authenticated users can upload design assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'design-assets');

CREATE POLICY "Anyone can read design assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'design-assets');

CREATE POLICY "Authenticated users can update their design assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'design-assets');

CREATE POLICY "Authenticated users can delete their design assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'design-assets');