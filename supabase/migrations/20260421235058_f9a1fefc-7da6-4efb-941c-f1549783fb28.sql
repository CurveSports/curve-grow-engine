-- Enum for org_notes tag
DO $$ BEGIN
  CREATE TYPE public.org_note_tag AS ENUM (
    'internal_planning', 'kickoff', 'check_in', 'issue', 'win', 'renewal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum for org_projects status
DO $$ BEGIN
  CREATE TYPE public.org_project_status AS ENUM ('draft', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ org_notes ============
CREATE TABLE public.org_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by uuid NOT NULL,
  tag public.org_note_tag,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_notes_org_id_created_at ON public.org_notes(org_id, created_at DESC);

ALTER TABLE public.org_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_notes"
  ON public.org_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER org_notes_updated_at
  BEFORE UPDATE ON public.org_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ organizations.last_activity_at ============
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

-- Trigger: bump org last_activity_at when a note is added
CREATE OR REPLACE FUNCTION public.bump_org_last_activity_on_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organizations SET last_activity_at = now() WHERE id = NEW.org_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER org_notes_bump_org_activity
  AFTER INSERT ON public.org_notes
  FOR EACH ROW EXECUTE FUNCTION public.bump_org_last_activity_on_note();

-- ============ org_weekly_focus ============
CREATE TABLE public.org_weekly_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  focus_task_ids jsonb,
  focus_note text,
  set_by uuid NOT NULL,
  week_starting date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_weekly_focus_org_id ON public.org_weekly_focus(org_id);

ALTER TABLE public.org_weekly_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_weekly_focus"
  ON public.org_weekly_focus FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "org members view own weekly focus"
  ON public.org_weekly_focus FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE TRIGGER org_weekly_focus_updated_at
  BEFORE UPDATE ON public.org_weekly_focus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ org_projects ============
CREATE TABLE public.org_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  engine public.task_engine,
  status public.org_project_status NOT NULL DEFAULT 'draft',
  release_date date,
  released_at timestamptz,
  released_by uuid,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_org_projects_org_id ON public.org_projects(org_id);

ALTER TABLE public.org_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_projects"
  ON public.org_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "org members view active projects"
  ON public.org_projects FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() AND status = 'active');

CREATE TRIGGER org_projects_updated_at
  BEFORE UPDATE ON public.org_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ org_tasks.project_id ============
ALTER TABLE public.org_tasks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.org_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_org_tasks_project_id ON public.org_tasks(project_id);

-- ============ derived_metrics: new health score columns ============
ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS operations_health_score integer,
  ADD COLUMN IF NOT EXISTS market_position_health_score integer,
  ADD COLUMN IF NOT EXISTS program_health_score integer,
  ADD COLUMN IF NOT EXISTS strategic_clarity_score integer,
  ADD COLUMN IF NOT EXISTS overall_health_score integer,
  ADD COLUMN IF NOT EXISTS selection_leakage_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS growth_opportunity_direction text,
  ADD COLUMN IF NOT EXISTS execution_risk text,
  ADD COLUMN IF NOT EXISTS market_risk text,
  ADD COLUMN IF NOT EXISTS retention_risk text,
  ADD COLUMN IF NOT EXISTS engagement_complexity text;