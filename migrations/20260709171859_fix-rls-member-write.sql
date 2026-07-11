-- ============================================================
-- FIX RLS: Add member_write policies to all tables missing them
-- ============================================================
-- Pattern: members can INSERT/UPDATE/DELETE rows in their workspace
-- Uses existing is_workspace_member() SECURITY DEFINER helper

-- ── PHARMACY MODULE ──────────────────────────────────────────

DROP POLICY IF EXISTS pharmacies_member_insert ON pharmacies;
CREATE POLICY pharmacies_member_insert ON pharmacies
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacies_member_update ON pharmacies;
CREATE POLICY pharmacies_member_update ON pharmacies
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacies_member_delete ON pharmacies;
CREATE POLICY pharmacies_member_delete ON pharmacies
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_expenses_member_insert ON pharmacy_expenses;
CREATE POLICY pharmacy_expenses_member_insert ON pharmacy_expenses
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_expenses_member_update ON pharmacy_expenses;
CREATE POLICY pharmacy_expenses_member_update ON pharmacy_expenses
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_expenses_member_delete ON pharmacy_expenses;
CREATE POLICY pharmacy_expenses_member_delete ON pharmacy_expenses
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_prescriptions_member_insert ON pharmacy_prescriptions;
CREATE POLICY pharmacy_prescriptions_member_insert ON pharmacy_prescriptions
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_prescriptions_member_update ON pharmacy_prescriptions;
CREATE POLICY pharmacy_prescriptions_member_update ON pharmacy_prescriptions
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_prescriptions_member_delete ON pharmacy_prescriptions;
CREATE POLICY pharmacy_prescriptions_member_delete ON pharmacy_prescriptions
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS store_medicines_member_insert ON store_medicines;
CREATE POLICY store_medicines_member_insert ON store_medicines
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS store_medicines_member_update ON store_medicines;
CREATE POLICY store_medicines_member_update ON store_medicines
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS store_medicines_member_delete ON store_medicines;
CREATE POLICY store_medicines_member_delete ON store_medicines
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS stock_movements_member_insert ON stock_movements;
CREATE POLICY stock_movements_member_insert ON stock_movements
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS stock_movements_member_update ON stock_movements;
CREATE POLICY stock_movements_member_update ON stock_movements
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS stock_movements_member_delete ON stock_movements;
CREATE POLICY stock_movements_member_delete ON stock_movements
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- ── COMMERCE MODULE ──────────────────────────────────────────

DROP POLICY IF EXISTS sales_member_insert ON sales;
CREATE POLICY sales_member_insert ON sales
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS sale_items_member_insert ON sale_items;
CREATE POLICY sale_items_member_insert ON sale_items
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS sale_items_member_update ON sale_items;
CREATE POLICY sale_items_member_update ON sale_items
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS sale_items_member_delete ON sale_items;
CREATE POLICY sale_items_member_delete ON sale_items
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS invoices_member_insert ON invoices;
CREATE POLICY invoices_member_insert ON invoices
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS invoices_member_delete ON invoices;
CREATE POLICY invoices_member_delete ON invoices
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- invoice_items: no workspace_id, join through invoices
DROP POLICY IF EXISTS mem_ins_invoice_items ON invoice_items;
CREATE POLICY mem_ins_invoice_items ON invoice_items
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices inv
    WHERE inv.id = invoice_items.invoice_id
      AND is_workspace_member(inv.workspace_id)
  ));

DROP POLICY IF EXISTS mem_upd_invoice_items ON invoice_items;
CREATE POLICY mem_upd_invoice_items ON invoice_items
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM invoices inv
    WHERE inv.id = invoice_items.invoice_id
      AND is_workspace_member(inv.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices inv
    WHERE inv.id = invoice_items.invoice_id
      AND is_workspace_member(inv.workspace_id)
  ));

DROP POLICY IF EXISTS mem_del_invoice_items ON invoice_items;
CREATE POLICY mem_del_invoice_items ON invoice_items
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM invoices inv
    WHERE inv.id = invoice_items.invoice_id
      AND is_workspace_member(inv.workspace_id)
  ));

