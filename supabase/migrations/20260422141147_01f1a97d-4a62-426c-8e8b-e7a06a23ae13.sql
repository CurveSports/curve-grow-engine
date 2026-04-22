CREATE TABLE public.org_communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  generated_by uuid NOT NULL,
  generated_on_behalf_of_org boolean NOT NULL DEFAULT false,
  communication_type text NOT NULL,
  tone text,
  format text,
  prompt_text text,
  was_refined boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_log_org ON public.org_communication_log(org_id, generated_at DESC);

ALTER TABLE public.org_communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage communication log"
  ON public.org_communication_log
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own communication log"
  ON public.org_communication_log
  FOR SELECT
  TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org members insert own communication log"
  ON public.org_communication_log
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id = current_org_id() AND generated_by = auth.uid());