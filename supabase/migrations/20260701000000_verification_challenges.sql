/*
# SaveMali — Security Verification Challenges

## Purpose
Prevent bot sign-ups by requiring a 3-round challenge (math / arrangement / pattern)
after successful account creation. Supports rate limiting (3 attempts max per challenge)
and session lockout.

## Tables

### verification_challenges
- Stores each challenge issued to a user during sign-up
- Contains the salted SHA-256 answer hash, expiry, and attempt tracking
- `is_locked` flags the session after 3 failed attempts
*/

CREATE TABLE IF NOT EXISTS verification_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  session_id  text NOT NULL,
  challenge_type text NOT NULL,
  challenge_data jsonb NOT NULL,
  answer_hash text NOT NULL,
  salt        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_locked   boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Index for fast lookup by session + type during verification
CREATE INDEX IF NOT EXISTS idx_vc_session ON verification_challenges(session_id, challenge_type);

-- RLS: only the owning user (via auth.uid()) can see their own challenges
ALTER TABLE verification_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_challenges" ON verification_challenges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_challenges" ON verification_challenges FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own_challenges" ON verification_challenges FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
