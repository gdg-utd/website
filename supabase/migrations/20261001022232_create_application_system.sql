create schema if not exists private;

create table public.application_openings (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  eyebrow text not null,
  title text not null,
  description text not null,
  accent text not null default 'blue' check (accent in ('blue', 'green', 'yellow', 'red')),
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  responsibilities jsonb not null default '[]'::jsonb check (jsonb_typeof(responsibilities) = 'array'),
  form_version integer not null default 1 check (form_version > 0),
  form_schema jsonb not null check (jsonb_typeof(form_schema) = 'object'),
  email_templates jsonb not null check (jsonb_typeof(email_templates) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'archived')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create table public.applications (
  id bigint generated always as identity primary key,
  opening_id bigint not null references public.application_openings(id) on delete restrict,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  applicant_email text not null,
  applicant_first_name text not null,
  applicant_last_name text not null,
  form_version integer not null check (form_version > 0),
  responses jsonb not null default '{}'::jsonb,
  submission_state text not null default 'draft' check (submission_state in ('draft', 'submitted')),
  submitted_at timestamptz,
  published_decision text not null default 'undecided' check (published_decision in ('undecided', 'accepted', 'rejected')),
  decision_published_at timestamptz,
  decision_published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opening_id, applicant_id),
  check (jsonb_typeof(responses) = 'object'),
  check (pg_column_size(responses) <= 65536),
  check (
    (submission_state = 'draft' and submitted_at is null)
    or (submission_state = 'submitted' and submitted_at is not null)
  ),
  check (
    (published_decision = 'undecided' and decision_published_at is null and decision_published_by is null)
    or (
      published_decision in ('accepted', 'rejected')
      and submission_state = 'submitted'
      and decision_published_at is not null
      and decision_published_by is not null
    )
  )
);

create table public.application_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  active boolean not null default true
);

create table public.application_events (
  id bigint generated always as identity primary key,
  application_id bigint not null references public.applications(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted', 'reopened', 'decision_staged', 'decision_published')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  check (
    event_type <> 'decision_staged'
    or details ->> 'decision' in ('accepted', 'rejected')
  )
);

