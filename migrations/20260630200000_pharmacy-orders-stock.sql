-- Pharmacy: supplier orders
CREATE TABLE IF NOT EXISTS supplier_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  supplier_name  text NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ordered','received','cancelled')),
  total_cost     numeric(10,2) DEFAULT 0,
  notes          text,
  ordered_at     timestamptz,
  received_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sel_supplier_orders" ON supplier_orders FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_supplier_orders" ON supplier_orders FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_supplier_orders" ON supplier_orders FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_supplier_orders" ON supplier_orders FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

CREATE TABLE IF NOT EXISTS order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  medicine_id    uuid REFERENCES store_medicines(id) ON DELETE SET NULL,
  medicine_name  text NOT NULL,
  quantity       integer NOT NULL DEFAULT 1,
  unit_cost      numeric(10,2) NOT NULL DEFAULT 0,
  total_cost     numeric(10,2) NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sel_order_items" ON order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM supplier_orders so WHERE so.id = order_items.order_id AND is_workspace_owner(so.workspace_id)));
CREATE POLICY "ins_order_items" ON order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM supplier_orders so WHERE so.id = order_items.order_id AND is_workspace_owner(so.workspace_id)));
CREATE POLICY "del_order_items" ON order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM supplier_orders so WHERE so.id = order_items.order_id AND is_workspace_owner(so.workspace_id)));

-- Pharmacy: stock movements (audit trail for stock changes)
CREATE TABLE IF NOT EXISTS stock_movements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  medicine_id    uuid REFERENCES store_medicines(id) ON DELETE SET NULL,
  medicine_name  text NOT NULL,
  type           text NOT NULL CHECK (type IN ('in','out','adjustment')),
  quantity       integer NOT NULL,
  reason         text,
  reference_id   uuid,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sel_stock_movements" ON stock_movements FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_orders_ws ON supplier_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ws ON stock_movements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_med ON stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);

-- Grants
GRANT ALL ON supplier_orders TO authenticated;
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;
