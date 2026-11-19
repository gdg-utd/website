create function private.validate_profile_net_id() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Preserve historical values until the member updates their NetID.
  if tg_op = 'UPDATE' and new.net_id is not distinct from old.net_id then
    return new;
  end if;

  if new.net_id is not null and new.net_id collate "C" !~ '^[A-Za-z]{3}[0-9]{6}$' then
    raise exception using
      errcode = '23514',
      constraint = 'profiles_net_id_format',
      message = 'NetID must contain three letters followed by six digits.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_profile_net_id() from public, anon, authenticated;

create trigger profiles_validate_net_id
before insert or update of net_id on public.profiles
for each row execute function private.validate_profile_net_id();
