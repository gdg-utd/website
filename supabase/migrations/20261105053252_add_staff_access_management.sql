create table public.staff_access_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid references auth.users(id) on delete set null,
  target_email text not null,
  previous_role text check (previous_role in ('admin','reviewer')),
  new_role text check (new_role in ('admin','reviewer')),
  created_at timestamptz not null default now()
);
alter table public.staff_access_events enable row level security;
revoke all on public.staff_access_events from public, anon, authenticated;
create index staff_access_events_actor_idx on public.staff_access_events(actor_id);
create index staff_access_events_target_idx on public.staff_access_events(target_id);
create index staff_access_events_recent_idx on public.staff_access_events(created_at desc, id desc);

create function private.get_staff_access() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (select private.is_application_admin()) then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(row_data order by active desc, email) from (
      select s.user_id, u.email, trim(concat(p.first_name,' ',p.last_name)) as name,
        s.role, s.active, s.created_at
      from public.application_admins s join auth.users u on u.id=s.user_id
      left join public.profiles p on p.id=s.user_id where u.deleted_at is null
    ) row_data), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(row_data order by created_at desc,id desc) from (
      select e.id,e.target_email,e.previous_role,e.new_role,e.created_at,
        coalesce(u.email,'Deleted account') as actor_email
      from public.staff_access_events e left join auth.users u on u.id=e.actor_id
      order by e.created_at desc,e.id desc limit 20
    ) row_data), '[]'::jsonb)
  );
end;
$$;

create function private.set_staff_access(target_email text, desired_role text, expected_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_id uuid; old_role text; old_active boolean; normalized_email text := lower(trim(target_email));
begin
  -- Serialize role changes, then re-check the caller's current access inside the lock.
  lock table public.application_admins in share row exclusive mode;
  if (select auth.uid()) is null or not (select private.is_application_admin()) then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if normalized_email is null or length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or desired_role is null or desired_role not in ('admin','reviewer','revoked')
    or expected_role is null or expected_role not in ('new','admin','reviewer') then
    raise exception 'Invalid access request.' using errcode='22023';
  end if;
  select u.id into target_id from auth.users u where lower(u.email)=normalized_email and u.deleted_at is null;
  if target_id is null then raise exception 'No website account found for this email.' using errcode='P0002'; end if;
  if target_id=(select auth.uid()) then raise exception 'You cannot change your own access.' using errcode='22023'; end if;
  select s.role,s.active into old_role,old_active from public.application_admins s where s.user_id=target_id;
  if expected_role='new' then
    if desired_role='revoked' then raise exception 'Invalid access request.' using errcode='22023'; end if;
    if coalesce(old_active,false) then raise exception 'This account already has staff access. Refresh the list.' using errcode='40001'; end if;
  elsif not coalesce(old_active,false) or old_role is distinct from expected_role then
    raise exception 'Access changed since this page loaded. Refresh and try again.' using errcode='40001';
  end if;
  if old_active and old_role='admin' and desired_role<>'admin' and
    (select count(*) from public.application_admins where active and role='admin')<=1 then
    raise exception 'At least one active administrator must remain.' using errcode='22023';
  end if;
  if old_active and old_role=desired_role then return; end if;
  if desired_role='revoked' then
    update public.application_admins set active=false where user_id=target_id;
  else
    insert into public.application_admins(user_id,role,active,created_by)
      values(target_id,desired_role,true,(select auth.uid()))
      on conflict(user_id) do update set role=excluded.role,active=true;
  end if;
  insert into public.staff_access_events(actor_id,target_id,target_email,previous_role,new_role)
    values((select auth.uid()),target_id,normalized_email,
      case when old_active then old_role else null end,
      case when desired_role='revoked' then null else desired_role end);
end;
$$;

create function public.get_staff_access() returns jsonb
language sql security invoker set search_path='' as $$ select private.get_staff_access(); $$;
create function public.set_staff_access(target_email text, desired_role text, expected_role text) returns void
language sql security invoker set search_path='' as $$ select private.set_staff_access(target_email,desired_role,expected_role); $$;
revoke all on function private.get_staff_access(), private.set_staff_access(text,text,text), public.get_staff_access(), public.set_staff_access(text,text,text) from public,anon,authenticated;
grant execute on function private.get_staff_access(), private.set_staff_access(text,text,text), public.get_staff_access(), public.set_staff_access(text,text,text) to authenticated;
