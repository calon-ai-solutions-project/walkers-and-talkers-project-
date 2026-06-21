-- API used by the desktop NFC Writer app after it writes a card.
-- Token-keyed, SECURITY DEFINER so the desktop app needs no secret beyond the
-- public anon key. Activating a pending card by its own token is low-risk.

create or replace function activate_card_by_token(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card cards%rowtype;
begin
  select * into v_card from cards where token = p_token;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if v_card.state = 'revoked' then return jsonb_build_object('status','revoked'); end if;
  update cards set state = 'active' where id = v_card.id;
  return jsonb_build_object('status','ok', 'member_id', v_card.member_id);
end; $$;
revoke all on function activate_card_by_token(text) from public;
grant execute on function activate_card_by_token(text) to anon, authenticated;

-- Optional: append a read/scan log entry (the app can call this on a Read).
create or replace function log_card_read(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card cards%rowtype;
begin
  select * into v_card from cards where token = p_token;
  if not found then return jsonb_build_object('status','not_found'); end if;
  insert into checkin_attempts(token_attempted, card_id, member_id, result)
    values (p_token, v_card.id, v_card.member_id, 'desktop_read');
  return jsonb_build_object('status','ok');
end; $$;
revoke all on function log_card_read(text) from public;
grant execute on function log_card_read(text) to anon, authenticated;
