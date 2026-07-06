-- Drop old tables from previous app
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.restaurant_orders CASCADE;
DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
DROP TABLE IF EXISTS public.hotel_bookings CASCADE;
DROP TABLE IF EXISTS public.hotel_rooms CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.store_products CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

DROP FUNCTION IF EXISTS public.get_my_tenant_id();
DROP FUNCTION IF EXISTS public.is_superadmin();

-- WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN ('pharmacy','commerce','education','gestion')),
  owner_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  country      text NOT NULL DEFAULT 'CD',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workspaces" ON workspaces;
CREATE POLICY "select_own_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_workspaces" ON workspaces;
CREATE POLICY "insert_own_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_workspaces" ON workspaces;
CREATE POLICY "update_own_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_workspaces" ON workspaces;
CREATE POLICY "delete_own_workspaces" ON workspaces FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- GLOBAL MEDICINES (preloaded catalog)
CREATE TABLE IF NOT EXISTS global_medicines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  generic_name          text,
  category              text NOT NULL,
  unit                  text NOT NULL DEFAULT 'comprimé',
  default_price_usd     numeric(10,2) DEFAULT 0.50,
  description           text,
  requires_prescription boolean DEFAULT false,
  created_at            timestamptz DEFAULT now()
);
ALTER TABLE global_medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_global_medicines" ON global_medicines;
CREATE POLICY "public_read_global_medicines" ON global_medicines FOR SELECT
  TO anon, authenticated USING (true);

-- STORE MEDICINES (per-workspace inventory)
CREATE TABLE IF NOT EXISTS store_medicines (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  global_medicine_id   uuid REFERENCES global_medicines(id) ON DELETE SET NULL,
  name                 text NOT NULL,
  category             text,
  unit                 text DEFAULT 'comprimé',
  price_usd            numeric(10,2) DEFAULT 0.00,
  stock_quantity       integer DEFAULT 0,
  min_stock_alert      integer DEFAULT 10,
  created_at           timestamptz DEFAULT now()
);
ALTER TABLE store_medicines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_store_medicines" ON store_medicines;
CREATE POLICY "select_store_medicines" ON store_medicines FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = store_medicines.workspace_id AND workspaces.owner_id = auth.uid()));
DROP POLICY IF EXISTS "insert_store_medicines" ON store_medicines;
CREATE POLICY "insert_store_medicines" ON store_medicines FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = store_medicines.workspace_id AND workspaces.owner_id = auth.uid()));
DROP POLICY IF EXISTS "update_store_medicines" ON store_medicines;
CREATE POLICY "update_store_medicines" ON store_medicines FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = store_medicines.workspace_id AND workspaces.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = store_medicines.workspace_id AND workspaces.owner_id = auth.uid()));
DROP POLICY IF EXISTS "delete_store_medicines" ON store_medicines;
CREATE POLICY "delete_store_medicines" ON store_medicines FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = store_medicines.workspace_id AND workspaces.owner_id = auth.uid()));

-- is_workspace_owner helper function
CREATE OR REPLACE FUNCTION is_workspace_owner(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM workspaces WHERE id = ws_id AND owner_id = auth.uid());
$$;

-- EDUCATION: students
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
CREATE POLICY "sel_students" ON students FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_students" ON students FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_students" ON students FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_students" ON students FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- EDUCATION: fee_payments
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
CREATE POLICY "sel_fee_payments" ON fee_payments FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_fee_payments" ON fee_payments FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_fee_payments" ON fee_payments FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_fee_payments" ON fee_payments FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- NOTE: `store_products` was removed from the schema; use `commerce_products` instead.

