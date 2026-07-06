-- Allow workspace members (non-owners) to read data from their workspace
-- 1. Create helper function
-- 2. Add member SELECT policies to all 27 data tables

-- Helper: check if current user is an active member of the workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- For every table that has an owner-only SELECT policy, add a member policy
DO $$
DECLARE
  t text;
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND (qual LIKE '%owner_id = auth.uid()%' OR qual LIKE '%is_workspace_owner%')
      AND tablename != 'workspace_members'
      AND tablename != 'workspaces'
  LOOP
    -- Drop existing member policy if it exists (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS mem_sel_%s ON %I', pol.tablename, pol.tablename);
    -- Add member SELECT policy
    EXECUTE format(
      'CREATE POLICY mem_sel_%s ON %I FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id) OR is_workspace_member(workspace_id))',
      pol.tablename, pol.tablename
    );
  END LOOP;
END $$;
