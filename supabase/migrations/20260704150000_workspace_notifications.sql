-- Create workspace_notifications table
CREATE TABLE IF NOT EXISTS public.workspace_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  module TEXT NOT NULL,
  created_by UUID,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  actor_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON public.workspace_notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.workspace_notifications(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.workspace_notifications(workspace_id, created_at DESC);

-- RLS Policies
CREATE POLICY workspace_notifications_select ON public.workspace_notifications
  FOR SELECT USING (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_notifications.workspace_id
      AND workspaces.owner_id = auth.uid()
    )
  );

CREATE POLICY workspace_notifications_select_member ON public.workspace_notifications
  FOR SELECT USING (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_notifications.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
    )
  );

CREATE POLICY workspace_notifications_insert ON public.workspace_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_notifications.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
    )
  );

CREATE POLICY workspace_notifications_update ON public.workspace_notifications
  FOR UPDATE USING (
    (user_id IS NULL OR user_id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE workspaces.id = workspace_notifications.workspace_id
        AND workspaces.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_members.workspace_id = workspace_notifications.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.status = 'active'
      )
    )
  );
