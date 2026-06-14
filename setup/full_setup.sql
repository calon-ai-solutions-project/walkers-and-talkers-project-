-- ============================================================================
-- Walkers & Talkers — ONE-SHOT SETUP
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
--
-- It creates everything: tables, security (RLS), the check-in functions, an
-- auto-admin rule, the Bristol region, and a test card so you can try a tap
-- straight away. After running this, just create your login user in
-- Authentication → Users → Add user (with your email) and you're done.
-- ============================================================================

-- ---------- TABLES ----------
create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  walk_day text not null,
  walk_time time not null,
  contact_email text,
  active boolean default true,
  created_at timestamptz default now()
);
alter table regions enable row level security;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'volunteer'
    check (role in ('super_admin', 'regional_admin', 'volunteer')),
  region_id uuid references regions(id),
  created_at timestamptz default now()
);
alter table profiles enable row level security;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_no text unique not null,
  first_name text not null,
  last_name text not null,
  email text, phone text,
  address_line1 text, address_line2 text, city text, postcode text,
  date_of_birth date,
  emergency_contact_name text, emergency_contact_phone text,
  emergency_contact_relationship text,
  health_notes text,
  region_id uuid not null references regions(id),
  member_since_year int not null default 2026,
  joined_at timestamptz default now(),
  needs_full_data boolean default false,
  data_source text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table members enable row level security;
create index if not exists members_region_idx on members(region_id);
create index if not exists members_active_idx on members(active);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token text unique not null,
  hardware_uid text,
  state text not null default 'pending'
    check (state in ('pending', 'active', 'lost', 'revoked')),
  issued_at timestamptz default now(),
  revoked_at timestamptz,
  notes text
);
alter table cards enable row level security;
create index if not exists cards_member_idx on cards(member_id);
create index if not exists cards_token_idx on cards(token);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references regions(id),
  session_date date not null,
  opened_at timestamptz, closed_at timestamptz,
  cancelled boolean default false, cancelled_reason text,
  opened_by uuid references profiles(id),
  notes text, created_at timestamptz default now(),
  unique(region_id, session_date)
);
alter table sessions enable row level security;
create index if not exists sessions_date_idx on sessions(session_date);
create index if not exists sessions_region_idx on sessions(region_id);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null check (method in ('nfc', 'qr', 'manual', 'name')),
  card_id uuid references cards(id),
  recorded_by uuid references profiles(id),
  unique(session_id, member_id)
);
alter table attendance enable row level security;
create index if not exists attendance_session_idx on attendance(session_id);
create index if not exists attendance_member_idx on attendance(member_id);

create table if not exists welfare_flags (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  flagged_at timestamptz default now(),
  weeks_absent int not null,
  stage text not null check (stage in ('missed_you', 'welfare_check', 'escalated')),
  resolved_at timestamptz, resolved_by uuid references profiles(id),
  resolution_note text
);
alter table welfare_flags enable row level security;
create index if not exists welfare_flags_member_idx on welfare_flags(member_id);

create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  template text not null, sent_at timestamptz default now(),
  subject text, resend_id text, status text default 'sent'
);
alter table email_log enable row level security;
create index if not exists email_log_member_idx on email_log(member_id);

create table if not exists checkin_attempts (
  id uuid primary key default gen_random_uuid(),
  token_attempted text,
  card_id uuid references cards(id),
  member_id uuid references members(id),
  session_id uuid references sessions(id),
  result text not null,
  created_at timestamptz default now()
);
alter table checkin_attempts enable row level security;
create index if not exists checkin_attempts_created_idx on checkin_attempts(created_at);

-- ---------- HELPER FUNCTIONS ----------
create or replace function auth_role()
returns text language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;
create or replace function auth_region()
returns uuid language sql security definer stable as $$
  select region_id from profiles where id = auth.uid()
$$;

-- ---------- POLICIES (drop-then-create so this is re-runnable) ----------
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
drop policy if exists "profiles_select_super" on profiles;
create policy "profiles_select_super" on profiles for select using (auth_role() = 'super_admin');
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

