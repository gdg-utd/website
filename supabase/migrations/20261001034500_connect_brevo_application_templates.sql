update public.application_openings
set email_templates = jsonb_set(
  jsonb_set(
    jsonb_set(
      email_templates,
      '{confirmation,brevo_template_id}',
      '1'::jsonb,
      true
    ),
    '{acceptance,brevo_template_id}',
    '2'::jsonb,
    true
  ),
  '{rejection,brevo_template_id}',
  '3'::jsonb,
  true
),
updated_at = now()
where slug in ('sprint-officer', 'sprint-mentee');

