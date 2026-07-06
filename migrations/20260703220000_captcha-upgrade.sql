-- SaveMali CAPTCHA v2 upgrade — media library + captcha logs + config

-- Media library for image-based challenges
CREATE TABLE IF NOT EXISTS captcha_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  category      text NOT NULL,
  tags          text[] DEFAULT '{}',
  url           text NOT NULL,
  thumbnail_url text,
  difficulty    integer DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
  lang          text DEFAULT 'fr',
  ai_score      real DEFAULT 0,
  width         integer,
  height        integer,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_captcha_media_category ON captcha_media(category);
CREATE INDEX IF NOT EXISTS idx_captcha_media_workspace ON captcha_media(workspace_id);
CREATE INDEX IF NOT EXISTS idx_captcha_media_difficulty ON captcha_media(difficulty);

-- CAPTCHA verification logs for dashboard analytics
CREATE TABLE IF NOT EXISTS captcha_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  challenge_type  text NOT NULL,
  success         boolean NOT NULL DEFAULT false,
  score           integer DEFAULT 0,
  ip_address      text,
  user_agent      text,
  device          text,
  country         text,
  browser         text,
  os              text,
  time_ms         integer DEFAULT 0,
  risk_signals    jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_captcha_logs_workspace ON captcha_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_captcha_logs_created ON captcha_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_captcha_logs_type ON captcha_logs(challenge_type);
CREATE INDEX IF NOT EXISTS idx_captcha_logs_success ON captcha_logs(success);

-- CAPTCHA workspace configuration
CREATE TABLE IF NOT EXISTS captcha_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  challenge_types text[] DEFAULT '{shapes,images,puzzle,sequential,audio}',
  difficulty_min  integer DEFAULT 1,
  difficulty_max  integer DEFAULT 10,
  fail_threshold  integer DEFAULT 3,
  lockout_seconds integer DEFAULT 30,
  challenge_timeout integer DEFAULT 30,
  risk_threshold  integer DEFAULT 40,
  theme           text DEFAULT 'auto',
  size            text DEFAULT 'default',
  mode            text DEFAULT 'visible',
  lang            text DEFAULT 'fr',
  enabled         boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE captcha_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE captcha_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE captcha_config ENABLE ROW LEVEL SECURITY;

-- Media: workspace members can read; owner can manage
CREATE POLICY "workspace_members_read_media" ON captcha_media
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "workspace_owners_manage_media" ON captcha_media
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Logs: workspace members can read; insert allowed
CREATE POLICY "workspace_members_read_logs" ON captcha_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "authenticated_insert_logs" ON captcha_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Config: workspace members can read; owner can manage
CREATE POLICY "workspace_members_read_config" ON captcha_config
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "workspace_owners_manage_config" ON captcha_config
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Grants
GRANT ALL ON captcha_media TO authenticated;
GRANT ALL ON captcha_logs TO authenticated;
GRANT ALL ON captcha_config TO authenticated;
