# RLS Adversarial Test Results

> This is the single most important gate in the project. It must pass **every
> row** before any real member data goes into production and before the PR is
> merged. Solo build means you ARE the second pair of eyes. Fill this in by
> actually running each query as the test volunteer — do not infer the result.

- Date: ______
- Tester: ______
- Test volunteer email: ______

## Setup

1. Invite a fourth email you control (e.g. a personal Gmail) via Supabase →
   Authentication → Users. Log in once so the `auth.users` row exists.
2. Make them a Bristol volunteer:
   ```sql
   insert into profiles (id, email, full_name, role, region_id)
   select u.id, u.email, 'Test Volunteer', 'volunteer',
     (select id from regions where slug = 'bristol')
   from auth.users u
   where u.email = 'your_test_volunteer@gmail.com'
   on conflict (id) do update set role = 'volunteer';
   ```
3. Put a known marker in a real member's health_notes for the test:
   ```sql
   update members
   set health_notes = 'TEST ONLY — blood pressure medication, mobility issues'
   where member_no = 'WT-0001';
   ```

Run queries as the volunteer either via Supabase SQL editor "Impersonate user",
or by logging in as them in a private browser window and querying from the app.

| # | Test | Query | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Volunteer reads members table directly | `select count(*) from members;` | **0** — volunteers have no policy on `members` after the fix migration | ____ |
| 2 | Volunteer reads health_notes | `select first_name, health_notes from members where member_no = 'WT-0001';` | **0 rows / no access** — `members` is closed to volunteers; health_notes never reachable | ____ |
| 3 | Volunteer reads the safe view | `select count(*) from members_safe;` | Bristol members count (no health_notes column exists on the view) | ____ |
| 4 | Volunteer tries to read health_notes via the view | `select health_notes from members_safe limit 1;` | **error** — column does not exist on `members_safe` | ____ |
| 5 | Volunteer modifies a member | `update members set first_name = 'Hacked' where member_no = 'WT-0001';` | **0 rows affected** (no modify policy) | ____ |
| 6 | Volunteer reads auth.users | `select * from auth.users;` | error or empty | ____ |
| 7 | Volunteer reads other profiles | `select * from profiles where id != auth.uid();` | empty | ____ |
| 8 | Anonymous reads members | `curl $URL/rest/v1/members -H "apikey: $ANON"` (logged out) | `[]` | ____ |
| 9 | Anonymous reads members_safe | `curl $URL/rest/v1/members_safe -H "apikey: $ANON"` | `[]` (no anon grant; `authenticated` only) | ____ |

> If a regional_admin should be tested too: a Bristol regional_admin SHOULD see
> Bristol members including health_notes via `members`, and SHOULD NOT see any
> other region. Add rows for that pass if/when a second region exists.

## Cleanup

```sql
update members set health_notes = null where member_no = 'WT-0001';
```

Then delete the test volunteer's `auth.users` row from the dashboard.

## Verdict

- [ ] Every row above is PASS.
- Notes / anything fixed: ______
