-- Return a bit more (non-sensitive) member info from the public check-in so the
-- tap page can show a friendly branded member card: full name + member number.
-- Deliberately does NOT return phone/email/address — that page is public and a
-- found card must not expose a vulnerable member's contact details.
create or replace function check_in_by_token(p_token text, p_method text default 'nfc')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_card cards%rowtype; v_member members%rowtype; v_session sessions%rowtype;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_result text; v_new boolean := false; v_region_name text; v_walk_day text;
begin
  if p_method is null or p_method not in ('nfc','qr','manual','name') then p_method := 'nfc'; end if;
  select * into v_card from cards where token = p_token;
  if not found then
    insert into checkin_attempts(token_attempted, result) values (p_token,'invalid_card');
    return jsonb_build_object('status','invalid_card'); end if;
  if v_card.state <> 'active' then
    insert into checkin_attempts(token_attempted, card_id, member_id, result)
      values (p_token, v_card.id, v_card.member_id, 'inactive_card');
    return jsonb_build_object('status','inactive_card'); end if;
  select * into v_member from members where id = v_card.member_id;
  if not found or not coalesce(v_member.active,false) then
    insert into checkin_attempts(token_attempted, card_id, member_id, result)
      values (p_token, v_card.id, v_card.member_id, 'invalid_card');
    return jsonb_build_object('status','invalid_card'); end if;
  select * into v_session from sessions where region_id = v_member.region_id and session_date = v_today;
  if not found then v_result := 'no_session';
  elsif v_session.cancelled then v_result := 'cancelled';
  elsif v_session.opened_at is null or v_session.closed_at is not null then v_result := 'not_open';
  else
    with ins as (insert into attendance (session_id, member_id, method, card_id)
      values (v_session.id, v_member.id, p_method, v_card.id)
      on conflict (session_id, member_id) do nothing returning 1)
    select exists (select 1 from ins) into v_new;
    v_result := case when v_new then 'ok' else 'already' end;
  end if;
  insert into checkin_attempts(token_attempted, card_id, member_id, session_id, result)
    values (p_token, v_card.id, v_member.id, v_session.id, v_result);
  select name, walk_day into v_region_name, v_walk_day from regions where id = v_member.region_id;
  return jsonb_build_object(
    'status', v_result,
    'first_name', v_member.first_name,
    'last_name', v_member.last_name,
    'member_no', v_member.member_no,
    'region', v_region_name,
    'walk_day', v_walk_day
  );
end; $$;
revoke all on function check_in_by_token(text, text) from public;
grant execute on function check_in_by_token(text, text) to anon, authenticated;
