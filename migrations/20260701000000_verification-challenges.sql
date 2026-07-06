-- Savemali Verification Challenge system (replaces email OTP)
CREATE TABLE IF NOT EXISTS verification_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      text NOT NULL,
  challenge_type  text NOT NULL CHECK (challenge_type IN ('math','arrangement','pattern')),
  challenge_data  jsonb NOT NULL,
  answer_hash     text NOT NULL,
  salt            text NOT NULL,
  expires_at      timestamptz NOT NULL,
  attempts_count  integer DEFAULT 0,
  is_locked       boolean DEFAULT false,
  is_verified     boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE verification_challenges ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own challenges
CREATE POLICY "own_verification_challenges" ON verification_challenges
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grants
GRANT ALL ON verification_challenges TO authenticated;

-- Index
CREATE INDEX IF NOT EXISTS idx_vc_user ON verification_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_vc_session ON verification_challenges(session_id);
CREATE INDEX IF NOT EXISTS idx_vc_expires ON verification_challenges(expires_at);
