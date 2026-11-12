-- Per-member card printing status for the CRM.
--   to_print   : card not yet submitted to the printer (default for everyone new)
--   on_the_way : card submitted to the printing supplier
--   delivered  : physical card received / handed to the member
alter table public.members
  add column if not exists print_status text not null default 'to_print';

alter table public.members drop constraint if exists members_print_status_check;
alter table public.members
  add constraint members_print_status_check
  check (print_status in ('to_print','on_the_way','delivered'));

-- Backfill from the only reliable signal of what was submitted to the printer:
-- a card with printed_at set was sent to the supplier -> On the Way. Everyone
-- else stays To Print. Done BEFORE the history trigger exists so the backfill
-- itself is not logged as hundreds of manual changes.
update public.members m
set print_status = 'on_the_way'
where exists (
  select 1 from public.cards c
  where c.member_id = m.id and c.printed_at is not null
)
and m.print_status <> 'on_the_way';

-- Audit trail of every status change.
create table if not exists public.card_status_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index if not exists card_status_history_member_idx
  on public.card_status_history (member_id, changed_at desc);

alter table public.card_status_history enable row level security;
drop policy if exists card_status_history_read on public.card_status_history;
create policy card_status_history_read on public.card_status_history
  for select to authenticated using (true);

create or replace function public.log_card_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.print_status is distinct from old.print_status then
    insert into public.card_status_history (member_id, old_status, new_status, changed_by)
    values (new.id, old.print_status, new.print_status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists members_card_status_history on public.members;
create trigger members_card_status_history
  after update on public.members
  for each row execute function public.log_card_status_change();
