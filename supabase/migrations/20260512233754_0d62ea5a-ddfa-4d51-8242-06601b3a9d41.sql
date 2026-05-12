
-- ===== SHORTLINKS =====
CREATE TABLE public.org_shortlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  label TEXT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
  brand_color TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  unique_click_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shortlinks_org ON public.org_shortlinks(org_id);
CREATE INDEX idx_shortlinks_slug ON public.org_shortlinks(slug);

CREATE TRIGGER trg_shortlinks_updated BEFORE UPDATE ON public.org_shortlinks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shortlink_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlink_id UUID NOT NULL REFERENCES public.org_shortlinks(id) ON DELETE CASCADE,
  user_agent TEXT,
  referer TEXT,
  ip_hash TEXT,
  country TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shortlink_clicks_link ON public.shortlink_clicks(shortlink_id);

-- ===== MAGIC LINKS =====
CREATE TABLE public.magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_id UUID REFERENCES public.org_contacts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by_email TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_magic_links_token ON public.magic_links(token);
CREATE INDEX idx_magic_links_org ON public.magic_links(org_id);

-- ===== RLS =====
ALTER TABLE public.org_shortlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlink_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shortlinks_access" ON public.org_shortlinks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "shortlink_clicks_select" ON public.shortlink_clicks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.org_shortlinks s WHERE s.id = shortlink_id AND s.org_id = public.current_org_id())
  );

CREATE POLICY "magic_links_access" ON public.magic_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);
