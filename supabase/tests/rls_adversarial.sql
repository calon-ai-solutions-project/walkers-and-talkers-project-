-- ============================================================================
-- Adversarial RLS + RPC test (automated version of tests/rls_results.md)
--
-- Creates throwaway fixtures (a second region, one user per role, members with
-- a marker in health_notes, sessions, cards, attendance, welfare/email rows),
-- impersonates each role exactly as PostgREST does (SET ROLE + JWT claims) and
-- checks what it can read and write. Everything runs inside a sub-transaction
-- that is ALWAYS rolled back, and member_no_seq is restored afterwards, so it is
-- safe to run against a live database: it leaves no rows behind.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_adversarial.sql
--
-- Passes silently (NOTICE with the report); raises an exception listing the
-- failing checks otherwise. Set rls_test.report_via_error = on to get the
-- passing report as an error too (for SQL consoles that hide NOTICEs).
-- ============================================================================
do $test$
declare
  v_bristol uuid;
  v_test_region uuid := gen_random_uuid();
  u_vol_b uuid := gen_random_uuid();   -- Bristol volunteer
  u_vol_t uuid := gen_random_uuid();   -- volunteer in the second region
  u_ra_b uuid := gen_random_uuid();    -- Bristol regional_admin
  u_sa uuid := gen_random_uuid();      -- super_admin
  m_b uuid := gen_random_uuid();       -- Bristol member
  m_t uuid := gen_random_uuid();       -- second-region member
  s_b uuid := gen_random_uuid();
  s_t uuid := gen_random_uuid();
  c_active text := 'rlstest' || substr(md5(random()::text), 1, 8);
  c_pending text := 'rlstest' || substr(md5(random()::text), 1, 8);
  c_lost text := 'rlstest' || substr(md5(random()::text), 1, 8);
  c_t uuid := gen_random_uuid();
  v_today date := (now() at time zone 'Europe/London')::date;
  v_seq_last bigint;
  v_seq_called boolean;
  t record;
  got text;
  ok boolean;
  report text := '';
  fails int := 0;
  total int := 0;
