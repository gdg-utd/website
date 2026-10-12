-- Add a degree response immediately before each existing major response.
-- The application UI renders this pair with the shared UT Dallas program selector.

with rewritten_openings as (
  select
    opening.id,
    jsonb_set(
      opening.form_schema,
      '{sections}',
      (
        select jsonb_agg(
          case
            when exists (
              select 1
              from jsonb_array_elements(section.value->'fields') as field(value)
              where field.value->>'id' = 'major'
            )
            and not exists (
              select 1
              from jsonb_array_elements(section.value->'fields') as field(value)
              where field.value->>'id' = 'degree'
            )
            then jsonb_set(
              section.value,
              '{fields}',
              (
                select jsonb_agg(positioned_field.value order by positioned_field.position)
                from (
                  select
                    field.value,
                    field.ordinality * 2 as position
                  from jsonb_array_elements(section.value->'fields')
                    with ordinality as field(value, ordinality)

                  union all

                  select
                    '{"id":"degree","type":"short_text","label":"Degree","required":true,"max_length":120}'::jsonb,
                    field.ordinality * 2 - 1 as position
                  from jsonb_array_elements(section.value->'fields')
                    with ordinality as field(value, ordinality)
                  where field.value->>'id' = 'major'
                ) as positioned_field
              )
            )
            else section.value
          end
          order by section.ordinality
        )
        from jsonb_array_elements(opening.form_schema->'sections')
          with ordinality as section(value, ordinality)
      )
    ) as form_schema
  from public.application_openings as opening
  where exists (
    select 1
    from jsonb_array_elements(opening.form_schema->'sections') as section(value)
    cross join lateral jsonb_array_elements(section.value->'fields') as field(value)
    where field.value->>'id' = 'major'
  )
  and not exists (
    select 1
    from jsonb_array_elements(opening.form_schema->'sections') as section(value)
    cross join lateral jsonb_array_elements(section.value->'fields') as field(value)
    where field.value->>'id' = 'degree'
  )
)
update public.application_openings as opening
set
  form_schema = rewritten.form_schema,
  form_version = opening.form_version + 1,
  updated_at = now()
from rewritten_openings as rewritten
where opening.id = rewritten.id;
