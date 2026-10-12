update public.application_openings
set
  form_schema = jsonb_set(
    form_schema,
    '{sections,1,fields}',
    $json$
    [
      {
        "id": "canva_comfort",
        "type": "single_choice",
        "label": "How comfortable are you using Canva?",
        "required": true,
        "options": [
          {"value":"beginner","label":"Beginner"},
          {"value":"intermediate","label":"Intermediate"},
          {"value":"advanced","label":"Advanced"}
        ]
      },
      {
        "id": "portfolio_url",
        "type": "url",
        "label": "Share a link to a portfolio, Google Drive folder, or two to three design samples.",
        "required": true,
        "help": "Flyers, posters, social graphics, and reels are all welcome. Make sure anyone with the link can view it.",
        "placeholder": "https://"
      },
      {
        "id": "guest_speaker_flyer",
        "type": "long_text",
        "label": "Imagine we are promoting a guest speaker event to students. How would you approach the flyer, and what would make it stand out?",
        "required": true,
        "max_length": 2000,
        "placeholder": "Describe your visual direction, the information you would prioritize, and how you would capture students' attention."
      },
      {
        "id": "events_and_initiative",
        "type": "long_text",
        "label": "Are you available to attend our regular events, and how would you take initiative to help grow our community beyond your design work?",
        "required": true,
        "help": "Regular events include workshops, speaker events, and tabling.",
        "max_length": 2000,
        "placeholder": "Share your general availability and how you would contribute at events or through other outreach."
      }
    ]
    $json$::jsonb,
    false
  ),
  form_version = form_version + 1,
  updated_at = now()
where slug = 'marketing-officer';
