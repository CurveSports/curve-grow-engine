
-- Email templates library
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  rendering_engine TEXT NOT NULL DEFAULT 'react_email',
  jsx_source TEXT,
  mjml_source TEXT,
  input_fields JSONB DEFAULT '[]'::jsonb,
  preview_props JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  owner_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_owner ON public.email_templates(owner_org_id);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_view"
ON public.email_templates FOR SELECT
USING (
  active = true AND (
    is_system = true
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.current_org_id() = owner_org_id
  )
);

CREATE POLICY "email_templates_admin_all"
ON public.email_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "email_templates_org_manage"
ON public.email_templates FOR ALL
USING (is_system = false AND public.current_org_id() = owner_org_id)
WITH CHECK (is_system = false AND public.current_org_id() = owner_org_id);

CREATE TRIGGER trg_email_templates_updated
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend org_email_sends
ALTER TABLE public.org_email_sends
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rendering_engine TEXT DEFAULT 'react_email',
  ADD COLUMN IF NOT EXISTS jsx_source TEXT,
  ADD COLUMN IF NOT EXISTS template_props JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS spam_score NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS spam_check_details JSONB,
  ADD COLUMN IF NOT EXISTS spam_check_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dark_mode_optimized BOOLEAN DEFAULT TRUE;
