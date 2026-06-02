ALTER TABLE public.org_tasks
  ADD COLUMN IF NOT EXISTS phase int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_org_tasks_project_phase
  ON public.org_tasks(project_id, phase, display_order);

CREATE OR REPLACE FUNCTION public.task_phase_is_unlocked(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH t AS (
    SELECT project_id, phase FROM public.org_tasks WHERE id = _task_id
  )
  SELECT CASE
    WHEN (SELECT project_id FROM t) IS NULL THEN true
    WHEN (SELECT phase FROM t) <= 1 THEN true
    ELSE NOT EXISTS (
      SELECT 1 FROM public.org_tasks ot, t
      WHERE ot.project_id = t.project_id
        AND ot.phase < t.phase
        AND ot.status <> 'completed'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_task_phase_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NOT public.task_phase_is_unlocked(NEW.id)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'This task is locked. Complete all earlier-phase tasks in this project first.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_task_phase_gate ON public.org_tasks;
CREATE TRIGGER trg_enforce_task_phase_gate
  BEFORE UPDATE ON public.org_tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_task_phase_gate();