-- Résumé selection follows profile ownership, draft ownership, and submission locks.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
insert into storage.objects(bucket_id, name)
select 'member-resumes', uid||'/11111111-1111-4111-8111-111111111111/'||filename
from audit_ids cross join unnest(array['b2xkLnBkZg.pdf','bmV3LnBkZg.pdf']) filename where key='alice';
-- A broader permissive policy on another Storage integration must not reopen resume writes.
create policy "Test permissive storage inserts" on storage.objects for insert to authenticated with check (true);
create policy "Test permissive storage updates" on storage.objects for update to authenticated using (true) with check (true);
create policy "Test permissive storage deletes" on storage.objects for delete to authenticated using (true);
set local role authenticated;
select pg_temp.denied(
  format('insert into storage.objects(bucket_id,name) values (%L,%L)', 'member-resumes',
    (select uid from audit_ids where key='alice')||'/11111111-1111-4111-8111-111111111111/dGVzdA.pdf'),
  'direct resume upload is blocked even under a member-owned path'
);
select pg_temp.denied('select * from public.claim_unused_resume_files()', 'member cannot claim cleanup files');
select pg_temp.denied('select public.reserve_resume_upload(null, 1)', 'member cannot reserve quota directly');
update public.profiles set resume_path=(select name from storage.objects where name like '%/b2xkLnBkZg.pdf');
insert into public.applications(opening_id, applicant_id, responses, submission_state, resume_path, resume_selection_saved)
select (select id from audit_ids where key='audit-opening-b'), id, '{"answer":"Resume fixture"}', 'draft', resume_path, true
from public.profiles;
reset role;

select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='reviewer'),true);
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from storage.objects where bucket_id='member-resumes'), 'reviewer cannot read draft resume');
reset role;

select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='bob'),true);
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from storage.objects where bucket_id='member-resumes'), 'other member cannot read resume');
select pg_temp.invalid(
  format('update public.profiles set resume_path=%L', (select uid from audit_ids where key='alice')||'/11111111-1111-4111-8111-111111111111/b2xkLnBkZg.pdf'),
  'profile cannot reference another member resume'
);
select pg_temp.invalid(
  format('insert into public.applications(opening_id,applicant_id,resume_path) values (%s,%L,%L)',
    (select id from audit_ids where key='audit-opening-b'),
    (select uid from audit_ids where key='bob'),
    (select uid from audit_ids where key='alice')||'/11111111-1111-4111-8111-111111111111/b2xkLnBkZg.pdf'),
  'application cannot reference another member resume'
);
reset role;

select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
set local role authenticated;
update public.applications set submission_state='submitted' where opening_id=(select id from audit_ids where key='audit-opening-b');
update public.profiles set resume_path=(select name from storage.objects where name like '%/bmV3LnBkZg.pdf');
update public.profiles set resume_path=null;
delete from storage.objects where bucket_id='member-resumes';
update storage.objects set name=replace(name,'b2xkLnBkZg','Y2hhbmdlZA') where bucket_id='member-resumes';
select pg_temp.check_true((select count(*)=2 from storage.objects where bucket_id='member-resumes'), 'owner cannot delete uploaded versions');
select pg_temp.check_true((select count(*)=0 from storage.objects where name like '%/Y2hhbmdlZA.pdf'), 'owner cannot overwrite or rename uploaded versions');
reset role;

select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='reviewer'),true);
set local role authenticated;
select pg_temp.check_true((select array_agg(split_part(name,'/',3))=array['b2xkLnBkZg.pdf'] from storage.objects where bucket_id='member-resumes'), 'reviewer sees only submitted version after profile replacement and removal');
reset role;

select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='admin'),true);
set local role authenticated;
select pg_temp.denied(
  'update public.applications set resume_path=null where opening_id='||(select id from audit_ids where key='audit-opening-b'),
  'admin cannot replace a submitted resume'
);
reset role;


-- The server reserves quota, then a cleanup worker claims only old unreferenced files.
grant select on audit_ids to service_role;
update auth.users set email_confirmed_at = now() where id = (select uid from audit_ids where key='alice');
set local role service_role;
select pg_temp.check_true(not public.reserve_resume_upload((select uid from audit_ids where key='bob'), 4194304), 'unconfirmed account cannot reserve');
select pg_temp.check_true(not public.reserve_resume_upload((select uid from audit_ids where key='alice'), 4194305), 'oversized upload cannot reserve');
do $$
begin
  for attempt in 1..10 loop
    perform pg_temp.check_true(public.reserve_resume_upload((select uid from audit_ids where key='alice'), 4194304), 'upload within member quota');
  end loop;
end $$;
select pg_temp.check_true(not public.reserve_resume_upload((select uid from audit_ids where key='alice'), 1), 'member quota rejects eleventh upload');
reset role;
insert into private.resume_upload_reservations(member_id, bytes)
select gen_random_uuid(), 4194304 from generate_series(1,54);
update auth.users set email_confirmed_at = now() where id = (select uid from audit_ids where key='bob');
set local role service_role;
select pg_temp.check_true(not public.reserve_resume_upload((select uid from audit_ids where key='bob'), 1), 'project quota applies across accounts');
select pg_temp.check_true((select count(*)=0 from public.claim_unused_resume_files()), 'recent unattached upload protected');
reset role;

insert into storage.objects(bucket_id, name, created_at)
select 'member-resumes', uid||'/22222222-2222-4222-8222-222222222222/'||filename, now()-interval '2 days'
from audit_ids cross join unnest(array['ZHJhZnQucGRm.pdf','cHJvZmlsZS5wZGY.pdf']) filename where key='alice';
update storage.objects set created_at=now()-interval '2 days' where bucket_id='member-resumes';
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
set local role authenticated;
update public.profiles set resume_path=(select name from storage.objects where name like '%/cHJvZmlsZS5wZGY.pdf');
insert into public.applications(opening_id, applicant_id, responses, submission_state, resume_path)
select (select id from audit_ids where key='audit-opening-a'), id, '{}', 'draft',
  (select name from storage.objects where name like '%/ZHJhZnQucGRm.pdf')
from public.profiles;
reset role;

set local role service_role;
select pg_temp.check_true(
  (select array_agg(split_part(path,'/',3))=array['bmV3LnBkZg.pdf'] from public.claim_unused_resume_files() path),
  'cleanup preserves all three types of references'
);
select pg_temp.check_true((select count(*)=0 from public.claim_unused_resume_files()), 'overlapping cleanup does not reclaim the same file');
reset role;

set local role authenticated;
select pg_temp.invalid(
  format('update public.profiles set resume_path=%L', (select name from storage.objects where name like '%/bmV3LnBkZg.pdf')),
  'cleanup claim blocks new references while deletion is pending'
);
reset role;

update private.resume_cleanup_claims set retry_after=now()-interval '1 minute';
set local role service_role;
select pg_temp.check_true(
  (select array_agg(split_part(path,'/',3))=array['bmV3LnBkZg.pdf'] from public.claim_unused_resume_files() path),
  'failed deletion is eligible for retry'
);
reset role;
