ALTER TABLE public.org_digital_presence
  DROP COLUMN IF EXISTS brand_voice_notes,
  ADD COLUMN IF NOT EXISTS recent_post_urls jsonb NOT NULL DEFAULT '{}'::jsonb;