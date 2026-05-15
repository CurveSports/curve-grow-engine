CREATE OR REPLACE FUNCTION public.count_segment_contacts(_segment_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s record;
  v_count integer;
begin
  select * into s from public.org_contact_segments where id = _segment_id;
  if not found then return 0; end if;

  execute 'select count(distinct c.id) from public.org_contacts c
    left join public.org_team_memberships tm on tm.contact_id = c.id
    left join public.org_teams t on t.id = tm.team_id
    left join public.org_contact_group_members gm on gm.contact_id = c.id
    where c.org_id = $1
    and ($2->>''contact_type'' is null or c.contact_type = $2->>''contact_type'')
    and ($2->''contact_types'' is null or c.contact_type = any(select jsonb_array_elements_text($2->''contact_types'')))
    and ($2->>''season'' is null or c.season = $2->>''season'')
    and ($2->''team_assignments'' is null or c.team_assignments && (select array_agg(value) from jsonb_array_elements_text($2->''team_assignments'')))
    and ($2->>''sms_opt_in'' is null or c.sms_opt_in = ($2->>''sms_opt_in'')::boolean)
    and ($2->>''unsubscribed'' is null or c.unsubscribed = ($2->>''unsubscribed'')::boolean)
    and ($2->>''grad_year'' is null or c.player_grad_year = ($2->>''grad_year'')::int)
    and ($2->>''season_id'' is null or t.season_id = ($2->>''season_id'')::uuid)
    and ($2->>''team_id'' is null or tm.team_id = ($2->>''team_id'')::uuid)
    and ($2->''team_ids'' is null or tm.team_id = any(select (jsonb_array_elements_text($2->''team_ids''))::uuid))
    and ($2->>''team_role'' is null or tm.role::text = $2->>''team_role'')
    and ($2->>''group_id'' is null or gm.group_id = ($2->>''group_id'')::uuid)
    and (case when $2->>''archived'' = ''true'' then c.archived_at is not null
              when $2->>''archived'' = ''false'' then c.archived_at is null
              else true end)'
  into v_count using s.org_id, s.filter_rules;

  return coalesce(v_count, 0);
end;
$function$;