-- ============================================================
-- Migration: localStorage features to database tables
-- ============================================================

-- 1. PHARMACY: Prescriptions
CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  patient_name  text NOT NULL,
  medicine      text NOT NULL,
  dosage        text NOT NULL DEFAULT '',
  doctor        text NOT NULL DEFAULT '',
  date          date NOT NULL DEFAULT CURRENT_DATE,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at    timestamptz DEFAULT now()
);

-- 2. PHARMACY: Expenses
CREATE TABLE IF NOT EXISTS pharmacy_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  category      text NOT NULL DEFAULT '',
  amount        numeric NOT NULL DEFAULT 0,
  description   text NOT NULL DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

-- 3. EDUCATION: Schedule / Timetable
CREATE TABLE IF NOT EXISTS edu_schedule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  day           text NOT NULL,
  time          text NOT NULL,
  class_name    text NOT NULL DEFAULT '',
  subject       text NOT NULL DEFAULT '',
  teacher       text NOT NULL DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

-- 4. EDUCATION: Manual Grades
CREATE TABLE IF NOT EXISTS edu_grades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_name  text NOT NULL,
  class_name    text NOT NULL DEFAULT '',
  subject       text NOT NULL DEFAULT '',
  score         numeric NOT NULL DEFAULT 0,
  grade         text NOT NULL DEFAULT '',
  date          date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz DEFAULT now()
);

-- 5. EDUCATION: Discipline
CREATE TABLE IF NOT EXISTS edu_discipline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_name  text NOT NULL,
  class_name    text NOT NULL DEFAULT '',
  date          date NOT NULL DEFAULT CURRENT_DATE,
  reason        text NOT NULL DEFAULT '',
  action        text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at    timestamptz DEFAULT now()
);

-- 6. EDUCATION: Incidents
CREATE TABLE IF NOT EXISTS edu_incidents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  type          text NOT NULL DEFAULT 'other',
  description   text NOT NULL DEFAULT '',
  reported_by   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at    timestamptz DEFAULT now()
);

-- 7. GESTION: Employee Payments
CREATE TABLE IF NOT EXISTS gestion_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  employee_id   uuid REFERENCES employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL DEFAULT '',
  amount        numeric NOT NULL DEFAULT 0,
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','cancelled')),
  created_at    timestamptz DEFAULT now()
);

-- RLS policies for all new tables
ALTER TABLE pharmacy_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_discipline ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_payments ENABLE ROW LEVEL SECURITY;

-- Pharmacy prescriptions policies
CREATE POLICY "prescriptions_own" ON pharmacy_prescriptions FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "prescriptions_member" ON pharmacy_prescriptions FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- Pharmacy expenses policies
CREATE POLICY "expenses_own" ON pharmacy_expenses FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "expenses_member" ON pharmacy_expenses FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- Education schedule policies
CREATE POLICY "schedule_own" ON edu_schedule FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "schedule_member" ON edu_schedule FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- Education grades policies
CREATE POLICY "grades_own" ON edu_grades FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "grades_member" ON edu_grades FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- Education discipline policies
CREATE POLICY "discipline_own" ON edu_discipline FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "discipline_member" ON edu_discipline FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- Education incidents policies
CREATE POLICY "incidents_own" ON edu_incidents FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "incidents_member" ON edu_incidents FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));

-- Gestion payments policies
CREATE POLICY "gestion_payments_own" ON gestion_payments FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "gestion_payments_member" ON gestion_payments FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active'));
