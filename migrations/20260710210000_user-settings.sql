-- User-level preferences (global, not workspace-scoped)
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text DEFAULT 'Africa/Lubumbashi',
  locale text DEFAULT 'fr',
  compact_mode boolean DEFAULT false,
  reduced_motion boolean DEFAULT false,
  sidebar_collapsed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own" ON user_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert_own" ON user_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own" ON user_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- API Keys for workspace integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_value text NOT NULL UNIQUE,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys (workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON api_keys (key_value);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_workspace" ON api_keys
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "api_keys_insert_workspace" ON api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "api_keys_update_workspace" ON api_keys
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "api_keys_delete_workspace" ON api_keys
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enhanced workspace_member preferences
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Africa/Lubumbashi';
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS compact_mode boolean DEFAULT false;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS locale text DEFAULT 'fr';
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS phone text;

GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO authenticated;
