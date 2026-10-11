update public.application_openings
set email_templates = jsonb_set(
  jsonb_set(
    email_templates,
    '{acceptance,brevo_template_id}',
    '10'::jsonb,
    true
  ),
  '{acceptance,next_steps}',
  case slug
    when 'sprint-officer' then jsonb_build_array(
      'Watch for onboarding details from the GDG UTDallas team.',
      'Join the GDG UTDallas Discord for updates, announcements, and important program information.'
    )
    when 'sprint-mentee' then jsonb_build_array(
      'Watch for cohort and kickoff details from the GDG UTDallas team.',
      'Join the GDG UTDallas Discord for updates, announcements, and important program information.'
    )
  end,
  true
),
updated_at = now()
where slug in ('sprint-officer', 'sprint-mentee');
