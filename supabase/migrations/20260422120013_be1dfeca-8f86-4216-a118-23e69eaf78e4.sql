-- Presentation edits table for admin-saved overrides on Internal Brief / Client Presentation slides
CREATE TABLE public.org_presentation_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  presentation_type text NOT NULL CHECK (presentation_type IN ('internal_brief','client_kickoff','client_progress')),
  slide_number integer NOT NULL,
  field_key text NOT NULL,
  edited_value text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, presentation_type, slide_number, field_key)
);

CREATE INDEX idx_org_presentation_edits_org ON public.org_presentation_edits(org_id, presentation_type);

ALTER TABLE public.org_presentation_edits ENABLE ROW LEVEL SECURITY;

-- Admins only — no org user access whatsoever
CREATE POLICY "admins manage presentation edits"
ON public.org_presentation_edits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
