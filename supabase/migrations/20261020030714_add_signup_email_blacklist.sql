-- Manage entries in the Supabase Table Editor. No browser role can read the list.
create table public.email_blacklist (
  email text primary key check (email = lower(trim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

alter table public.email_blacklist enable row level security;
revoke all on table public.email_blacklist from public, anon, authenticated;
grant all on table public.email_blacklist to service_role;

-- Normalize dashboard inserts and edits, including mixed-case addresses.
create function private.normalize_blacklist_email()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;
revoke all on function private.normalize_blacklist_email() from public, anon, authenticated;
create trigger normalize_blacklist_email
before insert or update on public.email_blacklist
for each row execute function private.normalize_blacklist_email();

-- Intentionally available before authentication: exposes only an exact email match,
-- never the list. Definer privileges are needed to read the protected table.
create function private.is_email_blacklisted(candidate_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.email_blacklist
    where email = lower(trim(candidate_email))
  );
$$;
revoke all on function private.is_email_blacklisted(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_email_blacklisted(text) to anon, authenticated, service_role;

create function public.is_email_blacklisted(candidate_email text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.is_email_blacklisted(candidate_email);
$$;
revoke all on function public.is_email_blacklisted(text) from public;
grant execute on function public.is_email_blacklisted(text) to anon, authenticated, service_role;

-- Enforce independently of the website, including direct Auth API requests.
create function private.reject_blacklisted_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_email_blacklisted(new.email) then
    raise exception using errcode = 'check_violation',
      message = 'Sorry, you cannot create an account because your email has been blacklisted by the GDG team. Please contact the GDG team if you believe this is incorrect.';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_blacklisted_signup() from public, anon, authenticated;
create trigger reject_blacklisted_signup
before insert on auth.users
for each row execute function private.reject_blacklisted_signup();

insert into public.email_blacklist (email) values
  ('psj230000@utdallas.edu'),
  ('sxm230234@utdallas.edu'),
  ('txc230040@utdallas.edu'),
  ('vxm230056@utdallas.edu');
