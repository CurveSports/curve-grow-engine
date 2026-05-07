
-- Staff at acquired clubs
CREATE TABLE public.acquisition_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL,
  role_type text CHECK (role_type IN ('coach','staff','admin','director')),
  employment_type text CHECK (employment_type IN ('employee','contractor','volunteer')),
  team_or_department text,
  is_active boolean NOT NULL DEFAULT true,
  start_date date,
  compliance_status text NOT NULL DEFAULT 'not_started' CHECK (compliance_status IN ('not_started','in_progress','compliant','overdue')),
  compliance_pct numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.acquisition_compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.acquisition_staff(id) ON DELETE CASCADE,
  requirement_type text NOT NULL CHECK (requirement_type IN ('background_check','fingerprinting','concussion_training','abuse_prevention_training','handbook_acknowledgment','other')),
  requirement_name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','complete','expired','waived')),
  due_date date,
  completed_date date,
  expiration_date date,
  documentation_url text,
  documentation_notes text,
  reference_number text,
  vendor text,
  ori_number text,
  last_reminder_sent_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  notes text,
  verified_by uuid,
  verified_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.compliance_requirement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_type text NOT NULL,
  requirement_name text NOT NULL,
  description text,
  applies_to_role_types text[] NOT NULL DEFAULT ARRAY['coach','staff','admin','director'],
  state_filter text,
  default_days_to_complete integer NOT NULL DEFAULT 30,
  expires_after_years integer,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acq_staff_project ON public.acquisition_staff(acquisition_id);
CREATE INDEX idx_acq_compliance_staff ON public.acquisition_compliance_items(staff_id);
CREATE INDEX idx_acq_compliance_project ON public.acquisition_compliance_items(acquisition_id);
CREATE INDEX idx_acq_compliance_status ON public.acquisition_compliance_items(acquisition_id, status);

-- RLS
ALTER TABLE public.acquisition_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage acquisition_staff" ON public.acquisition_staff FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage compliance_items" ON public.acquisition_compliance_items FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage compliance_templates" ON public.compliance_requirement_templates FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Trigger: recompute staff compliance status from items
CREATE OR REPLACE FUNCTION public.update_staff_compliance_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff_id uuid;
  v_total integer;
  v_complete integer;
  v_overdue integer;
  v_pct numeric;
BEGIN
  v_staff_id := COALESCE(NEW.staff_id, OLD.staff_id);
  SELECT COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('complete','waived')),
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('complete','waived','submitted'))
  INTO v_total, v_complete, v_overdue
  FROM public.acquisition_compliance_items WHERE staff_id = v_staff_id;
  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE ROUND(v_complete::numeric / v_total * 100, 1) END;
  UPDATE public.acquisition_staff SET
    compliance_pct = v_pct,
    compliance_status = CASE
      WHEN v_total = 0 THEN 'not_started'
      WHEN v_complete = v_total THEN 'compliant'
      WHEN v_overdue > 0 THEN 'overdue'
      WHEN v_complete > 0 THEN 'in_progress'
      ELSE 'not_started'
    END,
    updated_at = now()
  WHERE id = v_staff_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER staff_compliance_update
AFTER INSERT OR UPDATE OR DELETE ON public.acquisition_compliance_items
FOR EACH ROW EXECUTE FUNCTION public.update_staff_compliance_status();

CREATE TRIGGER set_acquisition_staff_updated_at BEFORE UPDATE ON public.acquisition_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_acquisition_compliance_items_updated_at BEFORE UPDATE ON public.acquisition_compliance_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed templates
INSERT INTO public.compliance_requirement_templates (requirement_type, requirement_name, description, applies_to_role_types, state_filter, default_days_to_complete, expires_after_years, display_order) VALUES
  ('background_check','NCSI Background Check','National background screening through NCSI/SportsEngine membership portal. Includes national databases and sex offender repositories.',ARRAY['coach','staff','admin','director'],null,30,null,1),
  ('fingerprinting','FDLE Level 2 Fingerprinting','Florida Department of Law Enforcement Level 2 fingerprinting through an approved LiveScan vendor. Requires correct ORI number. Results processed through the Florida Clearinghouse.',ARRAY['coach','staff','admin','director'],'Florida',30,5,2),
  ('concussion_training','Concussion Protocol Training','Required concussion awareness and protocol training for all staff working with athletes.',ARRAY['coach','staff'],null,30,null,3),
  ('abuse_prevention_training','Abuse Prevention Training','Required abuse prevention and recognition training for all staff working with athletes.',ARRAY['coach','staff'],null,30,null,4),
  ('handbook_acknowledgment','Employee Handbook Acknowledgment','Receipt and acknowledgment of the Curve employee handbook. Must be completed after handbook is finalized and distributed.',ARRAY['coach','staff','admin','director'],null,45,null,5);
