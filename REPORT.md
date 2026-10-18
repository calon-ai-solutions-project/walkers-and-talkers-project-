# REPORT — Walkers & Talkers repair (2026-10-18)

Full issue list with file/line, root cause and status: [`AUDIT.md`](AUDIT.md).

## Why it didn't work

1. **The Supabase project had been paused.** Free projects pause after a week
   without activity. The scheduled nudge job last ran on 9 September, and the
   project's services only came back up at 09:36 today, when you restored it.
   While paused, every API call from the app failed.
2. **The live database didn't match the code.** It was built by pasting SQL
   into the dashboard, so no migrations were recorded:
   - two migrations never ran (the NFC writer's card activation, and the super-admin profile update),
   - a catch-all policy was added that gave **every logged-in user full access to every member's health notes**,
   - member numbering existed only in the dashboard.
3. **The code didn't type-check.** The database types file came from a
   different project template (40 errors). That hid real bugs, e.g. saving
   region settings wiped the contact email.
4. **Volunteers couldn't add members** without that catch-all policy. The
   browser read the `members` table, which volunteers must not see.
5. **The Edge Functions in production differed from git.** Admin invite emails
   could not send, and `send-email` accepted calls from anyone.
6. **Missing env vars gave a blank white page** instead of an error message.

## What was broken → what I fixed

| Area | Fix | Verified by |
|---|---|---|
| Member data exposed to every logged-in user | Removed the catch-all policy; restored the intended per-role policies | SQL RLS test: 50/50 |
| Anonymous users could list attendee names + emails | `session_attendees_view` now runs with the caller's rights; anon/authenticated access revoked | RLS test A03, V18 |
| Anonymous users could check members in (`manual_check_in` NULL-role bug) | Guard fixed; anon can no longer call it | RLS test A09 |
| A user could move themselves to another region | `region_id` pinned in the own-profile policy | RLS test V10 |
| Volunteer "Add member" | New `create_member` RPC (role/region enforced, no health notes); hook uses it | Unit tests; browser: old code gets 403, new code creates the member |
| Card activation from NFC writer; Team role changes | Missing functions/policy re-created; lost/revoked cards can't be re-activated | RLS test A11, A12, S03 |
| 40 type errors | Types regenerated from the live schema | `npm run typecheck`: 0 errors |
| Region settings wiped contact email | Select the column | Browser walkthrough |
| `send-email` open to anyone; would become an open phishing relay if the repo version was deployed | Requires the service key or a signed-in staff user; staff can only send `welcome` | Run under Deno: 401/403/allowed |
| Deployed and repo `send-email` had diverged | Merged: deployed email copy + CORS + `admin_invite` | `deno check` |
| `delete-user` function only in production | Added to git | `deno check` |
| Blank page without env vars | Clear "not configured" screen naming the missing variables | Chromium |
| Public `/signup` page | Removed (accounts are created by admins) | Build + walkthrough |
| Member import script couldn't run | Fixed its broken import | Runs, exits with its own message |
| Lint errors, React DOM-nesting error, unlabeled icon buttons | Fixed | `npm run lint` 0 errors; walkthrough 0 console errors |
| npm advisories | Non-breaking updates (25 → 18) | All checks re-run |

## What was missing → what I added

- `supabase/migrations/20261018112732_align_live_with_repo.sql` and
  `20261018113246_close_rls_gaps.sql`.
- `supabase/tests/rls_adversarial.sql`: the `tests/rls_results.md` checklist
  as an automated 50-check test. It impersonates anon, volunteers in two
  regions, a regional admin and a super admin, and **always rolls back**.
- 13 Vitest unit tests and a Vitest config (the setup file was never loaded).
- npm scripts: `typecheck`, `test:db`, `gen:types`, `import:members`.
- `supabase/functions/delete-user/` (was deployed but never committed).

## Gates

| Gate | Result |
|---|---|
| Dependencies install cleanly | ✅ `npm ci` exit 0. 18 advisories remain: dev tooling needing major upgrades, plus `xlsx` (CLI only, no fix upstream) |
| Build and type check pass | ✅ build OK, `tsc` 0 errors (app + node configs) |
| Tests pass | ✅ 13/13 unit; 50/50 SQL RLS; 19/19 browser walkthrough |
| Database connects, schema matches code, data kept | ✅ connects; ✅ data unchanged (table below); ⚠️ schema: matches **on the restored copy** — **live needs the 2 migrations applied (your approval)** |
| App starts; login + create/read/update/delete + key flows | ✅ against the restored copy (see below); ⚠️ not on live (this container can't reach `*.supabase.co`) |
| Env vars set or documented | ✅ documented below. I couldn't read `.env.example` (the project denies it), so check it lists these names |
| No errors in logs during a full walkthrough | ✅ 0 unexpected errors. 2 expected: wrong-password 400 (tested on purpose), `send-email` 500 (Resend unreachable from this container) |

**Walkthrough (Chromium, real UI, restored copy of live with fixes applied):**
- **Admin:**
  - wrong password rejected, then login works;
  - open today's session;
  - check in by name;
  - member list (read);
  - add member (create);
  - duplicate email refused;
  - same name updates (update);
  - issue a card and mark it active;
  - public card tap checks in, and an unknown card is refused;
  - Settings keeps the contact email;
  - delete member (delete);
  - sign out.
- **Volunteer:**
  - lands on `/walk`, and admin pages bounce back;
  - check in by name;
  - add a member from the kiosk;
  - the API returns `[]` for member rows.

The local stack was: Postgres 16 restored from the backup, plus PostgREST 12, a
local auth service and the Edge Functions under Deno.

## Database and data: kept

- **Backup:** `/backups/20261018T095635Z/`, inside this container only.
  - Contents: every row as JSON, live schema, auth users without password hashes, restore script.
  - Checked against md5s computed inside Postgres, and test-restored into a scratch database.
  - ⚠️ The folder disappears when this container is reclaimed. If you want to keep it, download it or take a Supabase backup.
- **Changes to live:** none. All fixes were tested on the restored copy. The
  one attempt to apply a migration to live timed out before running; I
  checked, and nothing was applied.

| Table | Before | After (live) |
|---|---|---|
| attendance | 1 | 1 |
| cards | 9 | 9 |
| checkin_attempts | 48 | 48 |
| email_log | 0 | 0 |
| members | 7 | 7 |
| profiles | 2 | 2 |
| regions | 1 | 1 |
| sessions | 8 | 8 |
| welfare_flags | 0 | 0 |
| auth.users / identities | 2 / 2 | 2 / 2 |

## Still needs you

> **Order matters:** apply the 2 migrations to live **before** merging this
> PR. The new frontend calls the `create_member` RPC, which only exists once
> they are applied. Merged first, "Add member" would fail in production (the
> Vercel preview of this branch already talks to live and shows exactly that).

1. **Approve applying the 2 migrations to live.** Neither can lose data: they
   only create or replace functions, policies, a sequence and a trigger, and
   change grants. The single `DROP POLICY` removes a permission, not data.
   Then run the RLS test on live and regenerate types (commands below).
2. **Approve deploying the Edge Functions:** `send-email`, `invite-admin`,
   `register-member`, `delete-user`. Optionally delete the stray `rapid-api`.
3. **Supabase Auth settings:** make sure "Allow new users to sign up" is
   **off**, set Site URL / Redirect URLs to your real domain, and turn on
   leaked-password protection.
4. **Decide:** `handle_new_user` makes `alomhabib309@gmail.com` a super_admin
   on sign-up. Keep it, or remove it now that `claim_admin` and invites exist?
5. **Decide:** the project is in **Tokyo** (ap-northeast-1). For UK data, the
   plan said London/Ireland, which means a new project and moving the data.
6. **Keep it awake:** on the free plan, any 7-day gap pauses everything again.
7. **Optional hardening of `nudge-cron`:** it accepts the public anon key.
   Store a secret in Supabase Vault, send it from the cron job, and check it
   in the function.
8. **Resend secrets:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`
   and `EMMA_EMAIL` can't be read through the connector, so confirm they're set.

## Environment variables

| Name | Where |
|---|---|
| `VITE_SUPABASE_URL` | `.env.local` and Vercel (build time) |
| `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` and Vercel |
| `VITE_APP_DOMAIN` | Vercel (e.g. `https://walkersandtalkers.org`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only, for `npm run import:members`. Never in Vercel or `src/` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `EMMA_EMAIL` | Supabase Edge Function secrets |
| `DATABASE_URL` | your shell, only for `npm run test:db` |

## Commands

**Run locally**

```bash
npm ci
cp .env.example .env.local      # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_DOMAIN
npm run dev                     # http://localhost:8080 (vite.config.ts uses port 8080)
npm run typecheck && npm run lint && npm test && npm run build
```

**Apply the database fixes (after you approve), from a machine with the Supabase CLI**

```bash
supabase link --project-ref tbxqshzpoukyxlgfubmw
# live has no migration history: record the 16 that are already in effect
supabase migration repair --status applied \
  20260614120000 20260614120100 20260614120200 20260614120300 20260614120400 \
  20260614120500 20260614120600 20260614120700 20260614120800 20260614120900 \
  20260614121000 20260614121100 20260614121200 20260614121300 \
  20260627120000 20260627130000
supabase db push                # applies only 20261018112732 and 20261018113246
DATABASE_URL="<session pooler connection string>" npm run test:db   # must print 50 of 50
npm run gen:types && git diff src/integrations/supabase/types.ts     # expect no or cosmetic changes; commit
```

**Deploy Edge Functions (after you approve)**

```bash
supabase functions deploy send-email --no-verify-jwt       # checks callers itself
supabase functions deploy invite-admin --no-verify-jwt
supabase functions deploy register-member --no-verify-jwt  # public registration form
supabase functions deploy delete-user --no-verify-jwt
supabase functions delete rapid-api                        # optional: stray copy
```

**Deploy the frontend (Vercel)**

Set the 3 `VITE_*` variables in Vercel → Project → Settings → Environment
Variables, then redeploy. Vite builds them into the bundle, so a redeploy is
required after any change. The build command is `npm run build` and the
output directory is `dist`.
