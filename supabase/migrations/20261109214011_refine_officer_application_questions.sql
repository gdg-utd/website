-- Update live officer forms only. Existing applications and schema snapshots
-- remain intact; drafts adopt the current schema through the normal save flow.
with revised as (
  select o.id, jsonb_set(o.form_schema, '{sections}', (
    select jsonb_agg(jsonb_set(section, '{fields}',
      coalesce((
        select jsonb_agg(case
          when o.slug = 'sprint-officer' and field->>'id' = 'track_interests'
            then field || '{"label":"Which track(s) are you interested in mentoring?"}'::jsonb
          when o.slug = 'sprint-officer' and field->>'id' = 'meeting_availability'
            then field || '{"help":"Select all times when you can meet in person with your mentees to collaborate on your project. Times are in Central Time."}'::jsonb
          when o.slug = 'marketing-officer' and field->>'id' = 'portfolio_url'
            then field || '{"required":false}'::jsonb
          else field end order by field_position)
        from jsonb_array_elements(section->'fields') with ordinality as fields(field, field_position)
        where field->>'id' not in ('other_roles', 'additional_information')
          and not (o.slug = 'sprint-officer' and field->>'id' = 'project_idea')
      ), '[]'::jsonb)
      || case when section->>'id' = 'questionnaire' then
        '[{"id":"additional_information","type":"long_text","label":"Is there anything else you would like us to know?","required":false,"max_length":2000}]'::jsonb
        else '[]'::jsonb end
    ) order by section_position)
    from jsonb_array_elements(o.form_schema->'sections') with ordinality as sections(section, section_position)
  )) as form_schema
  from public.application_openings o
  where o.slug in ('sprint-officer', 'tech-officer', 'finance-officer',
    'industry-officer', 'marketing-officer', 'events-officer')
)
update public.application_openings o
set form_schema = revised.form_schema,
    form_version = o.form_version + 1,
    updated_at = now()
from revised
where o.id = revised.id and o.form_schema is distinct from revised.form_schema;
