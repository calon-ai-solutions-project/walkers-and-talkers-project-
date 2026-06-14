# Manual setup — steps this repo cannot do for you

This codebase contains all the in-repo artifacts for Phase 0 + Phase 1. The
steps below need real credentials, external services, or physical hardware and
must be done by a human with access. They are ordered. Tick them off.

## A. Local environment

- [ ] `npm install`
- [ ] Copy `.env.example` → `.env.local` and fill in real values from your
      Supabase project (URL, anon key). `.env.local` is gitignored — never
      commit it.
- [ ] `npm run dev`, open <http://localhost:5173/c/abc123> and confirm the
      check-in placeholder renders the token.

## B. Supabase project + schema

- [ ] Create the Supabase project (`walkers-talkers-prod`, region `eu-west-2`
      London or `eu-west-1` Ireland). Save URL, anon key, service_role key, DB
      password in your password manager.
- [ ] `supabase login`
- [ ] `supabase link --project-ref <your-project-ref>`
- [ ] `supabase db push` — applies the three migrations in
      `supabase/migrations/` (schema → RLS → volunteer health_notes fix).
- [ ] **Immediately regenerate types from the live schema and commit:**
      ```bash
      supabase gen types typescript --linked > src/types/database.ts
      ```
      This replaces the hand-authored `src/types/database.ts`. Skipping it lets
      the schema and the TypeScript types drift, which produces false-positive
      `npm run typecheck` passes for things that fail at runtime.
- [ ] Seed Bristol: run `supabase/seed.sql` in the SQL editor (or it runs via
      `supabase db reset` locally).
- [ ] Confirm all 8 tables exist with RLS enabled and policies present (no
      "default deny / unrestricted" warnings in the dashboard).

## C. Auth + admin profiles

- [ ] Authentication → Providers: enable Email, "Confirm email" ON, disable
      sign-ups.
- [ ] Authentication → URL Configuration: Site URL
      `https://walkersandtalkers.org`; Redirect URLs
      `https://walkersandtalkers.org/**` and `http://localhost:5173/**`.
- [ ] Invite you, Andy, Emma. Each logs in once to create their `auth.users`
      row, then run the `insert into profiles ... 'super_admin' ...` statements
      (see Build Guide §1.6 / Coding Guide Task 8). Andy & Emma get Bristol
      `region_id`.
- [ ] Confirm `select email, role from profiles;` shows three super_admins.

## D. Member import (sensitive data)

- [ ] `WT_Consolidated_Members.xlsx` is **not** in the repo and `*.xlsx` is
      gitignored — keep it that way. Drop the file into the repo root locally,
      or pass an absolute path as the script argument.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (service_role bypasses
      all RLS — local file only, never `src/`, never committed).
- [ ] Run the import:
      ```bash
      npm run import:members -- ./WT_Consolidated_Members.xlsx
      ```
- [ ] Verify: `select count(*) from members;` = 271,
      `select count(*) from cards;` = 271,
      `select count(distinct token) from cards;` = 271.
- [ ] Set `member_since_year` correctly per the real data (script defaults
      2024 — see DECISIONS.md open item).

## E. The RLS adversarial test (non-negotiable gate)

- [ ] Work through `tests/rls_results.md` end to end as a test volunteer.
      Every row must be PASS. **Do not merge the PR or load real data into a
      production others can reach until this passes.** If you find a hole, fix
      the policy, re-run, re-document.

## F. Frontend deploy (Vercel)

- [ ] Import the repo into Vercel, framework preset **Vite**.
- [ ] Set env vars in Vercel project settings **before** the production build,
      or the deployed app crashes on load: `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_ANON_KEY`, `VITE_APP_DOMAIN`.
- [ ] `vercel.json` (already in the repo) rewrites all paths to `index.html` so
      direct `/c/{token}` hits reach the React Router route instead of a 404.
- [ ] Add the live domain, set the DNS record Vercel specifies, wait for SSL.
- [ ] Confirm `https://walkersandtalkers.org/c/abc123` loads over HTTPS. This
      must be live before Simon's sample cards arrive.

## G. Email (Resend) — needed for Phase 3, not Phase 1

- [ ] Verify the sending domain in Resend (SPF + DKIM + DMARC DNS records).
- [ ] Create an API key, store it as `RESEND_API_KEY` (server-side only).

## H. Check-in loop (Phase 2 milestone — deploy + prove on the 2 sample cards)

> Section G (Resend) is for Phase 3 and not needed for this milestone.

Check-in is a `SECURITY DEFINER` RPC (`check_in_by_token`), the wired
`/c/:token` page, and an admin **Sessions** page (open/close/cancel). Prove the
loop end to end before building the by-name fallback.

- [ ] Apply the new migration: `supabase db push` (adds `check_in_by_token`,
      the `checkin_attempts` audit table, and grants). No Edge Function to
      deploy — the RPC runs inside Postgres.
- [ ] Regenerate types: `supabase gen types typescript --linked > src/types/database.ts`
      and commit (replaces the hand-authored stub for the new function/table).
- [ ] Activate the two sample cards (imported cards start `pending`):
      ```sql
      update cards set state = 'active' where token in ('<token1>', '<token2>');
      ```
- [ ] Open today's Bristol session: log in as super_admin/regional_admin →
      **Dashboard → Walk sessions → Open check-in** (or the SQL in §H of the
      original guide). This is the session-open guard in action.
- [ ] When the 2 printed samples arrive: tap each on a phone and scan each QR.
      Confirm `/c/{token}` shows "Welcome <name>! You're checked in to the
      Bristol walk", and a row appears in `attendance`. Tap again → still one
      row, page shows "You're all set". Confirm a row per attempt in
      `checkin_attempts`.
- [ ] Negative checks: from the Sessions page **Close check-in** → a tap shows
      "Check-in isn't open yet"; **Cancel walk** → "Today's walk is off"; an
      unknown token → "Card not recognised"; a `pending` card → "This card
      isn't active yet".
- [ ] **By-name fallback:** with check-in open, on the Sessions page type a
      member's name under "Forgot their card?" and click **Check in**. Confirm
      they appear in the attendee list and in `attendance` with `method = 'name'`.
- [ ] **Rate-limiting (do before public launch):** set per-IP limits on the
      RPC/REST endpoint at the Supabase API gateway (Project → Settings → API /
      the edge gateway). It is intentionally NOT implemented in SQL.

## Still out of scope (Phase 2 remainder + Phase 3+)

Notion sync + dedupe, welcome email on new member, the welfare engine, Resend
templates, and the full volunteer/admin apps.
