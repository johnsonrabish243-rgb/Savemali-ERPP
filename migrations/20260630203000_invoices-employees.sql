-- Commerce: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id    uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  total_usd      numeric(10,2) DEFAULT 0,
  status         text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','cancelled')),
  due_date       date,
  notes          text,
  issued_at      timestamptz DEFAULT now(),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_invoices" ON invoices FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_invoices" ON invoices FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_invoices" ON invoices FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS invoice_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_name   text NOT NULL,
  quantity       integer NOT NULL DEFAULT 1,
  unit_price     numeric(10,2) NOT NULL DEFAULT 0,
  total_price    numeric(10,2) NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_invoice_items" ON invoice_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = invoice_items.invoice_id AND is_workspace_owner(inv.workspace_id)));
CREATE POLICY "ins_invoice_items" ON invoice_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = invoice_items.invoice_id AND is_workspace_owner(inv.workspace_id)));
CREATE POLICY "del_invoice_items" ON invoice_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = invoice_items.invoice_id AND is_workspace_owner(inv.workspace_id)));

-- Employees: salary percentage and repartition
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'fixed' CHECK (salary_type IN ('fixed','percentage'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_percentage numeric(5,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS repartition_key text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_ws ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);

-- Grants
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
