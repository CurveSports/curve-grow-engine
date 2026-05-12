
-- ===== CAMPAIGNS =====
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  target_audience JSONB DEFAULT '{}'::jsonb,
  segment_id UUID REFERENCES public.org_contact_segments(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  brand_color TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_org ON public.campaigns(org_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(org_id, status);

CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
  email_send_id UUID REFERENCES public.org_email_sends(id) ON DELETE SET NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_assets_campaign ON public.campaign_assets(campaign_id);

-- ===== TWO-STAGE APPROVAL QUEUE =====
CREATE TABLE public.approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE,
  email_send_id UUID REFERENCES public.org_email_sends(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'curve_review',
  status TEXT NOT NULL DEFAULT 'pending',
  curve_reviewer_id UUID,
  curve_reviewed_at TIMESTAMPTZ,
  curve_review_notes TEXT,
  curve_decision TEXT,
  org_reviewer_id UUID,
  org_reviewed_at TIMESTAMPTZ,
  org_review_notes TEXT,
  org_decision TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_queue_org ON public.approval_queue(org_id);
CREATE INDEX idx_approval_queue_stage ON public.approval_queue(current_stage, status);
CREATE INDEX idx_approval_queue_campaign ON public.approval_queue(campaign_id);

CREATE TRIGGER trg_approval_queue_updated BEFORE UPDATE ON public.approval_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.approval_queue(id) ON DELETE CASCADE,
  author_id UUID,
  author_role TEXT,
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_comments_approval ON public.approval_comments(approval_id);

-- ===== RLS =====
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_access" ON public.campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "campaign_assets_access" ON public.campaign_assets FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.org_id = public.current_org_id())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.org_id = public.current_org_id())
  );

CREATE POLICY "approval_queue_access" ON public.approval_queue FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.current_org_id() = org_id);

CREATE POLICY "approval_comments_access" ON public.approval_comments FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.approval_queue aq WHERE aq.id = approval_id AND aq.org_id = public.current_org_id())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.approval_queue aq WHERE aq.id = approval_id AND aq.org_id = public.current_org_id())
  );
