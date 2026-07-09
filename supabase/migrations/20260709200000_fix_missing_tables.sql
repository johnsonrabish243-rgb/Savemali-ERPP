-- ============================================================
-- FIX MISSING TABLES & COLUMNS
-- ============================================================

-- 1. Add avatar_url column to workspace_members (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_members' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN avatar_url text;
  END IF;
END $$;

-- 2. Create teachers table (education module)
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  subject text,
  qualification text,
  hire_date date,
  salary numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY teachers_owner_select ON teachers FOR SELECT USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY teachers_owner_insert ON teachers FOR INSERT WITH CHECK (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY teachers_owner_update ON teachers FOR UPDATE USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY teachers_owner_delete ON teachers FOR DELETE USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY teachers_member_select ON teachers FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_owner_select ON audit_logs FOR SELECT USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY audit_logs_member_select ON audit_logs FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 4. Fix activity_logs CHECK constraint to allow 'hr' module
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_module_check;
  -- Add new constraint with 'hr' included
  ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_module_check
    CHECK (module IN ('pharmacy','commerce','education','gestion','system','hr'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Create hr_attendance table
CREATE TABLE IF NOT EXISTS hr_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in time,
  check_out time,
  status text DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','on_leave')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_attendance_owner_all ON hr_attendance FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_attendance_member_select ON hr_attendance FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 6. Create hr_absences table
CREATE TABLE IF NOT EXISTS hr_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reported_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_absences_owner_all ON hr_absences FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_absences_member_select ON hr_absences FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 7. Create hr_skills table
CREATE TABLE IF NOT EXISTS hr_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  level text DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced','expert')),
  assessed_by uuid,
  assessed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_skills_owner_all ON hr_skills FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_skills_member_select ON hr_skills FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 8. Create hr_promotions table
CREATE TABLE IF NOT EXISTS hr_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  old_position text,
  new_position text NOT NULL,
  old_salary numeric,
  new_salary numeric,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  approved_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_promotions_owner_all ON hr_promotions FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_promotions_member_select ON hr_promotions FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 9. Create hr_discipline table
CREATE TABLE IF NOT EXISTS hr_discipline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('warning','suspension','termination','commendation','other')),
  description text NOT NULL,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  issued_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_discipline ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_discipline_owner_all ON hr_discipline FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_discipline_member_select ON hr_discipline FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 10. Create hr_health_safety table
CREATE TABLE IF NOT EXISTS hr_health_safety (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  incident_type text NOT NULL CHECK (incident_type IN ('accident','near_miss',' hazard_report','safety_inspection','other')),
  description text NOT NULL,
  location text,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  severity text DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  reported_by uuid,
  status text DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_health_safety ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_health_safety_owner_all ON hr_health_safety FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_health_safety_member_select ON hr_health_safety FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 11. Create hr_documents table
CREATE TABLE IF NOT EXISTS hr_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES hr_employees(id) ON DELETE SET NULL,
  title text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('contract','certificate','id','policy','other')),
  file_url text,
  notes text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_documents_owner_all ON hr_documents FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_documents_member_select ON hr_documents FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 12. Create hr_communication table
CREATE TABLE IF NOT EXISTS hr_communication (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  channel text DEFAULT 'internal' CHECK (channel IN ('internal','email','sms','whatsapp')),
  target_all boolean DEFAULT true,
  sent_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hr_communication ENABLE ROW LEVEL SECURITY;
CREATE POLICY hr_communication_owner_all ON hr_communication FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY hr_communication_member_select ON hr_communication FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 13. Create edu_accounting table (for EducationPage accounting tab)
CREATE TABLE IF NOT EXISTS edu_accounting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income','expense')),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  reference_id uuid,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE edu_accounting ENABLE ROW LEVEL SECURITY;
CREATE POLICY edu_accounting_owner_all ON edu_accounting FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY edu_accounting_member_select ON edu_accounting FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- 14. Create pharmacy_accounting table (for PharmacyPage accounting tab)
CREATE TABLE IF NOT EXISTS pharmacy_accounting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income','expense')),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  reference_id uuid,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pharmacy_accounting ENABLE ROW LEVEL SECURITY;
CREATE POLICY pharmacy_accounting_owner_all ON pharmacy_accounting FOR ALL USING (auth.uid() = (SELECT owner_id FROM workspaces WHERE id = workspace_id));
CREATE POLICY pharmacy_accounting_member_select ON pharmacy_accounting FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));
