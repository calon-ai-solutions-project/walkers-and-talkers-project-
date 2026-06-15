-- Self-service admin bootstrap + portal password management helpers.
--
-- claim_admin(): lets the FIRST signed-in user promote themselves to
-- super_admin, but only while no super_admin exists yet. After that it refuses.
-- This removes the need to touch Supabase to get the first admin.
create or replace function claim_admin()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_admins int; v_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'not_logged_in');
  end if;
  select count(*) into v_admins from profiles where role = 'super_admin';
  if v_admins > 0 then
    return jsonb_build_object('status', 'admin_exists');
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into profiles (id, email, role)
    values (auth.uid(), coalesce(v_email, ''), 'super_admin')
  on conflict (id) do update set role = 'super_admin';
  return jsonb_build_object('status', 'ok');
end; $$;

revoke all on function claim_admin() from public;
grant execute on function claim_admin() to authenticated;
