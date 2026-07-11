-- ============================================================
-- Fix Platform Admin RLS: add SECURITY DEFINER functions for
-- cross-workspace queries and audit_logs policies
-- 20260715000000
-- ============================================================

-- ── Helper: safe count (returns 0 if table doesn't exist) ────

create or replace function platform_safe_count(tbl text)
returns bigint
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  cnt bigint;
begin
  execute format('select count(*)::bigint from %I', tbl) into cnt;
  return cnt;
exception when undefined_table then
  return 0;
end;
$$;

-- ── Platform dashboard stats (single RPC returning JSON) ─────

create or replace function platform_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result json;
begin
  select json_build_object(
    'totalUsers', coalesce((select count(distinct user_id)::bigint from workspace_members where user_id is not null), 0),
    'totalWorkspaces', coalesce((select count(*)::bigint from workspaces), 0),
    'activeWorkspaces', coalesce((select count(distinct workspace_id)::bigint from workspace_members where status = 'active'), 0),
    'inactiveWorkspaces', greatest(0,
      coalesce((select count(*)::bigint from workspaces), 0) -
      coalesce((select count(distinct workspace_id)::bigint from workspace_members where status = 'active'), 0)
    ),
    'totalMembers', coalesce((select count(*)::bigint from workspace_members), 0),
    'totalEmployees', platform_safe_count('employees'),
    'totalAdmins', coalesce((select count(*)::bigint from workspace_members where role = 'admin'), 0),
    'totalManagers', coalesce((select count(*)::bigint from workspace_members where role = 'manager'), 0),
    'totalCashiers', coalesce((select count(*)::bigint from workspace_members where role = 'cashier'), 0),
    'totalAccountants', coalesce((select count(*)::bigint from workspace_members where role = 'accountant'), 0),
    'totalSupportTickets', platform_safe_count('support_tickets'),
    'totalAppointments', platform_safe_count('appointments'),
    'totalNotifications', platform_safe_count('workspace_notifications'),
    'totalReports', platform_safe_count('shared_reports')
  ) into result;
  return result;
end;
$$;

-- ── List all users across workspaces ─────────────────────────

create or replace function platform_list_users()
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  status text,
  workspace_id uuid,
  workspace_name text,
  workspace_type text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    wm.id, wm.user_id, wm.email, wm.display_name,
    wm.role, wm.status, wm.workspace_id,
    w.name::text as workspace_name, w.type::text as workspace_type,
    wm.created_at
  from workspace_members wm
  join workspaces w on w.id = wm.workspace_id
  order by wm.created_at desc;
$$;

-- ── List all workspaces with member count ────────────────────

create or replace function platform_list_workspaces()
returns table (
  id uuid,
  name text,
  type text,
  owner_id uuid,
  created_at timestamptz,
  member_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.id, w.name::text, w.type::text, w.owner_id, w.created_at,
    count(wm.id)::bigint as member_count
  from workspaces w
  left join workspace_members wm on wm.workspace_id = w.id
  group by w.id
  order by w.created_at desc;
$$;

-- ── Update single member status (suspend/reactivate) ─────────

create or replace function platform_update_member_status(p_member_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  update workspace_members set status = p_status where id = p_member_id;
end;
$$;

-- ── Update all members of a workspace (suspend/reactivate) ───

create or replace function platform_update_workspace_members_status(p_workspace_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  update workspace_members set status = p_status where workspace_id = p_workspace_id;
end;
$$;

-- ── Platform audit log listing (across all workspaces) ───────

create or replace function platform_get_audit_logs(p_limit int default 50, p_offset int default 0)
returns table (
  id uuid,
  action text,
  actor_id uuid,
  actor_email text,
  target_id uuid,
  target_type text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  workspace_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, action::text, actor_id, actor_email::text,
         target_id, target_type::text, metadata,
         ip_address::text, user_agent::text,
         workspace_id, created_at
  from audit_logs
  order by created_at desc
  limit p_limit
  offset p_offset;
$$;

-- ============================================================
-- audit_logs RLS: platform admin policies
-- ============================================================

-- Platform admin can SELECT all audit logs
drop policy if exists audit_logs_platform_admin_select on audit_logs;
create policy audit_logs_platform_admin_select on audit_logs
  for select to authenticated
  using (is_platform_admin());

-- Platform admin can INSERT audit logs with any workspace_id (including NULL)
drop policy if exists audit_logs_platform_admin_insert on audit_logs;
create policy audit_logs_platform_admin_insert on audit_logs
  for insert to authenticated
  with check (is_platform_admin() and actor_id = auth.uid());

-- ============================================================
-- Grants
-- ============================================================

grant execute on function platform_safe_count(text) to authenticated;
grant execute on function platform_dashboard_stats() to authenticated;
grant execute on function platform_list_users() to authenticated;
grant execute on function platform_list_workspaces() to authenticated;
grant execute on function platform_update_member_status(uuid, text) to authenticated;
grant execute on function platform_update_workspace_members_status(uuid, text) to authenticated;
grant execute on function platform_get_audit_logs(int, int) to authenticated;
