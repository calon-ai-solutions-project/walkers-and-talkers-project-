-- ============================================================================
-- Check-in by token — the single write path for attendance from public taps.
--
-- The /c/{token} page is hit by ANONYMOUS users (no JWT), so RLS can't scope
-- them and direct inserts into attendance are blocked (no insert policy). This
-- SECURITY DEFINER function runs with the owner's privileges, validates the
-- token + an OPEN session for the member's region today, and performs the only
-- attendance insert. It is idempotent and audit-logs every attempt.
--
-- Rate-limiting is intentionally NOT done in SQL — it belongs at the Supabase
-- API gateway (per-IP limits on the REST/RPC endpoint). See MANUAL_SETUP.md.
-- ============================================================================

-- Audit log: one row per check-in attempt, success or not.
create table checkin_attempts (
  id uuid primary key default gen_random_uuid(),
  token_attempted text,
  card_id uuid references cards(id),
  member_id uuid references members(id),
  session_id uuid references sessions(id),
  result text not null,
  created_at timestamptz default now()
);

alter table checkin_attempts enable row level security;
create index checkin_attempts_created_idx on checkin_attempts(created_at);

-- Read is super_admin only. There is deliberately NO insert/update/delete
-- policy: rows are written solely inside the SECURITY DEFINER function below.
create policy "checkin_attempts_select_super" on checkin_attempts
  for select using (auth_role() = 'super_admin');

create or replace function check_in_by_token(p_token text, p_method text default 'nfc')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card        cards%rowtype;
  v_member      members%rowtype;
  v_session     sessions%rowtype;
  v_today       date := (now() at time zone 'Europe/London')::date;
  v_result      text;
  v_new         boolean := false;
  v_region_name text;
begin
  if p_method is null or p_method not in ('nfc', 'qr', 'manual', 'name') then
    p_method := 'nfc';
  end if;

  -- 1. Token -> card
  select * into v_card from cards where token = p_token;
  if not found then
    insert into checkin_attempts(token_attempted, result)
      values (p_token, 'invalid_card');
    return jsonb_build_object('status', 'invalid_card');
  end if;

  if v_card.state <> 'active' then
    insert into checkin_attempts(token_attempted, card_id, member_id, result)
      values (p_token, v_card.id, v_card.member_id, 'inactive_card');
    return jsonb_build_object('status', 'inactive_card');
  end if;

  -- 2. Card -> member
  select * into v_member from members where id = v_card.member_id;
  if not found or not coalesce(v_member.active, false) then
    insert into checkin_attempts(token_attempted, card_id, member_id, result)
      values (p_token, v_card.id, v_card.member_id, 'invalid_card');
    return jsonb_build_object('status', 'invalid_card');
  end if;

  -- 3. Today's session for the member's region + session-open guard
  select * into v_session from sessions
    where region_id = v_member.region_id and session_date = v_today;

  if not found then
    v_result := 'no_session';
  elsif v_session.cancelled then
    v_result := 'cancelled';
  elsif v_session.opened_at is null or v_session.closed_at is not null then
    v_result := 'not_open';
  else
    -- 4. Idempotent attendance insert (one row per member per session)
    with ins as (
      insert into attendance (session_id, member_id, method, card_id)
      values (v_session.id, v_member.id, p_method, v_card.id)
      on conflict (session_id, member_id) do nothing
      returning 1
    )
    select exists (select 1 from ins) into v_new;
    v_result := case when v_new then 'ok' else 'already' end;
  end if;

  insert into checkin_attempts(token_attempted, card_id, member_id, session_id, result)
    values (p_token, v_card.id, v_member.id, v_session.id, v_result);

  select name into v_region_name from regions where id = v_member.region_id;

  return jsonb_build_object(
    'status', v_result,
    'first_name', v_member.first_name,
    'region', v_region_name
  );
end;
$$;

-- Anonymous taps must be able to call it; authenticated manual flows too.
revoke all on function check_in_by_token(text, text) from public;
grant execute on function check_in_by_token(text, text) to anon, authenticated;
