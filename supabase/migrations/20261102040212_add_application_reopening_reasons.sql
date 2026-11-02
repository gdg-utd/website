-- Keep the latest applicant-visible reason on the application; every reopening
-- also records an immutable reason in the existing staff-only event history.
alter table public.applications add column reopen_reason text
  check (reopen_reason is null or char_length(reopen_reason) between 1 and 2000);

create function private.prepare_application_reopen_reason()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.reopen_reason is not null then
      raise exception 'Reopening reasons can only be set when an administrator reopens a submission.' using errcode = '22023';
    end if;
  elsif old.submission_state = 'submitted' and new.submission_state = 'draft' then
    if (select auth.uid()) is null or not (select private.is_application_admin()) then
      raise exception 'Only application administrators can reopen applications.' using errcode = '42501';
    end if;
    new.reopen_reason := regexp_replace(new.reopen_reason, '^[[:space:]]+|[[:space:]]+$', '', 'g');
    if new.reopen_reason is null or char_length(new.reopen_reason) not between 1 and 2000 then
      raise exception 'Enter a reopening reason of 1 to 2000 characters.' using errcode = '22023';
    end if;
  elsif new.reopen_reason is distinct from old.reopen_reason then
    raise exception 'Reopening reasons cannot be changed outside a reopening.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.prepare_application_reopen_reason() from public, anon, authenticated;
create trigger applications_reopen_reason before insert or update on public.applications
  for each row execute function private.prepare_application_reopen_reason();

-- No reasonless API remains. The transition and audit event are one transaction.
drop function public.reopen_application(bigint);
drop function private.reopen_application(bigint);
create function private.reopen_application(target_application_id bigint, reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed_id bigint;
begin
  if (select auth.uid()) is null or not (select private.is_application_admin()) then
    raise exception 'Only application administrators can reopen applications.' using errcode = '42501';
  end if;
  reason := regexp_replace(reason, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if reason is null or char_length(reason) not between 1 and 2000 then
    raise exception 'Enter a reopening reason of 1 to 2000 characters.' using errcode = '22023';
  end if;
  update public.applications set submission_state = 'draft', reopen_reason = reason
    where id = target_application_id and submission_state = 'submitted'
    returning id into changed_id;
  return changed_id is not null;
end;
$$;
revoke all on function private.reopen_application(bigint, text) from public, anon, authenticated;
grant execute on function private.reopen_application(bigint, text) to authenticated;
create function public.reopen_application(target_application_id bigint, reason text)
returns boolean language sql security invoker set search_path = ''
as $$ select private.reopen_application(target_application_id, reason); $$;
revoke all on function public.reopen_application(bigint, text) from public, anon, authenticated;
grant execute on function public.reopen_application(bigint, text) to authenticated;

do $patch$
declare definition text;
begin
  definition := pg_get_functiondef('private.record_application_change()'::regprocedure);
  if position($old$values (new.id, (select auth.uid()), 'reopened');$old$ in definition) = 0 then
    raise exception 'Unexpected application audit trigger definition';
  end if;
  definition := replace(definition,
    $old$insert into public.application_events (application_id, actor_id, event_type)
    values (new.id, (select auth.uid()), 'reopened');$old$,
    $new$insert into public.application_events (application_id, actor_id, event_type, details)
    values (new.id, (select auth.uid()), 'reopened', jsonb_build_object('reason', new.reopen_reason));$new$);
  if position($check$jsonb_build_object('reason', new.reopen_reason)$check$ in definition) = 0 then
    raise exception 'Reopening audit patch did not apply';
  end if;
  execute definition;
end;
$patch$;
