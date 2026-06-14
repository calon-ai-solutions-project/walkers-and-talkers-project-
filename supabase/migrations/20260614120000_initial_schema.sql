-- ============================================================================
-- REGIONS
-- ============================================================================
create table regions (
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

-- ============================================================================
-- PROFILES (linked to auth.users)
-- Roles: super_admin (you, Andy, Emma), regional_admin, volunteer
-- ============================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'volunteer'
    check (role in ('super_admin', 'regional_admin', 'volunteer')),
  region_id uuid references regions(id),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- ============================================================================
-- MEMBERS (system of record)
-- ============================================================================
create table members (
  id uuid primary key default gen_random_uuid(),
  member_no text unique not null,                 -- e.g. WT-0001
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  date_of_birth date,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  health_notes text,                              -- SENSITIVE — see RLS migration
  region_id uuid not null references regions(id),
  member_since_year int not null default 2026,
  joined_at timestamptz default now(),
  needs_full_data boolean default false,          -- true for name+email-only members
  data_source text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table members enable row level security;
create index members_region_idx on members(region_id);
create index members_active_idx on members(active);

-- ============================================================================
-- CARDS (NFC / QR tokens)
-- ============================================================================
create table cards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token text unique not null,                     -- 12-char opaque random string
  hardware_uid text,                              -- NFC chip UID once written
  state text not null default 'pending'
    check (state in ('pending', 'active', 'lost', 'revoked')),
  issued_at timestamptz default now(),
  revoked_at timestamptz,
  notes text
);

alter table cards enable row level security;
create index cards_member_idx on cards(member_id);
create index cards_token_idx on cards(token);

-- ============================================================================
-- SESSIONS (a single walk on a specific day)
-- ============================================================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references regions(id),
  session_date date not null,
  opened_at timestamptz,
  closed_at timestamptz,
  cancelled boolean default false,
  cancelled_reason text,
  opened_by uuid references profiles(id),
  notes text,
  created_at timestamptz default now(),
  unique(region_id, session_date)
);

alter table sessions enable row level security;
create index sessions_date_idx on sessions(session_date);
create index sessions_region_idx on sessions(region_id);

-- ============================================================================
-- ATTENDANCE (one check-in per member per session)
-- ============================================================================
create table attendance (
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
create index attendance_session_idx on attendance(session_id);
create index attendance_member_idx on attendance(member_id);

-- ============================================================================
-- WELFARE FLAGS (state machine)
-- ============================================================================
create table welfare_flags (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  flagged_at timestamptz default now(),
  weeks_absent int not null,
  stage text not null check (stage in ('missed_you', 'welfare_check', 'escalated')),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  resolution_note text
);

alter table welfare_flags enable row level security;
create index welfare_flags_member_idx on welfare_flags(member_id);

-- ============================================================================
-- EMAIL LOG
-- ============================================================================
create table email_log (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  template text not null,
  sent_at timestamptz default now(),
  subject text,
  resend_id text,
  status text default 'sent'
);

alter table email_log enable row level security;
create index email_log_member_idx on email_log(member_id);

-- ============================================================================
-- updated_at trigger for members
-- ============================================================================
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger members_updated_at
  before update on members
  for each row execute function trigger_set_updated_at();
