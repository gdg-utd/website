alter table public.application_email_queue
  drop constraint application_email_queue_template_key_check;

alter table public.application_email_queue
  add constraint application_email_queue_template_key_check check (
    template_key in (
      'confirmation',
      'acceptance',
      'rejection',
      'officer_update',
      'rsvp_expired'
    )
  );

alter table public.application_events
  drop constraint application_events_event_type_check;

alter table public.application_events
  add constraint application_events_event_type_check check (
    event_type in (
      'submitted',
      'reopened',
      'decision_staged',
      'decision_published',
      'rsvp_confirmed',
      'rsvp_released',
      'rsvp_expired',
      'post_interview_rejected'
    )
  );

create table public.application_rsvps (
  application_id bigint primary key references public.applications(id) on delete cascade,
  status text not null default 'awaiting_response'
    check (status in ('awaiting_response', 'confirmed', 'released', 'expired')),
  deadline_at timestamptz not null,
  responded_at timestamptz,
  agreements_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'awaiting_response' and responded_at is null and agreements_confirmed_at is null)
    or (status = 'confirmed' and responded_at is not null and agreements_confirmed_at is not null)
    or (status = 'released' and responded_at is not null and agreements_confirmed_at is null)
    or (status = 'expired' and responded_at is null and agreements_confirmed_at is null)
  )
);

comment on table public.application_rsvps is
  'Tracks the fixed 72-hour response window for published SPRINT mentee offers.';

create index application_rsvps_status_deadline_idx
  on public.application_rsvps (status, deadline_at);

alter table public.application_rsvps enable row level security;

revoke all on public.application_rsvps from anon, authenticated;
grant select on public.application_rsvps to authenticated;

create policy "Applicants and staff can view RSVP status"
on public.application_rsvps
for select
to authenticated
using (
  exists (
    select 1
    from public.applications application
    where application.id = application_id
      and (
        application.applicant_id = (select auth.uid())
        or (select private.is_application_staff())
      )
  )
);

create or replace function private.touch_application_rsvp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger application_rsvps_touch_updated_at
before update on public.application_rsvps
for each row execute function private.touch_application_rsvp();

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
    elsif old.applicant_id is not distinct from current_user_id
      and old.submission_state = 'submitted'
      and old.published_decision = 'accepted'
      and new.published_decision = 'rejected'
      and opening_record.slug = 'sprint-mentee'
      and exists (
        select 1
        from public.application_rsvps rsvp
        where rsvp.application_id = old.id
          and rsvp.status = 'released'
      ) then
      new.submitted_at := old.submitted_at;
      new.responses := old.responses;
      new.decision_published_at := now();
      new.decision_published_by := current_user_id;
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
          or not (
            (old.published_decision = 'undecided' and new.published_decision in ('accepted', 'rejected'))
            or (old.published_decision = 'accepted' and new.published_decision = 'rejected')
          ) then
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

create or replace function private.record_application_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opening_title text;
  opening_slug text;
  rsvp_deadline timestamptz;
  delivery_template text;
