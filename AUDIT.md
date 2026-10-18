# AUDIT — Walkers & Talkers

Date: 2026-10-18 · Supabase project `tbxqshzpoukyxlgfubmw` ("walkers-and-talkers-project-")
Phase 1 was read-only. Status column is updated during the Phase 2 fix loop.

## 0. Backup (taken before anything else)

`pg_dump` is impossible from this container (the network policy blocks Postgres
ports and `*.supabase.co`), so the backup was taken through the Supabase
connector with SQL and saved to `/backups/20261018T095635Z/` (outside the repo,
never committed):

- `data_public.json` — every row of all 9 public tables (76 rows)
- `auth_users.json` — the 2 auth users + identities (no password hashes)
- `schema_live.sql` — full live schema (tables, constraints, indexes, sequence,
  functions verbatim, views, triggers, RLS, cron job with token redacted)
- `restore_data.sql`, `README.md`, `checksums_from_db.json`

Verified: the JSON re-hashed locally matches md5s computed inside Postgres for
all 9 tables; `schema_live.sql` + `restore_data.sql` were restored into a
scratch Postgres 16 and gave identical row counts and the same `members` md5.

Row counts before any change:

| table | rows | | table | rows |
|---|---|---|---|---|
| attendance | 1 | | profiles | 2 |
| cards | 9 | | regions | 1 |
| checkin_attempts | 48 | | sessions | 8 |
| email_log | 0 | | welfare_flags | 0 |
| members | 7 | | auth.users | 2 |

## 1. Project structure and stack

- **Frontend:** React 18.3 + Vite 5.4 + TypeScript 5.8 + Tailwind 3.4, shadcn/ui
  (49 generated components under `src/components/ui`, ~19 used), TanStack Query 5,
  react-router 6.30, supabase-js 2.108. Lovable template (`lovable-tagger`).
- **Package manager:** npm (`package-lock.json`), Node 22 here.
- **Entry points:** `index.html` → `src/main.tsx` → `src/App.tsx` (all routes);
  Supabase client `src/integrations/supabase/client.ts`; auth `src/lib/auth.tsx`.
- **Backend:** hosted Supabase only (Postgres 17.6, PostgREST 14.5, GoTrue 2.197),
  16 SQL migrations in `supabase/migrations/`, 4 Edge Functions in
  `supabase/functions/` (Deno), pg_cron job → `nudge-cron`.
- **Other:** `desktop/nfc-writer` (Electron NFC card writer, built by
  `.github/workflows/build-mac-app.yml`), `tools/acr122u` (card reader bridge),
  `scripts/import_members.ts` (one-off xlsx import with service key).
- **Deploy:** Vercel (`vercel.json` SPA rewrite). No Docker/Railway/Procfile.

## 2. Install

`npm ci` → exit 0, 483 packages. Warnings: 3 deprecated transitive packages
(whatwg-encoding, domexception, abab); `npm audit`: **25 vulnerabilities
(2 critical, 13 high, 10 moderate)** — almost all dev/build tooling (vitest,
tinypool, vite/esbuild dev server, tailwind/postcss chain). Runtime-relevant:
`react-router-dom` (open-redirect advisories, non-breaking fix available).
`xlsx` (no fix upstream) is only used by the CLI import script.

## 3. Environment variables (names only)

`.env.example` could not be read: the project's `.claude/settings.json` denies
reading `.env*`. Variables the code uses:

| Variable | Where | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend, import script | yes — app white-screens without it |
| `VITE_SUPABASE_ANON_KEY` **or** `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | yes (either) |
| `VITE_APP_DOMAIN` | `src/lib/utils.ts` (`appUrl`) | recommended (falls back to window origin) |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/import_members.ts` only | only for the import CLI |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `EMMA_EMAIL` | Edge Function secrets | yes for email |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | auto-provided by Supabase |

Edge Function secret values can't be listed through the connector, so whether
the 4 RESEND/EMMA secrets are set is **unverified**.

## 4. Database

- Connection works (connector). Status `ACTIVE_HEALTHY`.
- 9 tables, 2 views, 9 functions, 21 policies, 3 triggers, 1 sequence,
  extensions pg_cron + pg_net (in `public`), pgcrypto, uuid-ossp, vault.
- **No migration history**: `supabase_migrations` schema does not exist —
  the schema was built by pasting SQL into the dashboard, not `supabase db push`.
- All 16 repo migrations apply cleanly, in order, to an empty Postgres.
- Drift (live vs. "all migrations applied"), comparing every column,
  constraint, index, policy, function body, view, trigger, RLS flag:

