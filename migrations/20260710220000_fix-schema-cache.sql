-- Force PostgREST schema cache reload so new columns (phone, timezone, etc.) are immediately visible
-- DDL triggers an automatic schema cache refresh in PostgREST
COMMENT ON TABLE workspace_members IS 'Workspace members with preferences (phone, timezone, compact_mode, locale, display_name)';
-- Explicit notify as a secondary measure
SELECT pg_notify('pgrst', 'reload schema');
