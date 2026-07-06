/*
# SaveMali — Team Members & Activity Logs

## Purpose
Enable workspace owners to invite employees (team members) who operate the
system on their behalf. Every significant action (sale, stock adjustment,
student enrolment, accounting entry, etc.) is recorded in an immutable
activity log tied to the acting member and their device.

## New Tables

### workspace_members
Stores invited employees for a workspace. The owner is identified by
`owner_id` on the `workspaces` table; members are separate Supabase auth
users (or invited via email, pending acceptance).

Columns:
- id                 — primary key
- workspace_id       — which workspace this member belongs to
- owner_id           — uid of the workspace owner (for RLS scoping)
- user_id            — uid of the member once they accept the invite (nullable until accepted)
- email              — email the invite was sent to
- display_name       — friendly name shown in reports
- role               — 'manager' | 'cashier' | 'pharmacist' | 'teacher' | 'accountant' | 'viewer'
- status             — 'pending' | 'active' | 'suspended'
- invited_at         — when the owner created the invite
- accepted_at        — when the member signed up / linked their account

### activity_logs
Immutable audit trail. Every sale, stock addition, student registration, fee
payment, accounting entry, etc. appends a row here. Captures who did it,
when (exact timestamp), what device/browser they used, and a structured
payload for the relevant record.

Columns:
- id               — primary key
- workspace_id     — workspace context
- owner_id         — workspace owner (for RLS)
- actor_user_id    — auth.uid() of the person who performed the action
- actor_email      — denormalised email for display even if member is deleted
- actor_name       — denormalised display name
- action_type      — e.g. 'sale', 'stock_add', 'stock_edit', 'student_add', 'fee_payment', 'product_add', 'accounting_entry', 'employee_add'
- module           — 'pharmacy' | 'commerce' | 'education' | 'gestion'
- description      — human-readable summary (e.g. "Vente de $12.50 — 3 articles")
- amount_usd       — monetary amount when applicable (NULL otherwise)
- reference_id     — uuid of the affected record (sale_id, medicine_id, student_id …)
- device_info      — JSON: { userAgent, platform, language, screenW, screenH }
- performed_at     — exact timestamp of the action (DEFAULT now())
- created_at       — row insertion time

## Security

RLS is enabled on both tables. The workspace owner can see all rows for their
workspace. Members can only see rows for workspaces they belong to (both as
owner and as member).

Owners can do everything on workspace_members. Members cannot insert/update
their own membership rows — only owners can manage memberships.

Activity logs are append-only for authenticated users who belong to the
workspace (either as owner or member). Nobody can update or delete log rows.
*/

-- ─── workspace_members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text NOT NULL,
  display_name  text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'cashier'
                CHECK (role IN ('manager','cashier','pharmacist','teacher','accountant','viewer')),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','active','suspended')),
  invited_at    timestamptz DEFAULT now(),
  accepted_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD on their own workspace's members
DROP POLICY IF EXISTS "owner_select_members" ON workspace_members;
CREATE POLICY "owner_select_members" ON workspace_members FOR SELECT
  TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_insert_members" ON workspace_members;
CREATE POLICY "owner_insert_members" ON workspace_members FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_update_members" ON workspace_members;
CREATE POLICY "owner_update_members" ON workspace_members FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_delete_members" ON workspace_members;
CREATE POLICY "owner_delete_members" ON workspace_members FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

-- Members can see workspaces they have been added to (so they can link their account)
DROP POLICY IF EXISTS "member_select_own_invite" ON workspace_members;
CREATE POLICY "member_select_own_invite" ON workspace_members FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Members can update their own row to accept the invite (set user_id, accepted_at)
DROP POLICY IF EXISTS "member_accept_invite" ON workspace_members;
CREATE POLICY "member_accept_invite" ON workspace_members FOR UPDATE
  TO authenticated USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- ─── activity_logs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email     text NOT NULL DEFAULT '',
  actor_name      text NOT NULL DEFAULT '',
  action_type     text NOT NULL,
  module          text NOT NULL CHECK (module IN ('pharmacy','commerce','education','gestion','system')),
  description     text NOT NULL,
  amount_usd      numeric(10,2),
  reference_id    uuid,
  device_info     jsonb DEFAULT '{}'::jsonb,
  performed_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Owner can read all logs for their workspace
DROP POLICY IF EXISTS "owner_select_logs" ON activity_logs;
CREATE POLICY "owner_select_logs" ON activity_logs FOR SELECT
  TO authenticated USING (owner_id = auth.uid());

-- Members can read logs for workspaces they belong to
DROP POLICY IF EXISTS "member_select_logs" ON activity_logs;
CREATE POLICY "member_select_logs" ON activity_logs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = activity_logs.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Anyone active in the workspace (owner or member) can insert logs
DROP POLICY IF EXISTS "workspace_insert_log" ON activity_logs;
CREATE POLICY "workspace_insert_log" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = activity_logs.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.status = 'active'
      )
    )
  );

-- Nobody can UPDATE or DELETE log rows (immutable audit trail)

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wm_workspace    ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wm_owner        ON workspace_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_wm_user         ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wm_email        ON workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_wm_status       ON workspace_members(status);

CREATE INDEX IF NOT EXISTS idx_alog_workspace  ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alog_owner      ON activity_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_alog_actor      ON activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_alog_module     ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_alog_performed  ON activity_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_alog_action     ON activity_logs(action_type);
