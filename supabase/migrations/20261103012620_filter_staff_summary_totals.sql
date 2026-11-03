-- Display totals follow all active filters across every matching page.
-- Bulk actions retain their explicit whole-opening scope.
create or replace function public.get_staff_application_page(p_q text default '',p_position text default '',p_decision text default '',p_page integer default 1,p_page_size integer default 25) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; page_size integer:=least(50,greatest(1,coalesce(p_page_size,25))); page_number integer:=least(100000,greatest(1,coalesce(p_page,1)));
begin
 if not (select private.is_application_staff()) then raise exception 'Application staff access required.' using errcode='42501'; end if;
 with base as materialized (
  select a.id,a.applicant_first_name,a.applicant_last_name,a.applicant_email,a.opening_id,a.submitted_at,a.published_decision,
   jsonb_build_object('slug',o.slug,'title',o.title,'accent',o.accent) as application_openings,
   case when r.application_id is null then null else jsonb_build_object('status',r.status,'deadline_at',r.deadline_at) end as application_rsvps,
   case when stage.details->>'decision' in ('accepted','rejected') then stage.details->>'decision' end as staged_decision,
   o.slug as opening_slug,r.status as rsvp_status,r.deadline_at
  from public.applications a join public.application_openings o on o.id=a.opening_id
  left join public.application_rsvps r on r.application_id=a.id
  left join lateral (select e.details from public.application_events e where e.application_id=a.id and e.event_type='decision_staged' and e.created_at>=a.submitted_at order by e.created_at desc,e.id desc limit 1) stage on true
  where a.submission_state='submitted'
 ), filtered as materialized (
  select * from base where (coalesce(p_position,'')='' or opening_slug=p_position)
   and (coalesce(p_decision,'')='' or published_decision=p_decision or (p_decision='staged' and published_decision='undecided' and staged_decision is not null))
   and (coalesce(btrim(p_q),'')='' or strpos(lower(concat_ws(' ',applicant_first_name,applicant_last_name,applicant_email)),lower(left(btrim(p_q),200)))>0)
 ), page_rows as (
  select * from filtered order by submitted_at desc,id desc limit page_size offset (page_number-1)*page_size
 ) select jsonb_build_object(
  'applications',coalesce((select jsonb_agg(to_jsonb(p) order by p.submitted_at desc,p.id desc) from page_rows p),'[]'::jsonb),
  'matched',(select count(*) from filtered),'page',page_number,'pageSize',page_size,
  'metrics',(select jsonb_build_object('total',count(*),'accepted',count(*) filter(where published_decision='accepted'),'notSelected',count(*) filter(where published_decision='rejected'),'awaiting',count(*) filter(where published_decision='undecided')) from filtered),
  'stagedCount',(select count(*) from base where opening_slug=p_position and published_decision='undecided' and staged_decision is not null),
  'rsvpSummary',(select jsonb_build_object('confirmed',count(*) filter(where rsvp_status='confirmed'),'released',count(*) filter(where rsvp_status='released'),'expired',count(*) filter(where rsvp_status='expired'),'awaiting',count(*) filter(where rsvp_status='awaiting_response' and deadline_at>now()),'readyToRelease',count(*) filter(where rsvp_status='awaiting_response' and deadline_at<=now())) from filtered),
  'openingExpiredCount',(select count(*) from base where opening_slug=p_position and rsvp_status='awaiting_response' and deadline_at<=now())
 ) into result;
 return result;
end;
$$;
revoke all on function public.get_staff_application_page(text,text,text,integer,integer) from public,anon;
grant execute on function public.get_staff_application_page(text,text,text,integer,integer) to authenticated;

