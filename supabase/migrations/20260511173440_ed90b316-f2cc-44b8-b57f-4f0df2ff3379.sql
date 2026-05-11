
-- ============================================================
-- PORTAL USERS (seller logins)
-- ============================================================
CREATE TABLE public.acquisition_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_type text NOT NULL DEFAULT 'seller' CHECK (portal_type = 'seller'),
  display_name text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  access_granted_at timestamptz NOT NULL DEFAULT now(),
  access_expires_at timestamptz,
  last_login_at timestamptz,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(acquisition_id, user_id)
);

CREATE INDEX idx_portal_users_acquisition ON public.acquisition_portal_users(acquisition_id);
CREATE INDEX idx_portal_users_user ON public.acquisition_portal_users(user_id);

ALTER TABLE public.acquisition_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users manage portal_users" ON public.acquisition_portal_users
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "sellers view own portal_users row" ON public.acquisition_portal_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- STAFF TOKENS (no-login onboarding URLs)
-- ============================================================
CREATE TABLE public.acquisition_staff_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.acquisition_staff(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  last_accessed_at timestamptz,
  access_count integer NOT NULL DEFAULT 0,
  link_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id)
);

CREATE INDEX idx_staff_tokens_token ON public.acquisition_staff_tokens(token);
CREATE INDEX idx_staff_tokens_staff ON public.acquisition_staff_tokens(staff_id);
CREATE INDEX idx_staff_tokens_acquisition ON public.acquisition_staff_tokens(acquisition_id);

ALTER TABLE public.acquisition_staff_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users manage staff_tokens" ON public.acquisition_staff_tokens
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

-- ============================================================
-- PORTAL ACTIVITY (logins, views, uploads, etc.)
-- ============================================================
CREATE TABLE public.acquisition_portal_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  portal_user_id uuid REFERENCES public.acquisition_portal_users(id) ON DELETE SET NULL,
  staff_token_id uuid REFERENCES public.acquisition_staff_tokens(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL CHECK (action IN (
    'login','page_view','view_task','update_task','add_note',
    'upload_document','view_document','submit_compliance_item',
    'acknowledge_handbook','send_message','view_timeline'
  )),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_activity_acquisition ON public.acquisition_portal_activity(acquisition_id, created_at DESC);

ALTER TABLE public.acquisition_portal_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users view portal_activity" ON public.acquisition_portal_activity
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users insert portal_activity" ON public.acquisition_portal_activity
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "sellers insert own portal_activity" ON public.acquisition_portal_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    portal_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.acquisition_portal_users pu
      WHERE pu.id = portal_user_id AND pu.user_id = auth.uid()
    )
  );

-- ============================================================
-- PORTAL CONFIG (per-acquisition settings)
-- ============================================================
CREATE TABLE public.acquisition_portal_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  config_key text NOT NULL,
  config_value text,
  config_label text,
  display_order integer NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(acquisition_id, config_key)
);

CREATE INDEX idx_portal_config_acquisition ON public.acquisition_portal_config(acquisition_id, config_key);

ALTER TABLE public.acquisition_portal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users manage portal_config" ON public.acquisition_portal_config
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

-- ============================================================
-- PORTAL CONTENT (rich text blocks)
-- ============================================================
CREATE TABLE public.acquisition_portal_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  portal_type text NOT NULL CHECK (portal_type IN ('seller','staff')),
  content_key text NOT NULL,
  content_text text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(acquisition_id, portal_type, content_key)
);

CREATE INDEX idx_portal_content_acquisition ON public.acquisition_portal_content(acquisition_id, portal_type);

ALTER TABLE public.acquisition_portal_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users manage portal_content" ON public.acquisition_portal_content
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

-- ============================================================
-- TOKEN GENERATION HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_staff_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_token text := '';
  i int;
BEGIN
  FOR i IN 1..32 LOOP
    v_token := v_token || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  END LOOP;
  RETURN v_token;
END;
$$;

