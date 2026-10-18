# AUDIT — Walkers & Talkers

Date: 2026-10-18 · Supabase project `tbxqshzpoukyxlgfubmw` ("walkers-and-talkers-project-")
Phase 1 was read-only. Statuses below were updated during the Phase 2 fix loop.

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

Status key:
- **FIXED** — changed in git and verified here.
- **FIXED (local)** — changed in git and verified on the restored copy of live, but **not yet applied to the live Supabase project** (needs your OK, see REPORT.md).
- **NEEDS-YOU** — needs your account, keys or a decision.

### BLOCKER

| ID | Issue | Where | Root cause | Fix | Status |
|---|---|---|---|---|---|
| B1 | Whole app down: Supabase project was paused | Supabase project | Free plan pauses after 7 days idle; cron last ran 2026-09-09; services restarted today 09:36 | You restored it. Prevent: Pro plan, or regular activity | NEEDS-YOU |
| B2 | **Any logged-in user could read/write every member incl. health notes** | live policy `members_all_authenticated` (not in git) | Added in the dashboard to "fix" B3 | `20261018113246_close_rls_gaps.sql` drops it; `..110000_align_live_with_repo.sql` restores the intended policies. RLS test V01/V02/V06/V07/R02/R03 | FIXED (local) |
| B3 | Volunteer "Add member" can't work under correct RLS | `src/hooks/useMembers.ts` | Client read `members` (no volunteer access) and inserted with `.select()` | `create_member` SECURITY DEFINER RPC + hook calls it. Unit tests; RLS V21–V27; browser: old code → HTTP 403, new code → member created | FIXED (local) |
| B4 | Type check failed (40 errors) | `src/integrations/supabase/types.ts` | Types from a different (template) schema | Regenerated from live (+3 new RPCs). 40 → 0 errors | FIXED |
| B5 | **Anonymous users could list attendee names + emails** | `supabase/migrations/20260614121300_nudge_engine_schema.sql:50` | Definer-rights view granted to anon/authenticated | `security_invoker = true`, revoked from anon/authenticated. RLS A03/V18 | FIXED (local) |
| B6 | `send-email` had no caller authentication | `supabase/functions/send-email/index.ts` | `verify_jwt=false`, no check in code | Requires service key or a staff JWT; staff may only send `welcome`. Verified under Deno: 401/403/allowed | FIXED (not deployed) |
| B7 | **Anonymous callers could check any member in by name** (found in Phase 2) | `manual_check_in` (migration `20260614120600`) | `v_role not in (...)` is NULL for no role, so the guard was skipped | Guard fixed + anon EXECUTE revoked. RLS A09 | FIXED (local) |

### MAJOR

| ID | Issue | Where | Fix | Status |
|---|---|---|---|---|
| M1 | No migration history on live | `supabase_migrations` missing | Mark the 16 existing migrations applied, then push the 2 new ones (commands in REPORT.md) | NEEDS-YOU |
| M2 | NFC writer can't activate cards; Team role changes silently did nothing | live missing `activate_card_by_token`, `log_card_read`, `profiles_update_super` | Re-created in `20261018112732_align_live_with_repo.sql`. RLS A11/S03 | FIXED (local) |
| M3 | Member numbering trigger existed only in live | live `assign_member_no`, `member_no_seq` | Captured in `20261018112732…` with `search_path`; sequence keeps its value (9) | FIXED (local) |
| M4 | A user could move themselves to another region and read its data | `profiles_update_own` | `region_id` pinned in WITH CHECK. RLS V10 | FIXED (local) |
| M5 | Edge Functions out of sync with git | deployed vs `supabase/functions/*` | `send-email` merged (deployed copy + CORS + admin_invite); `delete-user` added to git; all 5 pass `deno check` | FIXED (not deployed) |
| M6 | Cron job sends the public **anon** key to `nudge-cron` (not the service key, as first assumed) | `cron.job` 1 | Low risk (anon key is public); to lock `nudge-cron` down, put a secret in Vault — steps in REPORT.md | NEEDS-YOU |
| M7 | Public `/signup` page; email auto-promoted to super_admin on sign-up | `src/App.tsx`, `20260614120500_profile_autocreate.sql:14` | `/signup` route + page removed. Confirm sign-ups are disabled in Auth settings; decide on the hard-coded email | FIXED (route) / NEEDS-YOU |
| M8 | Blank white screen when env vars missing | `src/integrations/supabase/client.ts:11` | `main.tsx` shows which variables are missing (verified in Chromium) | FIXED |
| M9 | SECURITY DEFINER helpers without `search_path` | `auth_role`, `auth_region` (+3) | `set search_path = public` in `…110100` | FIXED (local) |
| M10 | Data stored in Tokyo region | Supabase project | New project in eu-west-2 + migrate | NEEDS-YOU |
| M11 | Saving region settings wiped the contact email (found in Phase 2) | `src/hooks/useMembers.ts:10` | `contact_email` added to the select. Browser: value shown and kept after save | FIXED |
| M12 | Member import script could not run (found in Phase 2) | `scripts/import_members.ts:18` | Imported a non-existent types file; path fixed, `npm run import:members` added | FIXED |
| M13 | Deployed email copy newer than git (found in Phase 2) | `send-email` | Deployed templates/footer are now the ones in git | FIXED |

### MINOR

| ID | Issue | Fix | Status |
|---|---|---|---|
| m1 | Lint errors | 3 → 0 (7 shadcn fast-refresh warnings remain) | FIXED |
| m2 | No real tests | 13 Vitest unit tests + 50-check SQL RLS suite + 19-step browser walkthrough | FIXED |
| m3 | npm audit findings | Non-breaking fixes: 25 → 18; rest needs vite 8 / vitest 5 majors or has no fix (xlsx, CLI only) | FIXED (partly) |
| m4 | Docs pointed to missing files/scripts | `typecheck`, `test:db`, `gen:types`, `import:members` scripts; paths corrected | FIXED |
| m5 | `setup/full_setup.sql` stale and unsafe | Marked DEPRECATED | FIXED |
| m6 | Attendee type missing `member_id` | Fixed | FIXED |
| m7 | `nudge-cron` callable with the anon key | See M6 | NEEDS-YOU |
| m8 | `rapid-api` stray duplicate of invite-admin | Delete it in Edge Functions (your OK) | NEEDS-YOU |
| m9 | Leaked-password protection off; `pg_net` in `public` | Dashboard toggle; leave `pg_net` | NEEDS-YOU |
| m10 | Perf advisors (unindexed FKs, initplan, permissive policies) | Not needed at this size | DEFERRED |
| m11 | 1.1 MB single bundle | Route-level code splitting later | DEFERRED |
| m12 | `activate_card_by_token` could re-activate a lost card | Only pending/active now. RLS A12 | FIXED (local) |
| m13 | React DOM-nesting error on Card Programmer (found in Phase 2) | `<p>` → `<div>` | FIXED |
| m14 | Icon-only View/Delete buttons had no accessible name (found in Phase 2) | `aria-label` + `title` | FIXED |
