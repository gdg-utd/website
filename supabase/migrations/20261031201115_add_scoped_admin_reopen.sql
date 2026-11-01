-- Reopening crosses the SELECT policy boundary from submitted to private draft.
-- Expose only this checked transition; do not grant staff access to draft answers.
create function private.reopen_application(target_application_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare changed_id bigint;
begin
  if (select auth.uid()) is null or not (select private.is_application_admin()) then
    raise exception 'Only application administrators can reopen applications.' using errcode = '42501';
  end if;
  update public.applications
    set submission_state = 'draft'
    where id = target_application_id and submission_state = 'submitted'
    returning id into changed_id;
  return changed_id is not null;
end;
$$;
revoke all on function private.reopen_application(bigint) from public, anon, authenticated;
grant execute on function private.reopen_application(bigint) to authenticated;

create function public.reopen_application(target_application_id bigint)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.reopen_application(target_application_id); $$;
revoke all on function public.reopen_application(bigint) from public, anon, authenticated;
grant execute on function public.reopen_application(bigint) to authenticated;
