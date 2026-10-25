-- Run ONLY inside BEGIN/ROLLBACK, after loading the pending migration in that same transaction.
-- Set test.member_id to the authorized disposable test account UUID first.
-- Requires an existing submitted, undecided officer application for that account.
-- These tests never call email providers or change account credentials.
select set_config('request.jwt.claim.sub',current_setting('test.member_id'),true);
do $$
declare
 failed boolean; account_id uuid:=current_setting('test.member_id')::uuid;
 app_id bigint; queue_id bigint; before_count integer; after_count integer; snap jsonb;
 page_one jsonb; page_two jsonb; email_address text;
begin
 if private.valid_utd_program('Imaginary Degree','Invented Major') then raise exception 'F03 invented program accepted'; end if;
 if not private.valid_utd_program('Bachelor of Science','Computer Science') then raise exception 'F03 valid program rejected'; end if;
 failed:=false;
 begin update public.profiles set degree='Invented',major='Invented' where id=account_id; exception when check_violation then failed:=true; end;
 if not failed then raise exception 'F03 profile constraint failed'; end if;
 failed:=false;
 begin perform public.respond_to_mentee_offer(0,'confirmed',null); exception when sqlstate '22023' then failed:=position('agreement' in sqlerrm)>0; end;
 if not failed then raise exception 'F04 NULL agreement accepted'; end if;
 failed:=false;
 begin perform public.respond_to_mentee_offer(0,null,true); exception when sqlstate '22023' then failed:=true; end;
 if not failed then raise exception 'F04 NULL response accepted'; end if;
 if exists(select 1 from public.applications a join public.application_openings o on o.id=a.opening_id where a.submission_state='draft' and a.form_version<>o.form_version) then raise exception 'F19 draft drift remains'; end if;
 select a.id into app_id from public.applications a join public.application_openings o on o.id=a.opening_id where a.applicant_id=account_id and a.submission_state='submitted' and a.published_decision='undecided' and o.slug<>'sprint-mentee' order by a.id limit 1;
 if app_id is null then raise exception 'Disposable officer application fixture is required'; end if;
 update public.applications set submission_state='draft' where id=app_id;
 failed:=false;
 begin update public.applications set responses=jsonb_set(responses,'{degree}','"Invented"'::jsonb) where id=app_id; exception when sqlstate '22023' then failed:=position('degree' in sqlerrm)>0; end;
 if not failed then raise exception 'F03 invalid application program accepted'; end if;
 update public.applications set submission_state='submitted' where id=app_id;
 select count(*) into before_count from public.application_email_queue where application_id=app_id and template_key='officer_update';
 update public.applications set published_decision='accepted' where id=app_id;
 select form_schema_snapshot into snap from public.applications where id=app_id;
 update public.applications set submission_state='draft' where id=app_id;
 update public.applications set submission_state='submitted' where id=app_id;
 update public.applications set published_decision='accepted' where id=app_id;
 select count(*) into after_count from public.application_email_queue where application_id=app_id and template_key='officer_update';
 if after_count-before_count<>2 then raise exception 'F16 repeat publication did not enqueue twice'; end if;
 if (select count(distinct provider_idempotency_key) from public.application_email_queue where application_id=app_id and template_key='officer_update')<>after_count then raise exception 'F16 provider keys reused'; end if;
 if snap is distinct from (select form_schema_snapshot from public.applications where id=app_id) then raise exception 'F19 snapshot changed unexpectedly'; end if;
 failed:=false;
 begin update public.applications set form_schema_snapshot='{}'::jsonb where id=app_id; exception when sqlstate '22023' then failed:=true; end;
 if not failed then raise exception 'F19 submitted snapshot mutation accepted'; end if;
 select id into queue_id from public.application_email_queue where application_id=app_id and template_key='officer_update' order by id desc limit 1;
 if (select count(*) from public.claim_application_email(queue_id))<>1 then raise exception 'F15 initial claim failed'; end if;
 if exists(select 1 from public.claim_application_email(queue_id)) then raise exception 'F15 concurrent duplicate claim accepted'; end if;
 update public.application_email_queue set status='failed',attempts=5,lease_token=null,locked_until=null where id=queue_id;
 if exists(select 1 from public.claim_application_email(queue_id)) then raise exception 'F15 retry limit ignored'; end if;
 perform public.retry_application_email(queue_id);
 if (select attempts from public.application_email_queue where id=queue_id)<>0 then raise exception 'F15 manual retry did not reset attempts'; end if;
 update public.applications set published_decision='rejected' where id=app_id;
 if (select status from public.application_email_queue where id=queue_id)<>'cancelled' then raise exception 'F15 obsolete decision delivery not cancelled'; end if;
 page_one:=public.get_staff_application_page('','','',1,1); page_two:=public.get_staff_application_page('','','',2,1);
 if jsonb_array_length(page_one->'applications')<>1 then raise exception 'F18 page size ignored'; end if;
 if (page_one->>'matched')::integer>1 and page_one->'applications'->0->>'id'=page_two->'applications'->0->>'id' then raise exception 'F18 pagination repeats rows'; end if;
 if page_one->'applications'->0 ? 'responses' then raise exception 'F18 list exposes response documents'; end if;
 if public.reserve_password_reset('does-not-exist-audit@utdallas.edu',repeat('a',64),repeat('b',64)) then raise exception 'F27 nonexistent reset accepted'; end if;
 if exists(select 1 from public.password_reset_rate_limits where key_hash=repeat('b',64)) then raise exception 'F27 nonexistent reset consumed global budget'; end if;
 for counter in 2..3 loop
  if public.reserve_password_reset_request('does-not-exist-audit@utdallas.edu',repeat('a',64),repeat('b',64))<>'skipped' then raise exception 'Unknown address was not handled generically'; end if;
 end loop;
 if public.reserve_password_reset_request('does-not-exist-audit@utdallas.edu',repeat('a',64),repeat('b',64))<>'limited' then raise exception 'Unknown address quota feedback differs from existing accounts'; end if;
 select email into email_address from auth.users where id=account_id;
 for counter in 1..3 loop
  if not public.reserve_password_reset(email_address,repeat('c',64),repeat('d',64)) then raise exception 'F27 existing reset not reserved'; end if;
 end loop;
 if public.reserve_password_reset(email_address,repeat('c',64),repeat('d',64)) then raise exception 'F27 per-account limit ignored'; end if;
 if (select request_count from public.password_reset_rate_limits where key_hash=repeat('d',64))<>3 then raise exception 'F27 rejected request consumed global budget'; end if;
 if public.reserve_password_reset_request(email_address,repeat('c',64),repeat('d',64))<>'limited' then raise exception 'Existing account did not report quota'; end if;
 update public.password_reset_rate_limits set expires_at=clock_timestamp()-interval '1 second' where key_hash=repeat('c',64);
 if public.reserve_password_reset_request(email_address,repeat('c',64),repeat('d',64))<>'allowed' then raise exception 'Expired quota window did not reset'; end if;
 update public.password_reset_rate_limits set request_count=500 where key_hash=repeat('d',64);
 if public.reserve_password_reset_request(email_address,repeat('c',64),repeat('d',64))<>'busy' then raise exception 'Global quota ignored'; end if;
 if public.reserve_password_reset_request('does-not-exist-audit@utdallas.edu',repeat('e',64),repeat('d',64))<>'busy' then raise exception 'Global quota reveals account existence'; end if;
 if has_function_privilege('anon','public.reserve_password_reset_request(text,text,text)','execute') or has_function_privilege('authenticated','public.reserve_password_reset_request(text,text,text)','execute') then raise exception 'Reset reservation exposed'; end if;
 if has_function_privilege('authenticated','public.claim_application_email(bigint)','execute') or has_function_privilege('anon','public.reserve_password_reset(text,text,text)','execute') or has_function_privilege('authenticated','public.is_application_email_worker(text)','execute') then raise exception 'Server-only function exposed'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 failed:=false;
 begin perform public.get_staff_application_page(); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'F18 nonstaff access allowed'; end if;
 failed:=false;
 begin perform public.retry_application_email(queue_id); exception when insufficient_privilege then failed:=true; end;
 if not failed then raise exception 'F15 nonadmin retry allowed'; end if;
 perform set_config('request.jwt.claim.sub',account_id::text,true);
 raise notice 'Database regression checks passed';
end;
$$;
