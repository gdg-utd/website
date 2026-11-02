-- Run as the database owner. Every fixture and test mutation is rolled back.
-- No provider calls: queued emails stay uncommitted and invisible to workers.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
create temporary table audit_ids (key text primary key, uid uuid, id bigint);
grant select, insert, update on audit_ids to authenticated, anon;
create function pg_temp.check_true(ok boolean, label text) returns void
language plpgsql security invoker as $$
begin
 if ok is distinct from true then raise exception 'Authorization regression: %', label; end if;
end $$;
create function pg_temp.denied(command text, label text) returns void
language plpgsql security invoker as $$
begin
 begin execute command;
 exception when insufficient_privilege then return;
 end;
 raise exception 'Authorization regression: unexpectedly allowed %', label;
end $$;
create function pg_temp.invalid(command text, label text) returns void
language plpgsql security invoker as $$
begin
 begin execute command;
 exception when sqlstate '22023' then return;
 end;
 raise exception 'Authorization regression: unexpectedly accepted %', label;
end $$;
insert into audit_ids(key,uid) select name,gen_random_uuid() from unnest(array['alice','bob','reviewer','admin']) name;
insert into auth.users(id,email,raw_user_meta_data)
select uid,'codex-audit-'||uid||'@utdallas.edu',jsonb_build_object('first_name','Audit','last_name',key) from audit_ids;
insert into public.application_admins(user_id,role)
select uid,key from audit_ids where key in ('reviewer','admin');
-- Replace only the transaction-visible SPRINT slug so expiry release cannot
-- select any existing applicant. Other sessions continue seeing the real slug.
update public.application_openings set slug='audit-original-'||id where slug='sprint-mentee';
with fixtures as (
 insert into public.application_openings(slug,title,eyebrow,description,status,form_schema,email_templates)
 select name,'Audit only','Audit','Transaction-only fixture','open',
 '{"sections":[{"id":"one","title":"About","fields":[{"id":"answer","label":"Answer","type":"short_text","required":true}]}]}'::jsonb,'{}'::jsonb
 from unnest(array['audit-opening-a','audit-opening-b','sprint-mentee']) name returning id,slug
) insert into audit_ids(key,id) select slug,id from fixtures;

-- Anonymous callers cannot see profiles/submissions, create applications, or publish.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
select pg_temp.denied('select * from public.profiles','anonymous profile isolation');
select pg_temp.denied('select * from public.applications','anonymous application isolation');
select pg_temp.denied('select public.publish_staged_application_decisions('||(select id from audit_ids where key='audit-opening-a')||')','anonymous publishing');
select pg_temp.denied('select public.reopen_application(0,''Correction requested'')','anonymous reopen RPC');
reset role;

-- Alice saves/submits only her own application. Draft data and history stay private.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='alice'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_true((select count(*)=1 from public.profiles),'own profile only');
update public.profiles set first_name='Updated audit' where id=(select uid from audit_ids where key='alice');
select pg_temp.check_true((select first_name='Updated audit' from public.profiles where id=(select uid from audit_ids where key='alice')),'own profile update');
select pg_temp.denied('insert into public.application_admins(user_id,role) values ('||quote_literal((select uid from audit_ids where key='alice'))||',''admin'')','self-promotion');
select pg_temp.denied('insert into public.applications(opening_id,applicant_id) values ('||(select id from audit_ids where key='audit-opening-a')||','||quote_literal((select uid from audit_ids where key='bob'))||')','forged application owner');
with created as (insert into public.applications(opening_id,applicant_id,responses)
 values ((select id from audit_ids where key='audit-opening-a'),(select uid from audit_ids where key='alice'),'{"answer":"Alice draft"}') returning id)
insert into audit_ids(key,id) select 'alice-app',id from created;
select pg_temp.check_true((select count(*)=0 from public.application_events),'applicant cannot read internal history');
select pg_temp.denied('select * from public.application_email_queue','applicant cannot read queue');
select pg_temp.denied('select public.get_staff_application_page()','applicant staff list');
select pg_temp.denied('select public.application_email_status('||(select id from audit_ids where key='alice-app')||')','applicant delivery status');
reset role;

