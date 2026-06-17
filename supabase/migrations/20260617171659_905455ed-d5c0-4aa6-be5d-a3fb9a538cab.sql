
CREATE TABLE public.public_audit_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_token text NOT NULL UNIQUE,
  org_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text,
  city_state text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  internal_alert_sent_at timestamptz,
  confirmation_sent_at timestamptz,
  ip_address text,
  user_agent text,
  honeypot_tripped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_public_audit_leads_created_at ON public.public_audit_leads (created_at DESC);
CREATE INDEX idx_public_audit_leads_status ON public.public_audit_leads (status);
CREATE INDEX idx_public_audit_leads_ip_recent ON public.public_audit_leads (ip_address, created_at DESC);

GRANT SELECT, UPDATE ON public.public_audit_leads TO authenticated;
GRANT ALL ON public.public_audit_leads TO service_role;

ALTER TABLE public.public_audit_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit leads"
  ON public.public_audit_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update audit leads"
  ON public.public_audit_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_public_audit_leads_updated_at
  BEFORE UPDATE ON public.public_audit_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC for report page (anyone with the token can view the sanitized report).
CREATE OR REPLACE FUNCTION public.get_public_audit_report(_token text)
RETURNS TABLE (
  org_name text,
  contact_name text,
  report_payload jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_name, contact_name, report_payload, created_at
  FROM public.public_audit_leads
  WHERE report_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_audit_report(text) TO anon, authenticated;