DROP POLICY IF EXISTS supplier_orders_member_insert ON supplier_orders;
CREATE POLICY supplier_orders_member_insert ON supplier_orders
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS customers_member_insert ON customers;
CREATE POLICY customers_member_insert ON customers
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS customers_member_update ON customers;
CREATE POLICY customers_member_update ON customers
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS customers_member_delete ON customers;
CREATE POLICY customers_member_delete ON customers
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS commerce_products_member_insert ON commerce_products;
CREATE POLICY commerce_products_member_insert ON commerce_products
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS commerce_products_member_update ON commerce_products;
CREATE POLICY commerce_products_member_update ON commerce_products
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS commerce_products_member_delete ON commerce_products;
CREATE POLICY commerce_products_member_delete ON commerce_products
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- ── EDUCATION MODULE ─────────────────────────────────────────

DROP POLICY IF EXISTS students_member_insert ON students;
CREATE POLICY students_member_insert ON students
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS students_member_delete ON students;
CREATE POLICY students_member_delete ON students
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS teachers_member_insert ON teachers;
CREATE POLICY teachers_member_insert ON teachers
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS teachers_member_delete ON teachers;
CREATE POLICY teachers_member_delete ON teachers
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS classes_member_insert ON classes;
CREATE POLICY classes_member_insert ON classes
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS classes_member_update ON classes;
CREATE POLICY classes_member_update ON classes
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS classes_member_delete ON classes;
CREATE POLICY classes_member_delete ON classes
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS exams_member_insert ON exams;
CREATE POLICY exams_member_insert ON exams
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS exams_member_update ON exams;
CREATE POLICY exams_member_update ON exams
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS exams_member_delete ON exams;
CREATE POLICY exams_member_delete ON exams
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS exam_results_member_insert ON exam_results;
CREATE POLICY exam_results_member_insert ON exam_results
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS exam_results_member_update ON exam_results;
CREATE POLICY exam_results_member_update ON exam_results
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS exam_results_member_delete ON exam_results;
CREATE POLICY exam_results_member_delete ON exam_results
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_grades_member_insert ON edu_grades;
CREATE POLICY edu_grades_member_insert ON edu_grades
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_grades_member_update ON edu_grades;
CREATE POLICY edu_grades_member_update ON edu_grades
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_grades_member_delete ON edu_grades;
CREATE POLICY edu_grades_member_delete ON edu_grades
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_schedule_member_insert ON edu_schedule;
CREATE POLICY edu_schedule_member_insert ON edu_schedule
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_schedule_member_update ON edu_schedule;
CREATE POLICY edu_schedule_member_update ON edu_schedule
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_schedule_member_delete ON edu_schedule;
CREATE POLICY edu_schedule_member_delete ON edu_schedule
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_discipline_member_insert ON edu_discipline;
CREATE POLICY edu_discipline_member_insert ON edu_discipline
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_discipline_member_update ON edu_discipline;
CREATE POLICY edu_discipline_member_update ON edu_discipline
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_discipline_member_delete ON edu_discipline;
CREATE POLICY edu_discipline_member_delete ON edu_discipline
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_incidents_member_insert ON edu_incidents;
CREATE POLICY edu_incidents_member_insert ON edu_incidents
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_incidents_member_update ON edu_incidents;
CREATE POLICY edu_incidents_member_update ON edu_incidents
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_incidents_member_delete ON edu_incidents;
CREATE POLICY edu_incidents_member_delete ON edu_incidents
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS fee_payments_member_insert ON fee_payments;
CREATE POLICY fee_payments_member_insert ON fee_payments
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS fee_payments_member_update ON fee_payments;
CREATE POLICY fee_payments_member_update ON fee_payments
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS fee_payments_member_delete ON fee_payments;
CREATE POLICY fee_payments_member_delete ON fee_payments
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- ── GESTION MODULE ───────────────────────────────────────────

DROP POLICY IF EXISTS gestion_payments_member_insert ON gestion_payments;
CREATE POLICY gestion_payments_member_insert ON gestion_payments
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS gestion_payments_member_update ON gestion_payments;
CREATE POLICY gestion_payments_member_update ON gestion_payments
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS gestion_payments_member_delete ON gestion_payments;
CREATE POLICY gestion_payments_member_delete ON gestion_payments
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- ── EMPLOYEES MODULE ─────────────────────────────────────────