-- Bob cannot read or modify Alice's draft, profile, or future submitted answers.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='bob'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='bob'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from public.applications where id=(select id from audit_ids where key='alice-app')),'cross-applicant draft read');
do $$declare changed integer; begin
 update public.applications set responses='{"answer":"Tampered"}' where id=(select id from audit_ids where key='alice-app'); get diagnostics changed=row_count;
 perform pg_temp.check_true(changed=0,'cross-applicant draft update');
 update public.profiles set first_name='Tampered' where id=(select uid from audit_ids where key='alice'); get diagnostics changed=row_count;
 perform pg_temp.check_true(changed=0,'cross-applicant profile update');
end $$;
with created as (insert into public.applications(opening_id,applicant_id,responses,submission_state)
 values ((select id from audit_ids where key='audit-opening-b'),(select uid from audit_ids where key='bob'),'{"answer":"Bob submitted"}','submitted') returning id)
insert into audit_ids(key,id) select 'bob-app',id from created;
reset role;
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='alice'),'role','authenticated')::text,true);
set local role authenticated;
update public.applications set submission_state='submitted' where id=(select id from audit_ids where key='alice-app');
select pg_temp.check_true((select count(*)=0 from public.applications where id=(select id from audit_ids where key='bob-app')),'cross-applicant submitted read');
do $$declare changed integer; begin
 update public.applications set responses='{"answer":"Tampered"}' where id=(select id from audit_ids where key='alice-app'); get diagnostics changed=row_count;
 perform pg_temp.check_true(changed=0,'submitted applicant answers locked');
end $$;
select pg_temp.denied('select public.retry_application_email(0)','applicant manual retry');
select pg_temp.denied('select public.reopen_application('||(select id from audit_ids where key='alice-app')||',''Correction requested'')','applicant reopen RPC');
select pg_temp.denied('select private.reopen_application('||(select id from audit_ids where key='alice-app')||',''Correction requested'')','private helper also checks admin role');
reset role;

-- Reviewer reads/stages/clears; publishing, reopening, queue and role changes denied.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='reviewer'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='reviewer'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_true((select count(*)=2 from public.applications where id in (select id from audit_ids where key in ('alice-app','bob-app'))),'reviewer submitted visibility');
insert into public.application_events(application_id,actor_id,event_type,details)
select id,(select uid from audit_ids where key='reviewer'),'decision_staged','{"decision":"accepted"}' from audit_ids where key in ('alice-app','bob-app');
insert into public.application_events(application_id,actor_id,event_type,details)
select id,(select uid from audit_ids where key='reviewer'),'decision_staged','{"decision":"cleared"}' from audit_ids where key='alice-app';
insert into public.application_events(application_id,actor_id,event_type,details)
select id,(select uid from audit_ids where key='reviewer'),'decision_staged','{"decision":"accepted"}' from audit_ids where key='alice-app';
select pg_temp.denied('select public.publish_staged_application_decisions('||(select id from audit_ids where key='audit-opening-a')||')','reviewer bulk publish');
select pg_temp.denied('select public.application_email_status('||(select id from audit_ids where key='alice-app')||')','reviewer delivery payload');
select pg_temp.denied('select public.release_expired_mentee_offers('||(select id from audit_ids where key='sprint-mentee')||')','reviewer expiry release');
select pg_temp.denied('select public.reopen_application('||(select id from audit_ids where key='alice-app')||',''Correction requested'')','reviewer reopen RPC');
do $$declare changed integer; begin
 update public.applications set submission_state='draft' where id=(select id from audit_ids where key='alice-app'); get diagnostics changed=row_count;
 perform pg_temp.check_true(changed=0,'reviewer reopen');
 update public.applications set published_decision='accepted' where id=(select id from audit_ids where key='alice-app'); get diagnostics changed=row_count;
 perform pg_temp.check_true(changed=0,'reviewer single publish');
