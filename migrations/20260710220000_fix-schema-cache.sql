-- Force schema cache refresh for PostgREST
-- This ensures columns added in previous migrations (e.g. phone on workspace_members) are available immediately
NOTIFY pgrst, 'reload schema';
