ALTER TABLE public.org_branding
  ADD COLUMN IF NOT EXISTS logo_original_url text,
  ADD COLUMN IF NOT EXISTS logo_quality text,
  ADD COLUMN IF NOT EXISTS logo_processing_status text DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS logo_processing_error text,
  ADD COLUMN IF NOT EXISTS logo_width integer,
  ADD COLUMN IF NOT EXISTS logo_height integer,
  ADD COLUMN IF NOT EXISTS logo_format text;