end $$;
reset role;

-- Admin publishing is opening-scoped and repeat publication is idempotent.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='admin'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='admin'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_true((select count(*)=1 from public.publish_staged_application_decisions((select id from audit_ids where key='audit-opening-a'))),'scoped publication count');
select pg_temp.check_true((select published_decision='undecided' from public.applications where id=(select id from audit_ids where key='bob-app')),'other opening stays unpublished');
select pg_temp.check_true((select count(*)=0 from public.publish_staged_application_decisions((select id from audit_ids where key='audit-opening-a'))),'repeat publish is no-op');
-- Admin reopens another applicant's submission.
select pg_temp.invalid('select public.reopen_application('||(select id from audit_ids where key='alice-app')||',null)','null reason rejected');
select pg_temp.invalid('select public.reopen_application('||(select id from audit_ids where key='alice-app')||','||quote_literal(E' \t\n ')||')','whitespace reason rejected');
select pg_temp.invalid('select public.reopen_application('||(select id from audit_ids where key='alice-app')||',repeat(''x'',2001))','oversized reason rejected');
select pg_temp.check_true((select submission_state='submitted' from public.applications where id=(select id from audit_ids where key='alice-app')),'invalid reopening leaves submission unchanged');
select pg_temp.check_true(public.reopen_application((select id from audit_ids where key='alice-app'),'  Please clarify your experience.  '),'admin scoped reopen');
select pg_temp.check_true((select count(*)=0 from public.applications where id=(select id from audit_ids where key='alice-app')),'reopened draft remains private from staff');
select pg_temp.check_true(not public.reopen_application((select id from audit_ids where key='alice-app'),'Another reason'),'repeat reopen no-op');
-- Admin also applies: own reopened draft follows applicant rules, not admin override.
with created as (insert into public.applications(opening_id,applicant_id,responses,submission_state)
 values ((select id from audit_ids where key='audit-opening-a'),(select uid from audit_ids where key='admin'),'{"answer":"Admin applicant"}','submitted') returning id)
insert into audit_ids(key,id) select 'admin-app',id from created;
select pg_temp.invalid('update public.applications set submission_state=''draft'' where id='||(select id from audit_ids where key='admin-app'),'direct reopen requires reason');
select pg_temp.check_true(public.reopen_application((select id from audit_ids where key='admin-app'),'Admin applicant correction'),'admin-applicant scoped reopen');
update public.applications set responses='{"answer":"Admin resubmission"}',submission_state='submitted' where id=(select id from audit_ids where key='admin-app');
select pg_temp.check_true((select responses->>'answer'='Admin resubmission' and submission_state='submitted' from public.applications where id=(select id from audit_ids where key='admin-app')),'admin-applicant resubmission');
reset role;

-- Reopened ordinary applicant can resubmit; no one can forge its schema snapshot.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='alice'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_true((select reopen_reason='Please clarify your experience.' from public.applications where id=(select id from audit_ids where key='alice-app')),'owner reads normalized reason');
select pg_temp.denied('update public.applications set reopen_reason=''Forged reason'' where id='||(select id from audit_ids where key='alice-app'),'applicant cannot alter reason');
select pg_temp.denied('insert into public.applications(opening_id,applicant_id,reopen_reason) values ('||(select id from audit_ids where key='audit-opening-b')||','||quote_literal((select uid from audit_ids where key='alice'))||',''Forged reason'')','applicant cannot invent reopening on insert');
update public.applications set responses='{"answer":"Alice resubmission"}',submission_state='submitted' where id=(select id from audit_ids where key='alice-app');
select pg_temp.check_true((select published_decision='undecided' from public.applications where id=(select id from audit_ids where key='alice-app')),'reopen clears decision');
with created as (insert into public.applications(opening_id,applicant_id,responses,submission_state)
 values ((select id from audit_ids where key='sprint-mentee'),(select uid from audit_ids where key='alice'),'{"answer":"RSVP"}','submitted') returning id)
