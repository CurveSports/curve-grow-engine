
ALTER TABLE public.org_social_accounts RENAME COLUMN buffer_profile_id TO ayrshare_account_id;
ALTER TABLE public.org_social_accounts ADD COLUMN IF NOT EXISTS ayrshare_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.org_social_posts RENAME COLUMN buffer_update_id TO ayrshare_post_id;
ALTER TABLE public.org_social_posts ADD COLUMN IF NOT EXISTS engagement_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.org_social_posts ADD COLUMN IF NOT EXISTS platform_urls jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.org_social_posts ADD COLUMN IF NOT EXISTS last_metric_sync timestamptz;

CREATE TABLE IF NOT EXISTS public.org_ayrshare_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ayrshare_profile_key text NOT NULL,
  ayrshare_ref_id text,
  display_title text,
  is_mock boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);
CREATE INDEX IF NOT EXISTS idx_ayrshare_profiles_org ON public.org_ayrshare_profiles(org_id);

ALTER TABLE public.org_ayrshare_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ayrshare profiles" ON public.org_ayrshare_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members read ayrshare profile" ON public.org_ayrshare_profiles
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members write ayrshare profile" ON public.org_ayrshare_profiles
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER trg_ayrshare_profiles_updated
  BEFORE UPDATE ON public.org_ayrshare_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.system_integrations SET
  integration_key = 'ayrshare',
  display_name = 'Ayrshare (Social Posting)',
  env_var_names = ARRAY['AYRSHARE_API_KEY','AYRSHARE_JWT_PRIVATE_KEY'],
  what_unlocks_when_wired = 'Real Instagram/Facebook/TikTok/X posting and engagement metric sync via Ayrshare multi-tenant API',
  estimated_cost_monthly = 'Business plan ~$149/mo (covers up to 100 user profiles + unlimited posts). See ayrshare.com/pricing for current plans.',
  provider_docs_url = 'https://www.ayrshare.com/docs',
  setup_instructions = E'1. Sign up at ayrshare.com\n2. Select Business plan (multi-tenant) — required for managing multiple client profiles from one account\n3. Generate primary API key from dashboard\n4. Add AYRSHARE_API_KEY to Supabase Edge Function secrets\n5. The platform will automatically use Ayrshare on next call',
  notes = 'Ayrshare replaces Buffer for multi-tenant social posting. One Curve account, one API key, one profile per client org.',
  status = 'stubbed'
WHERE integration_key = 'buffer';
