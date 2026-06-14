# Walkers & Talkers — Claude Code Instructions

Walkers & Talkers is a charity check-in and welfare system for walking-group
members (Bristol for v1). It stores **sensitive personal data**: home
addresses, emergency contacts, and health notes for people who are often older
or isolated. Getting access control wrong is a data breach involving vulnerable
people, not just a bug.

## Critical rules

1. **NEVER commit secrets.** `.env` / `.env.*` are gitignored (except
   `.env.example`). The `service_role` key, Resend key, and any access token
   live only in environment variables. If you see a secret in a file you are
   editing, refuse and flag it.
2. **NEVER run destructive SQL** (`DROP`, `TRUNCATE`, `DELETE` without `WHERE`)
   against the production Supabase project. Use a migration or a dev branch.
3. **NEVER add a route or component that bypasses RLS.** All Supabase queries
   from the app go through the configured anon client, which enforces RLS.
4. **NEVER call the `service_role` key from the frontend.** It bypasses all
   RLS. It belongs only in `scripts/` for one-off CLI jobs, never in `src/`.
5. **Schema changes are migrations, always.** Every schema change is a file in
   `supabase/migrations/`. Never edit the schema via the dashboard — you lose
   reproducibility and rollback.
6. **Re-generate types after every schema change:**
   `supabase gen types typescript --linked > src/types/database.ts`.
   Otherwise the TypeScript types drift from the live schema.

## Project conventions

- React + Vite + TypeScript + Tailwind. Plain Tailwind (no shadcn yet).
- Auth: Supabase email + password. Admin accounts are created in the Supabase
  dashboard (no public sign-up). (Originally magic-link; switched for simpler,
  reliable admin sign-in without SMTP setup.)
- Data fetching goes through the typed client in `src/lib/supabase.ts`.
- Auth/session state lives in `src/lib/auth.tsx` (`useAuth`).
- Route guards live in `src/components/RequireAuth.tsx`.
- Roles: `super_admin` (you, Andy, Emma), `regional_admin`, `volunteer`.
- DB-enforced access control is the source of truth; the UI is **not** a
  security boundary.

## What success looks like

A Bristol volunteer logged in MUST NOT be able to see another region's member's
health notes — or any data outside their region — via any code path. This is
the system's single most important guarantee. The adversarial RLS test in
`tests/rls_results.md` must pass every row before real member data goes into
production.

## Phase status

Phase 0 (foundations) and Phase 1 (schema, auth, member import) are in this
repo. Edge Functions, the real check-in DB wiring, the welfare engine, Notion
sync, Resend templates, and the full apps are Phase 2+ and out of scope here.
See `MANUAL_SETUP.md` for the external steps this codebase cannot perform.
