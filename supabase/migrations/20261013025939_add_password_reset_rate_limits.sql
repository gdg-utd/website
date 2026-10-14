create table public.password_reset_rate_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null
);

comment on table public.password_reset_rate_limits is
  'Opaque, short-lived counters used to throttle password recovery email requests.';

alter table public.password_reset_rate_limits enable row level security;

revoke all on table public.password_reset_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.password_reset_rate_limits to service_role;

create index password_reset_rate_limits_expires_at_idx
  on public.password_reset_rate_limits (expires_at);

create or replace function public.consume_password_reset_rate_limit(
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_request_count integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$'
    or p_max_requests < 1
    or p_window_seconds < 1
  then
    raise exception 'Invalid password reset rate-limit arguments';
  end if;

  delete from public.password_reset_rate_limits
  where expires_at < v_now - interval '1 day';

  insert into public.password_reset_rate_limits (
    key_hash,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    p_key_hash,
    v_now,
    1,
    v_now + make_interval(secs => p_window_seconds)
  )
  on conflict (key_hash) do update
  set
    window_started_at = case
      when public.password_reset_rate_limits.expires_at <= v_now then v_now
      else public.password_reset_rate_limits.window_started_at
    end,
    request_count = case
      when public.password_reset_rate_limits.expires_at <= v_now then 1
      else public.password_reset_rate_limits.request_count + 1
    end,
    expires_at = case
      when public.password_reset_rate_limits.expires_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
      else public.password_reset_rate_limits.expires_at
    end
  returning request_count into v_request_count;

  return v_request_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_password_reset_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_password_reset_rate_limit(text, integer, integer)
  to service_role;

create table public.system_email_templates (
  template_key text primary key check (template_key ~ '^[a-z][a-z0-9_]{2,63}$'),
  brevo_template_id integer not null check (brevo_template_id > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.system_email_templates is
  'Server-only mapping from system email purposes to Brevo transactional templates.';

alter table public.system_email_templates enable row level security;

revoke all on table public.system_email_templates from anon, authenticated;
grant select on table public.system_email_templates to service_role;

insert into public.system_email_templates (template_key, brevo_template_id)
values
  ('password_reset', 12),
  ('password_changed', 11)
on conflict (template_key) do update
set
  brevo_template_id = excluded.brevo_template_id,
  active = true,
  updated_at = now();
