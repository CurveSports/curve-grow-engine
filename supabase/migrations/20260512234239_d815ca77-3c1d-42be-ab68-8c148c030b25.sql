-- Email A/B tests
CREATE TABLE public.org_email_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  email_id uuid,
  campaign_asset_id uuid,
  variant_a_subject text NOT NULL,
  variant_a_preview text,
  variant_b_subject text NOT NULL,
  variant_b_preview text,
  split_pct integer NOT NULL DEFAULT 50 CHECK (split_pct BETWEEN 10 AND 90),
  winner_metric text NOT NULL DEFAULT 'open_rate' CHECK (winner_metric IN ('open_rate','click_rate','reply_rate')),
  winner_variant text CHECK (winner_variant IN ('a','b')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','complete','cancelled')),
  test_window_hours integer NOT NULL DEFAULT 4,
  variant_a_sent integer NOT NULL DEFAULT 0,
  variant_a_opens integer NOT NULL DEFAULT 0,
  variant_a_clicks integer NOT NULL DEFAULT 0,
  variant_b_sent integer NOT NULL DEFAULT 0,
  variant_b_opens integer NOT NULL DEFAULT 0,
  variant_b_clicks integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.org_email_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read ab tests" ON public.org_email_ab_tests FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write ab tests" ON public.org_email_ab_tests FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_ab_tests_updated BEFORE UPDATE ON public.org_email_ab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Send-time recommendations
CREATE TABLE public.org_send_time_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  audience_segment text,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour_of_day integer NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  open_rate numeric(5,2) NOT NULL DEFAULT 0,
  click_rate numeric(5,2) NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  is_recommended boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_send_time_org ON public.org_send_time_recommendations(org_id, is_recommended);
ALTER TABLE public.org_send_time_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read send times" ON public.org_send_time_recommendations FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members manage send times" ON public.org_send_time_recommendations FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

-- SMS companion drafts
CREATE TABLE public.org_sms_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  source_email_id uuid,
  campaign_asset_id uuid,
  body text NOT NULL CHECK (char_length(body) <= 320),
  shortlink_id uuid,
  segment_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','queued','sent','cancelled')),
  estimated_recipients integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.org_sms_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read sms drafts" ON public.org_sms_drafts FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write sms drafts" ON public.org_sms_drafts FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_sms_drafts_updated BEFORE UPDATE ON public.org_sms_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Social accounts
CREATE TABLE public.org_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('instagram','facebook','x','linkedin','tiktok','youtube')),
  handle text NOT NULL,
  display_name text,
  external_id text,
  buffer_profile_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','error','disconnected')),
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider, handle)
);
ALTER TABLE public.org_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read social accounts" ON public.org_social_accounts FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write social accounts" ON public.org_social_accounts FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_social_accounts_updated BEFORE UPDATE ON public.org_social_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Social posts
CREATE TABLE public.org_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  social_account_id uuid NOT NULL REFERENCES public.org_social_accounts(id) ON DELETE CASCADE,
  campaign_asset_id uuid,
  design_id uuid,
  body text NOT NULL,
  media_urls text[] NOT NULL DEFAULT '{}',
  shortlink_id uuid,
  scheduled_for timestamptz,
  posted_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted','failed','cancelled')),
  external_post_id text,
  buffer_update_id text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  shares_count integer NOT NULL DEFAULT 0,
  impressions_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_posts_org_status ON public.org_social_posts(org_id, status, scheduled_for);
ALTER TABLE public.org_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read social posts" ON public.org_social_posts FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write social posts" ON public.org_social_posts FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_social_posts_updated BEFORE UPDATE ON public.org_social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();