DROP POLICY IF EXISTS employees_member_insert ON employees;
CREATE POLICY employees_member_insert ON employees
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS employees_member_update ON employees;
CREATE POLICY employees_member_update ON employees
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS employees_member_delete ON employees;
CREATE POLICY employees_member_delete ON employees
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS attendance_member_insert ON attendance;
CREATE POLICY attendance_member_insert ON attendance
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS attendance_member_update ON attendance;
CREATE POLICY attendance_member_update ON attendance
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS attendance_member_delete ON attendance;
CREATE POLICY attendance_member_delete ON attendance
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- ── STAFF MODULE (missing mem_ins) ──────────────────────────

DROP POLICY IF EXISTS mem_ins_staff_leave_requests ON staff_leave_requests;
CREATE POLICY mem_ins_staff_leave_requests ON staff_leave_requests
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_leave_requests_member_delete ON staff_leave_requests;
CREATE POLICY staff_leave_requests_member_delete ON staff_leave_requests
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_attendance_member_delete ON staff_attendance;
CREATE POLICY staff_attendance_member_delete ON staff_attendance
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_employees_member_delete ON staff_employees;
CREATE POLICY staff_employees_member_delete ON staff_employees
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_notifications_member_delete ON staff_notifications;
CREATE POLICY staff_notifications_member_delete ON staff_notifications
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_payment_history_member_delete ON staff_payment_history;
CREATE POLICY staff_payment_history_member_delete ON staff_payment_history
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_payroll_periods_member_delete ON staff_payroll_periods;
CREATE POLICY staff_payroll_periods_member_delete ON staff_payroll_periods
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS staff_payslips_member_delete ON staff_payslips;
CREATE POLICY staff_payslips_member_delete ON staff_payslips
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

-- ── ACCOUNTING / AUDIT / LOGS ───────────────────────────────

DROP POLICY IF EXISTS accounting_entries_member_insert ON accounting_entries;
CREATE POLICY accounting_entries_member_insert ON accounting_entries
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS accounting_entries_member_update ON accounting_entries;
CREATE POLICY accounting_entries_member_update ON accounting_entries
  FOR UPDATE TO public
  USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS accounting_entries_member_delete ON accounting_entries;
CREATE POLICY accounting_entries_member_delete ON accounting_entries
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_accounting_member_delete ON edu_accounting;
CREATE POLICY edu_accounting_member_delete ON edu_accounting
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_accounting_member_delete ON pharmacy_accounting;
CREATE POLICY pharmacy_accounting_member_delete ON pharmacy_accounting
  FOR DELETE TO public
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS activity_logs_member_insert ON activity_logs;
CREATE POLICY activity_logs_member_insert ON activity_logs
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS audit_logs_member_insert ON audit_logs;
CREATE POLICY audit_logs_member_insert ON audit_logs
  FOR INSERT TO public
  WITH CHECK (is_workspace_member(workspace_id));

-- ── SHARED REPORTS ──────────────────────────────────────────
-- Skipped: shared_reports is owned by postgres, not project_admin

-- ── HR: Fix owner_all missing WITH CHECK on tables ──────────
-- Drop and recreate owner_all with proper WITH CHECK

DO $$
DECLARE
  t text;
  hr_tables text[] := ARRAY[
    'hr_absences','hr_attendance','hr_contracts','hr_departments',
    'hr_discipline','hr_documents','hr_employees','hr_evaluations',
    'hr_health_safety','hr_leave_requests','hr_promotions',
    'hr_recruitments','hr_skills','hr_trainings','hr_communication'
  ];
BEGIN
  FOREACH t IN ARRAY hr_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %s_owner_all ON %s', t, t);
    EXECUTE format(
      'CREATE POLICY %s_owner_all ON %s FOR ALL TO public
       USING (is_workspace_owner(workspace_id))
       WITH CHECK (is_workspace_owner(workspace_id))',
      t, t
    );
  END LOOP;
END $$;
