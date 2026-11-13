insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-resumes', 'member-resumes', false, 4194304, array['application/pdf']);

alter table public.profiles add column resume_path text;
alter table public.applications
  add column resume_path text,
  add column resume_selection_saved boolean not null default false;

grant insert (resume_path, resume_selection_saved), update (resume_path, resume_selection_saved)
  on public.applications to authenticated;

create index applications_submitted_resume_path_idx
  on public.applications (resume_path)
  where submission_state = 'submitted' and resume_path is not null;

-- Each upload gets a new path. Authenticated clients cannot overwrite or
-- delete versions, including those referenced by submitted applications.
create policy "Members can upload their own resume versions"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'member-resumes'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9_-]{1,240}\.pdf$'
);

create policy "Members and application staff can read allowed resumes"
on storage.objects for select to authenticated
using (
  bucket_id = 'member-resumes'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or (
      (select private.is_application_staff())
      and exists (
        select 1 from public.applications a
        where a.resume_path = storage.objects.name and a.submission_state = 'submitted'
      )
    )
  )
);

create function private.validate_resume_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if tg_table_name = 'applications' then
    owner_id := new.applicant_id;
    if tg_op = 'UPDATE' then
      if row(new.resume_path, new.resume_selection_saved)
          is not distinct from row(old.resume_path, old.resume_selection_saved) then
        return new;
      end if;
      if old.submission_state <> 'draft' or (select auth.uid()) is distinct from old.applicant_id then
        raise exception 'Only applicants can change a draft resume.' using errcode = '42501';
      end if;
    end if;
  else
    owner_id := new.id;
    if new.resume_path is not distinct from old.resume_path then
      return new;
    end if;
  end if;

  if new.resume_path is not null and (
    split_part(new.resume_path, '/', 1) <> owner_id::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'member-resumes' and name = new.resume_path
    )
  ) then
    raise exception 'Select a resume uploaded by your account.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_resume_selection() from public, anon, authenticated;

create trigger validate_profile_resume
before update of resume_path on public.profiles
for each row execute function private.validate_resume_selection();

create trigger validate_application_resume
before insert or update of resume_path, resume_selection_saved on public.applications
for each row execute function private.validate_resume_selection();
