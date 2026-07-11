-- ── Contact & Rendez-vous tables ──
-- Depends: workspaces, support_tickets

-- 1. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID,
  appointment_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'videoconference' CHECK (meeting_type IN ('videoconference','phone','in_person')),
  purpose TEXT NOT NULL,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rescheduled','cancelled','completed')),
  reschedule_token UUID,
  reminder_sent BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  assigned_to UUID,
  created_by_email TEXT,
  created_by_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID,
  contact_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'support' CHECK (category IN ('support','commercial','billing','partnership','data_protection','other')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','replied','closed')),
  created_by_email TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AVAILABILITY SLOTS (for admin-defined working hours)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_ws ON appointments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(meeting_date);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_ws ON contact_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_availability_slots_ws ON availability_slots(workspace_id);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Appointments RLS
DROP POLICY IF EXISTS owner_all_appointments ON appointments;
CREATE POLICY owner_all_appointments ON appointments
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS member_select_appointments ON appointments;
CREATE POLICY member_select_appointments ON appointments
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR email = auth.email()
  );

DROP POLICY IF EXISTS member_insert_appointments ON appointments;
CREATE POLICY member_insert_appointments ON appointments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS member_update_appointments ON appointments;
CREATE POLICY member_update_appointments ON appointments
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager'))
    OR user_id = auth.uid()
  );

-- Contact messages RLS
DROP POLICY IF EXISTS owner_all_contact_messages ON contact_messages;
CREATE POLICY owner_all_contact_messages ON contact_messages
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS member_select_contact_messages ON contact_messages;
CREATE POLICY member_select_contact_messages ON contact_messages
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS member_insert_contact_messages ON contact_messages;
CREATE POLICY member_insert_contact_messages ON contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS member_update_contact_messages ON contact_messages;
CREATE POLICY member_update_contact_messages ON contact_messages
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager'))
  );

-- Availability slots RLS
DROP POLICY IF EXISTS owner_availability ON availability_slots;
CREATE POLICY owner_availability ON availability_slots
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS member_select_availability ON availability_slots;
CREATE POLICY member_select_availability ON availability_slots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS member_manage_availability ON availability_slots;
CREATE POLICY member_manage_availability ON availability_slots
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager'))
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager'))
  );

-- Auto-number functions
CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'RDV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6))
$$;

CREATE OR REPLACE FUNCTION generate_contact_number()
RETURNS TEXT LANGUAGE SQL AS $$
  SELECT 'MSG-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6))
$$;
