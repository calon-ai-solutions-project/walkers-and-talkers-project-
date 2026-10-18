-- ============================================================================
-- Close the access-control gaps found by supabase/tests/rls_adversarial.sql.
-- Changes permissions and function bodies only — no table, column or row is
-- dropped or modified.
-- ============================================================================

-- 1. Remove the dashboard-added catch-all policy. "members_all_authenticated"
--    (FOR ALL TO authenticated USING true WITH CHECK true) let every signed-in
--    user — any volunteer, any region — read and change every member,
--    health_notes included. The region/role policies restored by the previous
--    migration (and members_select_regional_admin) are the intended access.
drop policy if exists "members_all_authenticated" on public.members;

-- 2. Adding a member goes through this function. Volunteers have no SELECT on
--    members (health_notes), so the client could neither look for duplicates
--    nor read back the inserted row — that is why the catch-all policy was
--    added. The function does the same steps server-side with the caller's
--    role and region enforced, and never returns health_notes.
create or replace function public.create_member(
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_email text default null,
  p_address_line1 text default null,
  p_postcode text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_phone text default null,
  p_data_source text default 'admin_entry',
  p_region_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text := auth_role();
  v_region uuid;
  v_first text := trim(coalesce(p_first_name, ''));
  v_last text := trim(coalesce(p_last_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_match members%rowtype;
  v_same_name int;
  v_id uuid;
  v_no text;
begin
  if v_role is null or v_role not in ('super_admin', 'regional_admin', 'volunteer') then
    raise exception 'Not allowed to add members' using errcode = '42501';
  end if;
  if v_first = '' or v_last = '' then
    raise exception 'First and last name are required' using errcode = '22023';
  end if;

  -- Only a super_admin may choose the region (default Bristol); everyone else
  -- always adds to their own region.
  if v_role = 'super_admin' then
    v_region := coalesce(p_region_id, (select id from regions where slug = 'bristol'));
  else
    v_region := auth_region();
  end if;
  if v_region is null then
    raise exception 'This account has no region' using errcode = '22023';
  end if;

  -- Email is the stronger identity: refuse a second member with the same email.
  if v_email is not null then
    select * into v_match from members
      where region_id = v_region and lower(email) = v_email
      limit 1;
    if found then
      return jsonb_build_object('status', 'email_exists', 'id', v_match.id,
        'member_no', v_match.member_no, 'first_name', v_match.first_name,
        'last_name', v_match.last_name);
    end if;
  end if;

  -- Same first + last name (case-insensitive, trimmed) and exactly one match:
  -- update that member, only overwriting fields that were filled in.
  select count(*) into v_same_name from members
    where region_id = v_region
      and lower(trim(first_name)) = lower(v_first)
      and lower(trim(last_name)) = lower(v_last);
  if v_same_name = 1 then
    update members set
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      email = coalesce(v_email, email),
      address_line1 = coalesce(nullif(trim(p_address_line1), ''), address_line1),
      postcode = coalesce(nullif(trim(p_postcode), ''), postcode),
      emergency_contact_name = coalesce(nullif(trim(p_emergency_contact_name), ''), emergency_contact_name),
      emergency_contact_phone = coalesce(nullif(trim(p_emergency_contact_phone), ''), emergency_contact_phone)
    where region_id = v_region
      and lower(trim(first_name)) = lower(v_first)
      and lower(trim(last_name)) = lower(v_last)
    returning id, member_no into v_id, v_no;
    return jsonb_build_object('status', 'updated', 'id', v_id, 'member_no', v_no);
  end if;

  -- member_no is assigned by the members_assign_no trigger.
  insert into members (
    first_name, last_name, phone, email, address_line1, postcode,
    emergency_contact_name, emergency_contact_phone, region_id, data_source, active
  ) values (
    v_first, v_last, nullif(trim(p_phone), ''), v_email, nullif(trim(p_address_line1), ''),
    nullif(trim(p_postcode), ''), nullif(trim(p_emergency_contact_name), ''),
    nullif(trim(p_emergency_contact_phone), ''), v_region,
    coalesce(nullif(trim(p_data_source), ''), 'admin_entry'), true
  )
  returning id, member_no into v_id, v_no;
  return jsonb_build_object('status', 'created', 'id', v_id, 'member_no', v_no);
end;
$$;
revoke all on function public.create_member(text, text, text, text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.create_member(text, text, text, text, text, text, text, text, text, uuid) to authenticated;

-- 3. session_attendees_view ran with its owner's rights, so anyone holding the
--    public anon key could list attendee names and emails across all regions.
--    Only the nudge-cron Edge Function (service key) needs it.
alter view public.session_attendees_view set (security_invoker = true);
revoke all on public.session_attendees_view from anon, authenticated;

-- 4. A user could change their own region_id (only role was pinned), then read
--    another region's members, sessions, attendance and cards. Pin both.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and region_id is not distinct from (select p.region_id from public.profiles p where p.id = auth.uid())
  );

-- 5. manual_check_in's guard `v_role not in (...)` is NULL (not true) for a
--    caller with no profile, so anonymous callers skipped every check and could
--    check any member into any open session. Same body, guard fixed.
create or replace function public.manual_check_in(p_member_id uuid, p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text := auth_role(); v_region uuid := auth_region();
  v_member members%rowtype; v_session sessions%rowtype; v_new boolean := false;
begin
  if v_role is null or v_role not in ('super_admin','regional_admin','volunteer') then
    return jsonb_build_object('status','forbidden'); end if;
  select * into v_session from sessions where id = p_session_id;
  if not found then return jsonb_build_object('status','no_session'); end if;
  if v_session.cancelled then return jsonb_build_object('status','cancelled'); end if;
  if v_session.opened_at is null or v_session.closed_at is not null then
    return jsonb_build_object('status','not_open'); end if;
  select * into v_member from members where id = p_member_id;
  if not found or not coalesce(v_member.active,false) then
    return jsonb_build_object('status','invalid_member'); end if;
  if v_member.region_id <> v_session.region_id then
    return jsonb_build_object('status','region_mismatch'); end if;
  if v_role <> 'super_admin' and v_session.region_id is distinct from v_region then
    return jsonb_build_object('status','forbidden'); end if;
  with ins as (
    insert into attendance (session_id, member_id, method, recorded_by)
    values (v_session.id, v_member.id, 'name', auth.uid())
    on conflict (session_id, member_id) do nothing returning 1)
  select exists (select 1 from ins) into v_new;
  insert into checkin_attempts(member_id, session_id, result)
    values (v_member.id, v_session.id, case when v_new then 'manual_ok' else 'manual_already' end);
  return jsonb_build_object('status', case when v_new then 'ok' else 'already' end, 'first_name', v_member.first_name);
end; $$;

-- 6. The desktop writer may only activate a card that is pending (or confirm
--    one that is already active). Lost and revoked cards stay switched off.
create or replace function public.activate_card_by_token(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card cards%rowtype;
begin
  select * into v_card from cards where token = p_token;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if v_card.state not in ('pending', 'active') then
    return jsonb_build_object('status', v_card.state);
  end if;
  update cards set state = 'active' where id = v_card.id;
  return jsonb_build_object('status','ok', 'member_id', v_card.member_id);
end; $$;

-- 7. Pin search_path on the remaining functions (advisor 0011): the
--    SECURITY DEFINER helpers could otherwise be pointed at look-alike objects.
alter function public.auth_role() set search_path = public;
alter function public.auth_region() set search_path = public;
alter function public.trigger_set_updated_at() set search_path = public;
alter function public.members_who_missed_session(uuid) set search_path = public;

-- 8. Nothing anonymous needs these. (auth_role/auth_region stay callable: RLS
--    policies evaluate them for anon requests too.)
revoke execute on function public.manual_check_in(uuid, uuid) from public, anon;
revoke execute on function public.claim_admin() from public, anon;
revoke execute on function public.members_who_missed_session(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.manual_check_in(uuid, uuid) to authenticated;
grant execute on function public.claim_admin() to authenticated;

notify pgrst, 'reload schema';
