
-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'org_user');
CREATE TYPE public.monetization_tier AS ENUM ('Foundational','Emerging','Growth','Advanced','Elite');
CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','revoked','expired');

-- =========================================================================
-- ORGANIZATIONS
-- =========================================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  city_state TEXT,
  org_type TEXT,
  primary_user_id UUID, -- references auth.users.id of org primary
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- PROFILES (links auth users -> org + email cache)
-- =========================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- USER ROLES (separate table — security best practice)
-- =========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- =========================================================================
-- ORGANIZATION INTAKE
-- =========================================================================
CREATE TABLE public.organization_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Section 1: Organization Profile
  organization_name TEXT,
  primary_contact_name TEXT,
  email TEXT,
  phone TEXT,
  city_state TEXT,
  market_type TEXT,
  org_type TEXT,
  years_in_operation TEXT,
  current_growth_trend TEXT,
  player_mix TEXT,
  local_market_competition TEXT,
  organization_focus TEXT,
  market_strategy TEXT,

  -- Section 2: Player & Team Structure
  total_players INTEGER,
  hs_players INTEGER,
  youth_players INTEGER,
  total_teams INTEGER,
  average_roster_size INTEGER,
  seasons_offered TEXT[],
  team_structure TEXT,
  typical_player_participation TEXT,
  player_commitment_level TEXT,
  demand_for_organization TEXT,
  player_selection_approach TEXT,

  -- Section 3: Revenue
  total_annual_revenue NUMERIC,
  avg_hs_player_fee NUMERIC,
  avg_youth_player_fee NUMERIC,
  dues_inclusions TEXT[],
  tiered_packages TEXT,
  price_point TEXT,
  knows_profit_margin TEXT,
  profit_margin_range TEXT,
  seeks_sponsorships TEXT,
  number_of_sponsors INTEGER,
  total_sponsorship_revenue NUMERIC,
  apparel_revenue NUMERIC,
  apparel_margin TEXT,
  apparel_model TEXT,
  runs_own_events TEXT,
  events_per_year INTEGER,
  total_event_revenue NUMERIC,
  camps_revenue NUMERIC,
  clinics_revenue NUMERIC,
  lessons_revenue NUMERIC,
  showcase_revenue NUMERIC,
  other_addon_revenue NUMERIC,
  facility_rental_revenue NUMERIC,

  -- Section 4: Retention
  retention_pct NUMERIC,
  avg_player_years NUMERIC,

  -- Section 5: Operations
  operational_structure TEXT,
  parent_communication TEXT[],
  coach_alignment TEXT,
  coaching_structure TEXT,
  pricing_approach TEXT,
  sponsorship_approach TEXT,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- DERIVED METRICS
-- =========================================================================
CREATE TABLE public.derived_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  market_multiplier NUMERIC,
  revenue_benchmark NUMERIC,
  revenue_per_player NUMERIC,
  hs_player_pct NUMERIC,
  dues_revenue NUMERIC,
  non_dues_revenue NUMERIC,
  non_dues_revenue_per_player NUMERIC,
  dues_revenue_pct NUMERIC,
  sponsorship_revenue_per_sponsor NUMERIC,
  add_on_revenue NUMERIC,
  add_on_revenue_per_player NUMERIC,
  revenue_per_event NUMERIC,
  estimated_returning_players NUMERIC,
  estimated_churned_players NUMERIC,
  revenue_gap NUMERIC,
  at_benchmark BOOLEAN,

  apparel_margin_pct NUMERIC,
  apparel_profit NUMERIC,
  apparel_revenue_per_player NUMERIC,
  facility_revenue_pct NUMERIC,

  pricing_opportunity_low NUMERIC,
  pricing_opportunity_high NUMERIC,
  sponsorship_opportunity_low NUMERIC,
  sponsorship_opportunity_high NUMERIC,
  apparel_opportunity_low NUMERIC,
  apparel_opportunity_high NUMERIC,
  event_opportunity_low NUMERIC,
  event_opportunity_high NUMERIC,
  addon_opportunity_low NUMERIC,
  addon_opportunity_high NUMERIC,
  retention_opportunity_low NUMERIC,
  retention_opportunity_high NUMERIC,
  total_opportunity_low NUMERIC,
  total_opportunity_high NUMERIC,

  pricing_score INTEGER,
  sponsorship_score INTEGER,
  apparel_score INTEGER,
  event_score INTEGER,
  addon_score INTEGER,
  retention_score INTEGER,
  total_engine_score INTEGER,
  monetization_tier public.monetization_tier,
  priority_engine TEXT,

  high_dues_concentration BOOLEAN,
  high_sponsorship_dependency BOOLEAN,

  diagnosis_text TEXT,
  next_steps JSONB,

  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- INVITATIONS