-- Trigger: auto-create token on staff insert
CREATE OR REPLACE FUNCTION public.create_staff_token_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_token := public.generate_staff_token();
    BEGIN
      INSERT INTO public.acquisition_staff_tokens (acquisition_id, staff_id, token)
      VALUES (NEW.acquisition_id, NEW.id, v_token);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN RAISE; END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_staff_token
AFTER INSERT ON public.acquisition_staff
FOR EACH ROW EXECUTE FUNCTION public.create_staff_token_on_insert();

-- Backfill tokens for existing staff
INSERT INTO public.acquisition_staff_tokens (acquisition_id, staff_id, token)
SELECT s.acquisition_id, s.id, public.generate_staff_token()
FROM public.acquisition_staff s
LEFT JOIN public.acquisition_staff_tokens t ON t.staff_id = s.id
WHERE t.id IS NULL;

-- ============================================================
-- AUTO-SEED PORTAL CONFIG ON NEW ACQUISITION
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_portal_config(_acq_id uuid, _state text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.acquisition_portal_config (acquisition_id, config_key, config_label, display_order) VALUES
    (_acq_id, 'background_check_portal_url', 'Background Check Portal URL', 1),
    (_acq_id, 'background_check_instructions', 'Additional background check instructions', 2),
    (_acq_id, 'concussion_training_url', 'Concussion Training Portal URL', 10),
    (_acq_id, 'concussion_training_instructions', 'Concussion training instructions', 11),
    (_acq_id, 'abuse_prevention_training_url', 'Abuse Prevention Training Portal URL', 12),
    (_acq_id, 'abuse_prevention_instructions', 'Abuse prevention training instructions', 13),
    (_acq_id, 'compliance_deadline', 'Overall compliance deadline', 20),
    (_acq_id, 'compliance_contact_name', 'Compliance contact person', 21),
    (_acq_id, 'compliance_contact_email', 'Compliance contact email', 22),
    (_acq_id, 'receipt_submission_instructions', 'Receipt/reimbursement instructions', 23)
  ON CONFLICT (acquisition_id, config_key) DO NOTHING;

  IF _state IS NOT NULL AND lower(_state) IN ('florida','fl') THEN
    INSERT INTO public.acquisition_portal_config (acquisition_id, config_key, config_label, display_order) VALUES
      (_acq_id, 'ori_number', 'FDLE ORI Number', 30),
      (_acq_id, 'fingerprint_vendor_1_name', 'Fingerprint Vendor 1 — Name', 31),
      (_acq_id, 'fingerprint_vendor_1_address', 'Fingerprint Vendor 1 — Address', 32),
      (_acq_id, 'fingerprint_vendor_1_url', 'Fingerprint Vendor 1 — Booking Link', 33),
      (_acq_id, 'fingerprint_vendor_2_name', 'Fingerprint Vendor 2 — Name', 34),
      (_acq_id, 'fingerprint_vendor_2_address', 'Fingerprint Vendor 2 — Address', 35),
      (_acq_id, 'fingerprint_vendor_2_url', 'Fingerprint Vendor 2 — Booking Link', 36),
      (_acq_id, 'fingerprint_vendor_3_name', 'Fingerprint Vendor 3 — Name', 37),
      (_acq_id, 'fingerprint_vendor_3_address', 'Fingerprint Vendor 3 — Address', 38),
      (_acq_id, 'fingerprint_vendor_3_url', 'Fingerprint Vendor 3 — Booking Link', 39),
      (_acq_id, 'fingerprint_instructions', 'Additional fingerprinting instructions', 40)
    ON CONFLICT (acquisition_id, config_key) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_portal_config_on_acquisition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_portal_config(NEW.id, NEW.state);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_portal_config
AFTER INSERT ON public.acquisition_projects
FOR EACH ROW EXECUTE FUNCTION public.seed_portal_config_on_acquisition();

-- Backfill config for existing acquisitions
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, state FROM public.acquisition_projects LOOP
    PERFORM public.seed_portal_config(r.id, r.state);
  END LOOP;
END $$;
