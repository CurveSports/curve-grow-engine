-- 1. Add new engine enum values
ALTER TYPE public.task_engine ADD VALUE IF NOT EXISTS 'Platform';
ALTER TYPE public.task_engine ADD VALUE IF NOT EXISTS 'Marketing';

-- 2. Owner type enum
DO $$ BEGIN
  CREATE TYPE public.task_owner_type AS ENUM ('curve_team','org_user','third_party','combo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add owner_type to org_tasks and task_templates
ALTER TABLE public.org_tasks
  ADD COLUMN IF NOT EXISTS owner_type public.task_owner_type NOT NULL DEFAULT 'org_user';

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS owner_type public.task_owner_type NOT NULL DEFAULT 'org_user';

-- 4. display_order on templates
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- 5. auto_created on org_projects
ALTER TABLE public.org_projects
  ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false;

-- 6. Platform / Marketing scoring fields on derived_metrics
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS platform_score integer;
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS platform_tasks_complete integer NOT NULL DEFAULT 0;
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS platform_tasks_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS marketing_score integer;
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS marketing_tasks_complete integer NOT NULL DEFAULT 0;
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS marketing_tasks_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.derived_metrics ADD COLUMN IF NOT EXISTS platform_marketing_updated_at timestamptz;

-- 7. Tighten org_tasks RLS so org users only update tasks they own
DROP POLICY IF EXISTS "org members update org_tasks" ON public.org_tasks;
CREATE POLICY "org members update org_tasks"
ON public.org_tasks
FOR UPDATE
TO authenticated
USING (
  org_id = current_org_id()
  AND project_id IS NOT NULL
  AND owner_type IN ('org_user','combo')
  AND EXISTS (
    SELECT 1 FROM org_projects p
    WHERE p.id = org_tasks.project_id AND p.status = 'active'
  )
);

-- 8. Score recompute function
CREATE OR REPLACE FUNCTION public.recompute_platform_marketing_scores(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_total int; p_done int; p_score int;
  m_total int; m_done int; m_score int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE status = 'completed')
    INTO p_total, p_done
  FROM public.org_tasks
  WHERE org_id = _org_id AND engine = 'Platform' AND plan_status <> 'draft';

  SELECT count(*), count(*) FILTER (WHERE status = 'completed')
    INTO m_total, m_done
  FROM public.org_tasks
  WHERE org_id = _org_id AND engine = 'Marketing' AND plan_status <> 'draft';

  p_score := CASE WHEN p_total = 0 THEN 1
                  ELSE GREATEST(1, LEAST(10, ROUND((p_done::numeric / p_total) * 10)::int)) END;
  m_score := CASE WHEN m_total = 0 THEN 1
                  ELSE GREATEST(1, LEAST(10, ROUND((m_done::numeric / m_total) * 10)::int)) END;

  -- Upsert into derived_metrics so the row exists even if metrics haven't been calculated yet
  INSERT INTO public.derived_metrics (
    org_id, platform_score, platform_tasks_complete, platform_tasks_total,
    marketing_score, marketing_tasks_complete, marketing_tasks_total,
    platform_marketing_updated_at
  ) VALUES (
    _org_id, p_score, p_done, p_total, m_score, m_done, m_total, now()
  )
  ON CONFLICT (org_id) DO UPDATE SET
    platform_score = EXCLUDED.platform_score,
    platform_tasks_complete = EXCLUDED.platform_tasks_complete,
    platform_tasks_total = EXCLUDED.platform_tasks_total,
    marketing_score = EXCLUDED.marketing_score,
    marketing_tasks_complete = EXCLUDED.marketing_tasks_complete,
    marketing_tasks_total = EXCLUDED.marketing_tasks_total,
    platform_marketing_updated_at = now();
END;
$$;

-- Ensure derived_metrics.org_id has a unique constraint so ON CONFLICT works
DO $$ BEGIN
  ALTER TABLE public.derived_metrics ADD CONSTRAINT derived_metrics_org_id_key UNIQUE (org_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

-- 9. Trigger function on org_tasks
CREATE OR REPLACE FUNCTION public.org_tasks_pm_score_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_org uuid;
  affected_engine task_engine;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_org := OLD.org_id;
    affected_engine := OLD.engine;
  ELSE
    affected_org := NEW.org_id;
    affected_engine := NEW.engine;
  END IF;

  IF affected_engine IN ('Platform','Marketing') THEN
    PERFORM public.recompute_platform_marketing_scores(affected_org);
  END IF;

  -- Also handle engine-change away from Platform/Marketing on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.engine IN ('Platform','Marketing')
     AND OLD.engine IS DISTINCT FROM NEW.engine THEN
    PERFORM public.recompute_platform_marketing_scores(OLD.org_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_org_tasks_pm_score ON public.org_tasks;
CREATE TRIGGER trg_org_tasks_pm_score
AFTER INSERT OR UPDATE OR DELETE ON public.org_tasks
FOR EACH ROW EXECUTE FUNCTION public.org_tasks_pm_score_trigger();