-- ============================================================================
-- New accounts no longer become super_admin because of their email address.
--
-- handle_new_user() (20260614120500_profile_autocreate) made any new auth user
-- with the email alomhabib309@gmail.com a super_admin. Real super admins exist
-- now, and claim_admin() plus Settings → Team invites cover bootstrapping, so
-- every new account starts as a volunteer until a super admin promotes it.
-- The on_auth_user_created trigger stays: it creates the profile row that
-- invited users need.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'volunteer')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
