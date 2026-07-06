-- Drop the old restrictive CHECK constraint
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;

-- Add new CHECK constraint with ALL roles used in the application
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
  CHECK (role = ANY (
    ARRAY[
      'admin'::text,
      'manager'::text,
      'cashier'::text,
      'pharmacist'::text,
      'teacher'::text,
      'accountant'::text,
      'viewer'::text,
      'supervisor'::text,
      'stock_manager'::text,
      'seller'::text,
      'hr'::text,
      'payroll'::text
    ]
  ));
