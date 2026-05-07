
-- 1. module_access on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS module_access text[] NOT NULL DEFAULT ARRAY['allegiance']::text[];

-- Backfill: all admins get both modules
UPDATE public.profiles p
SET module_access = ARRAY['allegiance','acquisitions']::text[]
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role = 'admin'::app_role
);

-- 2. Security definer helper
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND _module = ANY(module_access)
  );
$$;

-- 3. Tables
CREATE TABLE public.acquisition_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL,
  codename text,
  entity_name text,
  state text,
  city text,
  close_date date,
  phase text NOT NULL DEFAULT 'pre_close' CHECK (phase IN ('diligence','pre_close','closing_day','first_30','first_60','first_90','complete')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','complete')),
  seller_primary_name text,
  seller_primary_email text,
  seller_primary_phone text,
  seller_secondary_name text,
  seller_secondary_email text,
  acquisition_notes text,
  value_creation_summary text,
  total_tasks integer NOT NULL DEFAULT 0,
  completed_tasks integer NOT NULL DEFAULT 0,
  completion_pct numeric(5,2) NOT NULL DEFAULT 0,
  overdue_tasks integer NOT NULL DEFAULT 0,
  blocked_tasks integer NOT NULL DEFAULT 0,
  integration_pct numeric(5,2) NOT NULL DEFAULT 0,
  financial_pct numeric(5,2) NOT NULL DEFAULT 0,
  legal_pct numeric(5,2) NOT NULL DEFAULT 0,
  hr_culture_pct numeric(5,2) NOT NULL DEFAULT 0,
  marketing_pct numeric(5,2) NOT NULL DEFAULT 0,
  testing_pct numeric(5,2) NOT NULL DEFAULT 0,
  it_pct numeric(5,2) NOT NULL DEFAULT 0,
  data_assets_pct numeric(5,2) NOT NULL DEFAULT 0,
  compliance_pct numeric(5,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acquisition_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  workstream text NOT NULL CHECK (workstream IN ('integration','financial','legal','hr_culture','marketing','testing','it','data_assets','compliance','value_creation')),
  phase text NOT NULL CHECK (phase IN ('diligence','pre_close','closing_day','first_30','first_60','first_90')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','started','done','blocked')),
  priority text CHECK (priority IN ('1st','2nd','3rd','4th','needs_input')),
  lead_person_id uuid,
  lead_person_name text,
  target_date date,
  completed_date date,
  days_in_current_status integer DEFAULT 0,
  dependency text,
  curve_notes text,
  seller_notes text,
  is_seller_visible boolean NOT NULL DEFAULT false,
  is_staff_visible boolean NOT NULL DEFAULT false,
  template_id uuid,
  is_custom boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acquisition_task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.acquisition_tasks(id) ON DELETE CASCADE,
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  is_seller_visible boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acquisition_task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.acquisition_tasks(id) ON DELETE CASCADE,
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created','status_changed','note_added','date_changed','assigned','blocked','unblocked','updated')),
  old_value text,
  new_value text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acquisition_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  workstream text NOT NULL CHECK (workstream IN ('integration','financial','legal','hr_culture','marketing','testing','it','data_assets','compliance','value_creation')),
  phase text NOT NULL CHECK (phase IN ('diligence','pre_close','closing_day','first_30','first_60','first_90')),
  priority text,
  lead_role text,
  suggested_days_from_close integer,
  florida_only boolean NOT NULL DEFAULT false,
  is_system_template boolean NOT NULL DEFAULT true,
  is_seller_visible boolean NOT NULL DEFAULT false,
  is_staff_visible boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_acq_tasks_project ON public.acquisition_tasks(acquisition_id);
CREATE INDEX idx_acq_tasks_workstream ON public.acquisition_tasks(acquisition_id, workstream);
CREATE INDEX idx_acq_tasks_phase ON public.acquisition_tasks(acquisition_id, phase);
CREATE INDEX idx_acq_tasks_status ON public.acquisition_tasks(acquisition_id, status);
CREATE INDEX idx_acq_notes_task ON public.acquisition_task_notes(task_id);
CREATE INDEX idx_acq_activity_task ON public.acquisition_task_activity(task_id);

-- 4. Counts trigger
CREATE OR REPLACE FUNCTION public.update_acquisition_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acq_id uuid;
BEGIN
  v_acq_id := COALESCE(NEW.acquisition_id, OLD.acquisition_id);

  UPDATE public.acquisition_projects p SET
    total_tasks = sub.total,
    completed_tasks = sub.done,
    completion_pct = ROUND(CASE WHEN sub.total = 0 THEN 0 ELSE sub.done::numeric / sub.total * 100 END, 1),
    overdue_tasks = sub.overdue,
    blocked_tasks = sub.blocked,
    integration_pct = ROUND(CASE WHEN sub.integration_t = 0 THEN 0 ELSE sub.integration_d::numeric / sub.integration_t * 100 END, 1),
    financial_pct = ROUND(CASE WHEN sub.financial_t = 0 THEN 0 ELSE sub.financial_d::numeric / sub.financial_t * 100 END, 1),
    legal_pct = ROUND(CASE WHEN sub.legal_t = 0 THEN 0 ELSE sub.legal_d::numeric / sub.legal_t * 100 END, 1),
    hr_culture_pct = ROUND(CASE WHEN sub.hr_t = 0 THEN 0 ELSE sub.hr_d::numeric / sub.hr_t * 100 END, 1),
    marketing_pct = ROUND(CASE WHEN sub.marketing_t = 0 THEN 0 ELSE sub.marketing_d::numeric / sub.marketing_t * 100 END, 1),
    testing_pct = ROUND(CASE WHEN sub.testing_t = 0 THEN 0 ELSE sub.testing_d::numeric / sub.testing_t * 100 END, 1),
    it_pct = ROUND(CASE WHEN sub.it_t = 0 THEN 0 ELSE sub.it_d::numeric / sub.it_t * 100 END, 1),
    data_assets_pct = ROUND(CASE WHEN sub.da_t = 0 THEN 0 ELSE sub.da_d::numeric / sub.da_t * 100 END, 1),
    compliance_pct = ROUND(CASE WHEN sub.compliance_t = 0 THEN 0 ELSE sub.compliance_d::numeric / sub.compliance_t * 100 END, 1),
    updated_at = now()
  FROM (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'done') AS done,
      COUNT(*) FILTER (WHERE target_date < CURRENT_DATE AND status NOT IN ('done','blocked')) AS overdue,
      COUNT(*) FILTER (WHERE status = 'blocked') AS blocked,
      COUNT(*) FILTER (WHERE workstream = 'integration') AS integration_t,
      COUNT(*) FILTER (WHERE workstream = 'integration' AND status = 'done') AS integration_d,
      COUNT(*) FILTER (WHERE workstream = 'financial') AS financial_t,
      COUNT(*) FILTER (WHERE workstream = 'financial' AND status = 'done') AS financial_d,
      COUNT(*) FILTER (WHERE workstream = 'legal') AS legal_t,
      COUNT(*) FILTER (WHERE workstream = 'legal' AND status = 'done') AS legal_d,
      COUNT(*) FILTER (WHERE workstream = 'hr_culture') AS hr_t,
      COUNT(*) FILTER (WHERE workstream = 'hr_culture' AND status = 'done') AS hr_d,
      COUNT(*) FILTER (WHERE workstream = 'marketing') AS marketing_t,
      COUNT(*) FILTER (WHERE workstream = 'marketing' AND status = 'done') AS marketing_d,
      COUNT(*) FILTER (WHERE workstream = 'testing') AS testing_t,
      COUNT(*) FILTER (WHERE workstream = 'testing' AND status = 'done') AS testing_d,
      COUNT(*) FILTER (WHERE workstream = 'it') AS it_t,
      COUNT(*) FILTER (WHERE workstream = 'it' AND status = 'done') AS it_d,
      COUNT(*) FILTER (WHERE workstream = 'data_assets') AS da_t,
      COUNT(*) FILTER (WHERE workstream = 'data_assets' AND status = 'done') AS da_d,
      COUNT(*) FILTER (WHERE workstream = 'compliance') AS compliance_t,
      COUNT(*) FILTER (WHERE workstream = 'compliance' AND status = 'done') AS compliance_d
    FROM public.acquisition_tasks WHERE acquisition_id = v_acq_id
  ) sub
  WHERE p.id = v_acq_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER acq_task_counts
AFTER INSERT OR UPDATE OR DELETE ON public.acquisition_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_acquisition_counts();

-- 5. Phase auto-detection
CREATE OR REPLACE FUNCTION public.update_acquisition_phases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.acquisition_projects SET
    phase = CASE
      WHEN close_date IS NULL THEN 'pre_close'
      WHEN close_date > CURRENT_DATE THEN 'pre_close'
      WHEN close_date = CURRENT_DATE THEN 'closing_day'
      WHEN CURRENT_DATE <= close_date + 30 THEN 'first_30'
      WHEN CURRENT_DATE <= close_date + 60 THEN 'first_60'
      WHEN CURRENT_DATE <= close_date + 90 THEN 'first_90'
      ELSE 'complete'
    END,
    updated_at = now()
  WHERE status = 'active' AND phase <> 'complete';
END;
$$;

-- 6. updated_at trigger
CREATE TRIGGER acq_projects_updated_at BEFORE UPDATE ON public.acquisition_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER acq_tasks_updated_at BEFORE UPDATE ON public.acquisition_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. RLS
ALTER TABLE public.acquisition_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users manage projects" ON public.acquisition_projects
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users manage tasks" ON public.acquisition_tasks
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users manage notes" ON public.acquisition_task_notes
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users view activity" ON public.acquisition_task_activity
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users insert activity" ON public.acquisition_task_activity
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users manage templates" ON public.acquisition_task_templates
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));
