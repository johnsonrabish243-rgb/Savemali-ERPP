-- Allow workspace members (non-owners) to read the workspace they belong to
-- This fixes: employee login shows no dashboard because workspaces RLS blocks non-owner SELECT

-- Workspaces: members can read workspaces they belong to
DROP POLICY IF EXISTS "member_select_workspace" ON workspaces;
CREATE POLICY "member_select_workspace" ON workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