| Object | Live | Migrations |
|---|---|---|
| policy `members_all_authenticated` (ALL, authenticated, `true`/`true`) | **present** | absent |
| policies `members_select_super`, `members_modify_admin`, `members_insert_volunteer`, `members_update_volunteer` | **missing** | present |
| policy `profiles_update_super` | **missing** | present |
| functions `activate_card_by_token`, `log_card_read` | **missing** | present |
| function `assign_member_no()` + trigger `members_assign_no` + sequence `member_no_seq` | present | **absent** |
| `claim_admin`, `handle_new_user`, `members_who_missed_session` | whitespace-only differences | — |

Everything else (all tables/columns/constraints/indexes, both views, other
functions) matches exactly.

## 5. Build, type check, lint, tests

| Check | Result |
|---|---|
| `npm run build` | **pass** (warning: 1.12 MB single JS chunk) |
| `tsc -p tsconfig.app.json` | **fail — 40 errors** in 11 files (35 from stale `types.ts`, 5 in unused `ui/chart.tsx`, 1 real in `useSessions.ts`) |
| `tsc -p tsconfig.node.json` | pass |
| `npm run lint` | **fail — 3 errors, 7 warnings** |
| `npm test` | pass, but the only test is `expect(true).toBe(true)` |

There is no `typecheck` script although `MANUAL_SETUP.md` tells you to run one.

## 6. Running the app

- Without Supabase env vars every route renders a **blank white page**
  (`client.ts` throws at import, before React/ErrorBoundary mount).
- This container cannot reach `*.supabase.co` (proxy 403), so the browser
  cannot talk to the real project from here. End-to-end flows are therefore run
  against a local copy: Postgres 16 restored from the backup + PostgREST 12.2.3
  + a small local auth stub (Phase 2).
- Supabase logs show every service started at 09:36 UTC today, and the pg_cron
  job's last successful run was 2026-09-09: **the project had been paused**
  (free-tier inactivity pause) until today.

## 7. Integrations

- **Auth:** email + password; `/signup` page is publicly routed although the
  design says "no public sign-up". Auth settings (sign-ups on/off, Site URL,
  redirect URLs) can't be read through the connector.
- **Email (Resend via `send-email`):** deployed v5 ≠ repo. Deployed has CORS
  but no `admin_invite` template; repo has `admin_invite` but no CORS. Neither
  authenticates its caller.
- **Edge Functions deployed:** `send-email` v5, `nudge-cron` v3 (verify_jwt on),
  `invite-admin` v3, `register-member` v3, plus `rapid-api` (a stray copy of
  invite-admin) and `delete-user` (not in the repo, not called by the UI).
  Repo `invite-admin` and `register-member` are newer than what's deployed.
- **Cron:** `wt-nudge-cron` `0 16 * * 1-5` posts to `nudge-cron` with a
  legacy service-role JWT written inline in the job's SQL.
- **Storage / payments / other third-party APIs:** none used.

## 8. Deployment config

`vercel.json` SPA rewrite only. The env vars must exist in Vercel at build
time (Vite inlines them). No web CI (lint/typecheck/test) workflow; the only
workflow builds the macOS NFC writer. CORS on Edge Functions is `*`.
Supabase region is **ap-northeast-1 (Tokyo)**; the plan says London/Ireland.

## 9. Issues (ranked)

Status: OPEN · FIXED · NEEDS-YOU (needs your account, keys or a decision)

### BLOCKER

| ID | Issue | Where | Root cause | Proposed fix | Status |
|---|---|---|---|---|---|
| B1 | Whole app down: Supabase project was paused | Supabase project | Free plan pauses after 7 days idle; cron last ran 2026-09-09; services restarted today 09:36 | You restored it. Prevent: Pro plan, or regular activity | NEEDS-YOU |
| B2 | **Any logged-in user can read/write every member incl. health notes** | live policy `members_all_authenticated` (not in git) | Added in the dashboard to "fix" B3; replaced the intended region/role policies. Fails `tests/rls_results.md` rows 1, 2, 5 | Migration: drop it, restore the 4 intended `members_*` policies | OPEN |
| B3 | Volunteer "Add member" cannot work under correct RLS | `src/hooks/useMembers.ts:143-230` | Reads `members` for duplicate checks + next number, and inserts with `.select()`. Volunteers have no SELECT on `members` by design (health notes), so lookups see nothing and insert-returning is rejected | SECURITY DEFINER RPC `create_member` (role + region checks, dedupe, numbering, no health notes); hook calls it | OPEN |
| B4 | Type check fails (40 errors) | `src/integrations/supabase/types.ts` | File belongs to a different (Lovable template) schema: `regions.colour`, `profiles.first_name`, `app_role` enum… | Regenerate from live; fix the 1 real error; remove unused `ui/chart.tsx` | OPEN |
| B5 | **Anonymous internet users can list attendee names + emails** | `supabase/migrations/20260614121300_nudge_engine_schema.sql:50` | `session_attendees_view` is a definer-rights view (bypasses RLS) and anon/authenticated hold SELECT on it | `security_invoker = true`, revoke from anon/authenticated (only `nudge-cron`, using the service key, reads it) | OPEN |
| B6 | `send-email` has no caller authentication | `supabase/functions/send-email/index.ts:29` | `verify_jwt=false` and no check in code. Repo version adds `admin_invite` with arbitrary `to_email` + `login_url` → would be an open phishing relay from the charity's verified domain if deployed | Require the service key (server callers) or a staff user JWT (browser welcome email); `admin_invite` service-key only | OPEN |

