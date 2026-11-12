-- Central communications kill switch.
-- A single-row settings table that every outgoing-communication code path
-- checks before sending. Seeded PAUSED so the system is fail-safe: if the row
-- is ever missing or unreadable, callers treat communications as paused.
create table if not exists public.app_settings (
  id int primary key default 1,
  communications_paused boolean not null default true,
  paused_reason text,
  paused_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid,
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, communications_paused, paused_reason, paused_at)
values (1, true, 'Kill switch enabled 2026-11-12 at user request; all outgoing member/admin emails paused.', now())
on conflict (id) do update set
  communications_paused = true,
  paused_reason = excluded.paused_reason,
  paused_at = now(),
  updated_at = now();

-- Fail-closed helper: a missing row counts as PAUSED.
create or replace function public.communications_paused()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select communications_paused from public.app_settings where id = 1), true);
$$;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated
  using (true);

-- Only a super_admin may change the flag (i.e. reactivate communications).
drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update on public.app_settings
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- No INSERT/DELETE policies: the singleton row is managed only by migrations.
