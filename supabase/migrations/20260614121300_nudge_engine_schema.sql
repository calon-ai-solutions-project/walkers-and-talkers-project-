-- ============================================================================
-- Phase 4 + 5 — Nudge engine + email system
-- Adds scheduling/throttling metadata, the optional thank-you recap, member
-- email preferences, welfare escalation tracking, and the two helper objects
-- the cron uses to decide who gets thanked vs. missed-you vs. welfare.
--
-- All changes are additive (`add column if not exists`, `create or replace`)
-- so this is safe to re-run and references only columns that already exist.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- email_log: delivery state + throttle metadata
-- ----------------------------------------------------------------------------
alter table email_log
  add column if not exists scheduled_for timestamptz,
  add column if not exists sent_status text default 'queued'
    check (sent_status in ('queued', 'sent', 'failed', 'cancelled')),
  add column if not exists error_message text,
  add column if not exists week_of date;

create index if not exists email_log_scheduled_idx
  on email_log(scheduled_for) where sent_status = 'queued';
create index if not exists email_log_member_week_idx
  on email_log(member_id, week_of, template);

-- ----------------------------------------------------------------------------
-- sessions: optional recap line Andy fills from his phone after the walk
-- ----------------------------------------------------------------------------
alter table sessions
  add column if not exists thank_you_recap text;

-- ----------------------------------------------------------------------------
-- members: email preferences
-- ----------------------------------------------------------------------------
alter table members
  add column if not exists email_opt_out boolean default false,
  add column if not exists photo_consent boolean default false;

-- ----------------------------------------------------------------------------
-- welfare_flags: track the 21-day phone escalation + last email sent
-- ----------------------------------------------------------------------------
alter table welfare_flags
  add column if not exists escalated_to_phone_at timestamptz,
  add column if not exists last_email_sent_at timestamptz;

-- ----------------------------------------------------------------------------
-- View: members who attended a session (drives the thank-you query).
-- Filters out members with no email / opted out so the cron never has to.
-- ----------------------------------------------------------------------------
create or replace view session_attendees_view as
  select
    a.session_id,
    a.member_id,
    m.first_name,
    m.last_name,
    m.email,
    m.region_id,
    m.email_opt_out
  from attendance a
  join members m on m.id = a.member_id
  where m.email is not null and m.email_opt_out = false;

-- ----------------------------------------------------------------------------
-- Function: members who DID NOT attend a session, with a consecutive-miss
-- count (looking back to their last attended session). Drives missed-you vs.
-- welfare. Only counts non-cancelled, closed sessions so bank holidays /
-- cancelled walks pause the clock.
-- ----------------------------------------------------------------------------
create or replace function members_who_missed_session(p_session_id uuid)
returns table (
  member_id uuid,
  first_name text,
  last_name text,
  email text,
  region_id uuid,
  consecutive_misses int
)
language plpgsql
stable
as $$
declare
  v_session record;
begin
  select * into v_session from sessions where id = p_session_id;
  if not found then
    return;
  end if;

  return query
  select
    m.id,
    m.first_name,
    m.last_name,
    m.email,
    m.region_id,
    (
      -- Count consecutive missed sessions including this one, looking back
      select count(*)::int
      from sessions s2
      where s2.region_id = m.region_id
        and s2.session_date <= v_session.session_date
        and s2.cancelled = false
        and s2.closed_at is not null
        and not exists (
          select 1 from attendance a
          where a.session_id = s2.id and a.member_id = m.id
        )
        and s2.session_date >= (
          coalesce(
            (
              select max(s3.session_date)
              from sessions s3
              join attendance a3 on a3.session_id = s3.id and a3.member_id = m.id
              where s3.region_id = m.region_id and s3.session_date < v_session.session_date
            ),
            '1900-01-01'::date
          )
        )
    ) as consecutive_misses
  from members m
  where m.region_id = v_session.region_id
    and m.active = true
    and m.email is not null
    and m.email_opt_out = false
    -- exclude those who attended this session
    and not exists (
      select 1 from attendance a
      where a.session_id = v_session.id and a.member_id = m.id
    );
end;
$$;
