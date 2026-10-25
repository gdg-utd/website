-- Canonical programs match src/lib/utd-academic-programs.ts. Public catalog; no user data.
create table public.utd_academic_programs (degree text not null, major text not null, primary key(degree, major));
alter table public.utd_academic_programs enable row level security;
revoke all on public.utd_academic_programs from anon, authenticated;
grant select on public.utd_academic_programs to anon, authenticated;
create policy "Academic catalog is public" on public.utd_academic_programs for select to anon, authenticated using (true);
insert into public.utd_academic_programs(degree,major) values
('Bachelor of Arts','American Studies'),('Bachelor of Arts','Animation and Games'),('Bachelor of Arts','Biology'),('Bachelor of Arts','Chemistry'),('Bachelor of Arts','Criminology'),('Bachelor of Arts','Economics'),('Bachelor of Arts','Education'),('Bachelor of Arts','Engineering'),('Bachelor of Arts','History'),('Bachelor of Arts','Interdisciplinary Studies'),('Bachelor of Arts','International Political Economy'),('Bachelor of Arts','Latin American Studies'),('Bachelor of Arts','Literature'),('Bachelor of Arts','Mathematics'),('Bachelor of Arts','Media Arts and Design'),('Bachelor of Arts','Philosophy'),('Bachelor of Arts','Physics'),('Bachelor of Arts','Political Science'),('Bachelor of Arts','Professional Communication and Digital Media Studies'),('Bachelor of Arts','Public Health'),('Bachelor of Arts','Sociology'),('Bachelor of Arts','Visual and Performing Arts'),('Bachelor of Science','Accounting'),('Bachelor of Science','Actuarial Science'),('Bachelor of Science','Biochemistry'),('Bachelor of Science','Biology'),('Bachelor of Science','Biomedical Engineering'),('Bachelor of Science','Biomedical Sciences'),('Bachelor of Science','Business Administration'),('Bachelor of Science','Business Analytics and Artificial Intelligence'),('Bachelor of Science','Chemistry'),('Bachelor of Science','Child Learning and Development'),('Bachelor of Science','Cognitive Science'),('Bachelor of Science','Computational and Geospatial Science'),('Bachelor of Science','Computer Engineering'),('Bachelor of Science','Computer Information Systems and Technology'),('Bachelor of Science','Computer Science'),('Bachelor of Science','Cybersecurity and Risk Management'),('Bachelor of Science','Cybersecurity Technology and Policy'),('Bachelor of Science','Data Science'),('Bachelor of Science','Economics'),('Bachelor of Science','Education'),('Bachelor of Science','Electrical Engineering'),('Bachelor of Science','Finance'),('Bachelor of Science','Geosciences'),('Bachelor of Science','Geospatial Information Sciences'),('Bachelor of Science','Global Business'),('Bachelor of Science','Healthcare Management'),('Bachelor of Science','Healthcare Studies'),('Bachelor of Science','Human Resource Management'),('Bachelor of Science','Interdisciplinary Studies'),('Bachelor of Science','International Political Economy'),('Bachelor of Science','Marketing'),('Bachelor of Science','Materials Science and Engineering'),('Bachelor of Science','Mathematics'),('Bachelor of Science','Mechanical Engineering'),('Bachelor of Science','Molecular Biology'),('Bachelor of Science','Neuroscience'),('Bachelor of Science','Physics'),('Bachelor of Science','Psychology'),('Bachelor of Science','Public and Nonprofit Management'),('Bachelor of Science','Public Policy'),('Bachelor of Science','Software Engineering'),('Bachelor of Science','Speech, Language, and Hearing Sciences'),('Bachelor of Science','Supply Chain Management and Analytics'),('Bachelor of Science','Sustainability Planning and Policy'),('Bachelor of Science','Systems Engineering'),('Master of Arts','Art History'),('Master of Arts','Arts, Technology, and Emerging Communication'),('Master of Arts','History'),('Master of Arts','Humanities'),('Master of Arts','Interdisciplinary Studies'),('Master of Arts','Latin American Studies'),('Master of Arts','Literature'),('Master of Arts','Philosophy'),('Master of Arts','Political Science'),('Master of Arts','Visual and Performing Arts'),('Master of Arts in Teaching','Mathematics Education'),('Master of Arts in Teaching','Science Education'),('Master of Business Administration','Business Administration'),('Master of Fine Arts','Animation'),('Master of Fine Arts','Arts, Technology, and Emerging Communication'),('Master of Fine Arts','Game Development'),('Master of Public Affairs','Public Affairs'),('Master of Public Policy','Public Policy'),('Master of Science','Accounting and Analytics'),('Master of Science','Actuarial Science'),('Master of Science','Applied Cognition and Neuroscience'),('Master of Science','Applied Sociology'),('Master of Science','Artificial Intelligence for Biomedical Sciences'),('Master of Science','Bioinformatics and Computational Biology'),('Master of Science','Biomedical Engineering'),('Master of Science','Business Analytics and Artificial Intelligence'),('Master of Science','Biotechnology'),('Master of Science','Chemistry'),('Master of Science','Computer Engineering'),('Master of Science','Computer Science'),('Master of Science','Criminology'),('Master of Science','Cyber Security, Technology, and Policy'),('Master of Science','Data Science and Statistics'),('Master of Science','Economics'),('Master of Science','Electrical Engineering'),('Master of Science','Energy Management'),('Master of Science','Finance'),('Master of Science','Financial Technology and Analytics'),('Master of Science','Geosciences'),('Master of Science','Geospatial Information Sciences'),('Master of Science','Healthcare Leadership and Management'),('Master of Science','Human Development and Early Childhood Disorders'),('Master of Science','Information Technology and Management'),('Master of Science','Innovation and Entrepreneurship'),('Master of Science','International Management'),('Master of Science','International Political Economy'),('Master of Science','Leadership and Organizational Development'),('Master of Science','Management Science'),('Master of Science','Marketing'),('Master of Science','Materials Science and Engineering'),('Master of Science','Mathematics'),('Master of Science','Mechanical Engineering'),('Master of Science','Molecular and Cell Biology'),('Master of Science','Physics'),('Master of Science','Psychology'),('Master of Science','Social Data Analytics and Research'),('Master of Science','Software Engineering'),('Master of Science','Speech-Language Pathology'),('Master of Science','Supply Chain Management'),('Master of Science','Sustainability Planning and Policy'),('Master of Science','Systems Engineering and Management'),('Doctor of Audiology','Audiology'),('Doctor of Business Administration','Business Administration'),('Doctor of Philosophy','Arts, Technology, and Emerging Communication'),('Doctor of Philosophy','Biomedical Engineering'),('Doctor of Philosophy','Chemistry'),('Doctor of Philosophy','Cognition and Neuroscience'),('Doctor of Philosophy','Computer Engineering'),('Doctor of Philosophy','Computer Science'),('Doctor of Philosophy','Criminology'),('Doctor of Philosophy','Data Science and Statistics'),('Doctor of Philosophy','Economics'),('Doctor of Philosophy','Electrical Engineering'),('Doctor of Philosophy','Geosciences'),('Doctor of Philosophy','Geospatial Information Sciences'),('Doctor of Philosophy','History'),('Doctor of Philosophy','Humanities'),('Doctor of Philosophy','International Management Studies'),('Doctor of Philosophy','Literature'),('Doctor of Philosophy','Management Science'),('Doctor of Philosophy','Materials Science and Engineering'),('Doctor of Philosophy','Mathematics'),('Doctor of Philosophy','Mechanical Engineering'),('Doctor of Philosophy','Molecular and Cell Biology'),('Doctor of Philosophy','Physics'),('Doctor of Philosophy','Political Science'),('Doctor of Philosophy','Psychology'),('Doctor of Philosophy','Public Affairs'),('Doctor of Philosophy','Public Policy and Political Economy'),('Doctor of Philosophy','Software Engineering'),('Doctor of Philosophy','Speech, Language and Hearing Sciences'),('Doctor of Philosophy','Visual and Performing Arts');

