
create or replace function public.admin_delete_organization_cascade(_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Null out self-referential column first
  update public.organizations set primary_user_id = null where id = _org_id;

  -- Delete from every public table that has an org_id column
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'org_id'
      and table_name <> 'organizations'
  loop
    execute format('delete from public.%I where org_id = $1', r.table_name) using _org_id;
  end loop;

  -- Finally delete the organization itself
  delete from public.organizations where id = _org_id;
end;
$$;

revoke all on function public.admin_delete_organization_cascade(uuid) from public;
grant execute on function public.admin_delete_organization_cascade(uuid) to service_role;
