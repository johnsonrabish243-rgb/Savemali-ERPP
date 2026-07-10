-- Fix hr_employees schema to match frontend expectations
-- Frontend sends first_name + last_name (not a single `name` column)
-- Frontend sends department_id (uuid FK)

ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES hr_departments(id) ON DELETE SET NULL;
ALTER TABLE hr_employees ALTER COLUMN name DROP NOT NULL;