begin
  select title, slug into opening_title, opening_slug
  from public.application_openings
  where id = new.opening_id;

  if (tg_op = 'INSERT' and new.submission_state = 'submitted')
    or (tg_op = 'UPDATE' and old.submission_state = 'draft' and new.submission_state = 'submitted') then
    insert into public.application_events (application_id, actor_id, event_type)
    values (new.id, new.applicant_id, 'submitted');

    insert into public.application_email_queue (
      application_id, opening_id, recipient, template_key, payload, idempotency_key
    ) values (
      new.id,
      new.opening_id,
      new.applicant_email,
      'confirmation',
      jsonb_build_object('first_name', new.applicant_first_name, 'opening_title', opening_title),
      format('application:%s:submission:%s', new.id, new.submitted_at)
    ) on conflict (idempotency_key) do nothing;
  end if;

  if tg_op = 'UPDATE' and old.submission_state = 'submitted' and new.submission_state = 'draft' then
    delete from public.application_rsvps where application_id = new.id;
    insert into public.application_events (application_id, actor_id, event_type)
    values (new.id, (select auth.uid()), 'reopened');
  end if;

  if tg_op = 'UPDATE'
    and old.published_decision = 'undecided'
    and new.published_decision in ('accepted', 'rejected') then
    insert into public.application_events (application_id, actor_id, event_type, details)
    values (
      new.id,
      (select auth.uid()),
      'decision_published',
      jsonb_build_object('decision', new.published_decision)
    );

    if new.published_decision = 'accepted' and opening_slug = 'sprint-mentee' then
      rsvp_deadline := new.decision_published_at + interval '72 hours';
      insert into public.application_rsvps (application_id, deadline_at)
      values (new.id, rsvp_deadline)
      on conflict (application_id) do update set
        status = 'awaiting_response',
        deadline_at = excluded.deadline_at,
        responded_at = null,
        agreements_confirmed_at = null;
      delivery_template := 'acceptance';
    elsif new.published_decision = 'accepted' then
      delivery_template := 'officer_update';
    else
      delivery_template := 'rejection';
    end if;

    insert into public.application_email_queue (
      application_id, opening_id, recipient, template_key, payload, idempotency_key
    ) values (
      new.id,
      new.opening_id,
      new.applicant_email,
      delivery_template,
      jsonb_strip_nulls(jsonb_build_object(
        'first_name', new.applicant_first_name,
        'opening_title', opening_title,
        'decision', new.published_decision,
        'rsvp_deadline', rsvp_deadline
      )),
      format('application:%s:decision:%s:%s', new.id, new.published_decision, delivery_template)
    ) on conflict (idempotency_key) do nothing;
  end if;

  return null;
end;
$$;

