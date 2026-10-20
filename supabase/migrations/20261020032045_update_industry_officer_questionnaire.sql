-- Replace only the Industry role questionnaire; keep basic details and agreements.
update public.application_openings
set form_schema = jsonb_set(
  form_schema,
  '{sections}',
  (
    select jsonb_agg(
      case when section ->> 'id' = 'questionnaire' then
        jsonb_set(section, '{fields}', $json$
        [
          {
            "id": "role_interest",
            "type": "long_text",
            "label": "Why are you interested in joining the Industry team?",
            "required": true,
            "max_length": 2000,
            "help": "Share what interests you about the team and how you hope to contribute. 2–4 sentences."
          },
          {
            "id": "industry_interests",
            "type": "multiple_choice",
            "label": "Which areas interest you most?",
            "required": true,
            "help": "Select all that apply.",
            "options": [
              {"value": "sponsorships", "label": "Sponsor outreach"},
              {"value": "speaker-relations", "label": "Workshop speaker outreach"},
              {"value": "company-outreach", "label": "Company partnerships"},
              {"value": "hackathon-sponsorship", "label": "Hackathon sponsorship (HACKDSC)"},
              {"value": "linkedin-email-campaigns", "label": "LinkedIn and email campaigns"},
              {"value": "professional-events", "label": "Company event logistics"}
            ]
          },
          {
            "id": "company_interest",
            "type": "long_text",
            "label": "Which company would you like to connect with GDG UTDallas, and why?",
            "required": false,
            "max_length": 2000,
            "help": "Mention any connections you have, such as a recruiter, alum, or past internship. 1–3 sentences."
          },
          {
            "id": "relevant_experience",
            "type": "long_text",
            "label": "What experience do you have with sponsorships, fundraising, sales, or networking?",
            "required": true,
            "max_length": 2000,
            "help": "No prior experience is required. Share related experience from classes, clubs, jobs, or volunteering."
          },
          {
            "id": "communication_comfort",
            "type": "single_choice",
            "label": "How comfortable are you reaching out to and speaking with company representatives?",
            "required": true,
            "help": "Consider cold emails, messages, events, and calls. 1 = Not comfortable · 5 = Very comfortable.",
            "options": [
              {"value": "1", "label": "1 — Not comfortable"},
              {"value": "2", "label": "2"},
              {"value": "3", "label": "3"},
              {"value": "4", "label": "4"},
              {"value": "5", "label": "5 — Very comfortable"}
            ]
          },
          {
            "id": "linkedin_url",
            "type": "url",
            "label": "LinkedIn profile URL",
            "required": true,
            "placeholder": "https://www.linkedin.com/in/"
          }
        ]
        $json$::jsonb)
      else section end
      order by position
    )
    from jsonb_array_elements(form_schema -> 'sections') with ordinality as sections(section, position)
  )
),
form_version = form_version + 1,
updated_at = now()
where slug = 'industry-officer';
