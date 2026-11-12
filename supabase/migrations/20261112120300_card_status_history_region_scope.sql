-- Region-scope the audit table's read policy so a volunteer / regional_admin
-- can only read card-status history for members in their own region (a
-- super_admin sees all). Mirrors the members_safe guarantee: no cross-region
-- member data via any code path. ALTER POLICY keeps it non-destructive.
alter policy card_status_history_read on public.card_status_history
  using (
    auth_role() = 'super_admin'
    or exists (
      select 1 from public.members m
      where m.id = card_status_history.member_id
        and m.region_id = auth_region()
    )
  );
