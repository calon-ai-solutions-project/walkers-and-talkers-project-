# REPORT — Walkers & Talkers repair (2026-10-18)

Full issue list with file/line, root cause and status: [`AUDIT.md`](AUDIT.md).

**Status:** all fixes are applied to the live Supabase project
(`tbxqshzpoukyxlgfubmw`) and verified there. The RLS security test passes
51/51 on live. Every table has the same row count and checksum as the backup.

## Why it didn't work

1. **The Supabase project had been paused.** Free projects pause after a week
   without activity. The scheduled nudge job last ran on 9 September (its own
   calls did not count as activity). The project's services only came back up
   at 09:36 today, when you restored it. While paused, every API call from the
   app failed.
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
| Member data exposed to every logged-in user | Catch-all policy now grants nothing (`USING false`); the intended per-role policies restored | RLS test on live: 51/51 |
| Anonymous users could list attendee names + emails | `session_attendees_view` now runs with the caller's rights; anon/authenticated access revoked | RLS test A03, V18 |
| Anonymous users could check members in (`manual_check_in` NULL-role bug) | Guard fixed; anon can no longer call it | RLS test A09 |
| A user could move themselves to another region | `region_id` pinned in the own-profile policy | RLS test V10 |
| Sign-up made `alomhabib309@gmail.com` a super admin | Removed (a real super admin already exists). New sign-ups get `volunteer` with no region and see nothing | RLS test N01 |
| Volunteer "Add member" | New `create_member` RPC (role/region enforced, no health notes); hook uses it | Unit tests; RLS V21–V27; browser: old code gets 403, new code creates the member |
| Card activation from NFC writer; Team role changes | Missing functions/policy re-created; lost/revoked cards can't be re-activated | RLS test A11, A12, S03 |
| No migration history on live | The 16 existing migrations recorded; the 3 new ones applied through it | `list_migrations` on live |
| 40 type errors | Types regenerated from the live schema | `npm run typecheck`: 0 errors; regenerating from live gives no diff |
| Region settings wiped contact email | Select the column | Browser walkthrough |
| `send-email` open to anyone | Requires the service key or a signed-in staff user; staff can only send `welcome`. Deployed | Live: no token 401, anon key 401. Staff + other template 403 under Deno |
| Deployed and repo Edge Functions had diverged | `send-email` merged (deployed copy + CORS + `admin_invite`); `delete-user` added to git; all deployed from git | `deno check`; live calls without a token get 401 |
| Project pauses after 7 idle days | Daily read through the public REST API from GitHub Actions | `.github/workflows/keep-supabase-awake.yml` |
| Blank page without env vars | Clear "not configured" screen naming the missing variables | Chromium |
| Public `/signup` page | Removed (accounts are created by admins) | Build + walkthrough |
| Member import script couldn't run | Fixed its broken import | Runs, exits with its own message |
| Lint errors, React DOM-nesting error, unlabeled icon buttons | Fixed | `npm run lint` 0 errors; walkthrough 0 console errors |
| npm advisories | Non-breaking updates (25 → 18) | All checks re-run |

## Applied to live (2026-10-18)

| Change | Proof |
|---|---|
| `20261018112732_align_live_with_repo.sql` | Read-only check of every object it creates |
| `20261018113246_close_rls_gaps.sql` | Read-only check of policies, grants, view options, function bodies |
| `20261018114244_remove_hardcoded_super_admin.sql` | `handle_new_user` body; RLS N01 |
| Edge Functions: `send-email` v6, `invite-admin` v4, `register-member` v4, `delete-user` v2, `nudge-cron` v4 | All live. `send-email`, `invite-admin`, `delete-user`, `nudge-cron` return 401 without a token; `register-member` returns 400 for an empty form |

No statement in the migrations deletes or rewrites data, and none uses `DROP`,
`DELETE` or `TRUNCATE`. They only create or replace functions, policies, a
sequence and a trigger, and change grants. No email was sent to anyone.

## What was missing → what I added

- `supabase/migrations/20261018112732_align_live_with_repo.sql`,
  `20261018113246_close_rls_gaps.sql`,
  `20261018114244_remove_hardcoded_super_admin.sql`.
- `supabase/tests/rls_adversarial.sql`: the `tests/rls_results.md` checklist
  as an automated 51-check test. It impersonates anon, volunteers in two
  regions, a regional admin and a super admin, and **always rolls back**.
