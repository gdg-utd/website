create or replace function public.publish_staged_application_decisions()
returns table (application_id bigint, decision text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.application_admins staff
    where staff.user_id = (select auth.uid())
      and staff.active
      and staff.role = 'admin'
  ) then
    raise exception 'Only application administrators can publish decisions.'
      using errcode = '42501';
  end if;

  return query
  with latest_staged as (
    select distinct on (event.application_id)
      event.application_id,
      event.details ->> 'decision' as decision
    from public.application_events event
    join public.applications application
      on application.id = event.application_id
    where event.event_type = 'decision_staged'
      and event.created_at >= application.submitted_at
      and application.submission_state = 'submitted'
      and application.published_decision = 'undecided'
    order by event.application_id, event.created_at desc, event.id desc
  ),
  published as (
    update public.applications application
    set published_decision = latest.decision
    from latest_staged latest
    where application.id = latest.application_id
      and latest.decision in ('accepted', 'rejected')
      and application.submission_state = 'submitted'
      and application.published_decision = 'undecided'
    returning application.id, application.published_decision
  )
  select published.id, published.published_decision
  from published;
end;
$$;
