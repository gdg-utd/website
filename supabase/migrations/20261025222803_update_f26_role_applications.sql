-- Align Fall 2026 applications with the supplied officer and Sprints forms.
-- The opening URL selects the primary role; signed-in accounts supply UTD email.
-- Existing submitted responses and their schema snapshots are left intact.
with questionnaires(slug, fields) as (values
  ('sprint-officer', $json$[
  {
    "id": "technical_experience",
    "type": "long_text",
    "label": "Please list your relevant technical experiences and teaching experience, if any.",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "project_idea",
    "type": "long_text",
    "label": "Please describe your project idea.",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "track_interests",
    "type": "multiple_choice",
    "label": "Which track(s) are you interested in?",
    "required": false,
    "options": [
      {
        "value": "backend",
        "label": "Backend"
      },
      {
        "value": "frontend",
        "label": "Frontend"
      },
      {
        "value": "machine-learning",
        "label": "Machine Learning"
      },
      {
        "value": "no-preference",
        "label": "No Preference"
      }
    ]
  },
  {
    "id": "other_roles",
    "type": "multiple_choice",
    "label": "Any other roles you may be interested in?",
    "required": false,
    "options": [
      {
        "value": "tech-officer",
        "label": "Tech officer"
      },
      {
        "value": "marketing-officer",
        "label": "Marketing officer"
      },
      {
        "value": "finance-officer",
        "label": "Finance officer"
      },
      {
        "value": "industry-officer",
        "label": "Industry officer"
      },
      {
        "value": "sprint-officer",
        "label": "SPRINT officer"
      }
    ]
  },
  {
    "id": "program_fit",
    "type": "long_text",
    "label": "Why do you think you'll be a good fit for this program?",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "meeting_availability",
    "type": "multiple_choice",
    "label": "Please select which time(s) you're available.",
    "required": true,
    "options": [
      {
        "value": "tuesday-7-8",
        "label": "Tuesday, 7:00–8:00 PM"
      },
      {
        "value": "thursday-7-8",
        "label": "Thursday, 7:00–8:00 PM"
      }
    ],
    "help": "Select all that apply. Times are in Central Time."
  },
  {
    "id": "portfolio_url",
    "type": "url",
    "label": "Link to Portfolio/GitHub",
    "required": true,
    "placeholder": "https://"
  },
  {
    "id": "time_restrictions",
    "type": "long_text",
    "label": "Do you have any time restrictions we should be aware of?",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "additional_information",
    "type": "long_text",
    "label": "Is there anything else you would like us to know?",
    "required": false,
    "max_length": 2000
  }
]$json$::jsonb),
  ('tech-officer', $json$[
  {
    "id": "technical_experience",
    "type": "long_text",
    "label": "Please list your relevant technical experiences and teaching experience, if any.",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "other_roles",
    "type": "multiple_choice",
    "label": "Any other roles you may be interested in?",
    "required": false,
    "options": [
      {
        "value": "tech-officer",
        "label": "Tech officer"
      },
      {
        "value": "marketing-officer",
        "label": "Marketing officer"
      },
      {
        "value": "finance-officer",
        "label": "Finance officer"
      },
      {
        "value": "industry-officer",
        "label": "Industry officer"
      },
      {
        "value": "sprint-officer",
        "label": "SPRINT officer"
      }
    ]
  },
  {
    "id": "program_fit",
    "type": "long_text",
    "label": "Why do you think you'll be a good fit for this program?",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "portfolio_url",
    "type": "url",
    "label": "Link to Portfolio/GitHub",
    "required": true,
    "placeholder": "https://"
  },
  {
    "id": "time_restrictions",
    "type": "long_text",
    "label": "Do you have any time restrictions we should be aware of?",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "additional_information",
    "type": "long_text",
    "label": "Is there anything else you would like us to know?",
    "required": false,
    "max_length": 2000
  }
]$json$::jsonb),
  ('sprint-mentee', $json$[
  {
    "id": "track",
    "type": "single_choice",
    "label": "What track are you applying for?",
    "required": true,
    "options": [
      {
        "value": "backend",
        "label": "Backend"
      },
      {
        "value": "frontend",
        "label": "Frontend"
      },
      {
        "value": "ai-machine-learning",
        "label": "AI/Machine Learning"
      }
    ]
  },
  {
    "id": "goals",
    "type": "long_text",
    "label": "What do you hope to learn or accomplish through the program?",
    "required": true,
    "max_length": 2000
  },
  {
    "id": "technical_skills",
    "type": "long_text",
    "label": "Please list any technical skills or experience you have.",
    "required": false,
    "max_length": 2000,
    "help": "Examples: Figma, HTML, CSS, JavaScript, React, Python, Java, Git, etc."
  },
  {
    "id": "meeting_preference",
    "type": "single_choice",
    "label": "What time would you prefer to meet?",
    "required": true,
    "options": [
      {
        "value": "tuesday-7-8",
        "label": "Tuesday, 7:00–8:00 PM"
      },
      {
        "value": "thursday-7-8",
        "label": "Thursday, 7:00–8:00 PM"
      },
      {
        "value": "either",
        "label": "Either works for me"
      }
    ],
    "help": "Times are in Central Time."
  },
  {
    "id": "time_restrictions",
    "type": "long_text",
    "label": "Do you have any other time restrictions?",
    "required": true,
    "max_length": 2000,
    "help": "If none, write “None”."
  }
]$json$::jsonb),
  ('finance-officer', $json$[
  {
    "id": "other_roles",
    "type": "multiple_choice",
    "label": "Any other roles you may be interested in?",
    "required": false,
    "options": [
      {
        "value": "tech-officer",
        "label": "Tech officer"
      },
      {
        "value": "marketing-officer",
        "label": "Marketing officer"
      },
      {
        "value": "finance-officer",
        "label": "Finance officer"
      },
      {
        "value": "industry-officer",
        "label": "Industry officer"
      },
      {
        "value": "sprint-officer",
        "label": "SPRINT officer"
      }
    ]
  },
  {
    "id": "program_fit",
    "type": "long_text",
    "label": "Why do you think you'll be a good fit for this program?",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "portfolio_url",
    "type": "url",
    "label": "Link to Portfolio/GitHub",
    "required": true,
    "placeholder": "https://"
  },
  {
    "id": "time_restrictions",
    "type": "long_text",
    "label": "Do you have any time restrictions we should be aware of?",
    "required": false,
    "max_length": 2000
  },
  {
    "id": "additional_information",
    "type": "long_text",
    "label": "Is there anything else you would like us to know?",
    "required": false,
    "max_length": 2000
  }
]$json$::jsonb)
)
update public.application_openings as opening
set form_schema = jsonb_set(opening.form_schema, '{sections}', (
  select jsonb_agg(
    case
      when section ->> 'id' = 'questionnaire' then
        jsonb_set(section, '{fields}', case
          when opening.slug = 'finance-officer' then (section -> 'fields') || questionnaires.fields
          else questionnaires.fields
        end)
      when section ->> 'id' = 'about-you' and opening.slug <> 'sprint-mentee' then
        jsonb_set(section, '{fields}', (section -> 'fields') ||
          '[{"id":"netid","type":"short_text","label":"NetID","required":true,"max_length":80}]'::jsonb)
      when section ->> 'id' = 'agreements' and opening.slug = 'sprint-mentee' then
        jsonb_set(section, '{fields}', $json$[
  {
    "id": "commitment",
    "type": "checkbox",
    "label": "Agreement: I understand that, if admitted, I am expected to remain actively committed to the Sprints program for the entire semester, attend required meetings, communicate consistently with my team, and contribute to the completion of my assigned project responsibilities.",
    "required": true
  },
  {
    "id": "agreement_time",
    "type": "checkbox",
    "label": "Agreement: I understand that I am expected to dedicate a minimum of three hours per week to my project, remain responsive to my mentor and teammates, and recognize that additional time may be necessary depending on my experience level and project needs.",
    "required": true
  }
]$json$::jsonb)
      else section
    end order by position
  )
  from jsonb_array_elements(opening.form_schema -> 'sections')
    with ordinality as sections(section, position)
)),
form_version = opening.form_version + 1,
updated_at = now()
from questionnaires
where opening.slug = questionnaires.slug;

-- Use the semester commitment described in the PDFs on the role detail pages.
update public.application_openings
set description = case slug
    when 'sprint-officer' then 'Organize coding sprints, coordinate teams, and support project completion throughout the semester.'
    else description end,
  details = case slug
    when 'sprint-officer' then '[{"label":"Commitment","value":"Full semester"},{"label":"Good fit for","value":"Organizers and team leads"}]'::jsonb
    when 'sprint-mentee' then '[{"label":"Commitment","value":"Full semester, at least three hours per week"},{"label":"Experience","value":"No prior experience required"}]'::jsonb
    else details end
where slug in ('sprint-officer', 'sprint-mentee');
