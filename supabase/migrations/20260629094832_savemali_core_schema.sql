/*
# SaveMali Core Schema

## Overview
Creates the full data model for SaveMali ERP — a multi-tenant business management
platform for workspace owners (pharmacies, shops, schools) based in DR Congo.

## New Tables

### 1. `workspaces`
Each business/organization that signs up gets a workspace.
- `id` (uuid, PK)
- `name` (text) — business display name
- `type` (text) — 'pharmacy' | 'commerce' | 'education' | 'gestion'
- `owner_id` (uuid) — references auth.users, defaults to auth.uid()
- `country` (text) — default 'CD' (Congo DR)
- `created_at`

### 2. `global_medicines`
Preloaded master catalog of medicines — readable by everyone, managed by admins.
- `id` (uuid, PK)
- `name` (text) — medicine name
- `generic_name` (text) — INN / generic name
- `category` (text) — e.g. 'Antibiotique', 'Analgésique', 'Antipaludéen'
- `unit` (text) — e.g. 'comprimé', 'flacon', 'ampoule'
- `default_price_usd` (numeric) — suggested price in USD
- `description` (text)
- `requires_prescription` (boolean)
- `created_at`

### 3. `store_medicines`
A workspace owner's personal medicine inventory — selected from global_medicines or custom.
- `id` (uuid, PK)
- `workspace_id` (uuid, FK → workspaces)
- `global_medicine_id` (uuid, FK → global_medicines, nullable for custom items)
- `name` (text) — can override global name
- `category` (text)
- `unit` (text)
- `price_usd` (numeric) — owner's selling price
- `stock_quantity` (integer)
- `min_stock_alert` (integer) — alert threshold
- `created_at`

### 4. `store_products`
General product catalog for commerce workspaces.
- `id` (uuid, PK)
- `workspace_id` (uuid, FK → workspaces)
- `name` (text)
- `category` (text)
- `price_usd` (numeric)
- `stock_quantity` (integer)
- `created_at`

## Security
- RLS enabled on all tables
- `global_medicines` is publicly readable (anon + authenticated)
- All other tables are owner-scoped via workspace ownership
*/

-- ─── WORKSPACES ──────────────────────────────────────────────────────────────
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

-- ─── GLOBAL MEDICINES (preloaded catalog) ────────────────────────────────────
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

-- ─── STORE MEDICINES (per-workspace inventory) ───────────────────────────────
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
  USING (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_medicines.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_store_medicines" ON store_medicines;
CREATE POLICY "insert_store_medicines" ON store_medicines FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_medicines.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "update_store_medicines" ON store_medicines;
CREATE POLICY "update_store_medicines" ON store_medicines FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_medicines.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_medicines.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_store_medicines" ON store_medicines;
CREATE POLICY "delete_store_medicines" ON store_medicines FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_medicines.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- ─── STORE PRODUCTS (commerce workspaces) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_products (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           text NOT NULL,
  category       text,
  price_usd      numeric(10,2) DEFAULT 0.00,
  stock_quantity integer DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_store_products" ON store_products;
CREATE POLICY "select_store_products" ON store_products FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_products.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_store_products" ON store_products;
CREATE POLICY "insert_store_products" ON store_products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_products.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "update_store_products" ON store_products;
CREATE POLICY "update_store_products" ON store_products FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_products.workspace_id
    AND workspaces.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_products.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "delete_store_products" ON store_products;
CREATE POLICY "delete_store_products" ON store_products FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspaces
    WHERE workspaces.id = store_products.workspace_id
    AND workspaces.owner_id = auth.uid()
  ));

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_store_medicines_workspace ON store_medicines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_store_medicines_global ON store_medicines(global_medicine_id);
CREATE INDEX IF NOT EXISTS idx_store_products_workspace ON store_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_global_medicines_category ON global_medicines(category);
