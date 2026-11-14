-- Resolve only actors on the requested page of a submitted application's history.
create function private.application_event_actors(target_application_id bigint, event_ids bigint[])
returns table (event_id bigint, actor_name text)
language sql stable security definer set search_path = ''
as $$
  select e.id, nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')
  from public.application_events e
  join public.applications a on a.id = e.application_id
  left join public.profiles p on p.id = e.actor_id
  where (select private.is_application_staff())
    and a.submission_state = 'submitted'
    and a.id = target_application_id
    and cardinality(event_ids) between 1 and 50
    and e.id = any(event_ids);
$$;

create function public.application_event_actors(target_application_id bigint, event_ids bigint[])
returns table (event_id bigint, actor_name text)
language sql stable security invoker set search_path = ''
as $$
  select * from private.application_event_actors(target_application_id, event_ids);
$$;

revoke all on function private.application_event_actors(bigint, bigint[]),
  public.application_event_actors(bigint, bigint[]) from public, anon, authenticated;
grant execute on function private.application_event_actors(bigint, bigint[]),
  public.application_event_actors(bigint, bigint[]) to authenticated;