create function private.valid_utd_program(degree_value text, major_value text, incomplete boolean default false)
returns boolean language sql stable security invoker set search_path = '' as $$
 select case
  when coalesce(degree_value,'')='' then coalesce(major_value,'')=''
  when coalesce(major_value,'')='' then incomplete and exists(select 1 from public.utd_academic_programs p where p.degree=degree_value)
  else exists(select 1 from public.utd_academic_programs p where p.degree=degree_value and p.major=major_value)
 end;
$$;
revoke all on function private.valid_utd_program(text,text,boolean) from public;
grant execute on function private.valid_utd_program(text,text,boolean) to authenticated, service_role;

alter table public.profiles add constraint profiles_valid_utd_program check(private.valid_utd_program(degree,major)) not valid;
alter table public.profiles validate constraint profiles_valid_utd_program;

create function private.validate_application_program() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if (new.responses ? 'degree' or new.responses ? 'major') and not private.valid_utd_program(new.responses->>'degree',new.responses->>'major',new.submission_state='draft') then
  raise exception 'Select a valid UT Dallas degree and major.' using errcode='22023';
 end if;
 return new;
end;
$$;
create trigger applications_validate_program before insert or update of responses,submission_state on public.applications for each row execute function private.validate_application_program();

-- Freeze the actual schema used at submission; refresh versions only for editable drafts.
alter table public.applications add column form_schema_snapshot jsonb;
alter table public.applications disable trigger applications_prepare_write;
update public.applications a set form_schema_snapshot=o.form_schema, form_version=case when a.submission_state='draft' then o.form_version else a.form_version end from public.application_openings o where o.id=a.opening_id;
alter table public.applications enable trigger applications_prepare_write;
alter table public.applications alter column form_schema_snapshot set not null;
alter table public.applications add constraint applications_schema_snapshot_object check(jsonb_typeof(form_schema_snapshot)='object');

