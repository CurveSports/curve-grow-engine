
-- ===== TABLES =====

CREATE TABLE public.org_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  logo_primary_url TEXT,
  logo_secondary_url TEXT,
  logo_mark_url TEXT,
  color_primary TEXT,
  color_secondary TEXT,
  color_accent TEXT,
  color_dark TEXT DEFAULT '#0F172A',
  color_light TEXT DEFAULT '#FFFFFF',
  font_heading TEXT DEFAULT 'Inter',
  font_body TEXT DEFAULT 'Inter',
  brand_voice_notes TEXT,
  tagline TEXT,
  hashtags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

CREATE TABLE public.org_brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL DEFAULT 'photo',
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  filename TEXT,
  tags TEXT[] DEFAULT '{}',
  alt_text TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_brand_assets_org ON public.org_brand_assets(org_id) WHERE archived = false;

CREATE TABLE public.org_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'family',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  sms_opt_in_date TIMESTAMPTZ,
  team_assignments TEXT[] DEFAULT '{}',
  season TEXT,
  player_grad_year INTEGER,
  parent_of_contact_id UUID REFERENCES public.org_contacts(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  source TEXT,
  source_batch_id UUID,
  unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  hard_bounce BOOLEAN NOT NULL DEFAULT FALSE,
  last_engaged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_contacts_org_id ON public.org_contacts(org_id);
CREATE INDEX idx_org_contacts_email ON public.org_contacts(org_id, lower(email));
CREATE INDEX idx_org_contacts_type ON public.org_contacts(org_id, contact_type);

CREATE TABLE public.org_contact_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  contact_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_segments_org ON public.org_contact_segments(org_id);

CREATE TABLE public.org_contact_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  filename TEXT,
  uploaded_by UUID,
  total_rows INTEGER DEFAULT 0,
  successful_imports INTEGER DEFAULT 0,
  duplicates_merged INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.org_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  from_email TEXT,
  from_name TEXT,
  provider_domain_id TEXT,
  dkim_verified BOOLEAN NOT NULL DEFAULT FALSE,
  spf_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_records JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_domains_org ON public.org_email_domains(org_id);

CREATE TABLE public.org_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  design_id UUID,
  segment_id UUID REFERENCES public.org_contact_segments(id) ON DELETE SET NULL,
  subject TEXT,
  preview_text TEXT,
  from_email TEXT,
  from_name TEXT,
  reply_to TEXT,
  html_body TEXT,
  text_body TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  recipient_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  provider_batch_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_sends_org ON public.org_email_sends(org_id);

CREATE TABLE public.org_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES public.org_email_sends(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.org_contacts(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_events_send ON public.org_email_events(send_id);

CREATE TABLE public.design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  design_type TEXT NOT NULL,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_prompt TEXT NOT NULL,
  input_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_output TEXT,
  thumbnail_url TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  owner_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  design_type TEXT NOT NULL,
  template_id UUID REFERENCES public.design_templates(id) ON DELETE SET NULL,
  name TEXT,
  prompt_input JSONB DEFAULT '{}'::jsonb,
  generated_html TEXT,
  preview_url TEXT,
  export_urls JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_by_role TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  parent_design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
  ai_model_used TEXT DEFAULT 'google/gemini-2.5-pro',
  generation_cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_designs_org ON public.designs(org_id);
CREATE INDEX idx_designs_status ON public.designs(org_id, status);

CREATE TABLE public.design_refinements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  refinement_prompt TEXT NOT NULL,
  previous_html TEXT,
  new_html TEXT,
  refined_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_design_refinements_design ON public.design_refinements(design_id);

-- ===== TRIGGERS: updated_at =====

CREATE TRIGGER trg_brand_kits_updated BEFORE UPDATE ON public.org_brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.org_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_segments_updated BEFORE UPDATE ON public.org_contact_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_design_templates_updated BEFORE UPDATE ON public.design_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_designs_updated BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SEGMENT COUNT FUNCTION =====
-- Filter shape: { contact_type?: string, contact_types?: string[], season?: string,
--                 team_assignments?: string[], sms_opt_in?: bool, unsubscribed?: bool,
--                 grad_year?: number }
CREATE OR REPLACE FUNCTION public.count_segment_contacts(_segment_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  v_count integer;
BEGIN
  SELECT * INTO s FROM public.org_contact_segments WHERE id = _segment_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  EXECUTE 'SELECT count(*) FROM public.org_contacts c WHERE c.org_id = $1
    AND ($2->>''contact_type'' IS NULL OR c.contact_type = $2->>''contact_type'')
    AND ($2->''contact_types'' IS NULL OR c.contact_type = ANY(SELECT jsonb_array_elements_text($2->''contact_types'')))
    AND ($2->>''season'' IS NULL OR c.season = $2->>''season'')
    AND ($2->''team_assignments'' IS NULL OR c.team_assignments && (SELECT array_agg(value) FROM jsonb_array_elements_text($2->''team_assignments'')))
    AND ($2->>''sms_opt_in'' IS NULL OR c.sms_opt_in = ($2->>''sms_opt_in'')::boolean)
    AND ($2->>''unsubscribed'' IS NULL OR c.unsubscribed = ($2->>''unsubscribed'')::boolean)
    AND ($2->>''grad_year'' IS NULL OR c.player_grad_year = ($2->>''grad_year'')::int)'
  INTO v_count USING s.org_id, s.filter_rules;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_org_segment_counts(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM public.org_contact_segments WHERE org_id = _org_id LOOP
    UPDATE public.org_contact_segments
       SET contact_count = public.count_segment_contacts(s.id),
           updated_at = now()
     WHERE id = s.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_update_segment_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_org_segment_counts(COALESCE(NEW.org_id, OLD.org_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_contacts_recount_segments
  AFTER INSERT OR UPDATE OR DELETE ON public.org_contacts
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_update_segment_counts();

CREATE TRIGGER trg_segments_initial_count
  AFTER INSERT OR UPDATE OF filter_rules ON public.org_contact_segments
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_segment_counts();

-- ===== AUTO-CREATE SYSTEM SEGMENTS =====
CREATE OR REPLACE FUNCTION public.seed_org_system_segments(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.org_contact_segments (org_id, name, description, filter_rules, is_system) VALUES
    (_org_id, 'All Contacts', 'Every contact in your audience', '{}'::jsonb, true),
    (_org_id, 'All Families', 'Family contacts', '{"contact_type":"family"}'::jsonb, true),
    (_org_id, 'All Players', 'Player contacts', '{"contact_type":"player"}'::jsonb, true),
    (_org_id, 'All Coaches', 'Coach contacts', '{"contact_type":"coach"}'::jsonb, true),
    (_org_id, 'All SMS Subscribers', 'Contacts opted in to SMS', '{"sms_opt_in":"true"}'::jsonb, true),
    (_org_id, 'Active Email Subscribers', 'Not unsubscribed', '{"unsubscribed":"false"}'::jsonb, true)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_org_marketing_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_org_system_segments(NEW.id);
  INSERT INTO public.org_brand_kits (org_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_seed_marketing AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.trg_seed_org_marketing_defaults();

-- Backfill for existing orgs
DO $$
DECLARE o RECORD;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_org_system_segments(o.id);
    INSERT INTO public.org_brand_kits (org_id) VALUES (o.id) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ===== RLS =====
ALTER TABLE public.org_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_contact_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_contact_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_refinements ENABLE ROW LEVEL SECURITY;

-- Helper predicate: caller is admin OR member of the row's org
-- Pattern repeated per table
CREATE POLICY "brand_kits_access" ON public.org_brand_kits FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "brand_assets_access" ON public.org_brand_assets FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "contacts_access" ON public.org_contacts FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "segments_access" ON public.org_contact_segments FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "uploads_access" ON public.org_contact_uploads FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "email_domains_access" ON public.org_email_domains FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "email_sends_access" ON public.org_email_sends FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "email_events_select" ON public.org_email_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.org_email_sends s WHERE s.id = send_id AND s.org_id = public.current_org_id())
  );

CREATE POLICY "designs_access" ON public.designs FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "design_templates_select" ON public.design_templates FOR SELECT
  USING (active AND (is_system OR owner_org_id IS NULL OR owner_org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "design_templates_admin_write" ON public.design_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "design_refinements_access" ON public.design_refinements FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.designs d WHERE d.id = design_id AND d.org_id = public.current_org_id())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.designs d WHERE d.id = design_id AND d.org_id = public.current_org_id())
  );

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true)
  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('design-renders', 'design-renders', false)
  ON CONFLICT DO NOTHING;

CREATE POLICY "brand_assets_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');
CREATE POLICY "brand_assets_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-assets' AND auth.uid() IS NOT NULL);
CREATE POLICY "brand_assets_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'brand-assets' AND auth.uid() IS NOT NULL);
CREATE POLICY "brand_assets_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "design_renders_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'design-renders' AND auth.uid() IS NOT NULL);
CREATE POLICY "design_renders_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'design-renders' AND auth.uid() IS NOT NULL);
