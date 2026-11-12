-- Expose print_status through members_safe so the CRM directory (which reads
-- the view, not the base table) can show and filter by card printing status.
-- New columns must be appended at the end for create-or-replace to succeed.
create or replace view public.members_safe as
 select id, member_no, first_name, last_name, email, phone,
        address_line1, address_line2, city, postcode, region_id,
        member_since_year, joined_at, needs_full_data, active,
        created_at, updated_at,
        print_status
   from members
  where auth_role() = 'super_admin'::text or region_id = auth_region();
