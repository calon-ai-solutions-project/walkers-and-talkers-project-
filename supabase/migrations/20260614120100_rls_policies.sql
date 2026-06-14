-- ============================================================================
-- Helper functions
-- security definer so they can read profiles regardless of the caller's RLS,
-- stable so the planner can cache them within a statement.
-- ============================================================================
create or replace function auth_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_region()
returns uuid language sql security definer stable as $$
  select region_id from profiles where id = auth.uid()
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_super" on profiles
  for select using (auth_role() = 'super_admin');

-- Users can update their own profile but NOT their own role.
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
  );

-- ============================================================================
-- REGIONS
-- ============================================================================
create policy "regions_select_authenticated" on regions
  for select using (auth.uid() is not null);

create policy "regions_super_admin_all" on regions
  for all using (auth_role() = 'super_admin');

-- ============================================================================
-- MEMBERS
-- super_admin sees all; regional_admin and volunteer see their own region.
--
-- KNOWN GAP (corrected by the volunteer_health_notes_fix migration):
-- RLS is row-level, not column-level, and Supabase puts every logged-in user
-- on the single `authenticated` Postgres role — so this region-scoped policy
-- lets volunteers SELECT health_notes too. The follow-up migration removes the
-- volunteer's direct access to the members table and routes them through a
-- security-definer members_safe view that excludes health_notes. We keep this
-- policy here so the migration history honestly shows the gap and its fix.
-- ============================================================================
create policy "members_select_super" on members
  for select using (auth_role() = 'super_admin');

create policy "members_select_region" on members
  for select using (
    auth_role() in ('regional_admin', 'volunteer')
    and region_id = auth_region()
  );

create policy "members_modify_admin" on members
  for all using (
    auth_role() = 'super_admin'
    or (auth_role() = 'regional_admin' and region_id = auth_region())
  );

-- ============================================================================
-- members_safe view — excludes health_notes. Initially security_invoker (so it
-- respects the caller's RLS on members). The fix migration redefines this as a
-- security-definer view that filters by region itself, which is what actually
-- closes the column gap for volunteers.
-- ============================================================================
create or replace view members_safe with (security_invoker = true) as
  select
    id, member_no, first_name, last_name, email, phone,
    address_line1, address_line2, city, postcode,
    region_id, member_since_year, joined_at,
    needs_full_data, active, created_at, updated_at
  from members;

-- ============================================================================
-- CARDS
-- ============================================================================
create policy "cards_select_super" on cards
  for select using (auth_role() = 'super_admin');

create policy "cards_select_region" on cards
  for select using (
    auth_role() in ('regional_admin', 'volunteer')
    and exists (
      select 1 from members
      where members.id = cards.member_id
      and members.region_id = auth_region()
    )
  );

create policy "cards_modify_admin" on cards
  for all using (
    auth_role() = 'super_admin'
    or (auth_role() = 'regional_admin' and exists (
      select 1 from members
      where members.id = cards.member_id
      and members.region_id = auth_region()
    ))
  );

-- ============================================================================
-- SESSIONS
-- ============================================================================
create policy "sessions_select_super" on sessions
  for select using (auth_role() = 'super_admin');

create policy "sessions_select_region" on sessions
  for select using (
    auth_role() in ('regional_admin', 'volunteer')
    and region_id = auth_region()
  );

create policy "sessions_modify_admin" on sessions
  for all using (
    auth_role() = 'super_admin'
    or (auth_role() = 'regional_admin' and region_id = auth_region())
  );

-- ============================================================================
-- ATTENDANCE
-- INSERT (check-in) is done via a SECURITY DEFINER function in Phase 2, not a
-- direct client insert, so only SELECT policies exist here.
-- ============================================================================
create policy "attendance_select_super" on attendance
  for select using (auth_role() = 'super_admin');

create policy "attendance_select_region" on attendance
  for select using (
    auth_role() in ('regional_admin', 'volunteer')
    and exists (
      select 1 from sessions
      where sessions.id = attendance.session_id
      and sessions.region_id = auth_region()
    )
  );

-- ============================================================================
-- WELFARE_FLAGS (welfare data is admin-only, never volunteer)
-- ============================================================================
create policy "welfare_select_super" on welfare_flags
  for select using (auth_role() = 'super_admin');

create policy "welfare_select_region" on welfare_flags
  for select using (
    auth_role() = 'regional_admin'
    and exists (
      select 1 from members
      where members.id = welfare_flags.member_id
      and members.region_id = auth_region()
    )
  );

create policy "welfare_modify_admin" on welfare_flags
  for all using (
    auth_role() = 'super_admin'
    or (auth_role() = 'regional_admin' and exists (
      select 1 from members
      where members.id = welfare_flags.member_id
      and members.region_id = auth_region()
    ))
  );

-- ============================================================================
-- EMAIL_LOG (read-only for region scope; admin-only)
-- ============================================================================
create policy "email_log_select_super" on email_log
  for select using (auth_role() = 'super_admin');

create policy "email_log_select_region" on email_log
  for select using (
    auth_role() = 'regional_admin'
    and exists (
      select 1 from members
      where members.id = email_log.member_id
      and members.region_id = auth_region()
    )
  );
