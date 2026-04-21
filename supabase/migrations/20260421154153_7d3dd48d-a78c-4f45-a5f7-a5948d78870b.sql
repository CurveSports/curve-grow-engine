-- 1. Create enum
DO $$ BEGIN
  CREATE TYPE public.plan_status AS ENUM ('draft', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add column (existing rows = active so nothing disappears for live orgs)
ALTER TABLE public.org_tasks
  ADD COLUMN IF NOT EXISTS plan_status public.plan_status NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_org_tasks_org_plan_status
  ON public.org_tasks(org_id, plan_status);

-- 3. Replace SELECT/UPDATE policies for org members to gate on plan_status = active
DROP POLICY IF EXISTS "org members view org_tasks" ON public.org_tasks;
CREATE POLICY "org members view org_tasks"
  ON public.org_tasks
  FOR SELECT
  TO authenticated
  USING (org_id = public.current_org_id() AND plan_status = 'active');

DROP POLICY IF EXISTS "org members update org_tasks" ON public.org_tasks;
CREATE POLICY "org members update org_tasks"
  ON public.org_tasks
  FOR UPDATE
  TO authenticated
  USING (org_id = public.current_org_id() AND plan_status = 'active');