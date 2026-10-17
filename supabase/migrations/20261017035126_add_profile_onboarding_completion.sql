alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = coalesce(updated_at, created_at, now())
where onboarding_completed_at is null;

comment on column public.profiles.onboarding_completed_at is
  'When the member completed the first-login profile onboarding flow.';
