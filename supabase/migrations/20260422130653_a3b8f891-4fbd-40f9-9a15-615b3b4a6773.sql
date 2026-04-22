-- Tier ladder fields on derived_metrics
ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS next_tier text,
  ADD COLUMN IF NOT EXISTS next_tier_threshold integer,
  ADD COLUMN IF NOT EXISTS points_to_next_tier integer,
  ADD COLUMN IF NOT EXISTS fastest_path_engines jsonb,
  ADD COLUMN IF NOT EXISTS fastest_path_total_points integer,
  ADD COLUMN IF NOT EXISTS can_reach_next_tier boolean,
  ADD COLUMN IF NOT EXISTS active_project_engines jsonb,
  ADD COLUMN IF NOT EXISTS project_aligned_with_fastest_path boolean;

-- Tier history tracking
CREATE TABLE IF NOT EXISTS public.org_tier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  previous_tier text,
  new_tier text NOT NULL,
  previous_score integer,
  new_score integer,
  changed_at timestamptz NOT NULL DEFAULT now(),
  intake_submission_id uuid REFERENCES public.organization_intake(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_org_tier_history_org ON public.org_tier_history(org_id, changed_at DESC);

ALTER TABLE public.org_tier_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage tier history" ON public.org_tier_history;
CREATE POLICY "admins manage tier history"
  ON public.org_tier_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "org members view own tier history" ON public.org_tier_history;
CREATE POLICY "org members view own tier history"
  ON public.org_tier_history
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

-- Add tier_advancement to notification_type enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'tier_advancement'
      AND enumtypid = 'public.notification_type'::regtype
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'tier_advancement';
  END IF;
END$$;