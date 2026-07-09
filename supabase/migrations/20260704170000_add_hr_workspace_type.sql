-- Add 'hr' to the workspaces.type CHECK constraint
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_type_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_type_check
  CHECK (type IN ('pharmacy','commerce','education','gestion','hr'));