-- =========================================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- null for admin invites
  role public.app_role NOT NULL DEFAULT 'org_user',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE INDEX idx_invitations_email ON public.invitations(lower(email));
CREATE INDEX idx_invitations_org ON public.invitations(org_id);

-- =========================================================================
-- SECURITY DEFINER HELPERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_primary(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND primary_user_id = _user_id);
$$;

-- =========================================================================
-- update_updated_at trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intake_updated BEFORE UPDATE ON public.organization_intake
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- handle_new_user: auto-create profile, assign role from invitation, link org
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_org_id UUID;
BEGIN
  -- Seed admin: matt.gerber@curvesports.com
  IF lower(NEW.email) = 'matt.gerber@curvesports.com' THEN
    INSERT INTO public.profiles (user_id, email, org_id)
    VALUES (NEW.id, NEW.email, NULL)
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Otherwise look for a pending invitation
  SELECT * INTO v_invite FROM public.invitations
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  IF v_invite IS NOT NULL THEN
    v_org_id := v_invite.org_id;
    INSERT INTO public.profiles (user_id, email, org_id)
    VALUES (NEW.id, NEW.email, v_org_id)
    ON CONFLICT (user_id) DO UPDATE SET org_id = EXCLUDED.org_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_invite.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If primary, set on org
    IF v_invite.is_primary AND v_org_id IS NOT NULL THEN
      UPDATE public.organizations SET primary_user_id = NEW.id WHERE id = v_org_id;
    END IF;

    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invite.id;
  ELSE
    -- No invite: create empty profile, no role (effectively no access)
    INSERT INTO public.profiles (user_id, email) VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- RLS
-- =========================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.derived_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- organizations
CREATE POLICY "admins manage orgs" ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org users view own org" ON public.organizations FOR SELECT
  USING (id = public.current_org_id());
CREATE POLICY "org primary updates own org" ON public.organizations FOR UPDATE
  USING (primary_user_id = auth.uid());

-- profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users view org peers" ON public.profiles FOR SELECT
  USING (org_id IS NOT NULL AND org_id = public.current_org_id());
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- intake
CREATE POLICY "admins manage intake" ON public.organization_intake FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members view intake" ON public.organization_intake FOR SELECT
  USING (org_id = public.current_org_id());
CREATE POLICY "org members insert intake" ON public.organization_intake FOR INSERT
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "org members update intake" ON public.organization_intake FOR UPDATE
  USING (org_id = public.current_org_id());

-- derived_metrics
CREATE POLICY "admins view all metrics" ON public.derived_metrics FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members view metrics" ON public.derived_metrics FOR SELECT
  USING (org_id = public.current_org_id());
-- writes only via edge function (service role bypasses RLS)

-- invitations
CREATE POLICY "admins manage invites" ON public.invitations FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org primary view org invites" ON public.invitations FOR SELECT
  USING (org_id IS NOT NULL AND public.is_org_primary(auth.uid(), org_id));
CREATE POLICY "org primary creates invites" ON public.invitations FOR INSERT
  WITH CHECK (
    org_id IS NOT NULL
    AND public.is_org_primary(auth.uid(), org_id)
    AND role = 'org_user'
    AND is_primary = false
    AND invited_by = auth.uid()
  );
CREATE POLICY "org primary revokes own invites" ON public.invitations FOR UPDATE
  USING (org_id IS NOT NULL AND public.is_org_primary(auth.uid(), org_id));
