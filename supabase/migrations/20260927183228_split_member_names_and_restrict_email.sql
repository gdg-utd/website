create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, update on table public.profiles to authenticated;

drop policy if exists "Members can read their own profile" on public.profiles;
create policy "Members can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80)
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles
  add column first_name text,
  add column last_name text;

update public.profiles
set
  first_name = left(split_part(trim(display_name), ' ', 1), 50),
  last_name = left(
    coalesce(
      nullif(trim(substr(trim(display_name), strpos(trim(display_name), ' ') + 1)), ''),
      'Member'
    ),
    50
  );

alter table public.profiles
  alter column first_name set not null,
  alter column last_name set not null,
  add constraint profiles_first_name_length
    check (char_length(first_name) between 1 and 50),
  add constraint profiles_last_name_length
    check (char_length(last_name) between 1 and 50),
  drop column display_name;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_first_name text := coalesce(trim(new.raw_user_meta_data ->> 'first_name'), '');
  supplied_last_name text := coalesce(trim(new.raw_user_meta_data ->> 'last_name'), '');
begin
  if lower(split_part(coalesce(new.email, ''), '@', 2)) <> 'utdallas.edu' then
    raise exception using
      errcode = 'check_violation',
      message = 'Only @utdallas.edu email addresses can create an account.';
  end if;

  if char_length(supplied_first_name) not between 1 and 50
    or char_length(supplied_last_name) not between 1 and 50 then
    raise exception using
      errcode = 'check_violation',
      message = 'A valid first and last name are required.';
  end if;

  insert into public.profiles (id, first_name, last_name)
  values (new.id, supplied_first_name, supplied_last_name);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
