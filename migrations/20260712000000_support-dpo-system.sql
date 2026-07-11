-- Support & DPO System: tickets, requests, RLS, indexes

-- ============================================================
-- 1. SUPPORT TICKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID,
  ticket_number TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_on_customer','resolved','closed')),
  source TEXT DEFAULT 'web',
  created_by_email TEXT,
  created_by_name TEXT,
  metadata JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. DPO REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS dpo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID,
  request_number TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN (
    'access','rectification','erasure','restriction','objection',
    'portability','withdraw_consent','complaint','other'
  )),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected','completed')),
  created_by_email TEXT,
  created_by_name TEXT,
  metadata JSONB,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. TICKET RESPONSES (internal thread)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  author_email TEXT,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_support_tickets_ws ON support_tickets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_dpo_requests_ws ON dpo_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dpo_requests_user ON dpo_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dpo_requests_status ON dpo_requests(status);
CREATE INDEX IF NOT EXISTS idx_dpo_requests_number ON dpo_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket ON ticket_responses(ticket_id);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

-- Owner can do all on support_tickets
DROP POLICY IF EXISTS owner_all_support_tickets ON support_tickets;
CREATE POLICY owner_all_support_tickets ON support_tickets
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Members can SELECT support_tickets
DROP POLICY IF EXISTS member_select_support_tickets ON support_tickets;
CREATE POLICY member_select_support_tickets ON support_tickets
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Members can INSERT support_tickets
DROP POLICY IF EXISTS member_insert_support_tickets ON support_tickets;
CREATE POLICY member_insert_support_tickets ON support_tickets
  FOR INSERT WITH CHECK (true);

-- Admin/manager UPDATE/DELETE on support_tickets
DROP POLICY IF EXISTS member_update_support_tickets ON support_tickets;
CREATE POLICY member_update_support_tickets ON support_tickets
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    OR user_id = auth.uid()
  );

-- Owner can do all on dpo_requests
DROP POLICY IF EXISTS owner_all_dpo_requests ON dpo_requests;
CREATE POLICY owner_all_dpo_requests ON dpo_requests
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Members can SELECT dpo_requests
DROP POLICY IF EXISTS member_select_dpo_requests ON dpo_requests;
CREATE POLICY member_select_dpo_requests ON dpo_requests
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Members can INSERT dpo_requests (anyone can submit a DPO request)
DROP POLICY IF EXISTS member_insert_dpo_requests ON dpo_requests;
CREATE POLICY member_insert_dpo_requests ON dpo_requests
  FOR INSERT WITH CHECK (true);

-- Admin/manager UPDATE on dpo_requests
DROP POLICY IF EXISTS member_update_dpo_requests ON dpo_requests;
CREATE POLICY member_update_dpo_requests ON dpo_requests
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    OR user_id = auth.uid()
  );

-- ticket_responses: owner all
DROP POLICY IF EXISTS owner_all_ticket_responses ON ticket_responses;
CREATE POLICY owner_all_ticket_responses ON ticket_responses
  FOR ALL USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  )
  WITH CHECK (
    ticket_id IN (SELECT id FROM support_tickets WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  );

-- ticket_responses: members can SELECT
DROP POLICY IF EXISTS member_select_ticket_responses ON ticket_responses;
CREATE POLICY member_select_ticket_responses ON ticket_responses
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
    OR ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

-- ticket_responses: members can INSERT
DROP POLICY IF EXISTS member_insert_ticket_responses ON ticket_responses;
CREATE POLICY member_insert_ticket_responses ON ticket_responses
  FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM support_tickets WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
    OR ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid())
  );

-- ============================================================
-- 6. AUTO-GENERATE TICKET/REQUEST NUMBER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6))
$$;

CREATE OR REPLACE FUNCTION generate_dpo_request_number()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT 'DPO-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6))
$$;