create table public.application_email_queue (
  id bigint generated always as identity primary key,
  application_id bigint not null references public.applications(id) on delete cascade,
  opening_id bigint not null references public.application_openings(id) on delete restrict,
  recipient text not null,
  template_key text not null check (template_key in ('confirmation', 'acceptance', 'rejection')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  idempotency_key text not null unique,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index applications_applicant_updated_idx
  on public.applications (applicant_id, updated_at desc);
create index applications_opening_submitted_idx
  on public.applications (opening_id, submitted_at desc)
  where submission_state = 'submitted';
create index applications_decision_submitted_idx
  on public.applications (published_decision, submitted_at desc)
  where submission_state = 'submitted';
create index applications_decision_published_by_idx
  on public.applications (decision_published_by)
  where decision_published_by is not null;
create index application_admins_created_by_idx
  on public.application_admins (created_by)
  where created_by is not null;
create index application_events_application_created_idx
  on public.application_events (application_id, created_at desc, id desc);
create index application_events_actor_idx
  on public.application_events (actor_id)
  where actor_id is not null;
create index application_email_queue_application_idx
  on public.application_email_queue (application_id, created_at desc);
create index application_email_queue_opening_idx
  on public.application_email_queue (opening_id);
create index application_email_queue_pending_idx
  on public.application_email_queue (created_at)
  where status = 'pending';

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
    );
$$;

create or replace function private.opening_accepts_applications(opening public.application_openings)
returns boolean
language sql
stable
set search_path = ''
as $$
  select opening.status = 'open'
    and (opening.opens_at is null or opening.opens_at <= now())
    and (opening.closes_at is null or opening.closes_at > now());
$$;

create or replace function private.responses_are_valid(schema_document jsonb, response_document jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with fields as (
    select field
    from jsonb_array_elements(coalesce(schema_document -> 'sections', '[]'::jsonb)) section
    cross join lateral jsonb_array_elements(coalesce(section -> 'fields', '[]'::jsonb)) field
  ),
  unknown_keys as (
    select key
    from jsonb_object_keys(response_document) key
    left join fields on fields.field ->> 'id' = key
    where fields.field is null
  ),
  invalid_fields as (
    select field
    from fields
    cross join lateral (
      select response_document -> (field ->> 'id') as value,
             response_document ? (field ->> 'id') as present
    ) response
    where
      (
        coalesce((field ->> 'required')::boolean, false)
        and (
          not response.present
          or response.value = 'null'::jsonb
          or (field ->> 'type' in ('short_text', 'long_text', 'url', 'single_choice') and btrim(response.value #>> '{}') = '')
          or (field ->> 'type' = 'multiple_choice' and response.value = '[]'::jsonb)
          or (field ->> 'type' = 'checkbox' and response.value <> 'true'::jsonb)
        )
      )
      or (
        response.present
        and response.value <> 'null'::jsonb
        and case field ->> 'type'
          when 'short_text' then jsonb_typeof(response.value) <> 'string'
            or char_length(response.value #>> '{}') > coalesce((field ->> 'max_length')::integer, 500)
          when 'long_text' then jsonb_typeof(response.value) <> 'string'
            or char_length(response.value #>> '{}') > coalesce((field ->> 'max_length')::integer, 4000)
          when 'url' then jsonb_typeof(response.value) <> 'string'
            or (
              btrim(response.value #>> '{}') <> ''
              and response.value #>> '{}' !~* '^https?://[^[:space:]]+$'
            )
          when 'single_choice' then jsonb_typeof(response.value) <> 'string'
            or not exists (
              select 1
              from jsonb_array_elements(coalesce(field -> 'options', '[]'::jsonb)) option
              where option ->> 'value' = response.value #>> '{}'
            )
          when 'multiple_choice' then jsonb_typeof(response.value) <> 'array'
            or jsonb_array_length(response.value) > 10
            or exists (
              select 1
              from jsonb_array_elements_text(response.value) selected(value)
              where not exists (
                select 1
                from jsonb_array_elements(coalesce(field -> 'options', '[]'::jsonb)) option
                where option ->> 'value' = selected.value
              )
            )
          when 'checkbox' then jsonb_typeof(response.value) <> 'boolean'
          else true
        end
      )
  )
  select jsonb_typeof(response_document) = 'object'
    and not exists (select 1 from unknown_keys)
    and not exists (select 1 from invalid_fields);
$$;

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

    if is_admin then
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
    else
      if old.applicant_id is distinct from current_user_id then
        raise exception 'You do not have access to this application.' using errcode = '42501';
      end if;
      if old.submission_state <> 'draft' then
        raise exception 'Submitted applications are locked.' using errcode = '22023';
      end if;
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
begin
  select title into opening_title
  from public.application_openings
  where id = new.opening_id;

  if (tg_op = 'INSERT' and new.submission_state = 'submitted')
    or (tg_op = 'UPDATE' and old.submission_state = 'draft' and new.submission_state = 'submitted') then
    insert into public.application_events (application_id, actor_id, event_type)
    values (new.id, new.applicant_id, 'submitted');

    insert into public.application_email_queue (
      application_id,
      opening_id,
      recipient,
      template_key,
      payload,
      idempotency_key
    ) values (
      new.id,
      new.opening_id,
      new.applicant_email,
      'confirmation',
      jsonb_build_object(
        'first_name', new.applicant_first_name,
        'opening_title', opening_title
      ),
      format('application:%s:submission:%s', new.id, new.submitted_at)
    ) on conflict (idempotency_key) do nothing;
  end if;

  if tg_op = 'UPDATE' and old.submission_state = 'submitted' and new.submission_state = 'draft' then
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

    insert into public.application_email_queue (
      application_id,
      opening_id,
      recipient,
      template_key,
      payload,
      idempotency_key
    ) values (
      new.id,
      new.opening_id,
      new.applicant_email,
      case when new.published_decision = 'accepted' then 'acceptance' else 'rejection' end,
      jsonb_build_object(
        'first_name', new.applicant_first_name,
        'opening_title', opening_title,
        'decision', new.published_decision
      ),
      format('application:%s:decision:%s', new.id, new.published_decision)
    ) on conflict (idempotency_key) do nothing;
  end if;

  return null;
end;
$$;

create or replace function private.touch_application_opening()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger application_openings_touch_updated_at
before update on public.application_openings
for each row execute function private.touch_application_opening();

create trigger applications_prepare_write
before insert or update on public.applications
for each row execute function private.prepare_application_write();

create trigger applications_record_change
after insert or update on public.applications
for each row execute function private.record_application_change();

alter table public.application_openings enable row level security;
alter table public.applications enable row level security;
alter table public.application_admins enable row level security;
alter table public.application_events enable row level security;
alter table public.application_email_queue enable row level security;

create policy "Published application openings are visible"
on public.application_openings
for select
to anon, authenticated
using (status in ('open', 'closed', 'archived'));

create policy "Applicants can view their applications"
on public.applications
for select
to authenticated
using ((select auth.uid()) = applicant_id);

create policy "Admins can view submitted applications"
on public.applications
for select
to authenticated
using ((select private.is_application_admin()) and submission_state = 'submitted');

create policy "Applicants can create their applications"
on public.applications
for insert
to authenticated
with check (
  (select auth.uid()) = applicant_id
  and published_decision = 'undecided'
  and exists (
    select 1
    from public.application_openings opening
    where opening.id = opening_id
      and private.opening_accepts_applications(opening)
  )
);

create policy "Applicants can update drafts"
on public.applications
for update
to authenticated
using ((select auth.uid()) = applicant_id and submission_state = 'draft')
with check ((select auth.uid()) = applicant_id);

create policy "Admins can manage submitted applications"
on public.applications
for update
to authenticated
using ((select private.is_application_admin()) and submission_state = 'submitted')
with check ((select private.is_application_admin()));

create policy "Admins can verify their access"
on public.application_admins
for select
to authenticated
using ((select auth.uid()) = user_id and active);

create policy "Admins can view application history"
on public.application_events
for select
to authenticated
using ((select private.is_application_admin()));

create policy "Admins can stage decisions"
on public.application_events
for insert
to authenticated
with check (
  (select private.is_application_admin())
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

revoke all on public.application_openings from anon, authenticated;
revoke all on public.applications from anon, authenticated;
revoke all on public.application_admins from anon, authenticated;
revoke all on public.application_events from anon, authenticated;
revoke all on public.application_email_queue from anon, authenticated;

grant select on public.application_openings to anon, authenticated;
grant select on public.applications to authenticated;
grant insert (
  opening_id,
  applicant_id,
  responses,
  submission_state
) on public.applications to authenticated;
grant update (
  responses,
  submission_state,
  published_decision
) on public.applications to authenticated;
grant select on public.application_admins to authenticated;
grant select on public.application_events to authenticated;
grant insert (application_id, actor_id, event_type, details)
  on public.application_events to authenticated;
grant usage, select on sequence public.applications_id_seq to authenticated;
grant usage, select on sequence public.application_events_id_seq to authenticated;

revoke all on function private.is_application_admin() from public, anon, authenticated;
revoke all on function private.opening_accepts_applications(public.application_openings) from public, anon, authenticated;
revoke all on function private.responses_are_valid(jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.prepare_application_write() from public, anon, authenticated;
revoke all on function private.record_application_change() from public, anon, authenticated;
revoke all on function private.touch_application_opening() from public, anon, authenticated;

insert into public.application_openings (
  slug,
  eyebrow,
  title,
  description,
  accent,
  details,
  responsibilities,
  form_schema,
  email_templates,
  status
) values
(
  'sprint-officer',
  'Program team',
  'SPRINT officer',
  'Help plan the eight-week program, coordinate with mentors, and support project teams from kickoff through showcase day.',
  'blue',
  '[{"label":"Commitment","value":"Weekly during SPRINT"},{"label":"Good fit for","value":"Organizers and team leads"}]'::jsonb,
  '["Keep weekly program logistics on track","Support mentors and mentee teams","Help run kickoff and showcase events"]'::jsonb,
  '{
    "sections": [
      {
        "id": "background",
        "title": "About you",
        "description": "Tell us where you are in your studies.",
        "fields": [
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Computer Science"},
          {"id":"portfolio_url","type":"url","label":"Portfolio, GitHub, or LinkedIn","required":false,"help":"Optional — include one link you would like us to review.","placeholder":"https://"}
        ]
      },
      {
        "id": "role",
        "title": "Working with SPRINT",
        "description": "We are looking for people who communicate clearly and follow through.",
        "fields": [
          {"id":"motivation","type":"long_text","label":"Why do you want to be a SPRINT officer?","required":true,"max_length":2000,"placeholder":"What interests you about helping run the program?"},
          {"id":"experience","type":"long_text","label":"Tell us about a time you organized, led, or supported a team.","required":true,"max_length":2000,"placeholder":"This can come from a class, club, job, or personal project."},
          {"id":"weekly_availability","type":"single_choice","label":"Can you attend weekly SPRINT meetings during the program?","required":true,"options":[{"value":"yes","label":"Yes"},{"value":"discuss","label":"I may need to discuss scheduling"}]},
          {"id":"commitment","type":"checkbox","label":"I understand that SPRINT officers are expected to support the full eight-week program.","required":true}
        ]
      }
    ]
  }'::jsonb,
  '{
    "confirmation":{"subject":"We received your SPRINT officer application","intro":"Thanks for applying to help run SPRINT.","next_steps":["The GDG UTDallas team will review your application.","We will contact you when decisions are ready."]},
    "acceptance":{"subject":"Your SPRINT officer application","intro":"You have been selected for the SPRINT officer team.","next_steps":["Watch for onboarding details from the GDG UTDallas team."]},
    "rejection":{"subject":"Your SPRINT officer application","intro":"Thank you for the time you put into your application.","next_steps":["We hope you will stay involved with future GDG UTDallas programs."]}
  }'::jsonb,
  'open'
),
(
  'sprint-mentee',
  'Project participant',
  'SPRINT mentee',
  'Join a small team, work with a mentor, and build a project to present at the end of the program.',
  'green',
  '[{"label":"Program length","value":"Eight weeks"},{"label":"Experience","value":"No prior experience required"}]'::jsonb,
  '["Meet with your team each week","Learn and contribute as the project develops","Present the finished project at the showcase"]'::jsonb,
  '{
    "sections": [
      {
        "id": "background",
        "title": "About you",
        "description": "No previous coding or project experience is required.",
        "fields": [
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Computer Science"},
          {"id":"experience_level","type":"single_choice","label":"Current technical experience","required":true,"options":[{"value":"none","label":"No experience yet"},{"value":"beginner","label":"Some classes or tutorials"},{"value":"projects","label":"I have built a few projects"},{"value":"experienced","label":"I have substantial project experience"}]},
          {"id":"portfolio_url","type":"url","label":"Portfolio, GitHub, or LinkedIn","required":false,"help":"Optional — it is completely fine to leave this blank.","placeholder":"https://"}
        ]
      },
      {
        "id": "goals",
        "title": "Your SPRINT goals",
        "description": "Tell us what you would like to build and learn.",
        "fields": [
          {"id":"goals","type":"long_text","label":"What do you hope to get out of SPRINT?","required":true,"max_length":2000,"placeholder":"Share what you would like to learn or accomplish."},
          {"id":"project_interests","type":"multiple_choice","label":"Which project areas interest you?","required":true,"help":"Choose every area you would be interested in exploring.","options":[{"value":"web","label":"Web development"},{"value":"mobile","label":"Mobile development"},{"value":"ai-data","label":"AI or data"},{"value":"cloud","label":"Cloud or backend"},{"value":"design","label":"Product design"},{"value":"open","label":"Open to anything"}]},
          {"id":"commitment","type":"checkbox","label":"I can participate in weekly team meetings and the final showcase during the eight-week program.","required":true}
        ]
      }
    ]
  }'::jsonb,
  '{
    "confirmation":{"subject":"We received your SPRINT mentee application","intro":"Thanks for applying to join SPRINT.","next_steps":["The GDG UTDallas team will review your application.","We will contact you when decisions are ready."]},
    "acceptance":{"subject":"Your SPRINT mentee application","intro":"You have been selected for the next SPRINT cohort.","next_steps":["Watch for cohort and kickoff details from the GDG UTDallas team."]},
    "rejection":{"subject":"Your SPRINT mentee application","intro":"Thank you for the time you put into your application.","next_steps":["We hope you will stay involved with future GDG UTDallas programs."]}
  }'::jsonb,
  'open'
);
