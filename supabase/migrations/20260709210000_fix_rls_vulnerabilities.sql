-- Fix RLS vulnerabilities across all tables
-- Problem: owner_all policies have with_check: null (INSERT bypasses validation)
-- Problem: no member write policies exist (members can only SELECT, not INSERT/UPDATE/DELETE)
-- Fix: add with_check to owner_all, add member_write policies for workspace members

-- Helper function: check if user is workspace member (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = ws_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = ws_id AND workspaces.owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if user can write to workspace (owner OR member)
CREATE OR REPLACE FUNCTION public.can_write_workspace(ws_id uuid)
RETURNS boolean AS $$
  SELECT public.is_workspace_owner(ws_id) OR public.is_workspace_member(ws_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HR TABLES: Fix owner_all + add member_write
-- ============================================================

-- HR Employees
DROP POLICY IF EXISTS hr_employees_owner_all ON hr_employees;
CREATE POLICY hr_employees_owner_all ON hr_employees
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_employees_member_select ON hr_employees;
CREATE POLICY hr_employees_member_select ON hr_employees
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_employees_member_write ON hr_employees;
CREATE POLICY hr_employees_member_write ON hr_employees
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Departments
DROP POLICY IF EXISTS hr_departments_owner_all ON hr_departments;
CREATE POLICY hr_departments_owner_all ON hr_departments
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_departments_member_select ON hr_departments;
CREATE POLICY hr_departments_member_select ON hr_departments
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_departments_member_write ON hr_departments;
CREATE POLICY hr_departments_member_write ON hr_departments
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Contracts
DROP POLICY IF EXISTS hr_contracts_owner_all ON hr_contracts;
CREATE POLICY hr_contracts_owner_all ON hr_contracts
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_contracts_member_select ON hr_contracts;
CREATE POLICY hr_contracts_member_select ON hr_contracts
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_contracts_member_write ON hr_contracts;
CREATE POLICY hr_contracts_member_write ON hr_contracts
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Leave Requests
DROP POLICY IF EXISTS hr_leave_requests_owner_all ON hr_leave_requests;
CREATE POLICY hr_leave_requests_owner_all ON hr_leave_requests
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_leave_requests_member_select ON hr_leave_requests;
CREATE POLICY hr_leave_requests_member_select ON hr_leave_requests
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_leave_requests_member_write ON hr_leave_requests;
CREATE POLICY hr_leave_requests_member_write ON hr_leave_requests
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Recruitments
DROP POLICY IF EXISTS hr_recruitments_owner_all ON hr_recruitments;
CREATE POLICY hr_recruitments_owner_all ON hr_recruitments
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_recruitments_member_select ON hr_recruitments;
CREATE POLICY hr_recruitments_member_select ON hr_recruitments
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_recruitments_member_write ON hr_recruitments;
CREATE POLICY hr_recruitments_member_write ON hr_recruitments
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Evaluations
DROP POLICY IF EXISTS hr_evaluations_owner_all ON hr_evaluations;
CREATE POLICY hr_evaluations_owner_all ON hr_evaluations
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_evaluations_member_select ON hr_evaluations;
CREATE POLICY hr_evaluations_member_select ON hr_evaluations
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_evaluations_member_write ON hr_evaluations;
CREATE POLICY hr_evaluations_member_write ON hr_evaluations
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Trainings
DROP POLICY IF EXISTS hr_trainings_owner_all ON hr_trainings;
CREATE POLICY hr_trainings_owner_all ON hr_trainings
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_trainings_member_select ON hr_trainings;
CREATE POLICY hr_trainings_member_select ON hr_trainings
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_trainings_member_write ON hr_trainings;
CREATE POLICY hr_trainings_member_write ON hr_trainings
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Attendance
DROP POLICY IF EXISTS hr_attendance_owner_all ON hr_attendance;
CREATE POLICY hr_attendance_owner_all ON hr_attendance
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_attendance_member_select ON hr_attendance;
CREATE POLICY hr_attendance_member_select ON hr_attendance
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_attendance_member_write ON hr_attendance;
CREATE POLICY hr_attendance_member_write ON hr_attendance
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Absences
DROP POLICY IF EXISTS hr_absences_owner_all ON hr_absences;
CREATE POLICY hr_absences_owner_all ON hr_absences
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_absences_member_select ON hr_absences;
CREATE POLICY hr_absences_member_select ON hr_absences
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_absences_member_write ON hr_absences;
CREATE POLICY hr_absences_member_write ON hr_absences
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Skills
DROP POLICY IF EXISTS hr_skills_owner_all ON hr_skills;
CREATE POLICY hr_skills_owner_all ON hr_skills
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_skills_member_select ON hr_skills;
CREATE POLICY hr_skills_member_select ON hr_skills
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_skills_member_write ON hr_skills;
CREATE POLICY hr_skills_member_write ON hr_skills
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Promotions
DROP POLICY IF EXISTS hr_promotions_owner_all ON hr_promotions;
CREATE POLICY hr_promotions_owner_all ON hr_promotions
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_promotions_member_select ON hr_promotions;
CREATE POLICY hr_promotions_member_select ON hr_promotions
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_promotions_member_write ON hr_promotions;
CREATE POLICY hr_promotions_member_write ON hr_promotions
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Discipline
DROP POLICY IF EXISTS hr_discipline_owner_all ON hr_discipline;
CREATE POLICY hr_discipline_owner_all ON hr_discipline
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_discipline_member_select ON hr_discipline;
CREATE POLICY hr_discipline_member_select ON hr_discipline
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_discipline_member_write ON hr_discipline;
CREATE POLICY hr_discipline_member_write ON hr_discipline
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Health & Safety
DROP POLICY IF EXISTS hr_health_safety_owner_all ON hr_health_safety;
CREATE POLICY hr_health_safety_owner_all ON hr_health_safety
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_health_safety_member_select ON hr_health_safety;
CREATE POLICY hr_health_safety_member_select ON hr_health_safety
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_health_safety_member_write ON hr_health_safety;
CREATE POLICY hr_health_safety_member_write ON hr_health_safety
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Documents
DROP POLICY IF EXISTS hr_documents_owner_all ON hr_documents;
CREATE POLICY hr_documents_owner_all ON hr_documents
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_documents_member_select ON hr_documents;
CREATE POLICY hr_documents_member_select ON hr_documents
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_documents_member_write ON hr_documents;
CREATE POLICY hr_documents_member_write ON hr_documents
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- HR Communication
DROP POLICY IF EXISTS hr_communication_owner_all ON hr_communication;
CREATE POLICY hr_communication_owner_all ON hr_communication
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS hr_communication_member_select ON hr_communication;
CREATE POLICY hr_communication_member_select ON hr_communication
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS hr_communication_member_write ON hr_communication;
CREATE POLICY hr_communication_member_write ON hr_communication
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ============================================================
-- ACCOUNTING TABLES: Fix RLS
-- ============================================================

-- Edu Accounting
DROP POLICY IF EXISTS edu_accounting_owner_all ON edu_accounting;
CREATE POLICY edu_accounting_owner_all ON edu_accounting
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS edu_accounting_member_select ON edu_accounting;
CREATE POLICY edu_accounting_member_select ON edu_accounting
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS edu_accounting_member_write ON edu_accounting;
CREATE POLICY edu_accounting_member_write ON edu_accounting
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Pharmacy Accounting
DROP POLICY IF EXISTS pharmacy_accounting_owner_all ON pharmacy_accounting;
CREATE POLICY pharmacy_accounting_owner_all ON pharmacy_accounting
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS pharmacy_accounting_member_select ON pharmacy_accounting;
CREATE POLICY pharmacy_accounting_member_select ON pharmacy_accounting
  FOR SELECT USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS pharmacy_accounting_member_write ON pharmacy_accounting;
CREATE POLICY pharmacy_accounting_member_write ON pharmacy_accounting
  FOR ALL USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ============================================================
-- AUDIT LOGS: allow all authenticated users to read, owner to write
-- ============================================================
DROP POLICY IF EXISTS audit_logs_owner_all ON audit_logs;
CREATE POLICY audit_logs_owner_all ON audit_logs
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS audit_logs_member_select ON audit_logs;
CREATE POLICY audit_logs_member_select ON audit_logs
  FOR SELECT USING (public.is_workspace_member(workspace_id));

-- ============================================================
-- PHARMACY TABLES: add member write where missing
-- ============================================================

-- Store Medicines
DROP POLICY IF EXISTS insert_store_medicines ON store_medicines;
CREATE POLICY insert_store_medicines ON store_medicines
  FOR INSERT WITH CHECK (public.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS update_store_medicines ON store_medicines;
CREATE POLICY update_store_medicines ON store_medicines
  FOR UPDATE USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS delete_store_medicines ON store_medicines;
CREATE POLICY delete_store_medicines ON store_medicines
  FOR DELETE USING (public.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS select_store_medicines ON store_medicines;
CREATE POLICY select_store_medicines ON store_medicines
  FOR SELECT USING (public.can_write_workspace(workspace_id));

-- Pharmacy Prescriptions
DROP POLICY IF EXISTS pharmacy_prescriptions_policy ON pharmacy_prescriptions;
CREATE POLICY pharmacy_prescriptions_policy ON pharmacy_prescriptions
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Pharmacy Expenses
DROP POLICY IF EXISTS pharmacy_expenses_policy ON pharmacy_expenses;
CREATE POLICY pharmacy_expenses_policy ON pharmacy_expenses
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Sales
DROP POLICY IF EXISTS sel_sales ON sales;
CREATE POLICY sel_sales ON sales
  FOR SELECT USING (public.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS ins_sales ON sales;
CREATE POLICY ins_sales ON sales
  FOR INSERT WITH CHECK (public.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS upd_sales ON sales;
CREATE POLICY upd_sales ON sales
  FOR UPDATE USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

DROP POLICY IF EXISTS del_sales ON sales;
CREATE POLICY del_sales ON sales
  FOR DELETE USING (public.can_write_workspace(workspace_id));

-- ============================================================
-- EDUCATION TABLES: add member write where missing
-- ============================================================

-- Students
DROP POLICY IF EXISTS students_policy ON students;
CREATE POLICY students_policy ON students
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Teachers
DROP POLICY IF EXISTS teachers_policy ON teachers;
CREATE POLICY teachers_policy ON teachers
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Classes
DROP POLICY IF EXISTS classes_policy ON classes;
CREATE POLICY classes_policy ON classes
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Fee Payments
DROP POLICY IF EXISTS fee_payments_policy ON fee_payments;
CREATE POLICY fee_payments_policy ON fee_payments
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- ============================================================
-- COMMERCE TABLES: add member write where missing
-- ============================================================

-- Commerce Products
DROP POLICY IF EXISTS commerce_products_policy ON commerce_products;
CREATE POLICY commerce_products_policy ON commerce_products
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Invoices
DROP POLICY IF EXISTS invoices_policy ON invoices;
CREATE POLICY invoices_policy ON invoices
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Invoice Items (no workspace_id, references invoices)
DROP POLICY IF EXISTS invoice_items_policy ON invoice_items;
CREATE POLICY invoice_items_policy ON invoice_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND public.can_write_workspace(invoices.workspace_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND public.can_write_workspace(invoices.workspace_id))
  );

-- Customers
DROP POLICY IF EXISTS customers_policy ON customers;
CREATE POLICY customers_policy ON customers
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- ============================================================
-- GESTION TABLES: add member write where missing
-- ============================================================

-- Gestion Payments
DROP POLICY IF EXISTS gestion_payments_policy ON gestion_payments;
CREATE POLICY gestion_payments_policy ON gestion_payments
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Supplier Orders
DROP POLICY IF EXISTS supplier_orders_policy ON supplier_orders;
CREATE POLICY supplier_orders_policy ON supplier_orders
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Order Items (no workspace_id, references supplier_orders)
DROP POLICY IF EXISTS order_items_policy ON order_items;
CREATE POLICY order_items_policy ON order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM supplier_orders WHERE supplier_orders.id = order_items.order_id AND public.can_write_workspace(supplier_orders.workspace_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM supplier_orders WHERE supplier_orders.id = order_items.order_id AND public.can_write_workspace(supplier_orders.workspace_id))
  );

-- Stock Movements
DROP POLICY IF EXISTS stock_movements_policy ON stock_movements;
CREATE POLICY stock_movements_policy ON stock_movements
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- ============================================================
-- WORKSPACE MEMBERS: allow owner to manage, members to read
-- ============================================================
DROP POLICY IF EXISTS workspace_members_owner_all ON workspace_members;
CREATE POLICY workspace_members_owner_all ON workspace_members
  FOR ALL USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

DROP POLICY IF EXISTS workspace_members_member_select ON workspace_members;
CREATE POLICY workspace_members_member_select ON workspace_members
  FOR SELECT USING (public.is_workspace_member(workspace_id));

-- ============================================================
-- ACTIVITY LOGS: allow all workspace users
-- ============================================================
DROP POLICY IF EXISTS activity_logs_policy ON activity_logs;
CREATE POLICY activity_logs_policy ON activity_logs
  FOR ALL USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));
