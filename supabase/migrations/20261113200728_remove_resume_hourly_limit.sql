create or replace function public.reserve_resume_upload(p_member_id uuid, p_bytes integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  reserved_now timestamptz;
begin
  if p_bytes is null or p_bytes not between 1 and 4194304 or not exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
    where u.id = p_member_id and u.deleted_at is null and u.email_confirmed_at is not null
      and u.email ~* '^[^@[:space:]]+@utdallas\.edu$'
  ) then
    return false;
  end if;

  perform pg_advisory_xact_lock(1365787479, 1);
  reserved_now := clock_timestamp();
  if (select coalesce(sum(bytes), 0) from private.resume_upload_reservations
        where reserved_at > reserved_now - interval '24 hours') + p_bytes > 268435456 then
    return false;
  end if;

  insert into private.resume_upload_reservations (member_id, bytes, reserved_at)
  values (p_member_id, p_bytes, reserved_now);
  return true;
end;
$$;

drop index private.resume_upload_reservations_member_time_idx;
