alter table public.profiles
  add column personal_email text,
  add column linkedin_url text,
  add column github_url text,
  add column portfolio_url text,
  add constraint profiles_personal_email_format
    check (
      personal_email is null
      or (
        char_length(personal_email) between 3 and 320
        and personal_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  add constraint profiles_linkedin_url_format
    check (
      linkedin_url is null
      or (
        char_length(linkedin_url) between 8 and 2048
        and linkedin_url ~* '^https?://[^[:space:]]+$'
      )
    ),
  add constraint profiles_github_url_format
    check (
      github_url is null
      or (
        char_length(github_url) between 8 and 2048
        and github_url ~* '^https?://[^[:space:]]+$'
      )
    ),
  add constraint profiles_portfolio_url_format
    check (
      portfolio_url is null
      or (
        char_length(portfolio_url) between 8 and 2048
        and portfolio_url ~* '^https?://[^[:space:]]+$'
      )
    );
