
-- DOCUMENTS
CREATE TABLE public.acquisition_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_description text,
  document_type text CHECK (document_type IN ('contract','agreement','financial','handbook','policy','marketing','presentation','checklist','report','correspondence','compliance','template','other')),
  workstream text CHECK (workstream IN ('integration','financial','legal','hr_culture','marketing','testing','it','data_assets','compliance','value_creation','general')),
  storage_type text NOT NULL CHECK (storage_type IN ('uploaded','google_drive','external_link')),
  file_path text,
  file_size integer,
  file_type text,
  external_url text,
  version integer NOT NULL DEFAULT 1,
  is_current_version boolean NOT NULL DEFAULT true,
  previous_version_id uuid REFERENCES public.acquisition_documents(id),
  version_notes text,
  is_seller_visible boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  requires_review boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acq_docs_project ON public.acquisition_documents(acquisition_id);
CREATE INDEX idx_acq_docs_workstream ON public.acquisition_documents(acquisition_id, workstream);

-- BUDGET
CREATE TABLE public.acquisition_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  workstream text NOT NULL CHECK (workstream IN ('integration','financial','legal','hr_culture','marketing','testing','it','data_assets','compliance','value_creation','general')),
  category text NOT NULL CHECK (category IN ('legal_fees','accounting_fees','marketing_spend','equipment','facility','travel','software','staffing','consulting','compliance','other')),
  description text NOT NULL,
  vendor text,
  budgeted_amount numeric(10,2),
  actual_amount numeric(10,2),
  date_incurred date,
  is_paid boolean NOT NULL DEFAULT false,
  payment_method text,
  receipt_document_id uuid REFERENCES public.acquisition_documents(id),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acq_budget_project ON public.acquisition_budget_items(acquisition_id);
CREATE INDEX idx_acq_budget_workstream ON public.acquisition_budget_items(acquisition_id, workstream);

-- COMMUNICATIONS
CREATE TABLE public.acquisition_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  communication_type text NOT NULL CHECK (communication_type IN ('seller','staff','sikich','legal','vendor','internal','other')),
  subject text NOT NULL,
  summary text,
  contact_name text,
  contact_role text,
  contact_organization text,
  method text CHECK (method IN ('call','email','meeting','text','in_person','other')),
  communication_date timestamptz NOT NULL DEFAULT now(),
  follow_up_needed boolean NOT NULL DEFAULT false,
  follow_up_date date,
  follow_up_notes text,
  follow_up_completed boolean NOT NULL DEFAULT false,
  related_document_ids uuid[],
  related_task_id uuid REFERENCES public.acquisition_tasks(id) ON DELETE SET NULL,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acq_comms_project ON public.acquisition_communications(acquisition_id);
CREATE INDEX idx_acq_comms_type ON public.acquisition_communications(acquisition_id, communication_type);

-- SENTIMENT
CREATE TABLE public.acquisition_seller_sentiment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  milestone text NOT NULL CHECK (milestone IN ('day_7','day_30','day_60','day_90','custom')),
  custom_milestone_name text,
  sentiment_score integer NOT NULL CHECK (sentiment_score BETWEEN 1 AND 5),
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acq_sentiment_project ON public.acquisition_seller_sentiment(acquisition_id);

-- WEEKLY ROLLUPS
CREATE TABLE public.acquisition_weekly_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  days_since_close integer,
  total_tasks integer,
  completed_tasks integer,
  completion_pct numeric(5,2),
  overdue_tasks integer,
  blocked_tasks integer,
  tasks_completed_this_week integer,
  tasks_started_this_week integer,
  workstream_data jsonb,
  total_staff integer,
  compliant_staff integer,
  compliance_pct numeric(5,2),
  executive_summary text,
  risk_flags jsonb,
  next_week_priorities jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','sent')),
  sent_at timestamptz,
  sent_to text[],
  generated_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acq_rollups_project ON public.acquisition_weekly_rollups(acquisition_id);

-- updated_at triggers
CREATE TRIGGER trg_acq_docs_updated BEFORE UPDATE ON public.acquisition_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_acq_budget_updated BEFORE UPDATE ON public.acquisition_budget_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.acquisition_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_seller_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_weekly_rollups ENABLE ROW LEVEL SECURITY;

-- Admin full access; authenticated read
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['acquisition_documents','acquisition_budget_items','acquisition_communications','acquisition_seller_sentiment','acquisition_weekly_rollups'] LOOP
    EXECUTE format('CREATE POLICY "admin all %1$s" ON public.%1$s FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(),''admin''::app_role));', t);
    EXECUTE format('CREATE POLICY "auth read %1$s" ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
  END LOOP;
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('acquisition-documents','acquisition-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "acq docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'acquisition-documents');
CREATE POLICY "acq docs admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'acquisition-documents' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "acq docs admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'acquisition-documents' AND public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "acq docs admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'acquisition-documents' AND public.has_role(auth.uid(),'admin'::app_role));
