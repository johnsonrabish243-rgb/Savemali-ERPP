-- OTP storage table for TextBee SMS verification
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by phone + purpose + unused
CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose ON otp_codes (phone_number, purpose, used);

-- Index for cleanup of expired OTPs
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes (expires_at);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  resend_count INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

-- RLS: only service role can access OTP tables
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - otp_codes" ON otp_codes FOR ALL USING (false);
CREATE POLICY "Service role only - otp_rate_limits" ON otp_rate_limits FOR ALL USING (false);
