-- Allow workspace members to update their own row (avatar_url, display_name)
-- Currently only owner_update_members exists, which blocks member self-service

DROP POLICY IF EXISTS "member_update_own_profile" ON workspace_members;
CREATE POLICY "member_update_own_profile" ON workspace_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
