-- Allow super_admins to update any profile (needed for the Settings → Team
-- role management screen). Regular users can still only update their own
-- profile and cannot change their own role (existing profiles_update_own).
create policy "profiles_update_super" on profiles
  for update using (auth_role() = 'super_admin')
  with check (auth_role() = 'super_admin');
