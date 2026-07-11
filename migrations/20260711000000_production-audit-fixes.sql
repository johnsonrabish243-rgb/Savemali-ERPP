-- Production Audit Fixes: missing tables, columns, RLS, constraints

-- ============================================================
-- 1. ADD expiry_date COLUMN to store_medicines
-- ============================================================
ALTER TABLE store_medicines ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ============================================================
-- 2. FIX activity_logs CHECK constraint to include 'hr'
-- ============================================================
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_module_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_module_check
  CHECK (module IN ('pharmacy','commerce','education','gestion','system','hr'));

-- ============================================================
-- 3. Missing Education Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS edu_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  day TEXT NOT NULL,
  subject TEXT,
  teacher TEXT,
  start_time TEXT,
  end_time TEXT,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edu_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  grade NUMERIC(5,2),
  max_grade NUMERIC(5,2) DEFAULT 20,
  term TEXT,
  academic_year TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edu_discipline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  sanction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edu_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edu_accounting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Missing Gestion Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS gestion_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. Missing Pharmacy Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor_name TEXT,
  medicines JSONB,
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_accounting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. Multi-Pharmacy Support Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'pharmacist',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. Reports & Habits Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_data JSONB,
  status TEXT DEFAULT 'pending',
  submitted_by UUID,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. Missing HR Sub-Module Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present',
  check_in TIME,
  check_out TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  type TEXT DEFAULT 'absent',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT DEFAULT 'intermediate',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  previous_position TEXT,
  new_position TEXT NOT NULL,
  previous_salary NUMERIC(12,2),
  new_salary NUMERIC(12,2),
  promotion_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_discipline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  sanction TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_health_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  description TEXT,
  incident_date DATE DEFAULT CURRENT_DATE,
  severity TEXT,
  report TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT NOT NULL,
  storage_key TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_communication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sender_id UUID,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. Add workspace_notifications FK if missing
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_notifications_workspace_id_fkey'
  ) THEN
    ALTER TABLE workspace_notifications
      ADD CONSTRAINT workspace_notifications_workspace_id_fkey
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- ============================================================
-- 10. Add owner_all RLS policies for HR payroll tables
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['hr_payroll_periods','hr_payslips','hr_payment_transactions','hr_salary_advances']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_all_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY owner_all_%I ON %I
        FOR ALL USING (workspace_id IN (
          SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )) WITH CHECK (workspace_id IN (
          SELECT id FROM workspaces WHERE owner_id = auth.uid()
        ))', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 11. Indexes for missing tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_edu_schedule_ws ON edu_schedule(workspace_id);
CREATE INDEX IF NOT EXISTS idx_edu_grades_ws ON edu_grades(workspace_id);
CREATE INDEX IF NOT EXISTS idx_edu_discipline_ws ON edu_discipline(workspace_id);
CREATE INDEX IF NOT EXISTS idx_edu_incidents_ws ON edu_incidents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_edu_accounting_ws ON edu_accounting(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gestion_payments_ws ON gestion_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_prescriptions_ws ON pharmacy_prescriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_expenses_ws ON pharmacy_expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_accounting_ws ON pharmacy_accounting(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_ws ON shared_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_habits_ws_user ON habits(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pharmacies_ws ON pharmacies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_ws_emp ON hr_attendance(workspace_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_absences_ws_emp ON hr_absences(workspace_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_skills_ws_emp ON hr_skills(workspace_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_ws_emp ON hr_documents(workspace_id, employee_id);

-- ============================================================
-- 12. RLS policies for all new tables
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'edu_schedule','edu_grades','edu_discipline','edu_incidents','edu_accounting',
    'gestion_payments',
    'pharmacy_prescriptions','pharmacy_expenses','pharmacy_accounting',
    'pharmacies','pharmacy_members',
    'hr_attendance','hr_absences','hr_skills','hr_promotions','hr_discipline',
    'hr_health_safety','hr_documents','hr_communication'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Owner can do all
    EXECUTE format('
      DROP POLICY IF EXISTS owner_all_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY owner_all_%I ON %I
        FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
        WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))', tbl, tbl);

    -- Members can SELECT
    EXECUTE format('
      DROP POLICY IF EXISTS member_select_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY member_select_%I ON %I
        FOR SELECT USING (workspace_id IN (
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        ))', tbl, tbl);

    -- Members with role can write
    EXECUTE format('
      DROP POLICY IF EXISTS member_write_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY member_write_%I ON %I
        FOR INSERT WITH CHECK (
          workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
          AND workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid() AND role IN (''admin'',''manager'')
          ))', tbl, tbl);

    -- Members can UPDATE/DELETE own related data
    EXECUTE format('
      DROP POLICY IF EXISTS member_update_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY member_update_%I ON %I
        FOR UPDATE USING (workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid() AND role IN (''admin'',''manager'')
        ))', tbl, tbl);

    EXECUTE format('
      DROP POLICY IF EXISTS member_delete_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY member_delete_%I ON %I
        FOR DELETE USING (workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid() AND role IN (''admin'',''manager'')
        ))', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 13. Insert RLS for habits (user-based, not workspace-member)
-- ============================================================
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_all_habits ON habits;
CREATE POLICY owner_all_habits ON habits
  FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS user_own_habits ON habits;
CREATE POLICY user_own_habits ON habits
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_own_habit_logs ON habit_logs;
CREATE POLICY user_own_habit_logs ON habit_logs
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
