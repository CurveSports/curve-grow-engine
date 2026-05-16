ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS composition_config jsonb;
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS generation_engine text;