-- COMMERCE: commerce_products
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
CREATE POLICY "sel_commerce_products" ON commerce_products FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_commerce_products" ON commerce_products FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_commerce_products" ON commerce_products FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_commerce_products" ON commerce_products FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- COMMERCE: customers
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
CREATE POLICY "sel_customers" ON customers FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_customers" ON customers FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_customers" ON customers FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_customers" ON customers FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- COMMERCE: sales
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
CREATE POLICY "sel_sales" ON sales FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_sales" ON sales FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_sales" ON sales FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_sales" ON sales FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- COMMERCE: sale_items
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
CREATE POLICY "sel_sale_items" ON sale_items FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_sale_items" ON sale_items FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- GESTION: employees
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
CREATE POLICY "sel_employees" ON employees FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_employees" ON employees FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_employees" ON employees FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_employees" ON employees FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- GESTION: accounting_entries
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
CREATE POLICY "sel_accounting" ON accounting_entries FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_accounting" ON accounting_entries FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_accounting" ON accounting_entries FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_accounting" ON accounting_entries FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text NOT NULL,
  display_name  text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'cashier'
                CHECK (role IN ('manager','cashier','pharmacist','teacher','accountant','viewer')),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','active','suspended')),
  invite_token  text UNIQUE,
  invite_expires_at timestamptz,
  invited_at    timestamptz DEFAULT now(),
  accepted_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY "owner_select_members" ON workspace_members FOR SELECT
  TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner_insert_members" ON workspace_members FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_update_members" ON workspace_members FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_delete_members" ON workspace_members FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

-- Members: select own invite
CREATE POLICY "member_select_own_invite" ON workspace_members FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Members: accept invite only if email matches (SECURITY FIX: verify email match)
CREATE POLICY "member_accept_invite" ON workspace_members FOR UPDATE
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (user_id = auth.uid());

-- Anon: look up pending invite by token (for sign-up page)
CREATE POLICY "anon_select_pending_invite" ON workspace_members FOR SELECT
  TO anon, authenticated
  USING (
    invite_token IS NOT NULL
    AND status = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  );

-- ACTIVITY LOGS (immutable audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_email     text NOT NULL DEFAULT '',
  actor_name      text NOT NULL DEFAULT '',
  action_type     text NOT NULL,
  module          text NOT NULL CHECK (module IN ('pharmacy','commerce','education','gestion','system')),
  description     text NOT NULL,
  amount_usd      numeric(10,2),
  reference_id    uuid,
  device_info     jsonb DEFAULT '{}'::jsonb,
  performed_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Owner can read all logs for their workspace
CREATE POLICY "owner_select_logs" ON activity_logs FOR SELECT
  TO authenticated USING (owner_id = auth.uid());

-- Members can read logs for workspaces they belong to
CREATE POLICY "member_select_logs" ON activity_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = activity_logs.workspace_id AND wm.user_id = auth.uid() AND wm.status = 'active')
  );

-- Anyone active in the workspace (owner or member) can insert logs
CREATE POLICY "workspace_insert_log" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = activity_logs.workspace_id AND wm.user_id = auth.uid() AND wm.status = 'active')
    )
  );

-- SECURITY FIX: Explicitly block UPDATE and DELETE on activity_logs (immutable audit trail)
CREATE POLICY "no_update_logs" ON activity_logs FOR UPDATE
  TO authenticated USING (false);
CREATE POLICY "no_delete_logs" ON activity_logs FOR DELETE
  TO authenticated USING (false);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_store_medicines_workspace ON store_medicines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_medicines_global ON store_medicines(global_medicine_id);
CREATE INDEX IF NOT EXISTS idx_global_medicines_category ON global_medicines(category);
CREATE INDEX IF NOT EXISTS idx_students_workspace ON students(workspace_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_commerce_products_workspace ON commerce_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sales_workspace ON sales(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_employees_workspace ON employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounting_workspace ON accounting_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_entries(type);
CREATE INDEX IF NOT EXISTS idx_wm_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wm_owner ON workspace_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_wm_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wm_email ON workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_wm_status ON workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_wm_invite_token ON workspace_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_alog_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alog_owner ON activity_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_alog_actor ON activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_alog_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_alog_performed ON activity_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_alog_action ON activity_logs(action_type);

-- GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON global_medicines TO anon;
GRANT SELECT ON workspace_members TO anon;
