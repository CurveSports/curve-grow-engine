-- Extend org_projects with completion approval workflow fields
ALTER TABLE public.org_projects
  ADD COLUMN IF NOT EXISTS awaiting_completion_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completion_approved_by uuid,
  ADD COLUMN IF NOT EXISTS suggested_next_project_id uuid REFERENCES public.org_projects(id) ON DELETE SET NULL;

-- Add per-org project count cache fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS active_project_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_project_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft_project_count integer NOT NULL DEFAULT 0;

-- Extend notification_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'project_released' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'project_released';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'project_completion_pending' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'project_completion_pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'project_completed' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'project_completed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'next_project_suggested' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'next_project_suggested';
  END IF;
END$$;

-- Extend task_action enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'assigned_to_project' AND enumtypid = 'public.task_action'::regtype) THEN
    ALTER TYPE public.task_action ADD VALUE 'assigned_to_project';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'removed_from_project' AND enumtypid = 'public.task_action'::regtype) THEN
    ALTER TYPE public.task_action ADD VALUE 'removed_from_project';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'project_released' AND enumtypid = 'public.task_action'::regtype) THEN
    ALTER TYPE public.task_action ADD VALUE 'project_released';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'project_completed' AND enumtypid = 'public.task_action'::regtype) THEN
    ALTER TYPE public.task_action ADD VALUE 'project_completed';
  END IF;
END$$;

-- Function: recompute project counters for a single org
CREATE OR REPLACE FUNCTION public.recompute_org_project_counts(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organizations o
  SET
    active_project_count = COALESCE((SELECT count(*) FROM public.org_projects p WHERE p.org_id = _org_id AND p.status = 'active'), 0),
    draft_project_count = COALESCE((SELECT count(*) FROM public.org_projects p WHERE p.org_id = _org_id AND p.status = 'draft'), 0),
    completed_project_count = COALESCE((SELECT count(*) FROM public.org_projects p WHERE p.org_id = _org_id AND p.status = 'completed'), 0)
  WHERE o.id = _org_id;
END;
$$;

-- Trigger function to maintain counts on insert / update / delete
CREATE OR REPLACE FUNCTION public.org_projects_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_org_project_counts(OLD.org_id);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_org_project_counts(NEW.org_id);
    RETURN NEW;
  ELSE
    PERFORM public.recompute_org_project_counts(NEW.org_id);
    IF OLD.org_id IS DISTINCT FROM NEW.org_id THEN
      PERFORM public.recompute_org_project_counts(OLD.org_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_projects_counts ON public.org_projects;
CREATE TRIGGER trg_org_projects_counts
AFTER INSERT OR UPDATE OF status, org_id OR DELETE
ON public.org_projects
FOR EACH ROW
EXECUTE FUNCTION public.org_projects_count_trigger();

-- Backfill counts for existing orgs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.organizations LOOP
    PERFORM public.recompute_org_project_counts(r.id);
  END LOOP;
END$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_org_projects_org_status ON public.org_projects(org_id, status);
CREATE INDEX IF NOT EXISTS idx_org_projects_awaiting ON public.org_projects(awaiting_completion_approval) WHERE awaiting_completion_approval = true;
CREATE INDEX IF NOT EXISTS idx_org_tasks_project ON public.org_tasks(project_id);