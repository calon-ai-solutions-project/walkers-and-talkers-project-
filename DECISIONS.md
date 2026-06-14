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
- **Auth = Supabase magic link only, no passwords.** Sign-ups disabled; admins
  invited manually.
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

- **Check-in runs in an Edge Function (`supabase/functions/checkin`), not the
  browser.** It uses the auto-injected `service_role` key to write attendance,
  so there is no client-side attendance INSERT policy (RLS keeps direct writes
  closed; the function is the only writer).
- **Sessions are NOT auto-created on check-in.** A volunteer opens the session
  (sets `opened_at`) from the app/dashboard. If no session row exists for the
  region today → `no_session`; if it exists but `opened_at` is null or
  `closed_at` is set → `not_open`. This keeps the session-open guard meaningful
  and sidesteps the "auto-create vs pre-create" open decision for v1.
- **Session-open guard is the anti-abuse control.** A found/lost card tapped at
  someone's home does nothing unless a volunteer has opened today's session at
  the venue. Cards must also be `state = 'active'` (imported cards start
  `pending`).
- **Check-in method recorded as `nfc`.** Tap and QR scan hit the same URL, so we
  can't distinguish them from the request; `nfc` is the default. Manual/name
  check-ins (volunteer app, Phase 4) will set their own method.
- **"Today" is computed in `Europe/London`**, not UTC, so a late-evening walk
  doesn't roll to the wrong date.
- **Idempotent attendance** via the `unique(session_id, member_id)` constraint:
  a duplicate tap returns `already` instead of erroring (Postgres `23505`).

## Open decisions (resolve before launch)

- Live domain: `walkersandtalkers.org` vs `.org.uk` (currently using `.org`
  in `VITE_APP_DOMAIN`; sending subdomain `notifier.walkersandtalkers.org`).
- Charity number on the printed card (`1208851` confirmed or pending?).
- `member_since_year` for imported members (script currently defaults 2024 —
  set per the real data).
