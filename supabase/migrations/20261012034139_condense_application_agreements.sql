update public.application_openings
set
  form_schema = jsonb_set(
    form_schema,
    '{sections,2,fields}',
    case slug
      when 'tech-officer' then '[
        {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that I am committing to the Technical team for the full semester, including required meetings and events, and will dedicate at least three hours per week with additional time when projects or workshops require it.","required":true},
        {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, respond to officers and teammates in a timely manner, complete assigned tasks by their deadlines, and communicate conflicts or blockers early.","required":true},
        {"id":"agreement_responsibility","type":"checkbox","label":"Agreement: I will test and review my technical work, document shared work, collaborate respectfully, and help create experiences that are welcoming to members at every skill level.","required":true}
      ]'::jsonb
      when 'marketing-officer' then '[
        {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that I am committing to the Marketing team for the full semester, including required meetings and events, and will dedicate at least three hours per week with additional time around campaigns and major events.","required":true},
        {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, coordinate with officers and event leads, complete content by its deadlines, and communicate conflicts, blockers, or revision needs early.","required":true},
        {"id":"agreement_responsibility","type":"checkbox","label":"Agreement: I will follow GDG UTDallas brand and content guidelines, use approved assets, and handle photos, member information, and unpublished content responsibly.","required":true}
      ]'::jsonb
      when 'finance-officer' then '[
        {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that I am committing to the Finance team for the full semester, including required meetings and events, and will dedicate at least three hours per week with additional time around purchases, reimbursements, and major events.","required":true},
        {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, coordinate with officers requesting financial support, complete assigned records and requests accurately by their deadlines, and communicate missing information or delays early.","required":true},
        {"id":"agreement_responsibility","type":"checkbox","label":"Agreement: I will follow chapter and university approval processes, keep receipts and records organized, protect sensitive financial information, and never authorize unapproved spending.","required":true}
      ]'::jsonb
      when 'industry-officer' then '[
        {"id":"agreement_semester","type":"checkbox","label":"Agreement: I understand that I am committing to the Industry team for the full semester, including required meetings and events, and will dedicate at least three hours per week with additional time around outreach and partner events.","required":true},
        {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, coordinate with officers and event leads, complete research, outreach, follow-ups, and shared records by their deadlines, and communicate blockers promptly.","required":true},
        {"id":"agreement_responsibility","type":"checkbox","label":"Agreement: I will communicate professionally, represent GDG UTDallas responsibly, protect private contact information, and obtain approval before making commitments to an external partner.","required":true}
      ]'::jsonb
      when 'sprint-officer' then '[
        {"id":"commitment","type":"checkbox","label":"Agreement: I understand that I am committing to SPRINT from planning through the final showcase, including required meetings and events, and will dedicate at least three hours per week with additional time around program milestones.","required":true},
        {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, remain responsive to SPRINT directors, mentors, and teammates, complete assigned tasks by their deadlines, and communicate conflicts or blockers early.","required":true},
        {"id":"agreement_responsibility","type":"checkbox","label":"Agreement: I will support mentors and project teams respectfully, handle participant information responsibly, and help maintain a welcoming and productive program environment.","required":true}
      ]'::jsonb
      when 'sprint-mentee' then '[
        {"id":"commitment","type":"checkbox","label":"Agreement: I understand that I am committing to the full SPRINT program, including required meetings and the final showcase, and will dedicate at least three hours per week with additional time when my project needs it.","required":true},
        {"id":"agreement_communication","type":"checkbox","label":"Agreement: I will stay active on Discord, remain responsive to my mentor and teammates, complete assigned project tasks by their deadlines, and communicate conflicts or blockers early.","required":true},
        {"id":"agreement_responsibility","type":"checkbox","label":"Agreement: I will contribute consistently, collaborate respectfully with my team, ask for help when needed, and take shared responsibility for completing and presenting our project.","required":true}
      ]'::jsonb
    end,
    false
  ),
  form_version = form_version + 1,
  updated_at = now()
where slug in (
  'tech-officer',
  'marketing-officer',
  'finance-officer',
  'industry-officer',
  'sprint-officer',
  'sprint-mentee'
);
