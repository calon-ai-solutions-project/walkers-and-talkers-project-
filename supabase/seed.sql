-- Seed data applied with `supabase db reset` (local) or run manually in the
-- SQL editor against the linked project. Idempotent: safe to run more than once.

insert into regions (slug, name, walk_day, walk_time, contact_email, active)
values ('bristol', 'Bristol', 'Wednesday', '10:00', 'andy@walkersandtalkers.org.uk', true)
on conflict (slug) do nothing;
