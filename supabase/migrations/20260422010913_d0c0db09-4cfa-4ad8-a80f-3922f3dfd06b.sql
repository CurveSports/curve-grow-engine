-- Tighten org-user task visibility: a task is only visible/updatable by org users
-- if it belongs to an ACTIVE project. plan_status alone no longer grants access.
-- Admins are unaffected (their separate ALL policy still applies).

DROP POLICY IF EXISTS "org members view org_tasks" ON public.org_tasks;
DROP POLICY IF EXISTS "org members update org_tasks" ON public.org_tasks;

CREATE POLICY "org members view org_tasks"
ON public.org_tasks
FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id()
  AND project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.org_projects p
    WHERE p.id = org_tasks.project_id
      AND p.status = 'active'
  )
);

CREATE POLICY "org members update org_tasks"
ON public.org_tasks
FOR UPDATE
TO authenticated
USING (
  org_id = public.current_org_id()
  AND project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.org_projects p
    WHERE p.id = org_tasks.project_id
      AND p.status = 'active'
  )
);
