-- HR Payroll & Payment Tables
-- Extends the HR module with payroll periods, payslips, payment transactions, and salary advances

-- Payroll Periods
CREATE TABLE IF NOT EXISTS hr_payroll_periods (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month             integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              integer NOT NULL,
  label             text,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','completed','cancelled')),
  processed_at      timestamptz,
  processed_by      uuid,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(workspace_id, month, year)
);

-- Payslips
CREATE TABLE IF NOT EXISTS hr_payslips (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  period_id         uuid NOT NULL REFERENCES hr_payroll_periods(id) ON DELETE CASCADE,
  base_salary       numeric(12,2) NOT NULL DEFAULT 0,
  bonus             numeric(12,2) NOT NULL DEFAULT 0,
  allowance         numeric(12,2) NOT NULL DEFAULT 0,
  overtime          numeric(12,2) NOT NULL DEFAULT 0,
  deduction         numeric(12,2) NOT NULL DEFAULT 0,
  absence_deduction numeric(12,2) NOT NULL DEFAULT 0,
  late_deduction    numeric(12,2) NOT NULL DEFAULT 0,
  advance_deduction numeric(12,2) NOT NULL DEFAULT 0,
  tax_deduction     numeric(12,2) NOT NULL DEFAULT 0,
  social_contrib    numeric(12,2) NOT NULL DEFAULT 0,
  net_pay           numeric(12,2) NOT NULL DEFAULT 0,
  work_days         integer NOT NULL DEFAULT 0,
  absent_days       integer NOT NULL DEFAULT 0,
  late_days         integer NOT NULL DEFAULT 0,
  payslip_number    text,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','cancelled')),
  approved_by       uuid,
  approved_at       timestamptz,
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_id)
);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS hr_payment_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  payslip_id        uuid REFERENCES hr_payslips(id) ON DELETE SET NULL,
  amount            numeric(12,2) NOT NULL DEFAULT 0,
  payment_method    text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','mobile_money','check')),
  reference         text,
  notes             text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled')),
  processed_by      uuid,
  processed_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- Salary Advances / Loans
CREATE TABLE IF NOT EXISTS hr_salary_advances (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id       uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  amount            numeric(12,2) NOT NULL DEFAULT 0,
  installment_count integer NOT NULL DEFAULT 1,
  installment_amount numeric(12,2) NOT NULL DEFAULT 0,
  remaining         numeric(12,2) NOT NULL DEFAULT 0,
  reason            text,
  status            text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','partially_paid','paid','cancelled')),
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_payroll_periods_ws ON hr_payroll_periods(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_ws ON hr_payslips(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_emp ON hr_payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_period ON hr_payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_hr_paytrans_ws ON hr_payment_transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_paytrans_emp ON hr_payment_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_paytrans_payslip ON hr_payment_transactions(payslip_id);
CREATE INDEX IF NOT EXISTS idx_hr_advances_ws ON hr_salary_advances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hr_advances_emp ON hr_salary_advances(employee_id);

-- RLS
ALTER TABLE hr_payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_salary_advances ENABLE ROW LEVEL SECURITY;

-- Workspace members can read
CREATE POLICY "hr_payroll_periods_select" ON hr_payroll_periods FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_payslips_select" ON hr_payslips FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_paytrans_select" ON hr_payment_transactions FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "hr_advances_select" ON hr_salary_advances FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND status = 'active')
);

-- Admins/managers can insert/update/delete
CREATE POLICY "hr_payroll_periods_insert" ON hr_payroll_periods FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_payroll_periods_update" ON hr_payroll_periods FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_payroll_periods_delete" ON hr_payroll_periods FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_payslips_insert" ON hr_payslips FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_payslips_update" ON hr_payslips FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_payslips_delete" ON hr_payslips FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_paytrans_insert" ON hr_payment_transactions FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_paytrans_update" ON hr_payment_transactions FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_paytrans_delete" ON hr_payment_transactions FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

CREATE POLICY "hr_advances_insert" ON hr_salary_advances FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_advances_update" ON hr_salary_advances FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);
CREATE POLICY "hr_advances_delete" ON hr_salary_advances FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin','manager') AND status = 'active')
);

-- Grants
GRANT ALL ON hr_payroll_periods TO authenticated;
GRANT ALL ON hr_payslips TO authenticated;
GRANT ALL ON hr_payment_transactions TO authenticated;
GRANT ALL ON hr_salary_advances TO authenticated;
