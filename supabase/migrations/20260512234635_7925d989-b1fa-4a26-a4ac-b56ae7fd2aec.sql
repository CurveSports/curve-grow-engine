CREATE TABLE public.system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category text,
  env_var_names text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'not_built' CHECK (status IN ('live','stubbed','not_built','broken')),
  last_health_check_at timestamptz,
  last_health_check_result jsonb,
  what_works_when_stubbed text,
  what_unlocks_when_wired text,
  setup_instructions text,
  estimated_cost_monthly text,
  activate_when text,
  provider_docs_url text,
  notes text,
  used_by_features text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_integrations_status ON public.system_integrations(status);
CREATE INDEX idx_system_integrations_category ON public.system_integrations(category);

ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curve admins read integrations" ON public.system_integrations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "curve admins write integrations" ON public.system_integrations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_system_integrations_updated
  BEFORE UPDATE ON public.system_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_integrations
  (integration_key, display_name, category, env_var_names, status,
   what_works_when_stubbed, what_unlocks_when_wired, setup_instructions,
   estimated_cost_monthly, activate_when, provider_docs_url, used_by_features, sort_order)
VALUES
  ('anthropic', 'Anthropic API', 'ai', ARRAY['ANTHROPIC_API_KEY'], 'live',
   NULL,
   'AI design generation, communication assistant, audits, transcript processing, all AI features',
   NULL,
   '~$0.01-0.05 per generation (variable)', NULL,
   'https://docs.anthropic.com',
   ARRAY['generate-design','refine-design','generate-variations','AI Communication Assistant','Digital Audit','Meeting Transcript Processing','SMS Companion Generation'], 10),

  ('resend', 'Resend', 'email', ARRAY['RESEND_API_KEY'], 'live',
   NULL,
   'Email sending, domain verification, webhook event tracking',
   NULL,
   'Free up to 3,000 emails/month, then $20/mo for 50K', NULL,
   'https://resend.com/docs',
   ARRAY['send-email','register-domain','verify-domain','resend-webhook'], 20),

  ('browserless', 'Browserless', 'rendering', ARRAY['BROWSERLESS_API_TOKEN'], 'stubbed',
   'HTML preview in browser, all UI flows, design generation, AI refinement',
   'PNG/JPEG/PDF file exports, social posting (Buffer needs PNG to upload)',
   E'1. Sign up at browserless.io\n2. Pick Cloud plan\n3. Copy API token\n4. Add BROWSERLESS_API_TOKEN to Supabase Edge Function secrets\n5. Provider abstraction auto-switches on next call',
   '$50/mo for 10K renders (cheapest tier), $200/mo for 100K',
   'First real org wants to export designs OR ready to test live social posting',
   'https://docs.browserless.io',
   ARRAY['render-design','post-to-social (indirectly)'], 30),

  ('postmark_spam', 'Postmark Spam Check', 'email', ARRAY['POSTMARK_API_TOKEN'], 'stubbed',
   'Spam check UI shows mock score, email composer flow complete',
   'Real spam score detection on all emails before send',
   'Public endpoint at spamcheck.postmarkapp.com does not require auth. If using authenticated endpoint: sign up at postmarkapp.com, get token, add POSTMARK_API_TOKEN to Supabase secrets.',
   'Free',
   'Before sending real production emails (very soon)',
   'https://postmarkapp.com/spam-check',
   ARRAY['check-spam-score'], 40),

  ('buffer', 'Buffer', 'social', ARRAY['BUFFER_CLIENT_ID','BUFFER_CLIENT_SECRET','BUFFER_REDIRECT_URI'], 'stubbed',
   'Social account UI, post composer, calendar display, mock connection states',
   'Real Instagram/Facebook/TikTok/X posting and engagement metric sync',
   E'1. Go to buffer.com/developers\n2. Create new app\n3. Set redirect URI to https://[curveos-domain]/api/buffer/callback\n4. Get client_id and client_secret\n5. Add BUFFER_CLIENT_ID, BUFFER_CLIENT_SECRET, BUFFER_REDIRECT_URI to Supabase secrets\n6. Test OAuth flow with a test Buffer account',
   'Buffer free tier or $6/channel/month for full features. Each org connects their own account.',
   'First real org ready to schedule social posts',
   'https://buffer.com/developers/api',
   ARRAY['connect-social-account','post-to-social','sync-social-metrics'], 50),

  ('twilio', 'Twilio', 'sms', ARRAY['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'], 'not_built',
   NULL,
   'SMS campaign sending, opt-in/opt-out handling, dedicated number per org',
   NULL,
   '$1/month per phone number + $0.0075 per SMS',
   'Round 14 build',
   'https://www.twilio.com/docs',
   ARRAY[]::text[], 60),

  ('zoom', 'Zoom', 'meeting', ARRAY['ZOOM_CLIENT_ID','ZOOM_CLIENT_SECRET','ZOOM_WEBHOOK_SECRET'], 'live',
   NULL,
   'Meeting transcript ingestion, AI task suggestions, agenda generation',
   NULL,
   'Zoom Workplace Pro plan required (~$15/user/month)', NULL,
   'https://marketplace.zoom.us/docs/api-reference',
   ARRAY['zoom-recording-webhook','process-transcript','generate-agenda'], 70),

  ('supabase_storage', 'Supabase Storage', 'storage', ARRAY[]::text[], 'live',
   NULL,
   'File uploads for brand assets, photos, design exports, .ics files, QR codes, documents',
   NULL,
   'Included in Supabase plan', NULL, NULL,
   ARRAY[]::text[], 80),

  ('google_drive', 'Google Drive (via MCP)', 'storage', ARRAY[]::text[], 'live',
   NULL,
   'Document linking in acquisition deal rooms',
   NULL,
   'Free', NULL, NULL,
   ARRAY[]::text[], 90),

  ('ip_geolocation', 'IP Geolocation', 'analytics', ARRAY[]::text[], 'stubbed',
   'Shortlink redirects work, click tracking works, country/city fields stay null',
   'Geographic breakdowns in shortlink analytics',
   NULL,
   'Free up to 1000 lookups/day (ipapi.co), then paid',
   'Click volume justifies it, or analytics richness becomes a priority',
   'https://ipapi.co/',
   ARRAY[]::text[], 100);

UPDATE public.system_integrations
   SET notes = 'Alternative free options: ipinfo.io, ip-api.com, MaxMind GeoLite2 (local DB)'
 WHERE integration_key = 'ip_geolocation';