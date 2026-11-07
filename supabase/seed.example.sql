-- Run after creating the owner's user in Supabase Authentication.
-- Replace the placeholder UUID with the Authentication user ID.
insert into public.club_memberships (club_id, user_id, role, status, display_name)
values (
  '00000000-0000-4000-8000-000000000001',
  'REPLACE_WITH_AUTH_USER_UUID',
  'owner',
  'ACTIVE',
  'House host'
);

insert into public.accounts (club_id, membership_id)
select club_id, id from public.club_memberships
where user_id = 'REPLACE_WITH_AUTH_USER_UUID';