begin
  if to_regclass('public.member_no_seq') is not null then
    execute 'select last_value, is_called from public.member_no_seq' into v_seq_last, v_seq_called;
  end if;

  begin
    -- ---------------------------------------------------------------- fixtures
    select id into v_bristol from public.regions where slug = 'bristol';
    if v_bristol is null then
      insert into public.regions (slug, name, walk_day, walk_time)
        values ('bristol', 'Bristol', 'Wednesday', '10:00') returning id into v_bristol;
    end if;
    insert into public.regions (id, slug, name, walk_day, walk_time)
      values (v_test_region, 'rls-test-region', 'RLS Test Region', 'Monday', '10:00');

    insert into auth.users (id, email) values
      (u_vol_b, 'rls-vol-b@example.invalid'), (u_vol_t, 'rls-vol-t@example.invalid'),
      (u_ra_b, 'rls-ra-b@example.invalid'), (u_sa, 'rls-sa@example.invalid');
    -- on_auth_user_created made volunteer profiles; set the real roles.
    insert into public.profiles (id, email, role) values
      (u_vol_b, 'rls-vol-b@example.invalid', 'volunteer'), (u_vol_t, 'rls-vol-t@example.invalid', 'volunteer'),
      (u_ra_b, 'rls-ra-b@example.invalid', 'volunteer'), (u_sa, 'rls-sa@example.invalid', 'volunteer')
      on conflict (id) do nothing;
    update public.profiles set role = 'volunteer', region_id = v_bristol where id = u_vol_b;
    update public.profiles set role = 'volunteer', region_id = v_test_region where id = u_vol_t;
    update public.profiles set role = 'regional_admin', region_id = v_bristol where id = u_ra_b;
    update public.profiles set role = 'super_admin', region_id = null where id = u_sa;

    insert into public.members (id, member_no, first_name, last_name, email, region_id, health_notes, active) values
      (m_b, 'RLSTEST-B', 'Rlsb', 'Member', 'rls-member-b@example.invalid', v_bristol, 'TEST-HN', true),
      (m_t, 'RLSTEST-T', 'Rlst', 'Member', 'rls-member-t@example.invalid', v_test_region, 'TEST-HN', true);
    insert into public.cards (member_id, token, state) values
      (m_b, c_active, 'active'), (m_b, c_pending, 'pending'), (m_b, c_lost, 'lost');
    insert into public.cards (id, member_id, token, state) values (c_t, m_t, 'rlstest-t-card', 'active');
    insert into public.sessions (id, region_id, session_date, opened_at)
      values (s_b, v_bristol, v_today, now())
      on conflict (region_id, session_date) do update set opened_at = now(), closed_at = null, cancelled = false;
    select id into s_b from public.sessions where region_id = v_bristol and session_date = v_today;
    insert into public.sessions (id, region_id, session_date, opened_at) values (s_t, v_test_region, v_today, now());
    insert into public.attendance (session_id, member_id, method) values (s_t, m_t, 'name');
    insert into public.welfare_flags (member_id, weeks_absent, stage) values (m_b, 3, 'welfare_check');
    insert into public.email_log (member_id, template) values (m_b, 'welcome');
    insert into public.checkin_attempts (token_attempted, result) values ('rlstest', 'invalid_card');

    -- ------------------------------------------------------------------ checks
    -- who: NULL = anonymous (anon key, logged out); expect: '=<text>' exact,
    -- '>0' numeric, 'error' any error, 'error:<sqlstate>' specific error.
    -- Each check's writes are rolled back straight away so checks stay
    -- independent, except V21 and V26 (the next checks read what they create).
    for t in
      select * from (values
        ('A01 anon: members rows',                 null::uuid, 'select count(*) from public.members', '=0'),
        ('A02 anon: members_safe rows',            null, 'select count(*) from public.members_safe', '=0'),
        ('A03 anon: session_attendees_view',       null, 'select count(*) from public.session_attendees_view', 'error:42501'),
        ('A04 anon: profiles rows',                null, 'select count(*) from public.profiles', '=0'),
        ('A05 anon: attendance rows',              null, 'select count(*) from public.attendance', '=0'),
        ('A06 anon: cards rows',                   null, 'select count(*) from public.cards', '=0'),
        ('A07 anon: welfare_flags rows',           null, 'select count(*) from public.welfare_flags', '=0'),
        ('A08 anon: check_in_by_token works',      null, format('select public.check_in_by_token(%L, %L)->>%L', c_active, 'qr', 'status'), '=ok'),
        ('A09 anon: manual_check_in refused',      null, format('select public.manual_check_in(%L, %L)->>%L', m_b, s_b, 'status'), 'error'),
        ('A10 anon: create_member refused',        null, 'select public.create_member(''Anon'', ''Person'')->>''status''', 'error'),
        ('A11 anon: activate pending card',        null, format('select public.activate_card_by_token(%L)->>%L', c_pending, 'status'), '=ok'),
        ('A12 anon: cannot re-activate lost card', null, format('select public.activate_card_by_token(%L)->>%L', c_lost, 'status'), '=lost'),

        ('V01 Bristol volunteer: members rows',    u_vol_b, 'select count(*) from public.members', '=0'),
        ('V02 volunteer: health_notes',            u_vol_b, format('select count(health_notes) from public.members where id = %L', m_b), '=0'),
        ('V03 volunteer: members_safe own region', u_vol_b, format('select count(*) from public.members_safe where id = %L', m_b), '=1'),
        ('V04 volunteer: members_safe other region', u_vol_b, format('select count(*) from public.members_safe where region_id = %L', v_test_region), '=0'),
        ('V05 volunteer: no health_notes on view', u_vol_b, 'select count(health_notes) from public.members_safe', 'error:42703'),
        ('V06 volunteer: update member',           u_vol_b, format('with x as (update public.members set first_name = %L where id = %L returning 1) select count(*) from x', 'Hacked', m_b), '=0'),
        ('V07 volunteer: delete member',           u_vol_b, format('with x as (delete from public.members where id = %L returning 1) select count(*) from x', m_b), '=0'),
        ('V08 volunteer: other profiles',          u_vol_b, format('select count(*) from public.profiles where id <> %L', u_vol_b), '=0'),
        ('V09 volunteer: auth.users',              u_vol_b, 'select count(*) from auth.users', 'error:42501'),
        ('V10 volunteer: move self to other region', u_vol_b, format('with x as (update public.profiles set region_id = %L where id = %L returning 1) select count(*) from x', v_test_region, u_vol_b), 'error:42501'),
        ('V11 volunteer: promote self',            u_vol_b, format('with x as (update public.profiles set role = %L where id = %L returning 1) select count(*) from x', 'super_admin', u_vol_b), 'error:42501'),
        ('V12 volunteer: other-region sessions',   u_vol_b, format('select count(*) from public.sessions where region_id = %L', v_test_region), '=0'),
        ('V13 volunteer: other-region attendance', u_vol_b, format('select count(*) from public.attendance where session_id = %L', s_t), '=0'),
        ('V14 volunteer: other-region cards',      u_vol_b, format('select count(*) from public.cards where id = %L', c_t), '=0'),
        ('V15 volunteer: welfare_flags',           u_vol_b, 'select count(*) from public.welfare_flags', '=0'),
        ('V16 volunteer: email_log',               u_vol_b, 'select count(*) from public.email_log', '=0'),
        ('V17 volunteer: checkin_attempts',        u_vol_b, 'select count(*) from public.checkin_attempts', '=0'),
        ('V18 volunteer: attendees view',          u_vol_b, 'select count(*) from public.session_attendees_view', 'error:42501'),
        ('V19 volunteer: manual check-in own region', u_vol_b, format('select public.manual_check_in(%L, %L)->>%L', m_b, s_b, 'status'), '=ok'),
        ('V20 volunteer: manual check-in other region', u_vol_b, format('select public.manual_check_in(%L, %L)->>%L', m_t, s_t, 'status'), '=forbidden'),
        ('V21 volunteer: create_member',           u_vol_b, 'select public.create_member(''Rlsnew'', ''Person'', p_email => ''rls-new@example.invalid'')->>''status''', '=created'),
        ('V22 volunteer: created member is in own region', u_vol_b, 'select region_id::text from public.members_safe where email = ''rls-new@example.invalid''', '=' || v_bristol),
        ('V23 volunteer: created member got a number', u_vol_b, 'select count(*) from public.members_safe where email = ''rls-new@example.invalid'' and member_no ~ ''^WT-[0-9]{4,}$''', '=1'),
        ('V24 volunteer: duplicate email refused', u_vol_b, 'select public.create_member(''Other'', ''Name'', p_email => ''RLS-member-b@example.invalid'')->>''status''', '=email_exists'),
        ('V25 volunteer: same name updates',       u_vol_b, 'select public.create_member(''rlsb'', ''member'', p_phone => ''0700'')->>''status''', '=updated'),
        ('V26 volunteer: asks for another region', u_vol_b, format('select public.create_member(%L, %L, p_region_id => %L)->>%L', 'Rlsregion', 'Person', v_test_region, 'status'), '=created'),
        ('V27 volunteer: ...but lands in own region', u_vol_b, 'select region_id::text from public.members_safe where first_name = ''Rlsregion''', '=' || v_bristol),

        ('T01 other-region volunteer: Bristol members', u_vol_t, format('select count(*) from public.members_safe where region_id = %L', v_bristol), '=0'),
        ('T02 other-region volunteer: own member',  u_vol_t, format('select count(*) from public.members_safe where id = %L', m_t), '=1'),

        ('R01 Bristol regional_admin: health_notes', u_ra_b, format('select health_notes from public.members where id = %L', m_b), '=TEST-HN'),
        ('R02 regional_admin: other-region member', u_ra_b, format('select count(*) from public.members where id = %L', m_t), '=0'),
        ('R03 regional_admin: update other region', u_ra_b, format('with x as (update public.members set city = %L where id = %L returning 1) select count(*) from x', 'X', m_t), '=0'),
        ('R04 regional_admin: update own region',   u_ra_b, format('with x as (update public.members set city = %L where id = %L returning 1) select count(*) from x', 'X', m_b), '=1'),
        ('R05 regional_admin: welfare own region',  u_ra_b, format('select count(*) from public.welfare_flags where member_id = %L', m_b), '=1'),

        ('S01 super_admin: sees all regions',       u_sa, format('select count(*) from public.members where id in (%L, %L)', m_b, m_t), '=2'),
        ('S02 super_admin: health_notes',           u_sa, format('select health_notes from public.members where id = %L', m_t), '=TEST-HN'),
        ('S03 super_admin: change a user''s role',  u_sa, format('with x as (update public.profiles set role = %L where id = %L returning 1) select count(*) from x', 'volunteer', u_ra_b), '=1'),
        ('S04 super_admin: delete member',          u_sa, format('with x as (delete from public.members where id = %L returning 1) select count(*) from x', m_t), '=1')
      ) v(label, who, q, expect)
    loop
      total := total + 1;
      begin
        if t.who is null then
          perform set_config('request.jwt.claims', '{"role":"anon"}', true);
          perform set_config('request.jwt.claim.sub', '', true);
          execute 'set local role anon';
        else
          perform set_config('request.jwt.claims', json_build_object('sub', t.who, 'role', 'authenticated')::text, true);
          perform set_config('request.jwt.claim.sub', t.who::text, true);
          execute 'set local role authenticated';
        end if;
        execute t.q into got;
        got := coalesce(got, '<null>');
        if t.label ~ '^(V21|V26) ' then
          execute 'reset role';
        else
          raise exception using errcode = 'P0998', message = 'undo this check';
        end if;
      exception
        when sqlstate 'P0998' then
          null;  -- writes and the role switch are rolled back; the result is kept
        when others then
          got := 'error:' || sqlstate || ' ' || left(sqlerrm, 80);
      end;

      ok := case
        when t.expect = 'error' then got like 'error:%'
        when t.expect like 'error:%' then got like t.expect || '%'
        when t.expect = '>0' then got ~ '^[0-9]+$' and got::bigint > 0
        else got = substr(t.expect, 2)
      end;
      if not ok then fails := fails + 1; end if;
      report := report || case when ok then 'PASS ' else 'FAIL ' end || t.label
                || ' (expected ' || t.expect || ', got ' || got || ')' || E'\n';
    end loop;

    raise exception using errcode = 'P0999', message = 'rollback rls test fixtures';
  exception when sqlstate 'P0999' then
    null;  -- every fixture and every write above is discarded here
  end;

  if v_seq_last is not null then
    execute format('select setval(%L, %s, %L)', 'public.member_no_seq', v_seq_last, v_seq_called);
  end if;

  if fails > 0 then
    raise exception E'RLS TEST FAILED: % of % checks failed\n%', fails, total, report;
  elsif current_setting('rls_test.report_via_error', true) = 'on' then
    raise exception E'RLS TEST PASSED: % of % checks\n%', total, total, report;
  else
    raise notice E'RLS TEST PASSED: % of % checks\n%', total, total, report;
  end if;
end
$test$;
