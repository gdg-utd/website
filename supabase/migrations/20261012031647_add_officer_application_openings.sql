insert into public.application_openings (
  slug,
  eyebrow,
  title,
  description,
  accent,
  details,
  responsibilities,
  form_version,
  form_schema,
  email_templates,
  status,
  opens_at,
  closes_at
) values
(
  'tech-officer',
  'Officer application',
  'Tech officer',
  'Help create technical workshops, support chapter projects, and make hands-on learning approachable for the UTD community.',
  'green',
  '[{"label":"Team","value":"Technical"},{"label":"Commitment","value":"Full semester"}]'::jsonb,
  '["Help plan and deliver technical workshops","Contribute to chapter projects and technical resources","Support members during hands-on events"]'::jsonb,
  1,
  $json$
  {
    "sections": [
      {
        "id": "about-you",
        "title": "About you",
        "description": "Share a few basics about yourself.",
        "fields": [
          {"id":"first_name","type":"short_text","label":"First name","required":true,"max_length":80,"placeholder":"First name"},
          {"id":"last_name","type":"short_text","label":"Last name","required":true,"max_length":80,"placeholder":"Last name"},
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Ex: Computer Science"}
        ]
      },
      {
        "id": "questionnaire",
        "title": "Role questionnaire",
        "description": "Tell us about your interests and what you would bring to the technical team.",
        "fields": [
          {"id":"technical_interests","type":"multiple_choice","label":"Which technical areas interest you?","required":true,"help":"Choose every area you would be interested in supporting.","options":[{"value":"web","label":"Web development"},{"value":"mobile","label":"Mobile development"},{"value":"ai-data","label":"AI or data"},{"value":"cloud-backend","label":"Cloud or backend"},{"value":"workshops","label":"Technical workshops"},{"value":"open","label":"Open to any area"}]},
          {"id":"role_interest","type":"long_text","label":"Why are you interested in becoming a Tech officer?","required":true,"max_length":2000,"placeholder":"Tell us what interests you about the role and how you hope to contribute."},
          {"id":"relevant_experience","type":"long_text","label":"Describe a technical project, learning experience, or team contribution you are proud of.","required":true,"max_length":2000,"placeholder":"This can come from a class, club, job, hackathon, or personal project."},
          {"id":"portfolio_url","type":"url","label":"GitHub, portfolio, or project link","required":false,"help":"Optional — include one link you would like us to review.","placeholder":"https://"}
        ]
      },
      {
        "id": "agreements",
        "title": "Role agreements",
        "description": "Read each statement carefully. You must agree to every item before submitting.",
        "fields": [
          {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that, if selected, I am expected to remain actively committed to the Technical team for the full semester and attend required team meetings and chapter events.","required":true},
          {"id":"agreement_time","type":"checkbox","label":"Agreement: I understand that I am expected to dedicate at least three hours per week to this role, and that additional time may be needed around workshops, projects, and major events.","required":true},
          {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on the team Discord, respond to officers and teammates in a timely manner, and communicate schedule conflicts or blockers as early as possible.","required":true},
          {"id":"agreement_deadlines","type":"checkbox","label":"Agreement: I will complete assigned tasks by their deadlines, test and review my technical work before it is used, and ask for help early when I need it.","required":true},
          {"id":"agreement_collaboration","type":"checkbox","label":"Agreement: I will collaborate respectfully, document shared work, and help create technical experiences that are welcoming to members with different skill levels.","required":true}
        ]
      }
    ]
  }
  $json$::jsonb,
  '{
    "confirmation":{"brevo_template_id":7,"subject":"We received your Tech officer application","intro":"Thanks for applying to join the Technical team.","next_steps":["The GDG UTDallas team will review your application.","We will contact you when decisions are ready."]},
    "acceptance":{"brevo_template_id":10,"subject":"Your Tech officer application","intro":"You have been selected to join the Technical team.","next_steps":["Watch for onboarding details from the GDG UTDallas team.","Join the GDG UTDallas Discord for team updates and announcements."]},
    "rejection":{"brevo_template_id":8,"subject":"Your Tech officer application","intro":"Thank you for the time you put into your application.","next_steps":["We hope you will stay involved with future GDG UTDallas programs and events."]}
  }'::jsonb,
  'open',
  now(),
  null
),
(
  'marketing-officer',
  'Officer application',
  'Marketing officer',
  'Shape how GDG UTDallas tells its story through social media, visual content, event promotion, and community outreach.',
  'red',
  '[{"label":"Team","value":"Marketing"},{"label":"Commitment","value":"Full semester"}]'::jsonb,
  '["Create and schedule chapter content","Promote events across campus and online","Capture and share the GDG UTDallas community"]'::jsonb,
  1,
  $json$
  {
    "sections": [
      {
        "id": "about-you",
        "title": "About you",
        "description": "Share a few basics about yourself.",
        "fields": [
          {"id":"first_name","type":"short_text","label":"First name","required":true,"max_length":80,"placeholder":"First name"},
          {"id":"last_name","type":"short_text","label":"Last name","required":true,"max_length":80,"placeholder":"Last name"},
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Ex: Marketing"}
        ]
      },
      {
        "id": "questionnaire",
        "title": "Role questionnaire",
        "description": "Tell us about your interests and what you would bring to the marketing team.",
        "fields": [
          {"id":"marketing_interests","type":"multiple_choice","label":"Which marketing areas interest you?","required":true,"help":"Choose every area you would be interested in supporting.","options":[{"value":"social-media","label":"Social media"},{"value":"graphic-design","label":"Graphic design"},{"value":"photo-video","label":"Photography or video"},{"value":"copywriting","label":"Copywriting"},{"value":"event-promotion","label":"Event promotion"},{"value":"open","label":"Open to any area"}]},
          {"id":"role_interest","type":"long_text","label":"Why are you interested in becoming a Marketing officer?","required":true,"max_length":2000,"placeholder":"Tell us what interests you about the role and how you hope to contribute."},
          {"id":"relevant_experience","type":"long_text","label":"Describe a campaign, design, event, or community project you are proud of.","required":true,"max_length":2000,"placeholder":"This can come from a class, club, job, or personal project."},
          {"id":"portfolio_url","type":"url","label":"Portfolio or work sample","required":false,"help":"Optional — include one link you would like us to review.","placeholder":"https://"}
        ]
      },
      {
        "id": "agreements",
        "title": "Role agreements",
        "description": "Read each statement carefully. You must agree to every item before submitting.",
        "fields": [
          {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that, if selected, I am expected to remain actively committed to the Marketing team for the full semester and attend required team meetings and chapter events.","required":true},
          {"id":"agreement_time","type":"checkbox","label":"Agreement: I understand that I am expected to dedicate at least three hours per week to this role, and that additional time may be needed before events or during major campaigns.","required":true},
          {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on the team Discord, coordinate with officers and event leads, and communicate schedule conflicts or blockers as early as possible.","required":true},
          {"id":"agreement_deadlines","type":"checkbox","label":"Agreement: I will complete assigned content and promotional tasks by their deadlines, follow the content calendar, and ask for feedback early enough to make revisions.","required":true},
          {"id":"agreement_brand","type":"checkbox","label":"Agreement: I will follow GDG UTDallas brand and content guidelines, use approved assets, and handle photos, member information, and unpublished content responsibly.","required":true}
        ]
      }
    ]
  }
  $json$::jsonb,
  '{
    "confirmation":{"brevo_template_id":7,"subject":"We received your Marketing officer application","intro":"Thanks for applying to join the Marketing team.","next_steps":["The GDG UTDallas team will review your application.","We will contact you when decisions are ready."]},
    "acceptance":{"brevo_template_id":10,"subject":"Your Marketing officer application","intro":"You have been selected to join the Marketing team.","next_steps":["Watch for onboarding details from the GDG UTDallas team.","Join the GDG UTDallas Discord for team updates and announcements."]},
    "rejection":{"brevo_template_id":8,"subject":"Your Marketing officer application","intro":"Thank you for the time you put into your application.","next_steps":["We hope you will stay involved with future GDG UTDallas programs and events."]}
  }'::jsonb,
  'open',
  now(),
  null
),
(
  'finance-officer',
  'Officer application',
  'Finance officer',
  'Support responsible budgeting, organized financial records, and the purchasing and reimbursement work behind chapter events.',
  'yellow',
  '[{"label":"Team","value":"Finance"},{"label":"Commitment","value":"Full semester"}]'::jsonb,
  '["Maintain clear and accurate financial records","Support budgets, purchases, and reimbursements","Help teams plan events within approved resources"]'::jsonb,
  1,
  $json$
  {
    "sections": [
      {
        "id": "about-you",
        "title": "About you",
        "description": "Share a few basics about yourself.",
        "fields": [
          {"id":"first_name","type":"short_text","label":"First name","required":true,"max_length":80,"placeholder":"First name"},
          {"id":"last_name","type":"short_text","label":"Last name","required":true,"max_length":80,"placeholder":"Last name"},
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Ex: Finance"}
        ]
      },
      {
        "id": "questionnaire",
        "title": "Role questionnaire",
        "description": "Tell us about your interests and what you would bring to the finance team.",
        "fields": [
          {"id":"finance_interests","type":"multiple_choice","label":"Which finance responsibilities interest you?","required":true,"help":"Choose every area you would be interested in supporting.","options":[{"value":"budgeting","label":"Budget planning"},{"value":"purchases","label":"Purchases and reimbursements"},{"value":"recordkeeping","label":"Recordkeeping"},{"value":"fundraising","label":"Fundraising support"},{"value":"event-planning","label":"Event cost planning"},{"value":"open","label":"Open to any area"}]},
          {"id":"role_interest","type":"long_text","label":"Why are you interested in becoming a Finance officer?","required":true,"max_length":2000,"placeholder":"Tell us what interests you about the role and how you hope to contribute."},
          {"id":"relevant_experience","type":"long_text","label":"Describe an experience that demonstrates organization, accuracy, or financial responsibility.","required":true,"max_length":2000,"placeholder":"This can come from a class, club, job, or personal responsibility."},
          {"id":"tools","type":"short_text","label":"Which spreadsheet, budgeting, or organization tools have you used?","required":false,"max_length":500,"help":"Optional — prior finance experience is not required.","placeholder":"Ex: Google Sheets, Excel, Notion"}
        ]
      },
      {
        "id": "agreements",
        "title": "Role agreements",
        "description": "Read each statement carefully. You must agree to every item before submitting.",
        "fields": [
          {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that, if selected, I am expected to remain actively committed to the Finance team for the full semester and attend required team meetings and chapter events.","required":true},
          {"id":"agreement_time","type":"checkbox","label":"Agreement: I understand that I am expected to dedicate at least three hours per week to this role, and that additional time may be needed around purchases, reimbursements, and major events.","required":true},
          {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on the team Discord, coordinate with officers requesting financial support, and communicate missing information or delays as early as possible.","required":true},
          {"id":"agreement_deadlines","type":"checkbox","label":"Agreement: I will complete assigned records, budget updates, purchase requests, and reimbursement tasks accurately and by their deadlines.","required":true},
          {"id":"agreement_stewardship","type":"checkbox","label":"Agreement: I will follow chapter and university approval processes, keep receipts and records organized, protect sensitive financial information, and never authorize unapproved spending.","required":true}
        ]
      }
    ]
  }
  $json$::jsonb,
  '{
    "confirmation":{"brevo_template_id":7,"subject":"We received your Finance officer application","intro":"Thanks for applying to join the Finance team.","next_steps":["The GDG UTDallas team will review your application.","We will contact you when decisions are ready."]},
    "acceptance":{"brevo_template_id":10,"subject":"Your Finance officer application","intro":"You have been selected to join the Finance team.","next_steps":["Watch for onboarding details from the GDG UTDallas team.","Join the GDG UTDallas Discord for team updates and announcements."]},
    "rejection":{"brevo_template_id":8,"subject":"Your Finance officer application","intro":"Thank you for the time you put into your application.","next_steps":["We hope you will stay involved with future GDG UTDallas programs and events."]}
  }'::jsonb,
  'open',
  now(),
  null
),
(
  'industry-officer',
  'Officer application',
  'Industry officer',
  'Build relationships with companies, speakers, sponsors, and alumni to connect members with the wider technology community.',
  'blue',
  '[{"label":"Team","value":"Industry"},{"label":"Commitment","value":"Full semester"}]'::jsonb,
  '["Support outreach to companies, speakers, and sponsors","Coordinate professional events and partner follow-ups","Represent GDG UTDallas in external communication"]'::jsonb,
  1,
  $json$
  {
    "sections": [
      {
        "id": "about-you",
        "title": "About you",
        "description": "Share a few basics about yourself.",
        "fields": [
          {"id":"first_name","type":"short_text","label":"First name","required":true,"max_length":80,"placeholder":"First name"},
          {"id":"last_name","type":"short_text","label":"Last name","required":true,"max_length":80,"placeholder":"Last name"},
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Ex: Information Technology and Systems"}
        ]
      },
      {
        "id": "questionnaire",
        "title": "Role questionnaire",
        "description": "Tell us about your interests and what you would bring to the industry team.",
        "fields": [
          {"id":"industry_interests","type":"multiple_choice","label":"Which industry responsibilities interest you?","required":true,"help":"Choose every area you would be interested in supporting.","options":[{"value":"company-outreach","label":"Company outreach"},{"value":"speaker-relations","label":"Speaker relations"},{"value":"sponsorships","label":"Sponsorships"},{"value":"alumni","label":"Alumni relationships"},{"value":"professional-events","label":"Professional events"},{"value":"open","label":"Open to any area"}]},
          {"id":"role_interest","type":"long_text","label":"Why are you interested in becoming an Industry officer?","required":true,"max_length":2000,"placeholder":"Tell us what interests you about the role and how you hope to contribute."},
          {"id":"relevant_experience","type":"long_text","label":"Describe an experience involving outreach, relationship-building, or professional communication.","required":true,"max_length":2000,"placeholder":"This can come from a class, club, job, volunteer role, or personal experience."},
          {"id":"linkedin_url","type":"url","label":"LinkedIn profile","required":false,"help":"Optional — include your profile if you would like us to review it.","placeholder":"https://www.linkedin.com/in/"}
        ]
      },
      {
        "id": "agreements",
        "title": "Role agreements",
        "description": "Read each statement carefully. You must agree to every item before submitting.",
        "fields": [
          {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that, if selected, I am expected to remain actively committed to the Industry team for the full semester and attend required team meetings and chapter events.","required":true},
          {"id":"agreement_time","type":"checkbox","label":"Agreement: I understand that I am expected to dedicate at least three hours per week to this role, and that additional time may be needed around outreach campaigns and partner events.","required":true},
          {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on the team Discord, coordinate with officers and event leads, and communicate outreach updates, schedule conflicts, or blockers promptly.","required":true},
          {"id":"agreement_deadlines","type":"checkbox","label":"Agreement: I will complete assigned research, outreach, follow-ups, and event coordination tasks by their deadlines and keep shared partner records current.","required":true},
          {"id":"agreement_professionalism","type":"checkbox","label":"Agreement: I will communicate professionally, represent GDG UTDallas responsibly, protect private contact information, and obtain approval before making commitments to an external partner.","required":true}
        ]
      }
    ]
  }
  $json$::jsonb,
  '{
    "confirmation":{"brevo_template_id":7,"subject":"We received your Industry officer application","intro":"Thanks for applying to join the Industry team.","next_steps":["The GDG UTDallas team will review your application.","We will contact you when decisions are ready."]},
    "acceptance":{"brevo_template_id":10,"subject":"Your Industry officer application","intro":"You have been selected to join the Industry team.","next_steps":["Watch for onboarding details from the GDG UTDallas team.","Join the GDG UTDallas Discord for team updates and announcements."]},
    "rejection":{"brevo_template_id":8,"subject":"Your Industry officer application","intro":"Thank you for the time you put into your application.","next_steps":["We hope you will stay involved with future GDG UTDallas programs and events."]}
  }'::jsonb,
  'open',
  now(),
  null
)
on conflict (slug) do update set
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  description = excluded.description,
  accent = excluded.accent,
  details = excluded.details,
  responsibilities = excluded.responsibilities,
  form_version = excluded.form_version,
  form_schema = excluded.form_schema,
  email_templates = excluded.email_templates,
  status = excluded.status,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  updated_at = now();

update public.application_openings
set
  form_version = 2,
  form_schema = $json$
  {
    "sections": [
      {
        "id": "about-you",
        "title": "About you",
        "description": "Share a few basics about yourself.",
        "fields": [
          {"id":"first_name","type":"short_text","label":"First name","required":true,"max_length":80,"placeholder":"First name"},
          {"id":"last_name","type":"short_text","label":"Last name","required":true,"max_length":80,"placeholder":"Last name"},
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Ex: Computer Science"}
        ]
      },
      {
        "id": "questionnaire",
        "title": "Role questionnaire",
        "description": "Tell us about your experience and why you want to help run SPRINT.",
        "fields": [
          {"id":"motivation","type":"long_text","label":"Why do you want to be a SPRINT officer?","required":true,"max_length":2000,"placeholder":"What interests you about helping run the program?"},
          {"id":"experience","type":"long_text","label":"Tell us about a time you organized, led, or supported a team.","required":true,"max_length":2000,"placeholder":"This can come from a class, club, job, or personal project."},
          {"id":"weekly_availability","type":"single_choice","label":"Can you attend weekly SPRINT meetings during the program?","required":true,"options":[{"value":"yes","label":"Yes"},{"value":"discuss","label":"I may need to discuss scheduling"}]},
          {"id":"portfolio_url","type":"url","label":"Portfolio, GitHub, or LinkedIn","required":false,"help":"Optional — include one link you would like us to review.","placeholder":"https://"}
        ]
      },
      {
        "id": "agreements",
        "title": "Role agreements",
        "description": "Read each statement carefully. You must agree to every item before submitting.",
        "fields": [
          {"id":"commitment","type":"checkbox","label":"Agreement: I understand that, if selected, I am expected to remain actively committed to the SPRINT program from planning through the final showcase and attend required meetings and events.","required":true},
          {"id":"agreement_time","type":"checkbox","label":"Agreement: I understand that I am expected to dedicate at least three hours per week to this role, and that additional time may be necessary during kickoff, project milestones, and showcase preparation.","required":true},
          {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, remain responsive to SPRINT directors, mentors, and teammates, and communicate schedule conflicts or blockers as early as possible.","required":true},
          {"id":"agreement_deadlines","type":"checkbox","label":"Agreement: I will complete assigned planning, coordination, and event tasks by their deadlines and ask for support early when I need it.","required":true},
          {"id":"agreement_support","type":"checkbox","label":"Agreement: I will support mentors and project teams respectfully, handle participant information responsibly, and help maintain a welcoming and productive program environment.","required":true}
        ]
      }
    ]
  }
  $json$::jsonb,
  updated_at = now()
where slug = 'sprint-officer';

update public.application_openings
set
  form_version = 2,
  form_schema = $json$
  {
    "sections": [
      {
        "id": "about-you",
        "title": "About you",
        "description": "Share a few basics about yourself.",
        "fields": [
          {"id":"first_name","type":"short_text","label":"First name","required":true,"max_length":80,"placeholder":"First name"},
          {"id":"last_name","type":"short_text","label":"Last name","required":true,"max_length":80,"placeholder":"Last name"},
          {"id":"classification","type":"single_choice","label":"Current classification","required":true,"options":[{"value":"freshman","label":"Freshman"},{"value":"sophomore","label":"Sophomore"},{"value":"junior","label":"Junior"},{"value":"senior","label":"Senior"},{"value":"graduate","label":"Graduate student"}]},
          {"id":"major","type":"short_text","label":"Major","required":true,"max_length":120,"placeholder":"Ex: Computer Science"}
        ]
      },
      {
        "id": "questionnaire",
        "title": "Role questionnaire",
        "description": "Tell us what you would like to learn and build during SPRINT.",
        "fields": [
          {"id":"experience_level","type":"single_choice","label":"Current technical experience","required":true,"options":[{"value":"none","label":"No experience yet"},{"value":"beginner","label":"Some classes or tutorials"},{"value":"projects","label":"I have built a few projects"},{"value":"experienced","label":"I have substantial project experience"}]},
          {"id":"goals","type":"long_text","label":"What do you hope to get out of SPRINT?","required":true,"max_length":2000,"placeholder":"Share what you would like to learn or accomplish."},
          {"id":"project_interests","type":"multiple_choice","label":"Which project tracks interest you?","required":true,"help":"Choose every track you would be interested in exploring.","options":[{"value":"web","label":"Web development"},{"value":"mobile","label":"Mobile development"},{"value":"ai-data","label":"AI or data"},{"value":"cloud","label":"Cloud or backend"},{"value":"design","label":"Product design"},{"value":"open","label":"Open to anything"}]},
          {"id":"portfolio_url","type":"url","label":"Portfolio, GitHub, or project link","required":false,"help":"Optional — it is completely fine to leave this blank.","placeholder":"https://"}
        ]
      },
      {
        "id": "agreements",
        "title": "Program agreements",
        "description": "Read each statement carefully. You must agree to every item before submitting.",
        "fields": [
          {"id":"commitment","type":"checkbox","label":"Agreement: I understand that, if admitted, I am expected to remain actively committed to SPRINT for the entire program, attend required meetings, and participate in the final showcase.","required":true},
          {"id":"agreement_time","type":"checkbox","label":"Agreement: I understand that I am expected to dedicate at least three hours per week to my project and that additional time may be necessary depending on my experience level and project needs.","required":true},
          {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, remain responsive to my mentor and teammates, and communicate schedule conflicts or blockers as early as possible.","required":true},
          {"id":"agreement_deadlines","type":"checkbox","label":"Agreement: I will complete assigned project tasks by their deadlines, attend agreed team sessions, and ask for help early when I am stuck.","required":true},
          {"id":"agreement_teamwork","type":"checkbox","label":"Agreement: I will contribute consistently, collaborate respectfully with my team, and take shared responsibility for completing and presenting our project.","required":true}
        ]
      }
    ]
  }
  $json$::jsonb,
  updated_at = now()
where slug = 'sprint-mentee';
