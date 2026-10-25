-- Count requests for every address so quota feedback cannot reveal account existence.
-- Only registered accounts reserve the shared email-provider budget.
create function public.reserve_password_reset_request(p_email text,p_email_key text,p_global_key text)
returns text language plpgsql security definer set search_path='' as $$
begin
  if not public.consume_password_reset_rate_limit(p_email_key,3,3600) then
    return 'limited';
  end if;
  if exists (
    select 1 from public.password_reset_rate_limits
    where key_hash=p_global_key and expires_at>clock_timestamp() and request_count>=500
  ) then
    return 'busy';
  end if;
  if not exists(select 1 from auth.users where email=lower(p_email) and deleted_at is null) then
    return 'skipped';
  end if;
  if not public.consume_password_reset_rate_limit(p_global_key,500,3600) then
    return 'busy';
  end if;
  return 'allowed';
end;
$$;
revoke all on function public.reserve_password_reset_request(text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_password_reset_request(text,text,text) to service_role;

-- Keep compatibility with the previous function during deployment.
create or replace function public.reserve_password_reset(p_email text,p_email_key text,p_global_key text)
returns boolean language sql security invoker set search_path='' as $$
  select public.reserve_password_reset_request(p_email,p_email_key,p_global_key)='allowed';
$$;
