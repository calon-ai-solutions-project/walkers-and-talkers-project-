# Walkers & Talkers — Decisions Log

A one-liner per decision so future-you remembers *why*. Append, don't rewrite.

## Phase 0 / 1

- **Schema source = the Build Guide / Coding Guide variant**, not the earlier
  Technical Architecture doc. Tables: `regions`, `profiles`, `members`,
  `cards`, `sessions`, `attendance`, `welfare_flags`, `email_log`. The earlier
  doc used `events` and different column/role names; we picked the newer,
  internally-consistent pair of guides.
- **Roles = `super_admin` / `regional_admin` / `volunteer`.** super_admin (you,
  Andy, Emma) see everything; regional_admin and volunteer are region-scoped.
- **Walk day = Wednesday 10:00 for Bristol.** Confirm exact time with Andy.
- **Card token = 12-char opaque lowercase alphanumeric**, random (base64 of 9
  bytes, stripped to a-z0-9, sliced to 12). Opaque so a found card reveals
  nothing about the member.
- **Volunteers cannot see `health_notes`.** Enforced in the DB, not just the
  app: volunteers have no SELECT policy on `members` at all; they read the
  `members_safe` view (which excludes `health_notes`). regional_admin and
  super_admin read `members` directly. This is the "Option B" fix from the
  adversarial test — DB-enforced because a solo build will eventually forget a
  code-level guard.
- **Auth = Supabase email + password** (changed from magic-link). Admin accounts
  are created in the Supabase dashboard (Authentication → Users → Add user, with
  a password and auto-confirm); public sign-up stays disabled. Switched from
  magic-link because it needs no SMTP/email-delivery setup and is simpler/faster
  for admins to sign in during build and on-site. Magic-link can be reinstated
  later for member-facing flows if wanted.
- **`members_safe` view uses `security_invoker = true`** so it respects the
  caller's RLS rather than the view owner's.
- **`service_role` key lives only in `scripts/`**, never in `src/` or the
  deployed bundle. The import script reads it from `.env.local`.
- **Member data files (`*.xlsx`/`*.csv`) are gitignored.** Real personal data
  never enters version control.
- **`vercel.json` SPA rewrite** routes every path to `index.html` so direct
  hits on `/c/{token}` (NFC taps / QR scans) reach the React Router route
  instead of a Vercel 404.

## Phase 2 — check-in loop (the de-risking milestone)

- **Check-in is a `SECURITY DEFINER` Postgres function `check_in_by_token()`,
  not an Edge Function.** The `/c/{token}` page is hit by anonymous users with
  no JWT, so RLS can't scope them and direct attendance inserts are blocked.
  The function runs with the owner's privileges, validates the token + open
  session, and is the *only* path that writes attendance. Called from the anon
  client via `supabase.rpc('check_in_by_token', { p_token })`.
  - **Why not an Edge Function:** the page must feel instant (the brief: render
    well under ~500ms, "no spinners"). Edge Functions cold-start (1–3s on first
    hit after idle) — exactly the "member taps, nothing happens, walks off"
    failure. An in-Postgres RPC has no cold start. (The earlier Edge Function
    `supabase/functions/checkin` was removed in favour of this.)
- **Idempotency** via the `unique(session_id, member_id)` constraint +
  `insert … on conflict do nothing returning`: a duplicate tap returns
  `already` instead of erroring.
- **Audit logging:** every attempt (success or not) writes a row to
  `checkin_attempts` inside the function. Read access is super_admin only;
  there is no insert policy — only the SECURITY DEFINER function writes it.
- **Rate-limiting lives at the Supabase API gateway, not in SQL.** Faking it in
  a Postgres function is brittle; per-IP limits on the RPC endpoint are the
  right control. Documented as a config step in MANUAL_SETUP.md.
- **Sessions are NOT auto-created on check-in.** An admin opens the session
  (sets `opened_at`) from the Sessions page. No session today → `no_session`;
  exists but not opened / already closed → `not_open`. Keeps the session-open
  guard meaningful and sidesteps the "auto-create vs pre-create" open decision.
- **Session-open guard is the anti-abuse control.** A found/lost card tapped at
  home does nothing unless an admin has opened today's session. Cards must also
  be `state = 'active'` (imported cards start `pending`).
- **Cancelling a walk** sets `cancelled = true` (Sessions page). The welfare
  engine (Phase 3) must treat a cancelled session as "no walk" so members don't
  get missed-you emails for a walk that didn't happen.
- **Check-in method recorded as `nfc`** for taps/scans (same URL, can't tell
  them apart). By-name/manual check-ins (next pass) set their own method.
- **"Today" is computed in `Europe/London`** in both the function and the
  Sessions page, so a late walk doesn't roll to the wrong date.
- **Session writes use normal RLS** (`sessions_modify_admin`): super_admin any
  region, regional_admin their own. No new function needed for session control.
- **By-name / forgotten-card check-in** is a second SECURITY DEFINER function
  `check_in_member(member_id, session_id)` — the manual counterpart to
  `check_in_by_token`. It checks the caller's role/region via `auth_role()` /
  `auth_region()` (super_admin any region; others their own), requires an open
  session, is idempotent, records method `name`, sets `recorded_by`, and logs
  to `checkin_attempts`. The resilience keystone: a forgotten card never blocks
  a present member. Driven from the Sessions page member search (`members_safe`,
  so no health_notes exposure).

## Roles & volunteer experience

- **Three roles** (`profiles.role`): `super_admin` (all regions/data), `regional_admin`
  (one region's walks/members/welfare), `volunteer` (check members in only; sees
  no personal data beyond names via `members_safe`).
- **Volunteers get a dedicated kiosk** at `/walk` (`VolunteerShell` + `VolunteerCheckIn`)
  — no sidebar, no links elsewhere. After sign-in, the admin shell
  (`RequireAuthLayout`) bounces any `volunteer` to `/walk`, and a volunteer typing
  an admin URL (`/members`, `/settings`, …) is redirected there too. Admins can
  open `/walk` to preview it.
- **`manual_check_in` already allows volunteers** for their assigned region
  (role check includes `volunteer`; region-scoped). No new migration was needed.
  RLS already lets volunteers read their region's `members_safe` + sessions +
  attendance, so the kiosk works with the anon/auth client and no service key.
- **Bristol-only v1:** assigning `regional_admin`/`volunteer` auto-sets their
  `region_id` to Bristol; `super_admin` spans all regions (`region_id` null).
- **Settings** is super_admin only. Name field binds to `profiles.full_name`
  (not email). Auth is email+password here (not magic link), so the profile shows
  "email & password" and keeps Change Password; new-admin invite still uses a
  magic link to onboard, after which the super_admin sets their role.

## Open decisions (resolve before launch)

- Live domain: `walkersandtalkers.org` vs `.org.uk` (currently using `.org`
  in `VITE_APP_DOMAIN`; sending subdomain `notifier.walkersandtalkers.org`).
- Charity number on the printed card (`1208851` confirmed or pending?).
- `member_since_year` for imported members (script currently defaults 2024 —
  set per the real data).
