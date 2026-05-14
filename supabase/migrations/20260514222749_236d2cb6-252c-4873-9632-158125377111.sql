
-- 1. Link segments to a team for system per-team segments
alter table public.org_contact_segments
  add column if not exists team_id uuid references public.org_teams(id) on delete cascade;

create unique index if not exists org_contact_segments_team_role_unique
  on public.org_contact_segments(org_id, team_id, (filter_rules->>'team_role'))
  where team_id is not null;

-- 2. Extend count_segment_contacts to support team_ids array (union of teams)
create or replace function public.count_segment_contacts(_segment_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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
    and ($2->>''team_role'' is null or tm.role = $2->>''team_role'')
    and ($2->>''group_id'' is null or gm.group_id = ($2->>''group_id'')::uuid)
    and (case when $2->>''archived'' = ''true'' then c.archived_at is not null
              when $2->>''archived'' = ''false'' then c.archived_at is null
              else true end)'
  into v_count using s.org_id, s.filter_rules;

  return coalesce(v_count, 0);
end;
$$;

-- 3. Seed/refresh per-team system segments for an org
create or replace function public.seed_org_team_segments(_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  for t in select id, name from public.org_teams where org_id = _org_id loop
    -- All members of the team
    insert into public.org_contact_segments (org_id, team_id, name, description, filter_rules, is_system)
    values (_org_id, t.id, 'Team — ' || t.name,
            'Everyone on ' || t.name,
            jsonb_build_object('team_id', t.id::text), true)
    on conflict (org_id, team_id, (filter_rules->>'team_role'))
      where team_id is not null
      do update set name = excluded.name, description = excluded.description, updated_at = now();

    -- Players only
    insert into public.org_contact_segments (org_id, team_id, name, description, filter_rules, is_system)
    values (_org_id, t.id, 'Team — ' || t.name || ' (players)',
            'Players on ' || t.name,
            jsonb_build_object('team_id', t.id::text, 'team_role', 'player'), true)
    on conflict (org_id, team_id, (filter_rules->>'team_role'))
      where team_id is not null
      do update set name = excluded.name, description = excluded.description, updated_at = now();

    -- Parents only
    insert into public.org_contact_segments (org_id, team_id, name, description, filter_rules, is_system)
    values (_org_id, t.id, 'Team — ' || t.name || ' (parents)',
            'Parents on ' || t.name,
            jsonb_build_object('team_id', t.id::text, 'team_role', 'parent'), true)
    on conflict (org_id, team_id, (filter_rules->>'team_role'))
      where team_id is not null
      do update set name = excluded.name, description = excluded.description, updated_at = now();

    -- Coaches/staff
    insert into public.org_contact_segments (org_id, team_id, name, description, filter_rules, is_system)
    values (_org_id, t.id, 'Team — ' || t.name || ' (coaches)',
            'Coaches & staff on ' || t.name,
            jsonb_build_object('team_id', t.id::text, 'team_role', 'coach'), true)
    on conflict (org_id, team_id, (filter_rules->>'team_role'))
      where team_id is not null
      do update set name = excluded.name, description = excluded.description, updated_at = now();
  end loop;

  perform public.recompute_org_segment_counts(_org_id);
end;
$$;

-- 4. Trigger to maintain team segments
create or replace function public.trg_team_segments_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    -- segments cascade-deleted via FK
    return old;
  end if;
  perform public.seed_org_team_segments(new.org_id);
  return new;
end;
$$;

drop trigger if exists org_teams_seed_segments on public.org_teams;
create trigger org_teams_seed_segments
  after insert or update of name on public.org_teams
  for each row execute function public.trg_team_segments_sync();

-- 5. Backfill existing teams
do $$
declare o record;
begin
  for o in select distinct org_id from public.org_teams loop
    perform public.seed_org_team_segments(o.org_id);
  end loop;
end $$;
