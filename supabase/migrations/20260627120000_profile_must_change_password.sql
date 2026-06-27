-- ============================================================================
-- profiles.must_change_password
-- ----------------------------------------------------------------------------
-- Set TRUE for users created via the admin-invite flow (a temporary password
-- was emailed to them). The portal gates the rest of the app behind a
-- /change-password page until this flag is cleared, so the temp password is
-- single-use even though the auth.users row stays valid.
--
-- Default FALSE so existing admins and self-signup users are unaffected.
-- ============================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Let users see their own flag (existing profile select policies already
-- cover this via the per-row select on profiles, but we make it explicit
-- here in case the policy ever tightens).
comment on column public.profiles.must_change_password is
  'TRUE for users created via the invite-admin Edge Function. Cleared on first password change via the portal.';
