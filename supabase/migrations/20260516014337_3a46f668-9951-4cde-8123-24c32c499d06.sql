UPDATE public.organizations
SET sport = CASE
  WHEN sport ILIKE 'softball%' THEN 'softball'
  ELSE 'baseball'
END;

ALTER TABLE public.organizations
  ALTER COLUMN sport SET NOT NULL,
  ALTER COLUMN sport SET DEFAULT 'baseball';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_sport_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_sport_check
  CHECK (sport IN ('baseball','softball'));