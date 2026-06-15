-- Rename check_in_member -> manual_check_in to match the generated types and
-- the build plan. Same signature and behaviour (by-name / forgotten-card
-- check-in via a SECURITY DEFINER function).
drop function if exists check_in_member(uuid, uuid);

create or replace function manual_check_in(p_member_id uuid, p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role text := auth_role(); v_region uuid := auth_region();
  v_member members%rowtype; v_session sessions%rowtype; v_new boolean := false;
begin
  if v_role not in ('super_admin','regional_admin','volunteer') then
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
  if v_role <> 'super_admin' and v_session.region_id <> v_region then
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
revoke all on function manual_check_in(uuid, uuid) from public;
grant execute on function manual_check_in(uuid, uuid) to authenticated;
