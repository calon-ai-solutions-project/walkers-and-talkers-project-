-- ============================================================================
-- Auto-create a profile row whenever an auth user is added, so admins don't
-- need a manual profile insert. Known org emails are seeded as super_admin;
-- everyone else defaults to volunteer (promote later as needed).
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when lower(new.email) in ('alomhabib309@gmail.com')
         then 'super_admin' else 'volunteer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