- 13 Vitest unit tests and a Vitest config (the setup file was never loaded).
- npm scripts: `typecheck`, `test:db`, `gen:types`, `import:members`.
- `supabase/functions/delete-user/` (was deployed but never committed).
- `.github/workflows/keep-supabase-awake.yml`: a daily ping. It uses the
  public anon key, read from the live site (or a `SUPABASE_ANON_KEY` repo
  secret, if you add one). It refuses any key that isn't `anon`. No secret is
  stored in the repo.

## Gates

| Gate | Result |
|---|---|
| Dependencies install cleanly | ✅ `npm ci` exit 0. 18 advisories remain: dev tooling needing major upgrades, plus `xlsx` (CLI only, no fix upstream) |
| Build and type check pass | ✅ build OK, `tsc` 0 errors (app + node configs) |
| Tests pass | ✅ 13/13 unit; **51/51 SQL RLS on live**; 19/19 browser walkthrough |
| Database connects, schema matches code, data kept | ✅ live schema = migrations (types regenerated from live: no diff); ✅ data unchanged (table below) |
| App starts; login + create/read/update/delete + key flows | ✅ full walkthrough against a restored copy of live with the same fixes (this container can't reach `*.supabase.co` or Vercel from a browser) |
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

- **Backup:** `/backups/20261018T095635Z/`, outside the repo and never
  committed. It was also sent to you as a zip in the chat.
  - Contents: every row as JSON, live schema, auth users without password hashes, restore script.
  - Checked against md5s computed inside Postgres, and test-restored into a scratch database.
- Live row counts and per-table md5 checksums were compared with the backup
  before and after each change. All identical:

| Table | Before (backup) | After (live) |
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

`member_no_seq` is still at 9, so the next member gets the next number.

## Still needs you

1. **Turn off public sign-ups** (no tool can change this setting):
   Supabase Dashboard → project `tbxqshzpoukyxlgfubmw` → Authentication →
   Sign In / Providers → turn off **Allow new users to sign up** → Save.
   Until then, anyone who signs up through the API gets a volunteer account
   with no region, which can see nothing.

Optional, when convenient:

- Authentication → Attack Protection: turn on leaked-password protection.
  Authentication → URL Configuration: set Site URL / Redirect URLs to your domain.
- Edge Functions: delete the stray `rapid-api` function (a copy of `invite-admin`).
- Confirm the `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` and
  `EMMA_EMAIL` Edge Function secrets are set (they can't be read through the
  connector).
- `nudge-cron` accepts the public anon key. To lock it down, store a secret in
  Supabase Vault, send it from the cron job, and check it in the function.
- The catch-all policy is now `members_retired_catch_all` and grants nothing.
  Drop it in the SQL editor if you want it gone.

**Decided by you:** the project stays in **Tokyo** (ap-northeast-1).

## Environment variables

| Name | Where |
|---|---|
| `VITE_SUPABASE_URL` | `.env.local` and Vercel (build time) |
| `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` and Vercel |
| `VITE_APP_DOMAIN` | Vercel (e.g. `https://walkersandtalkers.org`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only, for `npm run import:members`. Never in Vercel or `src/` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `EMMA_EMAIL` | Supabase Edge Function secrets |
| `DATABASE_URL` | your shell, only for `npm run test:db` |
| `SUPABASE_ANON_KEY` | optional GitHub repo secret for the keep-alive workflow |

## Commands

**Run locally**

```bash
npm ci
cp .env.example .env.local      # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_DOMAIN
npm run dev                     # http://localhost:8080 (vite.config.ts uses port 8080)
npm run typecheck && npm run lint && npm test && npm run build
```

**Future database changes**, from a machine with the Supabase CLI. Live now
has a migration history, so `db push` applies only new files:

```bash
supabase link --project-ref tbxqshzpoukyxlgfubmw
supabase db push
DATABASE_URL="<session pooler connection string>" npm run test:db   # must print 51 of 51
npm run gen:types && git diff src/integrations/supabase/types.ts     # commit any change
```

**Redeploy Edge Functions**

```bash
supabase functions deploy send-email --no-verify-jwt       # checks callers itself
supabase functions deploy invite-admin --no-verify-jwt
supabase functions deploy register-member --no-verify-jwt  # public registration form
supabase functions deploy delete-user --no-verify-jwt
supabase functions deploy nudge-cron
```

**Deploy the frontend (Vercel)**

Merging to the default branch deploys production. The 3 `VITE_*` variables
live in Vercel → Project → Settings → Environment Variables. Vite builds them
into the bundle, so a redeploy is required after any change. The build command
is `npm run build` and the output directory is `dist`.
