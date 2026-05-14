CREATE OR REPLACE FUNCTION public.count_segment_contacts(_segment_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s RECORD;
  v_count integer;
BEGIN
  SELECT * INTO s FROM public.org_contact_segments WHERE id = _segment_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  EXECUTE 'SELECT count(DISTINCT c.id) FROM public.org_contacts c
    LEFT JOIN public.org_team_memberships tm ON tm.contact_id = c.id
    LEFT JOIN public.org_teams t ON t.id = tm.team_id
    LEFT JOIN public.org_contact_group_members gm ON gm.contact_id = c.id
    WHERE c.org_id = $1
    AND ($2->>''contact_type'' IS NULL OR c.contact_type = $2->>''contact_type'')
    AND ($2->''contact_types'' IS NULL OR c.contact_type = ANY(SELECT jsonb_array_elements_text($2->''contact_types'')))
    AND ($2->>''season'' IS NULL OR c.season = $2->>''season'')
    AND ($2->''team_assignments'' IS NULL OR c.team_assignments && (SELECT array_agg(value) FROM jsonb_array_elements_text($2->''team_assignments'')))
    AND ($2->>''sms_opt_in'' IS NULL OR c.sms_opt_in = ($2->>''sms_opt_in'')::boolean)
    AND ($2->>''unsubscribed'' IS NULL OR c.unsubscribed = ($2->>''unsubscribed'')::boolean)
    AND ($2->>''grad_year'' IS NULL OR c.player_grad_year = ($2->>''grad_year'')::int)
    AND ($2->>''season_id'' IS NULL OR t.season_id = ($2->>''season_id'')::uuid)
    AND ($2->>''team_id'' IS NULL OR tm.team_id = ($2->>''team_id'')::uuid)
    AND ($2->>''team_role'' IS NULL OR tm.role = $2->>''team_role'')
    AND ($2->>''group_id'' IS NULL OR gm.group_id = ($2->>''group_id'')::uuid)
    AND (CASE WHEN $2->>''archived'' = ''true'' THEN c.archived_at IS NOT NULL
              WHEN $2->>''archived'' = ''false'' THEN c.archived_at IS NULL
              ELSE true END)'
  INTO v_count USING s.org_id, s.filter_rules;

  RETURN COALESCE(v_count, 0);
END;
$function$;