drop policy if exists "regions_select_authenticated" on regions;
create policy "regions_select_authenticated" on regions for select using (auth.uid() is not null);
drop policy if exists "regions_super_admin_all" on regions;
create policy "regions_super_admin_all" on regions for all using (auth_role() = 'super_admin');

drop policy if exists "members_select_super" on members;
create policy "members_select_super" on members for select using (auth_role() = 'super_admin');
drop policy if exists "members_select_region" on members;          -- remove old gap policy if present
drop policy if exists "members_select_regional_admin" on members;
create policy "members_select_regional_admin" on members for select using (
  auth_role() = 'regional_admin' and region_id = auth_region());
drop policy if exists "members_modify_admin" on members;
create policy "members_modify_admin" on members for all using (
  auth_role() = 'super_admin'
  or (auth_role() = 'regional_admin' and region_id = auth_region()));

-- members_safe: security-definer view, region-filtered, no health_notes.
drop view if exists members_safe;
create view members_safe with (security_invoker = false, security_barrier = true) as
  select id, member_no, first_name, last_name, email, phone,
         address_line1, address_line2, city, postcode,
         region_id, member_since_year, joined_at,
         needs_full_data, active, created_at, updated_at
  from members
  where auth_role() = 'super_admin' or region_id = auth_region();
grant select on members_safe to authenticated;

drop policy if exists "cards_select_super" on cards;
create policy "cards_select_super" on cards for select using (auth_role() = 'super_admin');
drop policy if exists "cards_select_region" on cards;
create policy "cards_select_region" on cards for select using (
  auth_role() in ('regional_admin','volunteer')
  and exists (select 1 from members where members.id = cards.member_id and members.region_id = auth_region()));
drop policy if exists "cards_modify_admin" on cards;
create policy "cards_modify_admin" on cards for all using (
  auth_role() = 'super_admin'
  or (auth_role() = 'regional_admin' and exists (
    select 1 from members where members.id = cards.member_id and members.region_id = auth_region())));

drop policy if exists "sessions_select_super" on sessions;
create policy "sessions_select_super" on sessions for select using (auth_role() = 'super_admin');
drop policy if exists "sessions_select_region" on sessions;
create policy "sessions_select_region" on sessions for select using (
  auth_role() in ('regional_admin','volunteer') and region_id = auth_region());
drop policy if exists "sessions_modify_admin" on sessions;
create policy "sessions_modify_admin" on sessions for all using (
  auth_role() = 'super_admin'
  or (auth_role() = 'regional_admin' and region_id = auth_region()));

drop policy if exists "attendance_select_super" on attendance;
create policy "attendance_select_super" on attendance for select using (auth_role() = 'super_admin');
drop policy if exists "attendance_select_region" on attendance;
create policy "attendance_select_region" on attendance for select using (
  auth_role() in ('regional_admin','volunteer') and exists (
    select 1 from sessions where sessions.id = attendance.session_id and sessions.region_id = auth_region()));

drop policy if exists "welfare_select_super" on welfare_flags;
create policy "welfare_select_super" on welfare_flags for select using (auth_role() = 'super_admin');
drop policy if exists "welfare_select_region" on welfare_flags;
create policy "welfare_select_region" on welfare_flags for select using (
  auth_role() = 'regional_admin' and exists (
    select 1 from members where members.id = welfare_flags.member_id and members.region_id = auth_region()));
drop policy if exists "welfare_modify_admin" on welfare_flags;
create policy "welfare_modify_admin" on welfare_flags for all using (
  auth_role() = 'super_admin'
  or (auth_role() = 'regional_admin' and exists (
    select 1 from members where members.id = welfare_flags.member_id and members.region_id = auth_region())));

drop policy if exists "email_log_select_super" on email_log;
create policy "email_log_select_super" on email_log for select using (auth_role() = 'super_admin');
drop policy if exists "email_log_select_region" on email_log;
create policy "email_log_select_region" on email_log for select using (
  auth_role() = 'regional_admin' and exists (
    select 1 from members where members.id = email_log.member_id and members.region_id = auth_region()));

