CREATE TABLE public.admin_org_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

CREATE INDEX idx_admin_org_assignments_user_id ON public.admin_org_assignments(user_id);
CREATE INDEX idx_admin_org_assignments_org_id ON public.admin_org_assignments(org_id);

ALTER TABLE public.admin_org_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage admin_org_assignments"
ON public.admin_org_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "org members view own org admin assignments"
ON public.admin_org_assignments
FOR SELECT
TO authenticated
USING (org_id = public.current_org_id());