create function public.respond_to_mentee_offer(
  target_application_id bigint,
  response text,
  agreements_confirmed boolean default false
)
returns table (rsvp_status text, response_recorded_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer record;
  recorded_at timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if response not in ('confirmed', 'released') then
    raise exception 'Choose whether to confirm or release the offer.' using errcode = '22023';
  end if;

  if response = 'confirmed' and not agreements_confirmed then
    raise exception 'Review and accept every agreement before confirming your spot.' using errcode = '22023';
  end if;

  select
    rsvp.application_id,
    rsvp.status,
    rsvp.deadline_at,
    application.applicant_id,
    application.published_decision,
    opening.slug
  into offer
  from public.application_rsvps rsvp
  join public.applications application on application.id = rsvp.application_id
  join public.application_openings opening on opening.id = application.opening_id
  where rsvp.application_id = target_application_id
  for update of rsvp;

  if not found
    or offer.applicant_id is distinct from (select auth.uid())
    or offer.slug <> 'sprint-mentee'
    or offer.published_decision <> 'accepted' then
    raise exception 'This RSVP offer is not available.' using errcode = '42501';
  end if;

  if offer.status <> 'awaiting_response' then
    raise exception 'A response has already been recorded for this offer.' using errcode = '22023';
  end if;

  if offer.deadline_at <= recorded_at then
    raise exception 'The 72-hour response window has closed.' using errcode = '22023';
  end if;

  update public.application_rsvps
  set
    status = response,
    responded_at = recorded_at,
    agreements_confirmed_at = case when response = 'confirmed' then recorded_at else null end
  where application_id = target_application_id;

  if response = 'released' then
    update public.applications
    set published_decision = 'rejected'
    where id = target_application_id
      and published_decision = 'accepted';
  end if;

  insert into public.application_events (application_id, actor_id, event_type, details)
  values (
    target_application_id,
    (select auth.uid()),
    case when response = 'confirmed' then 'rsvp_confirmed' else 'rsvp_released' end,
    jsonb_build_object('deadline_at', offer.deadline_at)
  );

  return query select response, recorded_at;
end;
$$;

revoke all on function public.respond_to_mentee_offer(bigint, text, boolean)
  from public, anon, authenticated;
grant execute on function public.respond_to_mentee_offer(bigint, text, boolean)
  to authenticated;

create function public.release_expired_mentee_offers(target_opening_id bigint)
returns table (expired_application_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer record;
begin
  if not (select private.is_application_admin()) then
    raise exception 'Only application administrators can release expired offers.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.application_openings opening
    where opening.id = target_opening_id
      and opening.slug = 'sprint-mentee'
  ) then
    raise exception 'SPRINT mentee opening not found.' using errcode = '22023';
  end if;

  for offer in
    select
      rsvp.application_id,
      rsvp.deadline_at,
      application.opening_id,
      application.applicant_email,
      application.applicant_first_name,
      opening.title as opening_title
    from public.application_rsvps rsvp
    join public.applications application on application.id = rsvp.application_id
    join public.application_openings opening on opening.id = application.opening_id
    where application.opening_id = target_opening_id
      and application.published_decision = 'accepted'
      and rsvp.status = 'awaiting_response'
      and rsvp.deadline_at <= now()
    order by rsvp.deadline_at, rsvp.application_id
    for update of rsvp
  loop
    update public.application_rsvps
    set status = 'expired'
    where application_id = offer.application_id;

    update public.applications
    set published_decision = 'rejected'
    where id = offer.application_id
      and published_decision = 'accepted';

    insert into public.application_events (application_id, actor_id, event_type, details)
    values (
      offer.application_id,
      (select auth.uid()),
      'rsvp_expired',
      jsonb_build_object('deadline_at', offer.deadline_at)
    );

    insert into public.application_email_queue (
      application_id, opening_id, recipient, template_key, payload, idempotency_key
    ) values (
      offer.application_id,
      offer.opening_id,
      offer.applicant_email,
      'rsvp_expired',
      jsonb_build_object(
        'first_name', offer.applicant_first_name,
        'opening_title', offer.opening_title,
        'rsvp_deadline', offer.deadline_at
      ),
      format('application:%s:rsvp-expired:%s', offer.application_id, offer.deadline_at)
    ) on conflict (idempotency_key) do nothing;

    expired_application_id := offer.application_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.release_expired_mentee_offers(bigint)
  from public, anon, authenticated;
grant execute on function public.release_expired_mentee_offers(bigint)
  to authenticated;

create function public.mark_officer_application_not_selected(target_application_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_application_id bigint;
begin
  if not (select private.is_application_admin()) then
    raise exception 'Only application administrators can update interview outcomes.' using errcode = '42501';
  end if;

  update public.applications application
  set published_decision = 'rejected'
  from public.application_openings opening
  where application.id = target_application_id
    and application.opening_id = opening.id
    and opening.slug <> 'sprint-mentee'
    and application.submission_state = 'submitted'
    and application.published_decision = 'accepted'
  returning application.id into changed_application_id;

  if changed_application_id is null then
    return false;
  end if;

  insert into public.application_events (application_id, actor_id, event_type, details)
  values (
    changed_application_id,
    (select auth.uid()),
    'post_interview_rejected',
    jsonb_build_object('automated_email_sent', false)
  );

  return true;
end;
$$;

revoke all on function public.mark_officer_application_not_selected(bigint)
  from public, anon, authenticated;
grant execute on function public.mark_officer_application_not_selected(bigint)
  to authenticated;

insert into public.application_rsvps (application_id, deadline_at)
select application.id, application.decision_published_at + interval '72 hours'
from public.applications application
join public.application_openings opening on opening.id = application.opening_id
where opening.slug = 'sprint-mentee'
  and application.submission_state = 'submitted'
  and application.published_decision = 'accepted'
  and application.decision_published_at is not null
on conflict (application_id) do nothing;

update public.application_openings
set
  email_templates = (email_templates - 'acceptance') || jsonb_build_object(
    'officer_update',
    jsonb_build_object(
      'brevo_template_id', 13,
      'subject', format('Next steps for your %s application', title),
      'intro', 'We would like to move forward with your application.',
      'next_steps', jsonb_build_array(
        'A member of our team will contact you with interview scheduling details.'
      )
    )
  ),
  updated_at = now()
where slug <> 'sprint-mentee';

update public.application_openings
set
  email_templates = jsonb_set(
    jsonb_set(
      email_templates,
      '{acceptance}',
      jsonb_build_object(
        'brevo_template_id', 10,
        'subject', 'You are invited to join SPRINT',
        'intro', 'You have 72 hours to respond to your SPRINT offer.',
        'next_steps', jsonb_build_array(
          'Confirm your spot through the application dashboard within 72 hours.'
        )
      ),
      true
    ),
    '{rsvp_expired}',
    jsonb_build_object(
      'brevo_template_id', 14,
      'subject', 'Your SPRINT offer has expired',
      'intro', 'Your 72-hour response window has closed.',
      'next_steps', jsonb_build_array(
        'The spot has been released because no response was received by the deadline.'
      )
    ),
    true
  ),
  updated_at = now()
where slug = 'sprint-mentee';

revoke all on function private.touch_application_rsvp()
  from public, anon, authenticated;
