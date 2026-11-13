-- Résumé selection follows profile ownership, draft ownership, and submission locks.
select set_config('request.jwt.claim.sub',(select uid::text from audit_ids where key='alice'),true);
set local role authenticated;
insert into storage.objects(bucket_id, name)
select 'member-resumes', uid||'/11111111-1111-4111-8111-111111111111/'||filename
from audit_ids cross join unnest(array['b2xkLnBkZg.pdf','bmV3LnBkZg.pdf']) filename where key='alice';
select pg_temp.denied(
  format('insert into storage.objects values (%L,%L)', 'member-resumes',
    (select uid from audit_ids where key='bob')||'/11111111-1111-4111-8111-111111111111/dGVzdA.pdf'),
  'cross-account resume upload'
);
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
