-- Join table for admin task assignees (multiple per task)
CREATE TABLE public.org_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.org_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_org_task_assignees_user_id ON public.org_task_assignees(user_id);
CREATE INDEX idx_org_task_assignees_task_id ON public.org_task_assignees(task_id);
CREATE INDEX idx_org_task_assignees_org_id ON public.org_task_assignees(org_id);

ALTER TABLE public.org_task_assignees ENABLE ROW LEVEL SECURITY;

-- Any admin can manage (assign/reassign/remove)
CREATE POLICY "admins manage org_task_assignees"
ON public.org_task_assignees
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Org members can see assignees of their own org's tasks (so they know who's working on it)
CREATE POLICY "org members view own org task assignees"
ON public.org_task_assignees
FOR SELECT
TO authenticated
USING (org_id = public.current_org_id());
