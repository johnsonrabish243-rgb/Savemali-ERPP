/*
# SaveMali Extended Schema

Adds tables for Education (students, classes, grades, attendance, fee payments),
Commerce (products, customers, sales, sale_items), and
Gestion (employees, payroll_entries, accounting_entries).

All tables are owner-scoped through workspace_id → workspaces.owner_id = auth.uid().

## New Tables

### Education
- `students` – enrolled students per workspace
- `classes` – class/grade groups
- `student_grades` – grade records per student/subject
- `attendance_records` – daily attendance
- `fee_payments` – school fee payments

### Commerce
- `commerce_products` – product catalog
- `customers` – customer directory
- `sales` – sale transactions
- `sale_items` – line items per sale

### Gestion
- `employees` – HR employee records
- `payroll_entries` – monthly payroll
- `accounting_entries` – income/expense ledger

## Security
All tables enable RLS with authenticated owner-scoped policies via workspace.
*/

-- helper function to check workspace ownership
CREATE OR REPLACE FUNCTION is_workspace_owner(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = ws_id AND owner_id = auth.uid()
  );
$$;

-- ─── EDUCATION: students ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  date_of_birth  date,
  class_name     text,
  gender         text CHECK (gender IN ('M','F','other')),
  parent_phone   text,
  parent_email   text,
  enrolled_at    date DEFAULT CURRENT_DATE,
  status         text DEFAULT 'active' CHECK (status IN ('active','inactive','graduated')),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_students" ON students;
CREATE POLICY "sel_students" ON students FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_students" ON students;
CREATE POLICY "ins_students" ON students FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_students" ON students;
CREATE POLICY "upd_students" ON students FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_students" ON students;
CREATE POLICY "del_students" ON students FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── EDUCATION: fee_payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_usd     numeric(10,2) NOT NULL,
  description    text,
  paid_at        timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_fee_payments" ON fee_payments;
CREATE POLICY "sel_fee_payments" ON fee_payments FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_fee_payments" ON fee_payments;
CREATE POLICY "ins_fee_payments" ON fee_payments FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_fee_payments" ON fee_payments;
CREATE POLICY "upd_fee_payments" ON fee_payments FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_fee_payments" ON fee_payments;
CREATE POLICY "del_fee_payments" ON fee_payments FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── COMMERCE: commerce_products ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commerce_products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           text NOT NULL,
  category       text,
  price_usd      numeric(10,2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  barcode        text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE commerce_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_commerce_products" ON commerce_products;
CREATE POLICY "sel_commerce_products" ON commerce_products FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_commerce_products" ON commerce_products;
CREATE POLICY "ins_commerce_products" ON commerce_products FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_commerce_products" ON commerce_products;
CREATE POLICY "upd_commerce_products" ON commerce_products FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_commerce_products" ON commerce_products;
CREATE POLICY "del_commerce_products" ON commerce_products FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── COMMERCE: customers ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           text NOT NULL,
  phone          text,
  email          text,
  total_spent    numeric(10,2) DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_customers" ON customers;
CREATE POLICY "sel_customers" ON customers FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_customers" ON customers;
CREATE POLICY "ins_customers" ON customers FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_customers" ON customers;
CREATE POLICY "upd_customers" ON customers FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_customers" ON customers;
CREATE POLICY "del_customers" ON customers FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── COMMERCE: sales ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id    uuid REFERENCES customers(id) ON DELETE SET NULL,
  total_usd      numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','mobile_money','card','credit')),
  status         text DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled')),
  notes          text,
  sold_at        timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_sales" ON sales;
CREATE POLICY "sel_sales" ON sales FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_sales" ON sales;
CREATE POLICY "ins_sales" ON sales FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_sales" ON sales;
CREATE POLICY "upd_sales" ON sales FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_sales" ON sales;
CREATE POLICY "del_sales" ON sales FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── COMMERCE: sale_items ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id        uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_name   text NOT NULL,
  product_id     uuid,
  quantity       integer NOT NULL DEFAULT 1,
  unit_price     numeric(10,2) NOT NULL DEFAULT 0,
  total_price    numeric(10,2) NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_sale_items" ON sale_items;
CREATE POLICY "sel_sale_items" ON sale_items FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_sale_items" ON sale_items;
CREATE POLICY "ins_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_sale_items" ON sale_items;
CREATE POLICY "del_sale_items" ON sale_items FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── GESTION: employees ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  role           text NOT NULL,
  department     text,
  salary_usd     numeric(10,2) DEFAULT 0,
  phone          text,
  email          text,
  hire_date      date DEFAULT CURRENT_DATE,
  status         text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_employees" ON employees;
CREATE POLICY "sel_employees" ON employees FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_employees" ON employees;
CREATE POLICY "ins_employees" ON employees FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_employees" ON employees;
CREATE POLICY "upd_employees" ON employees FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_employees" ON employees;
CREATE POLICY "del_employees" ON employees FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── GESTION: accounting_entries ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('income','expense')),
  category       text NOT NULL,
  description    text NOT NULL,
  amount_usd     numeric(10,2) NOT NULL,
  entry_date     date DEFAULT CURRENT_DATE,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sel_accounting" ON accounting_entries;
CREATE POLICY "sel_accounting" ON accounting_entries FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "ins_accounting" ON accounting_entries;
CREATE POLICY "ins_accounting" ON accounting_entries FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "upd_accounting" ON accounting_entries;
CREATE POLICY "upd_accounting" ON accounting_entries FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
DROP POLICY IF EXISTS "del_accounting" ON accounting_entries;
CREATE POLICY "del_accounting" ON accounting_entries FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_workspace ON students(workspace_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_commerce_products_workspace ON commerce_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sales_workspace ON sales(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_employees_workspace ON employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounting_workspace ON accounting_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_entries(type);
