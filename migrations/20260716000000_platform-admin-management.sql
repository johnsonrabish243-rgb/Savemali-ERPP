-- ============================================================
-- Platform Admin Management: add/remove/list platform admins
-- 20260716000000
-- ============================================================

-- ── Add a platform admin (caller must already be a platform admin) ───

create or replace function add_platform_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if exists (select 1 from platform_admins where user_id = p_user_id) then
    return false;
  end if;
  insert into platform_admins (user_id) values (p_user_id);
  return true;
end;
$$;

-- ── Remove a platform admin (caller must already be a platform admin) ─

create or replace function remove_platform_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from platform_admins where user_id = p_user_id) then
    return false;
  end if;
  -- Prevent removing yourself
  if p_user_id = auth.uid() then
    raise exception 'Cannot remove yourself';
  end if;
  delete from platform_admins where user_id = p_user_id;
  return true;
end;
$$;

-- ── List all platform admins ─────────────────────────────────────────

create or replace function list_platform_admins()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pa.user_id,
    au.email::text,
    pa.created_at
  from platform_admins pa
  left join auth.users au on au.id = pa.user_id
  order by pa.created_at asc;
$$;

-- ── Grants ───────────────────────────────────────────────────────────

grant execute on function add_platform_admin(uuid) to authenticated;
grant execute on function remove_platform_admin(uuid) to authenticated;
grant execute on function list_platform_admins() to authenticated;
