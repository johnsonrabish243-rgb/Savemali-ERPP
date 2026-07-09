-- HR Module Tables
-- Creates all tables needed for the HR (Ressources Humaines) module

-- HR Departments
CREATE TABLE IF NOT EXISTS hr_departments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  manager_id uuid,
  parent_id uuid REFERENCES hr_departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_departments_workspace ON hr_departments(workspace_id);

-- HR Employees
CREATE TABLE IF NOT EXISTS hr_employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  position text NOT NULL,
  department_id uuid REFERENCES hr_departments(id) ON DELETE SET NULL,
  hire_date date NOT NULL,
  salary numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave','probation')),
  avatar_url text,
  birth_date date,
  address text,
  emergency_contact text,
  contract_type text DEFAULT 'permanent',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_workspace ON hr_employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department ON hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON hr_employees(status);

-- HR Contracts
CREATE TABLE IF NOT EXISTS hr_contracts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  contract_type text NOT NULL DEFAULT 'permanent' CHECK (contract_type IN ('permanent','contract','internship','freelance')),
  start_date date NOT NULL,
  end_date date,
  salary numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','terminated')),
  terms text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_contracts_workspace ON hr_contracts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON hr_contracts(employee_id);

-- HR Leave Requests
CREATE TABLE IF NOT EXISTS hr_leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL DEFAULT 'annual' CHECK (leave_type IN ('annual','sick','maternity','personal','unpaid')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reason text,
  approved_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_workspace ON hr_leave_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_employee ON hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_status ON hr_leave_requests(status);

-- HR Recruitments
CREATE TABLE IF NOT EXISTS hr_recruitments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  position text NOT NULL,
  department_id uuid REFERENCES hr_departments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed')),
  candidates_count integer DEFAULT 0,
  salary_range text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_recruitments_workspace ON hr_recruitments(workspace_id);

-- HR Evaluations
CREATE TABLE IF NOT EXISTS hr_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  period text NOT NULL,
  score numeric(4,1) NOT NULL DEFAULT 0,
  comments text,
  evaluator_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_evaluations_workspace ON hr_evaluations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_evaluations_employee ON hr_evaluations(employee_id);

-- HR Trainings
CREATE TABLE IF NOT EXISTS hr_trainings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  instructor text,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  participants_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_trainings_workspace ON hr_trainings(workspace_id);

-- RLS Policies
ALTER TABLE hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_recruitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_trainings ENABLE ROW LEVEL SECURITY;

-- Workspace members can read HR data
CREATE POLICY "hr_departments_select" ON hr_departments FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_employees_select" ON hr_employees FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_contracts_select" ON hr_contracts FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_leave_requests_select" ON hr_leave_requests FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_recruitments_select" ON hr_recruitments FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_evaluations_select" ON hr_evaluations FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_trainings_select" ON hr_trainings FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);

-- Admins/managers can insert/update/delete HR data
CREATE POLICY "hr_departments_insert" ON hr_departments FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_departments_update" ON hr_departments FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_departments_delete" ON hr_departments FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_employees_insert" ON hr_employees FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_employees_update" ON hr_employees FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_employees_delete" ON hr_employees FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_contracts_insert" ON hr_contracts FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_contracts_update" ON hr_contracts FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_contracts_delete" ON hr_contracts FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_leave_requests_insert" ON hr_leave_requests FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_leave_requests_update" ON hr_leave_requests FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_leave_requests_delete" ON hr_leave_requests FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_recruitments_insert" ON hr_recruitments FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_recruitments_update" ON hr_recruitments FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_recruitments_delete" ON hr_recruitments FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_evaluations_insert" ON hr_evaluations FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_evaluations_update" ON hr_evaluations FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_evaluations_delete" ON hr_evaluations FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_trainings_insert" ON hr_trainings FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_trainings_update" ON hr_trainings FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_trainings_delete" ON hr_trainings FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
