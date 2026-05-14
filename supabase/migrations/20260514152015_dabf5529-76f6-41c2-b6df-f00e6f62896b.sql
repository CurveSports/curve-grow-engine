
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS short_domain text;

ALTER TABLE public.org_contacts ADD COLUMN IF NOT EXISTS best_send_hour smallint
  CHECK (best_send_hour IS NULL OR (best_send_hour >= 0 AND best_send_hour <= 23));

ALTER TABLE public.org_email_sends ADD COLUMN IF NOT EXISTS send_at_optimal_time boolean NOT NULL DEFAULT false;

ALTER TABLE public.org_nps_responses ADD COLUMN IF NOT EXISTS followup_resolved_outcome text;

CREATE TABLE IF NOT EXISTS public.org_email_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email_send_id uuid NOT NULL REFERENCES public.org_email_sends(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.org_contacts(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_queue_due ON public.org_email_send_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_org ON public.org_email_send_queue(org_id);
ALTER TABLE public.org_email_send_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage own queue" ON public.org_email_send_queue
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.org_cost_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cost_type text NOT NULL,
  amount_usd numeric(10,4) NOT NULL DEFAULT 0,
  units int,
  description text,
  meta jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cost_log_org_date ON public.org_cost_log(org_id, occurred_at DESC);
ALTER TABLE public.org_cost_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members view own costs" ON public.org_cost_log
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert costs" ON public.org_cost_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.org_ab_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  test_type text NOT NULL DEFAULT 'subject',
  variant_a_email_send_id uuid REFERENCES public.org_email_sends(id) ON DELETE SET NULL,
  variant_b_email_send_id uuid REFERENCES public.org_email_sends(id) ON DELETE SET NULL,
  sample_size int,
  winner_metric text NOT NULL DEFAULT 'open_rate',
  decision_window_hours int NOT NULL DEFAULT 24,
  winner_variant text,
  winner_picked_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ab_runs_org ON public.org_ab_test_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_ab_runs_running ON public.org_ab_test_runs(status) WHERE status = 'running';
ALTER TABLE public.org_ab_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage own ab tests" ON public.org_ab_test_runs
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ab_runs_updated_at BEFORE UPDATE ON public.org_ab_test_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
