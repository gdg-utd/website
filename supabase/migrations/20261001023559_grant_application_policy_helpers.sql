-- These helpers are referenced by RLS policies. Authenticated users may execute
-- them only through already-resolved policy expressions because the private
-- schema itself is not exposed through the Data API.
grant execute on function private.is_application_admin() to authenticated;
grant execute on function private.opening_accepts_applications(public.application_openings) to authenticated;
