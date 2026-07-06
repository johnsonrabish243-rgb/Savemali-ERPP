-- Fix audit_logs RLS: the table was created via CLI but has no policies
-- Every INSERT/SELECT fails with "new row violates row-level security policy"

-- Ensure RLS is enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (safe re-run)
DROP POLICY IF EXISTS "audit_owner_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_member_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;

-- Owner can read all audit logs for their workspace
CREATE POLICY "audit_owner_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE workspaces.id = audit_logs.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

-- Members can read audit logs for workspaces they belong to
CREATE POLICY "audit_member_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = audit_logs.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
    )
  );

-- Authenticated users can insert audit logs for their workspace
CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM workspaces
        WHERE workspaces.id = audit_logs.workspace_id
        AND workspaces.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = audit_logs.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
      )
    )
  );
