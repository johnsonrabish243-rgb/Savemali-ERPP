ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS whatsapp_notifications boolean DEFAULT true;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS product_updates boolean DEFAULT true;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS security_alerts boolean DEFAULT true;
