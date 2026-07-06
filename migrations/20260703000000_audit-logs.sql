-- Enterprise Audit Logging

CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  action        text NOT NULL,
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   text,
  target_id     text,
  target_type   text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id     ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace    ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Members of a workspace can read its audit logs; users see their own logs
CREATE POLICY "Workspace members can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = audit_logs.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Any authenticated user can insert audit entries
CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
