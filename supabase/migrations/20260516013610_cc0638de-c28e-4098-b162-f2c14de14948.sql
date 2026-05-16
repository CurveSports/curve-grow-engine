-- 1. Sport on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sport text;

COMMENT ON COLUMN public.organizations.sport IS
  'Primary sport (baseball, softball, basketball, soccer, etc). Fed into Stability AI prompts so generated imagery matches the org.';

-- 2. hero_source on design templates
ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS hero_source text NOT NULL DEFAULT 'ai_background';

ALTER TABLE public.design_templates
  DROP CONSTRAINT IF EXISTS design_templates_hero_source_check;

ALTER TABLE public.design_templates
  ADD CONSTRAINT design_templates_hero_source_check
  CHECK (hero_source IN ('ai_background', 'user_photo', 'hybrid'));

COMMENT ON COLUMN public.design_templates.hero_source IS
  'ai_background = Stability generates full bg; user_photo = solid brand canvas + uploaded photo hero; hybrid = AI environment + cutout of uploaded photo composited on top';

-- 3. Retag known photo-driven templates
UPDATE public.design_templates SET hero_source = 'hybrid'
  WHERE name IN ('Commit Announcement', 'Commit Story', 'Senior Night', 'Roster Reveal');

UPDATE public.design_templates SET hero_source = 'user_photo'
  WHERE name IN ('Coach Spotlight', 'Sponsor Spotlight', 'Sponsor Recognition Header', 'Sponsor Story');