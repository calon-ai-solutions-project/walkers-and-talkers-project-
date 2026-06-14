-- ============================================================================
-- Volunteer health_notes fix (the "Option B", DB-enforced fix)
--
-- Problem proven by the adversarial RLS test (tests/rls_results.md, Test 2):
-- the members_select_region policy lets volunteers read EVERY column of their
-- region's members, including health_notes. RLS is row-level only, and because
-- Supabase runs all logged-in users on the single `authenticated` Postgres
-- role, column GRANTs cannot tell a volunteer apart from a regional_admin.
--
-- Fix: volunteers get NO direct access to the members table. They read the
-- members_safe view instead, which is redefined here as a SECURITY DEFINER
-- view (security_invoker = false) that does its own region/role filtering and
-- never exposes health_notes. regional_admin and super_admin keep direct
-- access to members (and therefore health_notes) through their existing
-- policies.
-- ============================================================================

-- 1. Remove the volunteer's (and regional_admin's) direct SELECT on members.
drop policy if exists "members_select_region" on members;

-- 2. Re-grant direct member SELECT to regional_admin only (own region).
--    regional_admin legitimately needs health_notes for welfare follow-up.
--    (super_admin already has members_select_super; regional_admin also has
--    members_modify_admin/for-all, but an explicit SELECT policy is clearer.)
create policy "members_select_regional_admin" on members
  for select using (
    auth_role() = 'regional_admin'
    and region_id = auth_region()
  );

-- 3. Redefine members_safe as a security-definer view that enforces region
--    scoping itself and excludes health_notes. Because it runs with the view
--    owner's privileges it bypasses the members RLS, so the WHERE clause IS the
--    access control. security_barrier prevents the planner from leaking rows
--    through pushed-down predicates.
drop view if exists members_safe;
create view members_safe
  with (security_invoker = false, security_barrier = true) as
  select
    id, member_no, first_name, last_name, email, phone,
    address_line1, address_line2, city, postcode,
    region_id, member_since_year, joined_at,
    needs_full_data, active, created_at, updated_at
  from members
  where
    auth_role() = 'super_admin'
    or region_id = auth_region();   -- regional_admin + volunteer: own region

-- 4. Let logged-in users read the safe view. Volunteers can ONLY reach member
--    data through this path; they have no policy on the members table at all.
grant select on members_safe to authenticated;
