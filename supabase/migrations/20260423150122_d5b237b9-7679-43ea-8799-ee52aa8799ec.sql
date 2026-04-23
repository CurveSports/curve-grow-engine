-- Add warm_reasons array column to sponsorship_leads
ALTER TABLE public.sponsorship_leads 
ADD COLUMN IF NOT EXISTS warm_reasons text[] DEFAULT '{}'::text[];

-- Add ai_generated flag for admin AI-generated leads (helps QA/verify)
ALTER TABLE public.sponsorship_leads
ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;

ALTER TABLE public.sponsorship_leads
ADD COLUMN IF NOT EXISTS ai_generation_notes text;

-- RPC: get org-facing sponsorship view (RLS-safe via SECURITY DEFINER + org membership check)
CREATE OR REPLACE FUNCTION public.get_org_sponsorship_view(p_org_id uuid)
RETURNS TABLE (
  id uuid,
  business_name text,
  contact_name text,
  business_type text,
  city_state text,
  source text,
  is_warm boolean,
  warm_reasons text[],
  warm_notes text,
  stage text,
  stage_simplified text,
  sponsorship_tier text,
  closed_value numeric,
  closed_at timestamptz,
  submitted_at timestamptz,
  last_stage_change_at timestamptz,
  assigned_rep_name text,
  client_notes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be admin OR a member of the requested org
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.current_org_id() = p_org_id
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    sl.id,
    sl.business_name,
    sl.contact_name,
    sl.business_type,
    sl.city_state,
    sl.source,
    sl.is_warm,
    COALESCE(sl.warm_reasons, '{}'::text[]) AS warm_reasons,
    sl.warm_notes,
    sl.stage,
    CASE sl.stage
      WHEN 'new_lead' THEN 'Submitted — awaiting outreach'
      WHEN 'contacted' THEN 'DSF team has reached out'
      WHEN 'responded' THEN 'In conversation'
      WHEN 'meeting_scheduled' THEN 'Meeting scheduled'
      WHEN 'proposal_sent' THEN 'Proposal delivered'
      WHEN 'negotiating' THEN 'In final discussions'
      WHEN 'closed_won' THEN 'Partnership secured'
      WHEN 'closed_lost' THEN 'Not pursued'
      ELSE sl.stage
    END AS stage_simplified,
    sl.sponsorship_tier,
    sl.closed_value,
    sl.closed_at,
    sl.submitted_at,
    sl.last_stage_change_at,
    COALESCE(p_rep.full_name, p_rep.email) AS assigned_rep_name,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'note_text', sln.note_text,
          'created_at', sln.created_at,
          'author_name', COALESCE(p_author.full_name, p_author.email)
        ) ORDER BY sln.created_at DESC
      )
      FROM public.sponsorship_lead_notes sln
      LEFT JOIN public.profiles p_author ON p_author.user_id = sln.created_by
      WHERE sln.lead_id = sl.id
        AND sln.is_client_visible = true
    ) AS client_notes
  FROM public.sponsorship_leads sl
  LEFT JOIN public.profiles p_rep ON p_rep.user_id = sl.assigned_to
  WHERE sl.org_id = p_org_id
    AND sl.is_active = true
  ORDER BY
    CASE WHEN sl.is_warm THEN 0 ELSE 1 END,
    sl.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_sponsorship_view(uuid) TO authenticated;

-- Org users need to INSERT their own leads (admins already covered by 'admins manage sponsorship_leads')
CREATE POLICY "org members insert own leads"
ON public.sponsorship_leads
FOR INSERT
TO authenticated
WITH CHECK (
  org_id = public.current_org_id()
  AND created_by = auth.uid()
);
