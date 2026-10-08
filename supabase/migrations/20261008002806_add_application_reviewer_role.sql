alter table public.application_admins
  add column role text not null default 'admin';

alter table public.application_admins
  add constraint application_admins_role_check
  check (role in ('admin', 'reviewer'));

create or replace function private.is_application_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.application_admins
      where user_id = (select auth.uid())
        and active
        and role in ('admin', 'reviewer')
    );
$$;

create or replace function private.is_application_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.application_admins
      where user_id = (select auth.uid())
        and active
        and role = 'admin'
    );
$$;

drop policy "Applicants and admins can view allowed applications"
  on public.applications;

create policy "Applicants and staff can view allowed applications"
on public.applications
for select
to authenticated
using (
  (select auth.uid()) = applicant_id
  or ((select private.is_application_staff()) and submission_state = 'submitted')
);

drop policy "Admins can view application history"
  on public.application_events;

create policy "Staff can view application history"
on public.application_events
for select
to authenticated
using ((select private.is_application_staff()));

drop policy "Admins can stage decisions"
  on public.application_events;

create policy "Staff can stage decisions"
on public.application_events
for insert
to authenticated
with check (
  (select private.is_application_staff())
  and actor_id = (select auth.uid())
  and event_type = 'decision_staged'
  and details ->> 'decision' in ('accepted', 'rejected')
  and exists (
    select 1
    from public.applications application
    where application.id = application_id
      and application.submission_state = 'submitted'
      and application.published_decision = 'undecided'
  )
);

create or replace function public.publish_staged_application_decisions()
returns table (application_id bigint, decision text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_application_admin()) then
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

revoke all on function private.is_application_staff()
  from public, anon, authenticated;
grant execute on function private.is_application_staff()
  to authenticated;

revoke all on function private.is_application_admin()
  from public, anon, authenticated;
grant execute on function private.is_application_admin()
  to authenticated;

revoke all on function public.publish_staged_application_decisions()
  from public, anon, authenticated;
grant execute on function public.publish_staged_application_decisions()
  to authenticated;
