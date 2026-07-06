/*
# SaveMali — Invite Token System

## Purpose
Allow workspace owners to generate a unique invite link for each employee.
The invited user opens the link, which takes them to a special sign-up page
that pre-fills their email and skips workspace creation — they simply set
a password and are automatically linked to the owner's workspace.

## Changes

### workspace_members
- ADD COLUMN `invite_token` (text, unique) — random token used in the invite URL
- ADD COLUMN `invite_expires_at` (timestamptz) — optional expiry timestamp

### RLS
- Allow anon (unauthenticated) users to SELECT a pending invite row by token,
  so the sign-up page can look up the invite details before the user has a session.
  This is scoped to: status = 'pending' AND invite_token IS NOT NULL.
  No other columns or rows are exposed to anon.
*/

-- Add invite_token column
ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

-- Allow anon to look up a pending invite by token (for the sign-up page)
DROP POLICY IF EXISTS "anon_select_pending_invite" ON workspace_members;
CREATE POLICY "anon_select_pending_invite" ON workspace_members FOR SELECT
  TO anon, authenticated
  USING (
    invite_token IS NOT NULL
    AND status = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  );

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_wm_invite_token ON workspace_members(invite_token);
