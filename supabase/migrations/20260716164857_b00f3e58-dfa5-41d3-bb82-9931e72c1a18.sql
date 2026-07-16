
ALTER TABLE public.org_nps_surveys
  ADD COLUMN IF NOT EXISTS master_question_order uuid[] DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.get_public_survey(_slug text, _preview_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(row) FROM (
    SELECT s.id, s.name, s.question, s.master_version,
           s.collect_team, s.collect_age_group, s.is_open, s.public_slug,
           s.followup_question_promoter, s.followup_question_passive, s.followup_question_detractor,
           s.included_master_question_ids,
           s.master_question_order,
           s.org_id, o.name AS org_name, b.logo_url AS org_logo_url
    FROM public.org_nps_surveys s
    JOIN public.organizations o ON o.id = s.org_id
    LEFT JOIN public.org_branding b ON b.org_id = s.org_id
    WHERE (_slug IS NOT NULL AND s.public_slug = _slug AND s.is_open = true)
       OR (_preview_id IS NOT NULL AND s.id = _preview_id)
    LIMIT 1
  ) row;
$function$;
