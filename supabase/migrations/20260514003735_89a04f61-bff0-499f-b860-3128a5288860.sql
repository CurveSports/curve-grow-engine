
-- ============================================================
-- Part 1: Contact Segregation - Seasons, Teams, Groups, Dedupe
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.org_sport AS ENUM ('baseball','softball','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_member_role AS ENUM ('player','coach','assistant_coach','team_manager','parent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- org_seasons ----------
CREATE TABLE IF NOT EXISTS public.org_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sport public.org_sport NOT NULL DEFAULT 'baseball',
  season_start_date date NOT NULL,
  season_end_date date NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_seasons_org ON public.org_seasons(org_id);

DROP TRIGGER IF EXISTS trg_org_seasons_status ON public.org_seasons;
CREATE TRIGGER trg_org_seasons_status
  BEFORE INSERT OR UPDATE ON public.org_seasons
  FOR EACH ROW EXECUTE FUNCTION public.compute_season_status();

ALTER TABLE public.org_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read seasons" ON public.org_seasons
  FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write seasons" ON public.org_seasons
  FOR ALL USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));

-- ---------- org_teams ----------
CREATE TABLE IF NOT EXISTS public.org_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.org_seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  age_group text,
  division text,
  external_source text,
  external_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_teams_org ON public.org_teams(org_id);
CREATE INDEX IF NOT EXISTS idx_org_teams_season ON public.org_teams(season_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_teams_season_name ON public.org_teams(season_id, lower(name));

ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read teams" ON public.org_teams
  FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write teams" ON public.org_teams
  FOR ALL USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));

-- ---------- org_team_memberships ----------
CREATE TABLE IF NOT EXISTS public.org_team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.org_teams(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.org_contacts(id) ON DELETE CASCADE,
  role public.team_member_role NOT NULL,
  jersey_number text,
  position text,
  is_primary_parent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_membership ON public.org_team_memberships(team_id, contact_id, role);
CREATE INDEX IF NOT EXISTS idx_team_memberships_contact ON public.org_team_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON public.org_team_memberships(team_id);

ALTER TABLE public.org_team_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read memberships" ON public.org_team_memberships
  FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write memberships" ON public.org_team_memberships
  FOR ALL USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));

-- ---------- org_contact_groups ----------
CREATE TABLE IF NOT EXISTS public.org_contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  group_type text NOT NULL DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_group_name ON public.org_contact_groups(org_id, lower(name));

ALTER TABLE public.org_contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read groups" ON public.org_contact_groups
  FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write groups" ON public.org_contact_groups
  FOR ALL USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));

-- ---------- org_contact_group_members ----------
CREATE TABLE IF NOT EXISTS public.org_contact_group_members (
  group_id uuid NOT NULL REFERENCES public.org_contact_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.org_contacts(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_contact ON public.org_contact_group_members(contact_id);

ALTER TABLE public.org_contact_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read group members" ON public.org_contact_group_members
  FOR SELECT USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members write group members" ON public.org_contact_group_members
  FOR ALL USING (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(),'admin'));

-- ---------- org_contacts additions ----------
ALTER TABLE public.org_contacts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_normalized text;

-- Backfill phone_normalized (digits only)
UPDATE public.org_contacts
SET phone_normalized = regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')
WHERE phone IS NOT NULL AND (phone_normalized IS NULL OR phone_normalized = '');

-- Trigger to maintain phone_normalized
CREATE OR REPLACE FUNCTION public.normalize_contact_phone()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.phone_normalized := NULLIF(regexp_replace(coalesce(NEW.phone,''), '[^0-9]', '', 'g'), '');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_normalize_contact_phone ON public.org_contacts;
CREATE TRIGGER trg_normalize_contact_phone
  BEFORE INSERT OR UPDATE OF phone ON public.org_contacts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_contact_phone();

-- Dedup unique partial indexes (org-scoped)
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_contacts_email
  ON public.org_contacts (org_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_contacts_phone
  ON public.org_contacts (org_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

-- ---------- find_duplicate_contact ----------
CREATE OR REPLACE FUNCTION public.find_duplicate_contact(
  _org_id uuid, _email text, _phone text, _first_name text, _last_name text
) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_phone_norm text := NULLIF(regexp_replace(coalesce(_phone,''), '[^0-9]', '', 'g'), '');
BEGIN
  IF _email IS NOT NULL AND _email <> '' THEN
    SELECT id INTO v_id FROM public.org_contacts
      WHERE org_id = _org_id AND lower(email) = lower(_email) LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  IF v_phone_norm IS NOT NULL THEN
    SELECT id INTO v_id FROM public.org_contacts
      WHERE org_id = _org_id AND phone_normalized = v_phone_norm LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  IF _first_name IS NOT NULL AND _last_name IS NOT NULL THEN
    SELECT id INTO v_id FROM public.org_contacts
      WHERE org_id = _org_id
        AND lower(first_name) = lower(_first_name)
        AND lower(last_name) = lower(_last_name)
        AND (email IS NULL OR email = '')
        AND (phone_normalized IS NULL OR phone_normalized = '')
      LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  RETURN NULL;
END $$;

-- ---------- updated_at triggers ----------
DROP TRIGGER IF EXISTS trg_org_teams_updated ON public.org_teams;
CREATE TRIGGER trg_org_teams_updated BEFORE UPDATE ON public.org_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_org_groups_updated ON public.org_contact_groups;
CREATE TRIGGER trg_org_groups_updated BEFORE UPDATE ON public.org_contact_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
