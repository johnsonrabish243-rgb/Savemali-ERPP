-- ============================================================
-- Platform Super Administrator (Root Admin)
-- 20260714000000
-- ============================================================

-- 1. Platform admins table
create table if not exists platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Platform settings table (key-value with JSONB values)
create table if not exists platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- 3. Platform audit log (extends existing audit_logs, workspace_id IS NULL for platform events)
--    The existing audit_logs table already supports workspace_id IS NULL,
--    so we reuse it for platform-level events.

-- 4. Platform notifications table
create table if not exists platform_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info','warning','error','critical')),
  data jsonb default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SECURITY DEFINER functions (bypass RLS for first-user check)
-- ============================================================

-- Check if any platform admin already exists
create or replace function has_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from platform_admins limit 1);
$$;

-- Atomically assign the first platform admin (no-op if already exists)
create or replace function try_assign_platform_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from platform_admins limit 1) then
    return false;
  end if;
  insert into platform_admins (user_id) values (p_user_id);
  return true;
end;
$$;

-- Helper: check if a user is a platform admin
create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

-- Count all users (for dashboard stats)
create or replace function platform_total_users()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint from auth.users;
$$;

-- Count all workspaces (for dashboard stats)
create or replace function platform_total_workspaces()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint from workspaces;
$$;

-- Count active workspaces (those with at least one active member)
create or replace function platform_active_workspaces()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(distinct workspace_id)::bigint
  from workspace_members
  where status = 'active';
$$;

-- ============================================================
-- RLS policies
-- ============================================================

-- platform_admins: only platform admin can read; insert via SECURITY DEFINER only
alter table platform_admins enable row level security;

drop policy if exists "platform_admin_select" on platform_admins;
create policy "platform_admin_select" on platform_admins
  for select
  using (is_platform_admin());

-- platform_settings: only platform admin can CRUD
alter table platform_settings enable row level security;

drop policy if exists "platform_settings_admin_all" on platform_settings;
create policy "platform_settings_admin_all" on platform_settings
  for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- platform_notifications: platform admin can read/update; insert via SECURITY DEFINER
alter table platform_notifications enable row level security;

drop policy if exists "platform_notifications_admin_read" on platform_notifications;
create policy "platform_notifications_admin_read" on platform_notifications
  for select
  using (is_platform_admin());

drop policy if exists "platform_notifications_admin_update" on platform_notifications;
create policy "platform_notifications_admin_update" on platform_notifications
  for update
  using (is_platform_admin())
  with check (is_platform_admin());

-- Grant usage to authenticated users for the SECURITY DEFINER functions
grant execute on function has_platform_admin() to authenticated, anon;
grant execute on function try_assign_platform_admin(uuid) to authenticated;
grant execute on function is_platform_admin() to authenticated, anon;
grant execute on function platform_total_users() to authenticated;
grant execute on function platform_total_workspaces() to authenticated;
grant execute on function platform_active_workspaces() to authenticated;

-- ============================================================
-- Default platform settings
-- ============================================================
insert into platform_settings (key, value) values
  ('platform_name', '"SaveMali"'),
  ('support_email', '"support@savemali.online"'),
  ('dpo_email', '"dpo@savemali.online"'),
  ('maintenance_mode', 'false'),
  ('password_min_length', '8'),
  ('session_timeout_minutes', '60'),
  ('language_default', '"fr"'),
  ('timezone_default', '"Africa/Lubumbashi"')
on conflict (key) do nothing;
