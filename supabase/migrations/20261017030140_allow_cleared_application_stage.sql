alter table public.application_events
  drop constraint application_events_check;

alter table public.application_events
  add constraint application_events_decision_staged_check check (
    event_type <> 'decision_staged'
    or details ->> 'decision' in ('accepted', 'rejected', 'cleared')
  );

drop policy "Staff can stage decisions"
  on public.application_events;

create policy "Staff can stage decisions"
on public.application_events
for insert
to authenticated
with check (
  (select private.is_application_staff())
  and actor_id = (select auth.uid())
  and event_type = 'decision_staged'
  and details ->> 'decision' in ('accepted', 'rejected', 'cleared')
  and exists (
    select 1
    from public.applications application
    where application.id = application_id
      and application.submission_state = 'submitted'
      and application.published_decision = 'undecided'
  )
);
