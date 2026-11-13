-- The upload worker validates PDF bytes and reserves quota before writing to Storage.
drop policy "Members can upload their own resume versions" on storage.objects;
create policy "Resume writes require the upload worker"
on storage.objects as restrictive for all to anon, authenticated
using (true)
with check (bucket_id <> 'member-resumes');

create policy "Resume versions cannot be updated by members"
on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'member-resumes');

create policy "Resume versions cannot be deleted by members"
on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'member-resumes');

create table private.resume_upload_reservations (
  id bigint generated always as identity primary key,
  member_id uuid not null,
  bytes integer not null check (bytes between 1 and 4194304),
  reserved_at timestamptz not null default clock_timestamp()
);
create index resume_upload_reservations_time_idx on private.resume_upload_reservations (reserved_at);
create index resume_upload_reservations_member_time_idx on private.resume_upload_reservations (member_id, reserved_at);

create table private.resume_cleanup_claims (
  path text primary key,
  retry_after timestamptz not null
);

create index profiles_resume_path_idx on public.profiles (resume_path) where resume_path is not null;
create index applications_resume_path_idx on public.applications (resume_path) where resume_path is not null;

-- Service-only RPC. Serialize reservations so concurrent requests cannot exceed either limit.
create function public.reserve_resume_upload(p_member_id uuid, p_bytes integer)
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
  if (select count(*) from private.resume_upload_reservations
      where member_id = p_member_id and reserved_at > reserved_now - interval '1 hour') >= 10
    or (select coalesce(sum(bytes), 0) from private.resume_upload_reservations
        where reserved_at > reserved_now - interval '24 hours') + p_bytes > 268435456 then
    return false;
  end if;

  insert into private.resume_upload_reservations (member_id, bytes, reserved_at)
  values (p_member_id, p_bytes, reserved_now);
  return true;
end;
$$;

revoke all on function public.reserve_resume_upload(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_resume_upload(uuid, integer) to service_role;

create or replace function private.validate_resume_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if tg_table_name = 'applications' then
    owner_id := new.applicant_id;
    if tg_op = 'UPDATE' then
      if row(new.resume_path, new.resume_selection_saved)
          is not distinct from row(old.resume_path, old.resume_selection_saved) then
        return new;
      end if;
      if old.submission_state <> 'draft' or (select auth.uid()) is distinct from old.applicant_id then
        raise exception 'Only applicants can change a draft resume.' using errcode = '42501';
      end if;
    end if;
  else
    owner_id := new.id;
    if new.resume_path is not distinct from old.resume_path then
      return new;
    end if;
  end if;

  if new.resume_path is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.resume_path, 4194304));
  if split_part(new.resume_path, '/', 1) <> owner_id::text
    or exists (select 1 from private.resume_cleanup_claims where path = new.resume_path)
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'member-resumes' and name = new.resume_path
    ) then
    raise exception 'Select a resume uploaded by your account.' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Claim before making an external Storage API call. While a claim exists, the
-- selection trigger rejects new references even if the API needs to retry.
create function public.claim_unused_resume_files()
returns setof text
language plpgsql security definer set search_path = ''
as $$
declare
  candidate text;
begin
  if not pg_try_advisory_xact_lock(1365787479, 2) then
    return;
  end if;

  delete from private.resume_upload_reservations where reserved_at <= now() - interval '24 hours';
  delete from private.resume_cleanup_claims c where not exists (
    select 1 from storage.objects o where o.bucket_id = 'member-resumes' and o.name = c.path
  );

  for candidate in
    select o.name from storage.objects o
    left join private.resume_cleanup_claims c on c.path = o.name
    where o.bucket_id = 'member-resumes'
      and o.created_at < now() - interval '24 hours'
      and (c.path is null or c.retry_after <= now())
      and not exists (select 1 from public.profiles p where p.resume_path = o.name)
      and not exists (select 1 from public.applications a where a.resume_path = o.name)
    order by c.retry_after nulls first, o.created_at, o.name
    limit 100
  loop
    if not pg_try_advisory_xact_lock(hashtextextended(candidate, 4194304)) then
      continue;
    end if;
    -- Recheck after taking the lock in case a profile or application just saved.
    if exists (select 1 from public.profiles where resume_path = candidate)
      or exists (select 1 from public.applications where resume_path = candidate) then
      continue;
    end if;
    insert into private.resume_cleanup_claims (path, retry_after)
    values (candidate, now() + interval '15 minutes')
    on conflict (path) do update set retry_after = excluded.retry_after;
    return next candidate;
  end loop;
end;
$$;

revoke all on function public.claim_unused_resume_files() from public, anon, authenticated;
grant execute on function public.claim_unused_resume_files() to service_role;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'resume_cleanup_worker_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'resume_cleanup_worker_token');
  end if;
end $$;

create function public.is_resume_cleanup_worker(p_token text)
returns boolean
language sql security definer set search_path = ''
as $$
  select coalesce(
    extensions.digest(p_token, 'sha256') = extensions.digest(
      (select decrypted_secret from vault.decrypted_secrets where name = 'resume_cleanup_worker_token'),
      'sha256'
    ), false
  );
$$;

revoke all on function public.is_resume_cleanup_worker(text) from public, anon, authenticated;
grant execute on function public.is_resume_cleanup_worker(text) to service_role;

-- Set resume_cleanup_project_url in Vault when enabling cleanup on a project.
select cron.schedule(
  'gdg-resume-cleanup', '*/10 * * * *',
  $job$
    select net.http_post(
      url := project.decrypted_secret || '/functions/v1/resume-storage',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-resume-cleanup-token', token.decrypted_secret),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )
    from vault.decrypted_secrets project
    cross join vault.decrypted_secrets token
    where project.name = 'resume_cleanup_project_url' and token.name = 'resume_cleanup_worker_token';
  $job$
);