insert into audit_ids(key,id) select 'alice-offer',id from created;
reset role;
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='bob'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='bob'),'role','authenticated')::text,true);
set local role authenticated;
with created as (insert into public.applications(opening_id,applicant_id,responses,submission_state)
 values ((select id from audit_ids where key='sprint-mentee'),(select uid from audit_ids where key='bob'),'{"answer":"Expiry"}','submitted') returning id)
insert into audit_ids(key,id) select 'bob-offer',id from created;
reset role;
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='admin'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='admin'),'role','authenticated')::text,true);
set local role authenticated;
update public.applications set published_decision='accepted' where id in (select id from audit_ids where key in ('alice-offer','bob-offer'));
reset role;
-- Transaction-only fixture setup, not an applicant permission bypass.
update public.application_rsvps set deadline_at=now() where application_id=(select id from audit_ids where key='bob-offer');
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='bob'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='bob'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.denied('select public.respond_to_mentee_offer('||(select id from audit_ids where key='alice-offer')||',''confirmed'',true)','cross-applicant RSVP');
select pg_temp.invalid('select public.respond_to_mentee_offer('||(select id from audit_ids where key='bob-offer')||',''confirmed'',true)','RSVP at exact cutoff');
reset role;
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='alice'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.invalid('select public.respond_to_mentee_offer('||(select id from audit_ids where key='alice-offer')||',''confirmed'',null)','null agreements');
select pg_temp.check_true((select rsvp_status='confirmed' from public.respond_to_mentee_offer((select id from audit_ids where key='alice-offer'),'confirmed',true)),'own RSVP confirm');
select pg_temp.invalid('select public.respond_to_mentee_offer('||(select id from audit_ids where key='alice-offer')||',''released'',true)','second RSVP response');
reset role;
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='admin'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select uid from audit_ids where key='admin'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.check_true((select count(*)=1 from public.release_expired_mentee_offers((select id from audit_ids where key='sprint-mentee'))),'only expired dummy offer released');
select pg_temp.check_true((select status='confirmed' from public.application_rsvps where application_id=(select id from audit_ids where key='alice-offer')),'confirmed spot retained');
select pg_temp.check_true((select count(*)=0 from public.release_expired_mentee_offers((select id from audit_ids where key='sprint-mentee'))),'repeat expiry release no-op');
reset role;
-- now() is fixed within this single rollback transaction. Count the distinct
-- submission events here; cross-request email cycles have separate regressions.
select pg_temp.check_true((select count(*)=2 from public.application_events where application_id=(select id from audit_ids where key='alice-app') and event_type='submitted'),'reopen/resubmit events distinct');
select pg_temp.check_true((select count(*)=1 from public.application_events where application_id=(select id from audit_ids where key='alice-app') and event_type='reopened' and details->>'reason'='Please clarify your experience.' and actor_id=(select uid from audit_ids where key='admin')),'one immutable audit event with reason and admin actor');
insert into audit_ids(key,id) select 'queue-before-second-reopen',count(*) from public.application_email_queue;
select pg_temp.check_true(public.reopen_application((select id from audit_ids where key='alice-app'),'A second correction request'),'later reopening succeeds');
select pg_temp.check_true((select reopen_reason='A second correction request' from public.applications where id=(select id from audit_ids where key='alice-app')),'latest reason replaced');
select pg_temp.check_true((select count(*)=2 from public.application_events where application_id=(select id from audit_ids where key='alice-app') and event_type='reopened'),'both reopening reasons retained in audit history');
select pg_temp.check_true((select count(*)=(select id from audit_ids where key='queue-before-second-reopen') from public.application_email_queue),'reopening sends no new notification');
select pg_temp.check_true((select count(*)=0 from public.application_email_queue where application_id=(select id from audit_ids where key='alice-app') and status in ('pending','failed')),'obsolete unsent notifications cancelled');
rollback;
select 'PASS: actual anon/authenticated role matrix; cross-applicant isolation; reviewer denials; scoped publishing; admin-applicant reopen; RSVP ownership/cutoff/idempotency. All fixtures rolled back.' as result;
