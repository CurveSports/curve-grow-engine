
-- ============================================================
-- Phase 1: Per-org platform quick-links + extend comm log
-- Phase 2: Per-user email connections (Gmail / Outlook)
-- ============================================================

-- ── Phase 1: org_send_platforms ──────────────────────────────
CREATE TABLE public.org_send_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  platform_type text NOT NULL DEFAULT 'other',  -- sportsengine | leagueapps | teamsnap | mailchimp | statstack | other
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_send_platforms_org ON public.org_send_platforms(org_id, display_order);

ALTER TABLE public.org_send_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_send_platforms"
  ON public.org_send_platforms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own send platforms"
  ON public.org_send_platforms FOR SELECT TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org primary insert send platforms"
  ON public.org_send_platforms FOR INSERT TO authenticated
  WITH CHECK (org_id = current_org_id() AND is_org_primary(auth.uid(), org_id) AND created_by = auth.uid());

CREATE POLICY "org primary update send platforms"
  ON public.org_send_platforms FOR UPDATE TO authenticated
  USING (org_id = current_org_id() AND is_org_primary(auth.uid(), org_id))
  WITH CHECK (org_id = current_org_id() AND is_org_primary(auth.uid(), org_id));

CREATE POLICY "org primary delete send platforms"
  ON public.org_send_platforms FOR DELETE TO authenticated
  USING (org_id = current_org_id() AND is_org_primary(auth.uid(), org_id));

-- ── Phase 1: extend org_communication_log with channel info ──
ALTER TABLE public.org_communication_log
  ADD COLUMN sent_at timestamp with time zone,
  ADD COLUMN send_channel text,            -- copy_paste | gmail | outlook | platform
  ADD COLUMN send_platform_id uuid REFERENCES public.org_send_platforms(id) ON DELETE SET NULL,
  ADD COLUMN send_recipient text,
  ADD COLUMN send_subject text,
  ADD COLUMN send_body_excerpt text,
  ADD COLUMN calendar_item_id uuid REFERENCES public.org_calendar_items(id) ON DELETE SET NULL,
  ADD COLUMN external_message_id text;

-- ── Phase 2: user_email_connections ──────────────────────────
CREATE TABLE public.user_email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,                   -- 'gmail' | 'outlook'
  email_address text NOT NULL,
  display_name text,
  refresh_token_encrypted text NOT NULL,
  access_token_encrypted text,
  token_expires_at timestamp with time zone,
  scopes text,
  status text NOT NULL DEFAULT 'active',    -- 'active' | 'revoked' | 'expired'
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone,
  last_error text,
  UNIQUE(user_id, provider, email_address)
);

CREATE INDEX idx_user_email_conn_user ON public.user_email_connections(user_id, status);

ALTER TABLE public.user_email_connections ENABLE ROW LEVEL SECURITY;

-- Users see only their own connections (no token columns will be sent to client; tokens used only via edge function)
CREATE POLICY "users view own email connections"
  ON public.user_email_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can disconnect their own
CREATE POLICY "users delete own email connections"
  ON public.user_email_connections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Inserts/updates handled by edge functions using service role; no client-side INSERT/UPDATE policies.

-- OAuth state (CSRF protection during oauth handshake)
CREATE TABLE public.user_email_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  redirect_to text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_email_oauth_states ENABLE ROW LEVEL SECURITY;
-- No policies — only service role accesses this table.
