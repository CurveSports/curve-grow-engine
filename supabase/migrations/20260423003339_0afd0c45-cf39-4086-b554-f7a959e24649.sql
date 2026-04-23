
CREATE TYPE public.admin_review_kind AS ENUM ('high_alert', 'revenue_review');

CREATE TABLE public.admin_org_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.admin_review_kind NOT NULL,
  reviewed_by uuid NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  UNIQUE(org_id, kind)
);

ALTER TABLE public.admin_org_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage admin_org_reviews"
ON public.admin_org_reviews
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
