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

## Phase 4 / 5 — Nudge engine + email (Resend + pg_cron)

The migration, the two Edge Functions, and the UI are in the repo. These are the
external steps the container can't do — run them from a machine with the
Supabase CLI linked to the project.

1. [ ] **Apply the schema:** `supabase db push` (adds the `20260614121300_
       nudge_engine_schema` migration: email_log delivery columns, sessions
       `thank_you_recap`, members `email_opt_out`/`photo_consent`, welfare_flags
       escalation columns, `session_attendees_view`, `members_who_missed_session`).
2. [ ] **Resend domain:** verify the `notifier.walkersandtalkers.org.uk`
       subdomain in Resend; confirm SPF + DKIM; confirm the sender identity
       `Andy from Walkers & Talkers <andy@walkersandtalkers.org.uk>`.
3. [ ] **Confirm the `hello@walkersandtalkers.org.uk` shared inbox exists.** It's
       the Reply-To. If it doesn't exist, create it or set `RESEND_REPLY_TO` to
       Andy's direct address instead — otherwise replies bounce.
4. [ ] **Set secrets** (NOT in frontend env — these are Edge Function secrets):
       ```bash
       supabase secrets set RESEND_API_KEY=re_...
       supabase secrets set RESEND_FROM_EMAIL="Andy from Walkers & Talkers <andy@walkersandtalkers.org.uk>"
       supabase secrets set RESEND_REPLY_TO="hello@walkersandtalkers.org.uk"
       supabase secrets set EMMA_EMAIL="emma@walkersandtalkers.org.uk"
       ```
5. [ ] **Deploy the functions:**
       ```bash
       supabase functions deploy send-email --no-verify-jwt
       supabase functions deploy nudge-cron --no-verify-jwt
       ```
       (`--no-verify-jwt` because the cron and the portal call them with a
       bearer token / service role, not a user JWT.)
6. [ ] **Smoke-test send-email** to your own inbox:
       ```bash
       curl -X POST https://<PROJECT-REF>.supabase.co/functions/v1/send-email \
         -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
         -H "Content-Type: application/json" \
         -d '{"template":"welcome","member_id":"<a member id with your email>"}'
       ```
       Confirm it arrives, From = "Andy from Walkers & Talkers", Reply-To = the
       shared inbox, and a new `email_log` row has `sent_status='sent'` + a
       `resend_id`.
7. [ ] **Smoke-test nudge-cron:** open + close today's Bristol session with a few
       test members (some checked in, some not, one with 3+ consecutive misses),
       then POST to `/functions/v1/nudge-cron` with the service-role bearer.
       Expect attendees → thank_you, 1–2 misses → missed_you, 3+ → welfare with
       Emma CC'd, a welfare_flag row created. Re-run → no duplicates (week_of
       throttle). Set one member `email_opt_out=true` and re-run → skipped.
       Cancel a session → zero emails.
8. [ ] **Schedule it** — enable `pg_cron` (and `pg_net`) under Database →
       Extensions, then in the SQL editor (replace the project ref; store the
       service-role key in Vault / a DB setting, never inline in a migration):
       ```sql
       select cron.schedule(
         'wt-nudge-cron',
         '0 16 * * 1-5',  -- 16:00 UTC Mon–Fri ≈ 17:00 London (BST); 16:00 in winter
         $$
         select net.http_post(
           url := 'https://<PROJECT-REF>.supabase.co/functions/v1/nudge-cron',
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
           )
         );
         $$
       );
       ```
       Confirm with `select * from cron.job;`. (Wednesday-only is `0 16 * * 3`.)
9. [ ] **Welcome email trigger:** wired into the admin **Add Member** flow — a
       new member with an email gets the welcome template on save. There is no
       Notion-form webhook yet, so members added straight through the Notion form
       won't auto-welcome until that webhook is built (see DECISIONS / gap list).
10. [ ] **Pre-launch sign-offs (gap analysis):** Q2/Q4 decisions confirmed with
        Andy + Emma; agree the frequency cap (missed_you for misses 1–2, welfare
        at 3, escalate at 21 days); confirm walks that don't run are marked
        **cancelled** in the UI so the welfare clock pauses; add `photo_consent`
        to the live registration form.

## Still out of scope (Phase 4/5 remainder + future)

Notion registration webhook for auto-welcome, an "auto-cancel sessions left open
>24h" sweep, multi-region UI (region selector + scoping), lost-card replacement
automation, and the optional Monday end-of-week digest to Andy/Emma.
