
CREATE TABLE IF NOT EXISTS public.invite_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  link_type TEXT,
  action_link TEXT,
  sent_email BOOLEAN NOT NULL DEFAULT false,
  email_error TEXT,
  user_existed BOOLEAN,
  was_confirmed BOOLEAN,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_send_log_email ON public.invite_send_log (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_send_log_org ON public.invite_send_log (org_id, created_at DESC);

ALTER TABLE public.invite_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invite send log"
  ON public.invite_send_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