-- Patch the existing audited trigger without replacing its authorization/state-transition rules.
do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('private.prepare_application_write()'::regprocedure);
 if position('new.form_version := opening_record.form_version;' in definition)=0 then raise exception 'Unexpected application trigger definition'; end if;
 definition:=replace(definition,'new.form_version := opening_record.form_version;', 'new.form_version := opening_record.form_version; new.form_schema_snapshot := opening_record.form_schema;');
 definition:=replace(definition,'  else
    if row(', '  else
    if new.form_schema_snapshot is distinct from old.form_schema_snapshot then raise exception ''Application schema cannot be changed directly.'' using errcode=''22023''; end if;
    if row(');
 definition:=replace(definition,'      new.published_decision := old.published_decision;', '      new.form_version := opening_record.form_version; new.form_schema_snapshot := opening_record.form_schema;
      new.published_decision := old.published_decision;');
 -- Avoid escape-string ambiguity in the existing UTD domain pattern.
 definition:=replace(definition, '@utdallas'||repeat(chr(92),2)||'.edu$', '@utdallas[.]edu$');
 definition:=replace(definition, $old$@utdallas\.edu$$old$, $new$@utdallas[.]edu$$new$);
 if position('Application schema cannot be changed directly.' in definition)=0 then raise exception 'Unexpected schema protection trigger definition'; end if;
 execute definition;
 definition:=pg_get_functiondef('public.respond_to_mentee_offer(bigint,text,boolean)'::regprocedure);
 definition:=replace(definition, 'response not in (''confirmed'', ''released'')', 'response is null or response not in (''confirmed'', ''released'')');
 definition:=replace(definition, 'and not agreements_confirmed', 'and agreements_confirmed is not true');
 if position('agreements_confirmed is not true' in definition)=0 then raise exception 'Unexpected RSVP guard definition'; end if;
 execute definition;
end;
$patch$;

-- A publication is a distinct notification event, including after a reopen/resubmit cycle.
do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('private.record_application_change()'::regprocedure);
 definition:=replace(definition, '  delivery_template text;', '  delivery_template text; decision_event_id bigint;');
 definition:=replace(definition, E'jsonb_build_object(''decision'', new.published_decision)\n    );', E'jsonb_build_object(''decision'', new.published_decision)\n    ) returning id into decision_event_id;');
 definition:=replace(definition, $old$format('application:%s:decision:%s:%s', new.id, new.published_decision, delivery_template)$old$, $new$format('application:%s:decision:%s:%s:%s', new.id, new.published_decision, delivery_template, decision_event_id)$new$);
 definition:=replace(definition, '    delete from public.application_rsvps where application_id = new.id;', '    delete from public.application_rsvps where application_id = new.id;
    update public.application_email_queue set status=''cancelled'', last_error=''Application reopened before delivery.'' where application_id=new.id and status in (''pending'',''failed'');');
 definition:=replace(definition, '  return null;', '  if tg_op=''UPDATE'' and new.published_decision is distinct from old.published_decision then
    update public.application_email_queue set status=''cancelled'',last_error=''Decision changed before delivery.'' where application_id=new.id and status in (''pending'',''failed'') and template_key in (''acceptance'',''rejection'',''officer_update'',''rsvp_expired'') and payload->>''decision'' is distinct from new.published_decision;
  end if;
  return null;');
 if position('returning id into decision_event_id' in definition)=0 or position('delivery_template, decision_event_id)' in definition)=0 then raise exception 'Unexpected publication notification definition'; end if;
 execute definition;
end;
$patch$;

-- Retry state and an atomic lease shared by immediate delivery and the scheduled worker.
alter table public.application_email_queue drop constraint application_email_queue_status_check;
alter table public.application_email_queue add constraint application_email_queue_status_check check(status in ('pending','processing','sent','failed','cancelled','uncertain'));
alter table public.application_email_queue add column attempts integer not null default 0 check(attempts>=0), add column next_attempt_at timestamptz not null default now(), add column provider_idempotency_key uuid not null default gen_random_uuid(), add column lease_token uuid, add column locked_until timestamptz;
-- Historical failures have no reliable acknowledgement/attempt metadata. Review before retrying.
update public.application_email_queue set status='uncertain',last_error='Historical delivery failure. Check Brevo before retrying.' where status='failed';
create index application_email_queue_retry_idx on public.application_email_queue(next_attempt_at,id) where status in ('pending','failed','processing');

create function public.claim_application_email(queue_id bigint) returns setof public.application_email_queue language sql security invoker set search_path='' as $$
 update public.application_email_queue set status='processing', attempts=attempts+1, lease_token=gen_random_uuid(), locked_until=clock_timestamp()+interval '2 minutes'
 where id=queue_id and attempts<5 and ((status in ('pending','failed') and next_attempt_at<=clock_timestamp()) )
 returning *;
$$;
revoke all on function public.claim_application_email(bigint) from public,anon,authenticated;
grant execute on function public.claim_application_email(bigint) to service_role;

-- Unknown addresses never reserve the shared provider budget. Only Edge Functions may call this.
create function public.reserve_password_reset(p_email text,p_email_key text,p_global_key text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where email=lower(p_email) and deleted_at is null) then return false; end if;
 if not public.consume_password_reset_rate_limit(p_email_key,3,3600) then return false; end if;
 return public.consume_password_reset_rate_limit(p_global_key,500,3600);
end;
$$;
revoke all on function public.reserve_password_reset(text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_password_reset(text,text,text) to service_role;

create index application_events_latest_stage_idx on public.application_events(application_id,created_at desc,id desc) where event_type='decision_staged';
create index applications_submitted_page_idx on public.applications(submitted_at desc,id desc) where submission_state='submitted';

-- Small, server-filtered pages and database aggregates; event histories never cross the list boundary.
create function public.get_staff_application_page(p_q text default '',p_position text default '',p_decision text default '',p_page integer default 1,p_page_size integer default 25) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; page_size integer:=least(50,greatest(1,coalesce(p_page_size,25))); page_number integer:=least(100000,greatest(1,coalesce(p_page,1)));
begin
 if not (select private.is_application_staff()) then raise exception 'Application staff access required.' using errcode='42501'; end if;
 with base as materialized (
  select a.id,a.applicant_first_name,a.applicant_last_name,a.applicant_email,a.opening_id,a.submitted_at,a.published_decision,
   jsonb_build_object('slug',o.slug,'title',o.title,'accent',o.accent) as application_openings,
   case when r.application_id is null then null else jsonb_build_object('status',r.status,'deadline_at',r.deadline_at) end as application_rsvps,
   case when stage.details->>'decision' in ('accepted','rejected') then stage.details->>'decision' end as staged_decision,
   o.slug as opening_slug,r.status as rsvp_status,r.deadline_at
  from public.applications a join public.application_openings o on o.id=a.opening_id
  left join public.application_rsvps r on r.application_id=a.id
  left join lateral (select e.details from public.application_events e where e.application_id=a.id and e.event_type='decision_staged' and e.created_at>=a.submitted_at order by e.created_at desc,e.id desc limit 1) stage on true
  where a.submission_state='submitted'
 ), filtered as materialized (
  select * from base where (coalesce(p_position,'')='' or opening_slug=p_position)
   and (coalesce(p_decision,'')='' or published_decision=p_decision or (p_decision='staged' and published_decision='undecided' and staged_decision is not null))
   and (coalesce(btrim(p_q),'')='' or strpos(lower(concat_ws(' ',applicant_first_name,applicant_last_name,applicant_email)),lower(left(btrim(p_q),200)))>0)
 ), page_rows as (
  select * from filtered order by submitted_at desc,id desc limit page_size offset (page_number-1)*page_size
 ) select jsonb_build_object(
  'applications',coalesce((select jsonb_agg(to_jsonb(p) order by p.submitted_at desc,p.id desc) from page_rows p),'[]'::jsonb),
  'matched',(select count(*) from filtered),'page',page_number,'pageSize',page_size,
  'metrics',(select jsonb_build_object('total',count(*),'accepted',count(*) filter(where published_decision='accepted'),'notSelected',count(*) filter(where published_decision='rejected'),'awaiting',count(*) filter(where published_decision='undecided')) from base),
  'stagedCount',(select count(*) from base where opening_slug=p_position and published_decision='undecided' and staged_decision is not null),
  'rsvpSummary',(select jsonb_build_object('confirmed',count(*) filter(where rsvp_status='confirmed'),'released',count(*) filter(where rsvp_status='released'),'expired',count(*) filter(where rsvp_status='expired'),'awaiting',count(*) filter(where rsvp_status='awaiting_response' and deadline_at>now()),'readyToRelease',count(*) filter(where rsvp_status='awaiting_response' and deadline_at<=now())) from base where opening_slug=p_position)
 ) into result;
 return result;
end;
$$;
revoke all on function public.get_staff_application_page(text,text,text,integer,integer) from public,anon;
grant execute on function public.get_staff_application_page(text,text,text,integer,integer) to authenticated;

-- Delivery status and manual retry remain administrator-only.
create function private.application_email_status(target_application_id bigint) returns table(id bigint,template_key text,status text,attempts integer,next_attempt_at timestamptz,last_error text)
language plpgsql security definer set search_path='' as $$
begin
 if not (select private.is_application_admin()) then raise exception 'Administrator access required.' using errcode='42501'; end if;
 return query select q.id,q.template_key,q.status,q.attempts,q.next_attempt_at,q.last_error from public.application_email_queue q where q.application_id=target_application_id order by q.created_at desc,q.id desc limit 20;
end;
$$;
revoke all on function private.application_email_status(bigint) from public,anon;
grant execute on function private.application_email_status(bigint) to authenticated;
create function public.application_email_status(target_application_id bigint) returns table(id bigint,template_key text,status text,attempts integer,next_attempt_at timestamptz,last_error text)
language sql security invoker set search_path='' as $$ select * from private.application_email_status(target_application_id); $$;
revoke all on function public.application_email_status(bigint) from public,anon;
grant execute on function public.application_email_status(bigint) to authenticated;

create function private.retry_application_email(target_queue_id bigint) returns table(application_id bigint,template_key text)
language plpgsql security definer set search_path='' as $$
begin
 if not (select private.is_application_admin()) then raise exception 'Administrator access required.' using errcode='42501'; end if;
 return query update public.application_email_queue q set attempts=0,status='pending',next_attempt_at=clock_timestamp(),lease_token=null,locked_until=null,last_error=null
 where q.id=target_queue_id and q.status in ('failed','uncertain') returning q.application_id,q.template_key;
end;
$$;
revoke all on function private.retry_application_email(bigint) from public,anon;
grant execute on function private.retry_application_email(bigint) to authenticated;
create function public.retry_application_email(target_queue_id bigint) returns table(application_id bigint,template_key text)
language sql security invoker set search_path='' as $$ select * from private.retry_application_email(target_queue_id); $$;
revoke all on function public.retry_application_email(bigint) from public,anon;
grant execute on function public.retry_application_email(bigint) to authenticated;

-- An interrupted send may have reached the provider. Do not automatically resend it.
create function public.expire_application_email_leases() returns void language sql security invoker set search_path='' as $$
 update public.application_email_queue set status='uncertain',lease_token=null,locked_until=null,last_error='Delivery was interrupted. Check Brevo before retrying.' where status='processing' and locked_until<clock_timestamp();
$$;
revoke all on function public.expire_application_email_leases() from public,anon,authenticated;
grant execute on function public.expire_application_email_leases() to service_role;

-- A private cron token stays in Vault; it is never embedded in application code or returned to browsers.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='application_email_worker_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'application_email_worker_token');
 end if;
end; $$;
create function public.is_application_email_worker(p_token text) returns boolean
language sql security definer set search_path='' as $$
 select coalesce(p_token is not null and extensions.digest(p_token,'sha256')=extensions.digest((select decrypted_secret from vault.decrypted_secrets where name='application_email_worker_token'),'sha256'),false);
$$;
revoke all on function public.is_application_email_worker(text) from public,anon,authenticated;
grant execute on function public.is_application_email_worker(text) to service_role;
-- Scheduling is installed separately after the worker deployment has been verified.
