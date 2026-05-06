-- ============ org_digital_presence ============
CREATE TABLE public.org_digital_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE,
  website_url TEXT,
  instagram_handle TEXT,
  facebook_url TEXT,
  x_handle TEXT,
  tiktok_handle TEXT,
  youtube_url TEXT,
  linkedin_url TEXT,
  -- self-reported context for hybrid social audit
  posting_frequency TEXT,           -- e.g. "3-5 per week", "daily", "rarely"
  social_post_samples JSONB DEFAULT '[]'::jsonb,  -- [{platform, text, posted_at?}]
  brand_voice_notes TEXT,
  primary_audience_notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_digital_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_digital_presence"
  ON public.org_digital_presence FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own digital presence"
  ON public.org_digital_presence FOR SELECT TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org primary insert own digital presence"
  ON public.org_digital_presence FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_org_primary(auth.uid(), org_id));

CREATE POLICY "org primary update own digital presence"
  ON public.org_digital_presence FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR is_org_primary(auth.uid(), org_id))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_org_primary(auth.uid(), org_id));

CREATE TRIGGER trg_org_digital_presence_updated_at
  BEFORE UPDATE ON public.org_digital_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ org_digital_audits ============
CREATE TABLE public.org_digital_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('website','social','combined')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual','auto_quarterly','intake')),
  triggered_by UUID,
  -- scoring
  website_score INTEGER,            -- 0-100
  social_score INTEGER,             -- 0-100 overall across platforms
  overall_score INTEGER,            -- 0-100 weighted blend (combined audits)
  scores_breakdown JSONB,           -- per-rubric and per-platform scores
  -- findings
  wins JSONB DEFAULT '[]'::jsonb,           -- [{title, detail, source}]
  fixes JSONB DEFAULT '[]'::jsonb,          -- [{title, detail, severity, type:'quick_win'|'project'}]
  sponsor_flags JSONB DEFAULT '[]'::jsonb,  -- [{title, detail}]
  -- raw evidence
  scraped_pages JSONB,              -- pages scraped via Firecrawl (url, title, excerpt)
  social_evidence JSONB,            -- per-platform scrape + sample notes
  ai_summary TEXT,                  -- short narrative summary
  -- diff
  previous_audit_id UUID REFERENCES public.org_digital_audits(id) ON DELETE SET NULL,
  comparison_to_previous JSONB,     -- {score_deltas, resolved, still_outstanding, new_issues}
  -- meta
  model_used TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_org_digital_audits_org_created ON public.org_digital_audits(org_id, created_at DESC);
CREATE INDEX idx_org_digital_audits_org_type_completed ON public.org_digital_audits(org_id, audit_type, completed_at DESC);

ALTER TABLE public.org_digital_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_digital_audits"
  ON public.org_digital_audits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own audits"
  ON public.org_digital_audits FOR SELECT TO authenticated
  USING (org_id = current_org_id() AND status = 'completed');