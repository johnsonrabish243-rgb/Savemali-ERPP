-- OHADA Compliance Enhancements
-- Adds optional fields to existing tables for OHADA conformity

-- Add OHADA fields to accounting_entries (optional, backward-compatible)
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS account_code text;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS journal_code text;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS period text;

-- Add indexes for OHADA queries
CREATE INDEX IF NOT EXISTS idx_accounting_period ON accounting_entries(period);
CREATE INDEX IF NOT EXISTS idx_accounting_journal ON accounting_entries(journal_code);
CREATE INDEX IF NOT EXISTS idx_accounting_account ON accounting_entries(account_code);

-- Add CNSS/IPR fields to employees (optional, backward-compatible)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cnss_rate numeric(5,2) DEFAULT 5;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ipr_rate numeric(5,2) DEFAULT 0;

-- Add reference_number to stock_movements for traceability
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reference_number text;
