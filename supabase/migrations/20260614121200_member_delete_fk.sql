-- Allow deleting a member without the audit log blocking it: when a member (or
-- their card) is deleted, null out the references in checkin_attempts rather
-- than blocking. Cards/attendance/welfare/email already cascade on member
-- delete.
alter table checkin_attempts drop constraint if exists checkin_attempts_member_id_fkey;
alter table checkin_attempts
  add constraint checkin_attempts_member_id_fkey
  foreign key (member_id) references members(id) on delete set null;

alter table checkin_attempts drop constraint if exists checkin_attempts_card_id_fkey;
alter table checkin_attempts
  add constraint checkin_attempts_card_id_fkey
  foreign key (card_id) references cards(id) on delete set null;
