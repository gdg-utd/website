create or replace function private.prepare_application_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opening_record public.application_openings%rowtype;
  current_user_id uuid := (select auth.uid());
  is_admin boolean := (select private.is_application_admin());
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into opening_record
  from public.application_openings
  where id = new.opening_id;

  if not found then
    raise exception 'Application opening not found.' using errcode = '23503';
  end if;

  if tg_op = 'INSERT' then
    if new.applicant_id is distinct from current_user_id then
      raise exception 'Applications can only be created for the signed-in account.' using errcode = '42501';
    end if;
    if not private.opening_accepts_applications(opening_record) then
      raise exception 'This application is not currently accepting responses.' using errcode = '22023';
    end if;

    select
      lower(users.email),
      coalesce(profiles.first_name, users.raw_user_meta_data ->> 'first_name'),
      coalesce(profiles.last_name, users.raw_user_meta_data ->> 'last_name')
    into new.applicant_email, new.applicant_first_name, new.applicant_last_name
    from auth.users users
    left join public.profiles profiles on profiles.id = users.id
    where users.id = current_user_id;

    if new.applicant_email is null
      or new.applicant_email !~* '^[^@[:space:]]+@utdallas\.edu$'
      or coalesce(btrim(new.applicant_first_name), '') = ''
      or coalesce(btrim(new.applicant_last_name), '') = '' then
      raise exception 'A complete UT Dallas member profile is required.' using errcode = '22023';
    end if;

    new.form_version := opening_record.form_version;
    new.published_decision := 'undecided';
    new.decision_published_at := null;
    new.decision_published_by := null;
    new.created_at := now();

    if new.submission_state = 'submitted' then
      if not private.responses_are_valid(opening_record.form_schema, new.responses) then
        raise exception 'Complete every required field before submitting.' using errcode = '22023';
      end if;
      new.submitted_at := now();
    else
      new.submission_state := 'draft';
      new.submitted_at := null;
    end if;
  else
    if row(
      new.opening_id,
      new.applicant_id,
      new.applicant_email,
      new.applicant_first_name,
      new.applicant_last_name,
      new.form_version,
      new.created_at
    ) is distinct from row(
      old.opening_id,
      old.applicant_id,
      old.applicant_email,
      old.applicant_first_name,
      old.applicant_last_name,
      old.form_version,
      old.created_at
    ) then
      raise exception 'Application identity fields cannot be changed.' using errcode = '22023';
    end if;

    -- A staff member can also be an applicant. Treat updates to their own
    -- reopened draft as applicant actions before considering staff privileges.
    if old.applicant_id is not distinct from current_user_id
      and old.submission_state = 'draft' then
      if not private.opening_accepts_applications(opening_record) then
        raise exception 'This application is not currently accepting responses.' using errcode = '22023';
      end if;
      if new.submission_state not in ('draft', 'submitted') then
        raise exception 'The requested application state change is not allowed.' using errcode = '22023';
      end if;

      new.published_decision := old.published_decision;
      new.decision_published_at := old.decision_published_at;
      new.decision_published_by := old.decision_published_by;

      if new.submission_state = 'submitted' then
        if not private.responses_are_valid(opening_record.form_schema, new.responses) then
          raise exception 'Complete every required field before submitting.' using errcode = '22023';
        end if;
        new.submitted_at := now();
      else
        new.submitted_at := null;
      end if;
    elsif is_admin then
      if new.responses is distinct from old.responses then
        raise exception 'Administrators cannot edit applicant responses.' using errcode = '22023';
      end if;

      if new.submission_state is distinct from old.submission_state then
        if old.submission_state <> 'submitted' or new.submission_state <> 'draft' then
          raise exception 'The requested application state change is not allowed.' using errcode = '22023';
        end if;
        new.submitted_at := null;
        new.published_decision := 'undecided';
        new.decision_published_at := null;
        new.decision_published_by := null;
      elsif new.published_decision is distinct from old.published_decision then
        if old.submission_state <> 'submitted'
          or old.published_decision <> 'undecided'
          or new.published_decision not in ('accepted', 'rejected') then
          raise exception 'This decision cannot be published.' using errcode = '22023';
        end if;
        new.decision_published_at := now();
        new.decision_published_by := current_user_id;
      else
        new.submitted_at := old.submitted_at;
        new.decision_published_at := old.decision_published_at;
        new.decision_published_by := old.decision_published_by;
      end if;
    elsif old.applicant_id is not distinct from current_user_id then
      raise exception 'Submitted applications are locked.' using errcode = '22023';
    else
      raise exception 'You do not have access to this application.' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop function public.publish_staged_application_decisions();

create function public.publish_staged_application_decisions(target_opening_id bigint)
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

  if target_opening_id is null or not exists (
    select 1
    from public.application_openings opening
    where opening.id = target_opening_id
  ) then
    raise exception 'Application opening not found.' using errcode = '22023';
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
      and application.opening_id = target_opening_id
      and application.submission_state = 'submitted'
      and application.published_decision = 'undecided'
    order by event.application_id, event.created_at desc, event.id desc
  ),
  published as (
    update public.applications application
    set published_decision = latest.decision
    from latest_staged latest
    where application.id = latest.application_id
      and application.opening_id = target_opening_id
      and latest.decision in ('accepted', 'rejected')
      and application.submission_state = 'submitted'
      and application.published_decision = 'undecided'
    returning application.id, application.published_decision
  )
  select published.id, published.published_decision
  from published;
end;
$$;

revoke all on function public.publish_staged_application_decisions(bigint)
  from public, anon, authenticated;
grant execute on function public.publish_staged_application_decisions(bigint)
  to authenticated;
