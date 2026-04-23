-- ============================================================
-- ROUND 10 — Communication Calendar tables
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. org_communication_tracks: which age groups org serves
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.org_communication_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  has_youth_track boolean NOT NULL DEFAULT false,
  has_hs_track boolean NOT NULL DEFAULT false,
  tracks_configured_at timestamptz,
  tracks_configured_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

ALTER TABLE public.org_communication_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_communication_tracks"
  ON public.org_communication_tracks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own tracks"
  ON public.org_communication_tracks FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY "org members insert own tracks"
  ON public.org_communication_tracks FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "org members update own tracks"
  ON public.org_communication_tracks FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER trg_tracks_updated_at
  BEFORE UPDATE ON public.org_communication_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────
-- 2. org_communication_seasons: per-track per-season records
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.org_communication_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('youth', 'hs')),
  season_name text NOT NULL,
  has_tryouts boolean NOT NULL DEFAULT false,
  tryout_date date,
  tryout_date_tbd boolean NOT NULL DEFAULT false,
  season_start_date date NOT NULL,
  season_end_date date NOT NULL,
  re_enrollment_deadline date,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seasons_org ON public.org_communication_seasons(org_id);
CREATE INDEX idx_seasons_status ON public.org_communication_seasons(status);

ALTER TABLE public.org_communication_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_communication_seasons"
  ON public.org_communication_seasons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own seasons"
  ON public.org_communication_seasons FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE POLICY "org members insert own seasons"
  ON public.org_communication_seasons FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id() AND created_by = auth.uid());

CREATE POLICY "org members update own seasons"
  ON public.org_communication_seasons FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY "org members delete own seasons"
  ON public.org_communication_seasons FOR DELETE TO authenticated
  USING (org_id = public.current_org_id());

-- Auto-compute season status based on today vs start/end dates
CREATE OR REPLACE FUNCTION public.compute_season_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.season_start_date > CURRENT_DATE THEN 'upcoming'
    WHEN NEW.season_end_date < CURRENT_DATE THEN 'completed'
    ELSE 'active'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seasons_compute_status
  BEFORE INSERT OR UPDATE OF season_start_date, season_end_date ON public.org_communication_seasons
  FOR EACH ROW EXECUTE FUNCTION public.compute_season_status();

CREATE TRIGGER trg_seasons_updated_at
  BEFORE UPDATE ON public.org_communication_seasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────
-- 3. org_calendar_items: all calendar items (system + custom)
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.org_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.org_communication_seasons(id) ON DELETE CASCADE,
  track text CHECK (track IN ('youth','hs','both')),

  system_code text,
  title text NOT NULL,
  description text,
  phase text NOT NULL CHECK (phase IN ('pre_season','in_season','post_season')),

  timing_type text NOT NULL CHECK (timing_type IN ('relative','recurring','manual')),
  timing_anchor text CHECK (timing_anchor IN ('tryout_date','season_start','season_end','re_enrollment_deadline')),
  timing_offset_days integer,
  timing_direction text CHECK (timing_direction IN ('before','after')),
  timing_note text,
  recurrence_frequency text CHECK (recurrence_frequency IN ('weekly','monthly')),
  recurrence_day text,
  recurrence_note text,

  calculated_due_date date,
  is_tbd boolean NOT NULL DEFAULT false,

  stakeholder text NOT NULL,
  ai_communication_type text,

  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  sent_by uuid,
  sent_notes text,

  is_system_item boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  is_non_negotiable boolean NOT NULL DEFAULT false,

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_items_org ON public.org_calendar_items(org_id);
CREATE INDEX idx_calendar_items_season ON public.org_calendar_items(season_id);
CREATE INDEX idx_calendar_items_phase ON public.org_calendar_items(phase);
CREATE INDEX idx_calendar_items_due ON public.org_calendar_items(calculated_due_date);

ALTER TABLE public.org_calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_calendar_items"
  ON public.org_calendar_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own calendar items"
  ON public.org_calendar_items FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

-- Org members can insert custom items only
CREATE POLICY "org members insert custom items"
  ON public.org_calendar_items FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.current_org_id()
    AND is_custom = true
    AND is_system_item = false
    AND created_by = auth.uid()
  );

-- Org members can update sent status, sent notes, and edit their own custom items
CREATE POLICY "org members update own calendar items"
  ON public.org_calendar_items FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- Org members can delete only their own custom items (not system items)
CREATE POLICY "org members delete own custom items"
  ON public.org_calendar_items FOR DELETE TO authenticated
  USING (
    org_id = public.current_org_id()
    AND is_custom = true
    AND is_system_item = false
  );

CREATE TRIGGER trg_calendar_items_updated_at
  BEFORE UPDATE ON public.org_calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ──────────────────────────────────────────────────────────
-- 4. org_communication_standards: per-org standards override
-- ──────────────────────────────────────────────────────────
CREATE TABLE public.org_communication_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  standards_content jsonb NOT NULL,
  last_updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id)
);

ALTER TABLE public.org_communication_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage org_communication_standards"
  ON public.org_communication_standards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own standards"
  ON public.org_communication_standards FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

CREATE TRIGGER trg_standards_updated_at
  BEFORE UPDATE ON public.org_communication_standards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();