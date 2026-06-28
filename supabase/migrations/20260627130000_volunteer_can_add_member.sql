-- ============================================================================
-- Let volunteers INSERT new members in their own region.
-- ----------------------------------------------------------------------------
-- The original RLS policy "members_modify_admin" covered all writes for
-- super_admin and regional_admin only, so a volunteer hitting Save on the
-- kiosk's Add Member form got
--   "new row violates row-level security policy for table 'members'"
--
-- This adds an INSERT-only policy for volunteers, scoped to their own
-- region (region_id must match auth_region()). They still cannot UPDATE
-- or DELETE existing members — those stay admin-only.
-- ============================================================================

create policy "members_insert_volunteer" on members
  for insert
  with check (
    auth_role() = 'volunteer'
    and region_id = auth_region()
  );

-- Volunteers also need to be able to read back the row they just created
-- (the Supabase INSERT returns the inserted row, which goes through SELECT
-- RLS). They already have members_select_region for their own region, so
-- no additional SELECT policy is needed.

notify pgrst, 'reload schema';
