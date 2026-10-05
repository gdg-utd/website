drop policy "Applicants can view their applications" on public.applications;
drop policy "Admins can view submitted applications" on public.applications;

create policy "Applicants and admins can view allowed applications"
on public.applications
for select
to authenticated
using (
  (select auth.uid()) = applicant_id
  or ((select private.is_application_admin()) and submission_state = 'submitted')
);

drop policy "Applicants can update drafts" on public.applications;
drop policy "Admins can manage submitted applications" on public.applications;

create policy "Applicants and admins can update allowed applications"
on public.applications
for update
to authenticated
using (
  ((select auth.uid()) = applicant_id and submission_state = 'draft')
  or ((select private.is_application_admin()) and submission_state = 'submitted')
)
with check (
  (select auth.uid()) = applicant_id
  or (select private.is_application_admin())
);

create policy "No direct email queue access"
on public.application_email_queue
for all
to anon, authenticated
using (false)
with check (false);
