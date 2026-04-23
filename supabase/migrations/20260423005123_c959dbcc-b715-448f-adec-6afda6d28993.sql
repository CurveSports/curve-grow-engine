CREATE TABLE public.admin_alert_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  alert_signature text NOT NULL,
  dismissed_by uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, alert_signature)
);

ALTER TABLE public.admin_alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage admin_alert_dismissals"
ON public.admin_alert_dismissals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));