drop policy if exists "checkin_attempts_select_super" on checkin_attempts;
create policy "checkin_attempts_select_super" on checkin_attempts for select using (auth_role() = 'super_admin');

-- ---------- TRIGGERS ----------
create or replace function trigger_set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists members_updated_at on members;
create trigger members_updated_at before update on members
  for each row execute function trigger_set_updated_at();

-- Auto-create a profile when an auth user is added. Known org emails become
-- super_admin so login just works — no manual profile SQL needed.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when lower(new.email) in ('alomhabib309@gmail.com')
         then 'super_admin' else 'volunteer' end
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- CHECK-IN FUNCTIONS ----------
create or replace function check_in_by_token(p_token text, p_method text default 'nfc')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_card cards%rowtype; v_member members%rowtype; v_session sessions%rowtype;
  v_today date := (now() at time zone 'Europe/London')::date;
  v_result text; v_new boolean := false; v_region_name text;
begin
  if p_method is null or p_method not in ('nfc','qr','manual','name') then p_method := 'nfc'; end if;
  select * into v_card from cards where token = p_token;
  if not found then
    insert into checkin_attempts(token_attempted, result) values (p_token, 'invalid_card');
    return jsonb_build_object('status','invalid_card');
  end if;
  if v_card.state <> 'active' then
    insert into checkin_attempts(token_attempted, card_id, member_id, result)
      values (p_token, v_card.id, v_card.member_id, 'inactive_card');
    return jsonb_build_object('status','inactive_card');
  end if;
  select * into v_member from members where id = v_card.member_id;
  if not found or not coalesce(v_member.active,false) then
    insert into checkin_attempts(token_attempted, card_id, member_id, result)
      values (p_token, v_card.id, v_card.member_id, 'invalid_card');
    return jsonb_build_object('status','invalid_card');
  end if;
  select * into v_session from sessions where region_id = v_member.region_id and session_date = v_today;
  if not found then v_result := 'no_session';
  elsif v_session.cancelled then v_result := 'cancelled';
  elsif v_session.opened_at is null or v_session.closed_at is not null then v_result := 'not_open';
  else
    with ins as (
      insert into attendance (session_id, member_id, method, card_id)
      values (v_session.id, v_member.id, p_method, v_card.id)
      on conflict (session_id, member_id) do nothing returning 1)
    select exists (select 1 from ins) into v_new;
    v_result := case when v_new then 'ok' else 'already' end;
  end if;
  insert into checkin_attempts(token_attempted, card_id, member_id, session_id, result)
    values (p_token, v_card.id, v_member.id, v_session.id, v_result);
  select name into v_region_name from regions where id = v_member.region_id;
  return jsonb_build_object('status', v_result, 'first_name', v_member.first_name, 'region', v_region_name);
end; $$;
revoke all on function check_in_by_token(text, text) from public;
grant execute on function check_in_by_token(text, text) to anon, authenticated;

create or replace function check_in_member(p_member_id uuid, p_session_id uuid)
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
revoke all on function check_in_member(uuid, uuid) from public;
grant execute on function check_in_member(uuid, uuid) to authenticated;

-- ---------- SEED + TEST DATA ----------
insert into regions (slug, name, walk_day, walk_time, contact_email, active)
values ('bristol','Bristol','Wednesday','10:00','andy@walkersandtalkers.org.uk',true)
on conflict (slug) do nothing;

insert into members (member_no, first_name, last_name, region_id, member_since_year, active)
select 'WT-TEST01','Test','Walker', r.id, 2026, true
from regions r where r.slug='bristol'
on conflict (member_no) do nothing;

insert into cards (member_id, token, state)
select m.id, 'test12345678', 'active'
from members m where m.member_no='WT-TEST01'
on conflict (token) do update set state='active';

insert into sessions (region_id, session_date, opened_at)
select id, (now() at time zone 'Europe/London')::date, now()
from regions where slug='bristol'
on conflict (region_id, session_date)
  do update set opened_at=now(), closed_at=null, cancelled=false;

-- Done. Now: Authentication → Users → Add user (your email, Auto Confirm),
-- then open  https://<your-site>/c/test12345678  to test a tap.
