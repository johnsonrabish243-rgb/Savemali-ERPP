-- Education: Staff / Personnel Management

CREATE TABLE IF NOT EXISTS staff_employees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  middle_name       text,
  gender            text CHECK (gender IN ('M','F')),
  photo_url         text,
  birth_date        date,
  address           text,
  phone             text,
  email             text,
  function          text,
  department        text,
  employee_code     text,
  hire_date         date DEFAULT CURRENT_DATE,
  contract_type     text CHECK (contract_type IN ('permanent','fixed-term','intern','temporary')),
  base_salary       numeric(12,2) DEFAULT 0,
  bonus             numeric(12,2) DEFAULT 0,
  allowance         numeric(12,2) DEFAULT 0,
  deduction         numeric(12,2) DEFAULT 0,
  bank_name         text,
  bank_account      text,
  status            text DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE staff_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_employees" ON staff_employees;
CREATE POLICY "sel_staff_employees" ON staff_employees FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_employees" ON staff_employees;
CREATE POLICY "ins_staff_employees" ON staff_employees FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_employees" ON staff_employees;
CREATE POLICY "upd_staff_employees" ON staff_employees FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_employees" ON staff_employees;
CREATE POLICY "del_staff_employees" ON staff_employees FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS staff_attendance (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES staff_employees(id) ON DELETE CASCADE,
  date              date NOT NULL DEFAULT CURRENT_DATE,
  clock_in          timestamptz,
  clock_out         timestamptz,
  status            text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','leave','permission')),
  hours_worked      numeric(5,2) DEFAULT 0,
  late_minutes      integer DEFAULT 0,
  notes             text,
  approved          boolean DEFAULT false,
  approved_by       uuid,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_attendance" ON staff_attendance;
CREATE POLICY "sel_staff_attendance" ON staff_attendance FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_attendance" ON staff_attendance;
CREATE POLICY "ins_staff_attendance" ON staff_attendance FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_attendance" ON staff_attendance;
CREATE POLICY "upd_staff_attendance" ON staff_attendance FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_attendance" ON staff_attendance;
CREATE POLICY "del_staff_attendance" ON staff_attendance FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS staff_payroll_periods (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month             integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              integer NOT NULL,
  label             text,
  processed         boolean DEFAULT false,
  processed_at      timestamptz,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(workspace_id, month, year)
);
ALTER TABLE staff_payroll_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_payroll_periods" ON staff_payroll_periods;
CREATE POLICY "sel_staff_payroll_periods" ON staff_payroll_periods FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_payroll_periods" ON staff_payroll_periods;
CREATE POLICY "ins_staff_payroll_periods" ON staff_payroll_periods FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_payroll_periods" ON staff_payroll_periods;
CREATE POLICY "upd_staff_payroll_periods" ON staff_payroll_periods FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_payroll_periods" ON staff_payroll_periods;
CREATE POLICY "del_staff_payroll_periods" ON staff_payroll_periods FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS staff_payslips (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES staff_employees(id) ON DELETE CASCADE,
  period_id         uuid NOT NULL REFERENCES staff_payroll_periods(id) ON DELETE CASCADE,
  base_salary       numeric(12,2) DEFAULT 0,
  bonus             numeric(12,2) DEFAULT 0,
  allowance         numeric(12,2) DEFAULT 0,
  overtime          numeric(12,2) DEFAULT 0,
  deduction         numeric(12,2) DEFAULT 0,
  absence_deduction numeric(12,2) DEFAULT 0,
  late_deduction    numeric(12,2) DEFAULT 0,
  advance_deduction numeric(12,2) DEFAULT 0,
  net_pay           numeric(12,2) DEFAULT 0,
  work_days         integer DEFAULT 0,
  absent_days       integer DEFAULT 0,
  late_days         integer DEFAULT 0,
  payslip_number    text,
  verified_by       uuid,
  paid              boolean DEFAULT false,
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_id)
);
ALTER TABLE staff_payslips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_payslips" ON staff_payslips;
CREATE POLICY "sel_staff_payslips" ON staff_payslips FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_payslips" ON staff_payslips;
CREATE POLICY "ins_staff_payslips" ON staff_payslips FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_payslips" ON staff_payslips;
CREATE POLICY "upd_staff_payslips" ON staff_payslips FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_payslips" ON staff_payslips;
CREATE POLICY "del_staff_payslips" ON staff_payslips FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS staff_payment_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES staff_employees(id) ON DELETE CASCADE,
  payslip_id        uuid REFERENCES staff_payslips(id) ON DELETE SET NULL,
  amount            numeric(12,2) NOT NULL DEFAULT 0,
  payment_method    text CHECK (payment_method IN ('cash','bank_transfer','mobile_money','check')),
  reference         text,
  notes             text,
  status            text DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  paid_at           timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE staff_payment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_payment_history" ON staff_payment_history;
CREATE POLICY "sel_staff_payment_history" ON staff_payment_history FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_payment_history" ON staff_payment_history;
CREATE POLICY "ins_staff_payment_history" ON staff_payment_history FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_payment_history" ON staff_payment_history;
CREATE POLICY "upd_staff_payment_history" ON staff_payment_history FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_payment_history" ON staff_payment_history;
CREATE POLICY "del_staff_payment_history" ON staff_payment_history FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES staff_employees(id) ON DELETE CASCADE,
  leave_type        text NOT NULL CHECK (leave_type IN ('annual','sick','maternity','paternity','unpaid','other')),
  start_date        date NOT NULL,
  end_date          date NOT NULL,
  reason            text,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE staff_leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_leave_requests" ON staff_leave_requests;
CREATE POLICY "sel_staff_leave_requests" ON staff_leave_requests FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_leave_requests" ON staff_leave_requests;
CREATE POLICY "ins_staff_leave_requests" ON staff_leave_requests FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_leave_requests" ON staff_leave_requests;
CREATE POLICY "upd_staff_leave_requests" ON staff_leave_requests FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_leave_requests" ON staff_leave_requests;
CREATE POLICY "del_staff_leave_requests" ON staff_leave_requests FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS staff_notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES staff_employees(id) ON DELETE CASCADE,
  title             text NOT NULL,
  message           text,
  type              text CHECK (type IN ('payslip','salary','payment','attendance','leave','system')),
  read              boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_staff_notifications" ON staff_notifications;
CREATE POLICY "sel_staff_notifications" ON staff_notifications FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_staff_notifications" ON staff_notifications;
CREATE POLICY "ins_staff_notifications" ON staff_notifications FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_staff_notifications" ON staff_notifications;
CREATE POLICY "upd_staff_notifications" ON staff_notifications FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_staff_notifications" ON staff_notifications;
CREATE POLICY "del_staff_notifications" ON staff_notifications FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_emp_ws ON staff_employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_att_ws ON staff_attendance(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_att_emp ON staff_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_att_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_staff_payroll_ws ON staff_payroll_periods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslip_ws ON staff_payslips(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslip_emp ON staff_payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_payslip_period ON staff_payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_staff_payhist_ws ON staff_payment_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_payhist_emp ON staff_payment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_ws ON staff_leave_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_emp ON staff_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_notif_ws ON staff_notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_staff_notif_emp ON staff_notifications(employee_id);

-- Grants
GRANT ALL ON staff_employees TO authenticated;
GRANT ALL ON staff_attendance TO authenticated;
GRANT ALL ON staff_payroll_periods TO authenticated;
GRANT ALL ON staff_payslips TO authenticated;
GRANT ALL ON staff_payment_history TO authenticated;
GRANT ALL ON staff_leave_requests TO authenticated;
GRANT ALL ON staff_notifications TO authenticated;
