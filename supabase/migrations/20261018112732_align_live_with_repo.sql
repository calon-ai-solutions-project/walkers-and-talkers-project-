-- ============================================================================
-- Bring the live database and the migration history back in line.
--
-- Live was built by pasting SQL into the dashboard, so it never recorded any
-- migrations: two migrations never ran there (card desktop API, profiles admin
-- update) and some member policies were missing, while server-side member
-- numbering existed only in the dashboard. Every statement here is idempotent
-- and creates/replaces objects only — no table, column or row is touched.
-- ============================================================================

-- 1. Server-side member numbering (previously dashboard-only). Assigns the next
--    WT-#### when member_no is empty or already taken, so two people adding a
--    member at the same moment can never collide.
create sequence if not exists public.member_no_seq;

select setval('public.member_no_seq', s.n, true)
from (
  select greatest(
    coalesce((select max(substring(member_no from '^WT-(\d+)$')::int) from public.members), 0),
    (select case when is_called then last_value else 0 end from public.member_no_seq)
  ) as n
) s
where s.n > 0;

create or replace function public.assign_member_no()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.member_no is null
     or exists (select 1 from public.members where member_no = new.member_no) then
    loop
      new.member_no := 'WT-' || lpad(nextval('public.member_no_seq')::text, 4, '0');
      exit when not exists (select 1 from public.members where member_no = new.member_no);
    end loop;
  end if;
  return new;
end;
$$;

create or replace trigger members_assign_no
  before insert on public.members
  for each row execute function public.assign_member_no();

-- 2. Desktop NFC writer API (20260614121100_card_desktop_api never ran on live).
--    The writer may only activate a card that is pending (or confirm one that
--    is already active); lost and revoked cards stay switched off.
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
revoke all on function public.activate_card_by_token(text) from public;
grant execute on function public.activate_card_by_token(text) to anon, authenticated;

create or replace function public.log_card_read(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card cards%rowtype;
begin
  select * into v_card from cards where token = p_token;
  if not found then return jsonb_build_object('status','not_found'); end if;
  insert into checkin_attempts(token_attempted, card_id, member_id, result)
    values (p_token, v_card.id, v_card.member_id, 'desktop_read');
  return jsonb_build_object('status','ok');
end; $$;
revoke all on function public.log_card_read(text) from public;
grant execute on function public.log_card_read(text) to anon, authenticated;

-- 3 + 4. Policies the migrations define but live never got: super admins can
--    update any profile (20260614120700 never ran on live, so Settings → Team
--    role changes silently updated 0 rows), and the member policies. Created
--    only when missing, so re-running this is a no-op.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_super') then
    create policy "profiles_update_super" on public.profiles
      for update using (auth_role() = 'super_admin')
      with check (auth_role() = 'super_admin');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'members_select_super') then
    create policy "members_select_super" on public.members
      for select using (auth_role() = 'super_admin');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'members_modify_admin') then
    create policy "members_modify_admin" on public.members
      for all using (
        auth_role() = 'super_admin'
        or (auth_role() = 'regional_admin' and region_id = auth_region())
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'members_insert_volunteer') then
    create policy "members_insert_volunteer" on public.members
      for insert with check (auth_role() = 'volunteer' and region_id = auth_region());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'members_update_volunteer') then
    create policy "members_update_volunteer" on public.members
      for update
      using (auth_role() = 'volunteer' and region_id = auth_region())
      with check (auth_role() = 'volunteer' and region_id = auth_region());
  end if;
end $$;

notify pgrst, 'reload schema';