### MAJOR

| ID | Issue | Where | Root cause | Proposed fix | Status |
|---|---|---|---|---|---|
| M1 | No migration history on live | `supabase_migrations` missing | Schema pasted via SQL editor | Record the 16 existing versions as applied, then apply new fixes as migrations | OPEN |
| M2 | NFC writer can't activate cards; Team role changes silently do nothing | live missing `activate_card_by_token`, `log_card_read`, `profiles_update_super` | Migration `20260614121100` / `120700` never run on live | Apply them (in the alignment migration) | OPEN |
| M3 | Server-side member numbering exists only in live | live `assign_member_no()`, trigger, `member_no_seq` | Added in dashboard | Capture in a migration (with `search_path`) | OPEN |
| M4 | A user can move themselves to another region | `supabase/migrations/20260614120100_rls_policies.sql:26` | `profiles_update_own` pins `role` but not `region_id` | Pin `region_id` in WITH CHECK | OPEN |
| M5 | Edge Functions out of sync with git | deployed vs `supabase/functions/*` | Deployed piecemeal. Invite emails fail today (deployed `send-email` has no `admin_invite`) | Merge `send-email` (CORS + admin_invite + auth), add `delete-user` to git, redeploy | OPEN |
| M6 | Service-role JWT stored inline in cron job SQL | `cron.job` 1 | Key pasted into `cron.schedule` | Move to Vault + rotate the key | NEEDS-YOU |
| M7 | Public `/signup` route + email auto-promoted to super_admin | `src/App.tsx:113`, `supabase/migrations/20260614120500_profile_autocreate.sql:14` | Leftover from template / bootstrap | Remove `/signup` route; you confirm sign-ups are disabled in Auth settings; decide on hard-coded email | OPEN |
| M8 | Blank white screen when env vars are missing | `src/integrations/supabase/client.ts:11` | Throws during module import | Show a readable configuration error instead | OPEN |
| M9 | SECURITY DEFINER helpers without `search_path` | `auth_role`, `auth_region` (+3 others) | Advisor `function_search_path_mutable` | `set search_path = public` | OPEN |
| M10 | Data stored in Tokyo region | Supabase project | Created in ap-northeast-1 | New project in eu-west-2 + migrate (your decision) | NEEDS-YOU |

### MINOR

| ID | Issue | Where | Proposed fix | Status |
|---|---|---|---|---|
| m1 | Lint errors (empty interfaces, `require`) | `ui/command.tsx:24`, `ui/textarea.tsx:5`, `tailwind.config.ts:99` | type aliases / ESM import | OPEN |
| m2 | No real tests | `src/test/example.test.ts` | Unit tests for hooks + SQL RLS/RPC test suite | OPEN |
| m3 | npm audit findings | `package-lock.json` | `npm audit fix` (non-breaking only) | OPEN |
| m4 | Docs point to files/scripts that don't exist | `CLAUDE.md` (`src/types/database.ts`, `src/lib/supabase.ts`, `RequireAuth.tsx`), `MANUAL_SETUP.md` (`npm run typecheck`, `import:members`) | Add the scripts, correct paths | OPEN |
| m5 | `setup/full_setup.sql` is stale and unsafe to run | `setup/full_setup.sql` | Mark deprecated | OPEN |
| m6 | `VolunteerCheckIn` attendee type missing `member_id` | `src/hooks/useSessions.ts:53` | Fix type | OPEN |
| m7 | `nudge-cron` callable with the public anon key | deployed `verify_jwt=true` only | Check the service key in code | OPEN |
| m8 | `rapid-api` stray duplicate function | deployed only | Delete (needs your OK) | NEEDS-YOU |
| m9 | Leaked-password protection off; `pg_net` in `public` schema | Auth settings / extensions | Dashboard toggle; leave `pg_net` (moving it is risky) | NEEDS-YOU |
| m10 | Perf advisors (unindexed FKs, initplan, permissive policies) | live DB | Not needed at this size | OPEN (deferred) |
| m11 | 1.1 MB single bundle | build | Route-level code splitting (later) | OPEN (deferred) |
| m12 | `activate_card_by_token` can re-activate a `lost` card | migration `20260614121100` | Only allow `pending` | OPEN |
